-- ============================================================
-- Kims Home Cloud — Supabase VFS Schema
-- ============================================================

-- Tabel akun Google Drive yang terdaftar
CREATE TABLE IF NOT EXISTS drive_accounts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label         TEXT NOT NULL UNIQUE,           -- "Akun 1", "Akun 2", dst
  email         TEXT NOT NULL,                  -- email akun Google
  total_bytes   BIGINT NOT NULL DEFAULT 16106127360,  -- 15 GB default (Google One free)
  used_bytes    BIGINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Tabel metadata file (Virtual File System)
CREATE TABLE IF NOT EXISTS files (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name           TEXT NOT NULL,
  mime_type           TEXT NOT NULL DEFAULT 'application/octet-stream',
  size                BIGINT NOT NULL DEFAULT 0,
  google_drive_file_id TEXT NOT NULL,           -- ID file di Google Drive
  account_id          UUID NOT NULL REFERENCES drive_accounts(id) ON DELETE CASCADE,
  folder_path         TEXT NOT NULL DEFAULT '/', -- virtual folder path
  is_trashed          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_files_folder_path ON files(folder_path) WHERE NOT is_trashed;
CREATE INDEX IF NOT EXISTS idx_files_account_id  ON files(account_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at  ON files(created_at DESC);

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_files_updated
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_drive_accounts_updated
  BEFORE UPDATE ON drive_accounts
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security (opsional, aktifkan jika pakai Supabase Auth)
-- ALTER TABLE files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drive_accounts ENABLE ROW LEVEL SECURITY;

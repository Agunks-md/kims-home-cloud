/** Metadata file yang disimpan di Supabase VFS */
export interface FileRecord {
  id: string;
  file_name: string;
  mime_type: string;
  size: number;
  google_drive_file_id: string;
  account_id: string;
  folder_path: string;
  is_trashed: boolean;
  created_at: string;
  updated_at: string;
}

/** Info akun Google Drive */
export interface DriveAccount {
  id: string;
  label: string;
  email: string;
  total_bytes: number;
  used_bytes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Ringkasan storage gabungan */
export interface StorageSummary {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  accounts: DriveAccountUsage[];
}

export interface DriveAccountUsage {
  id: string;
  label: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  free_percent: number;
}

/** Response upload */
export interface UploadResult {
  file: FileRecord;
  account_label: string;
  google_drive_file_id: string;
}

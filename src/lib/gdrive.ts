import { google, drive_v3 } from "googleapis";
import { supabase } from "./supabase";
import type { DriveAccount, DriveAccountUsage } from "@/types";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// ============================================================
// Tipe internal
// ============================================================

interface DriveClient {
  drive: drive_v3.Drive;
  accountId: string;
  label: string;
  folderId: string;
}

// ============================================================
// Inisialisasi multi-client Google Drive
// ============================================================

let cachedClients: DriveClient[] | null = null;

/**
 * Memuat semua Google Drive client berdasarkan env vars.
 * Client di-cache setelah pertama kali diinisialisasi.
 */
export function getDriveClients(): DriveClient[] {
  if (cachedClients) return cachedClients;

  const count = parseInt(process.env.GDRIVE_ACCOUNT_COUNT || "0", 10);
  if (count === 0) {
    throw new Error("GDRIVE_ACCOUNT_COUNT belum diset atau bernilai 0");
  }

  const clients: DriveClient[] = [];

  for (let i = 1; i <= count; i++) {
    const credPath = process.env[`GDRIVE_ACCOUNT_${i}_CREDENTIALS_PATH`];
    const folderId = process.env[`GDRIVE_ACCOUNT_${i}_FOLDER_ID`] || "root";
    const label = process.env[`GDRIVE_ACCOUNT_${i}_LABEL`] || `Akun ${i}`;

    if (!credPath) {
      console.warn(`GDRIVE_ACCOUNT_${i}_CREDENTIALS_PATH tidak ditemukan, skip.`);
      continue;
    }

    const absPath = path.resolve(process.cwd(), credPath);
    if (!fs.existsSync(absPath)) {
      console.warn(`Credential file tidak ditemukan: ${absPath}, skip.`);
      continue;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: absPath,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    clients.push({
      drive,
      accountId: "", // akan di-resolve dari DB saat dibutuhkan
      label,
      folderId,
    });
  }

  if (clients.length === 0) {
    throw new Error("Tidak ada Google Drive client yang berhasil diinisialisasi.");
  }

  cachedClients = clients;
  return clients;
}

// ============================================================
// Storage Info & Load Balancing
// ============================================================

/**
 * Ambil info storage semua akun aktif dari Supabase.
 */
export async function getAccountsUsage(): Promise<DriveAccountUsage[]> {
  const { data, error } = await supabase
    .from("drive_accounts")
    .select("*")
    .eq("is_active", true)
    .order("label");

  if (error) throw new Error(`Gagal ambil drive_accounts: ${error.message}`);

  return (data as DriveAccount[]).map((acc) => {
    const free = acc.total_bytes - acc.used_bytes;
    return {
      id: acc.id,
      label: acc.label,
      total_bytes: acc.total_bytes,
      used_bytes: acc.used_bytes,
      free_bytes: free,
      free_percent: acc.total_bytes > 0 ? (free / acc.total_bytes) * 100 : 0,
    };
  });
}

/**
 * Pilih akun dengan persentase ruang kosong paling besar (Smart Storage).
 * Memastikan akun yang dipilih punya cukup ruang untuk file yang akan diupload.
 */
export async function pickBestAccount(
  fileSizeBytes: number
): Promise<{ account: DriveAccountUsage; clientIndex: number }> {
  const accounts = await getAccountsUsage();
  const clients = getDriveClients();

  // Filter akun yang punya cukup ruang
  const eligible = accounts.filter((a) => a.free_bytes >= fileSizeBytes);

  if (eligible.length === 0) {
    throw new Error(
      `Tidak ada akun dengan ruang cukup untuk file ${(fileSizeBytes / 1e6).toFixed(1)} MB. ` +
        `Total ruang kosong: ${accounts.reduce((s, a) => s + a.free_bytes, 0) / 1e6} MB.`
    );
  }

  // Sort by free_percent descending → pilih yang paling longgar
  eligible.sort((a, b) => b.free_percent - a.free_percent);
  const best = eligible[0];

  // Cocokkan dengan client berdasarkan label
  const clientIndex = clients.findIndex((c) => c.label === best.label);
  if (clientIndex === -1) {
    throw new Error(`Client untuk akun "${best.label}" tidak ditemukan.`);
  }

  return { account: best, clientIndex };
}

// ============================================================
// Upload File
// ============================================================

/**
 * Upload file ke Google Drive dengan smart storage load balancing.
 * Otomatis pilih akun yang paling longgar.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{
  googleDriveFileId: string;
  accountId: string;
  accountLabel: string;
}> {
  const fileSize = fileBuffer.length;
  const { account, clientIndex } = await pickBestAccount(fileSize);
  const client = getDriveClients()[clientIndex];

  // Upload ke Google Drive
  const response = await client.drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [client.folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id",
  });

  const googleDriveFileId = response.data.id;
  if (!googleDriveFileId) {
    throw new Error("Google Drive tidak mengembalikan file ID.");
  }

  // Update used_bytes di Supabase
  const { error } = await supabase
    .from("drive_accounts")
    .update({ used_bytes: account.used_bytes + fileSize })
    .eq("id", account.id);

  if (error) {
    console.error("Gagal update used_bytes:", error.message);
    // ponytail: tidak rollback upload GDrive — bisa tambah compensation logic nanti
  }

  return {
    googleDriveFileId,
    accountId: account.id,
    accountLabel: account.label,
  };
}

// ============================================================
// Download URL
// ============================================================

/**
 * Dapatkan download URL langsung dari Google Drive.
 * Menggunakan webContentLink atau generate export link.
 */
export async function getDownloadUrl(
  googleDriveFileId: string,
  accountLabel: string
): Promise<string> {
  const clients = getDriveClients();
  const client = clients.find((c) => c.label === accountLabel);

  if (!client) {
    throw new Error(`Client untuk akun "${accountLabel}" tidak ditemukan.`);
  }

  // Set file permission ke anyone-read agar bisa diakses via link
  await client.drive.permissions.create({
    fileId: googleDriveFileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  const file = await client.drive.files.get({
    fileId: googleDriveFileId,
    fields: "webContentLink",
  });

  return file.data.webContentLink || `https://drive.google.com/uc?id=${googleDriveFileId}&export=download`;
}

/**
 * Stream file dari Google Drive (untuk proxy download tanpa expose link).
 */
export async function getFileStream(
  googleDriveFileId: string,
  accountLabel: string
): Promise<Readable> {
  const clients = getDriveClients();
  const client = clients.find((c) => c.label === accountLabel);

  if (!client) {
    throw new Error(`Client untuk akun "${accountLabel}" tidak ditemukan.`);
  }

  const response = await client.drive.files.get(
    { fileId: googleDriveFileId, alt: "media" },
    { responseType: "stream" }
  );

  return response.data as unknown as Readable;
}

// ============================================================
// Delete File
// ============================================================

/**
 * Hapus file dari Google Drive dan kurangi used_bytes di Supabase.
 */
export async function deleteFile(
  googleDriveFileId: string,
  accountId: string,
  accountLabel: string,
  fileSize: number
): Promise<void> {
  const clients = getDriveClients();
  const client = clients.find((c) => c.label === accountLabel);

  if (!client) {
    throw new Error(`Client untuk akun "${accountLabel}" tidak ditemukan.`);
  }

  // Hapus dari Google Drive
  await client.drive.files.delete({ fileId: googleDriveFileId });

  // Kurangi used_bytes
  const { data: acc } = await supabase
    .from("drive_accounts")
    .select("used_bytes")
    .eq("id", accountId)
    .single();

  if (acc) {
    const newUsed = Math.max(0, acc.used_bytes - fileSize);
    await supabase
      .from("drive_accounts")
      .update({ used_bytes: newUsed })
      .eq("id", accountId);
  }
}

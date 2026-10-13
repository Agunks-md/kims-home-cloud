import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/gdrive";
import { supabase } from "@/lib/supabase";


/**
 * POST /api/files/upload
 * Menerima FormData dengan field "file", upload ke Google Drive,
 * dan simpan metadata ke Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderPath = (formData.get("folder_path") as string) || "/";

    if (!file) {
      return NextResponse.json({ error: "Field 'file' wajib diisi." }, { status: 400 });
    }

    // Baca file ke buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Google Drive (otomatis pilih akun terbaik)
    const result = await uploadFile(buffer, file.name, file.type || "application/octet-stream");

    // Simpan metadata ke Supabase
    const { data: fileRecord, error } = await supabase
      .from("files")
      .insert({
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: buffer.length,
        google_drive_file_id: result.googleDriveFileId,
        account_id: result.accountId,
        folder_path: folderPath,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Gagal simpan metadata: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: fileRecord,
      account: result.accountLabel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

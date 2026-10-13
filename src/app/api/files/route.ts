import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { deleteFile, getDownloadUrl } from "@/lib/gdrive";
import type { FileRecord } from "@/types";


/**
 * GET /api/files
 * Ambil daftar file dari Supabase VFS.
 * Query params: folder_path (default "/"), search, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get("folder_path") || "/";
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("files")
      .select("*, drive_accounts(label)", { count: "exact" })
      .eq("is_trashed", false)
      .eq("folder_path", folderPath)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("file_name", `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ files: data, total: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/files?id=<file_id>
 * Hapus file dari Google Drive dan Supabase.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "Query param 'id' wajib." }, { status: 400 });
    }

    // Ambil metadata file
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("*, drive_accounts(label)")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    }

    const record = file as FileRecord & { drive_accounts: { label: string } };

    // Hapus dari Google Drive
    await deleteFile(
      record.google_drive_file_id,
      record.account_id,
      record.drive_accounts.label,
      record.size
    );

    // Hapus dari Supabase
    const { error: deleteError } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      return NextResponse.json({ error: `Gagal hapus metadata: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getDownloadUrl } from "@/lib/gdrive";
import type { FileRecord } from "@/types";


/**
 * GET /api/files/download?id=<file_id>
 * Dapatkan download URL untuk file tertentu.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "Query param 'id' wajib." }, { status: 400 });
    }

    const { data: file, error } = await supabase
      .from("files")
      .select("*, drive_accounts(label)")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
    }

    const record = file as FileRecord & { drive_accounts: { label: string } };
    const url = await getDownloadUrl(record.google_drive_file_id, record.drive_accounts.label);

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

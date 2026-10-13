import { NextResponse } from "next/server";
import { getAccountsUsage } from "@/lib/gdrive";
import type { StorageSummary } from "@/types";


/**
 * GET /api/storage
 * Ambil ringkasan storage gabungan semua akun.
 */
export async function GET() {
  try {
    const accounts = await getAccountsUsage();

    const summary: StorageSummary = {
      total_bytes: accounts.reduce((s, a) => s + a.total_bytes, 0),
      used_bytes: accounts.reduce((s, a) => s + a.used_bytes, 0),
      free_bytes: accounts.reduce((s, a) => s + a.free_bytes, 0),
      accounts,
    };

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: Boolean(getSupabaseAdmin()),
    time: new Date().toISOString(),
  });
}

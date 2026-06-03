import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json({
    ok: dbOk,
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    uptimeMs: Date.now() - started,
    ts: new Date().toISOString(),
  });
}

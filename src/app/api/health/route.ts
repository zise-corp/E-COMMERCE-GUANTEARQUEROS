import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!process.env.DATABASE_URL || (process.env.ADMIN_SESSION_SECRET?.length ?? 0) < 24) {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }

  try {
    await db.select({ id: categories.id }).from(categories).limit(1);
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }
}

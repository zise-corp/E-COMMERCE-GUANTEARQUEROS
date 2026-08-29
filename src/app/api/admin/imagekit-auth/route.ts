import { getUploadAuthParams } from "@imagekit/next/server";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Credenciales de una sola subida. La clave privada nunca sale del servidor. */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const publicKey = process.env["IMAGEKIT_PUBLIC_KEY"];
  const privateKey = process.env["IMAGEKIT_PRIVATE_KEY"];
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { ok: false, error: "Faltan las credenciales de ImageKit en el servidor." },
      { status: 500 },
    );
  }

  const auth = getUploadAuthParams({ publicKey, privateKey });
  return NextResponse.json({ ok: true, publicKey, ...auth });
}

import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { CLOUDINARY_FOLDER } from "@/lib/images";
import { uploadSignatureSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * Firma una subida directa del browser a Cloudinary. La API secret nunca sale del
 * server: solo viaja la firma, atada a este timestamp y a esta carpeta.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan las credenciales de Cloudinary en el server (CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET).",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = uploadSignatureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Slug inválido." }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${CLOUDINARY_FOLDER}/${parsed.data.slug}`;

  // Solo se firman estos parámetros: el cliente no puede cambiar la carpeta.
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

  return NextResponse.json({
    ok: true,
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  });
}

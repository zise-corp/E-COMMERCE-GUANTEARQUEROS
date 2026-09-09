import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyToken } from "@/lib/session";

/**
 * Protege todo /admin/* salvo el login. El panel además va con noindex: no se
 * enlaza desde la tienda ni aparece en el sitemap.
 *
 * Esto es la primera barrera; cada página y cada acción del panel vuelve a
 * verificar la sesión del lado del server.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  const session = await verifyToken(request.cookies.get(ADMIN_COOKIE)?.value, "admin").catch(
    () => null,
  );

  if (!session && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

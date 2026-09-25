const origin = "http://127.0.0.1:3000";

async function check(path) {
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(20_000),
  });
  await response.body?.cancel();
  if (response.status !== 200) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  console.log(`OK ${path}`);
}

try {
  await check("/api/health");
  await check("/");
  await check("/robots.txt");
  await check("/admin/login");
  await check("/checkout/envio");
  await check("/api/search?q=guantes");

  const sitemap = await fetch(`${origin}/sitemap.xml`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (sitemap.status !== 200) throw new Error(`/sitemap.xml: HTTP ${sitemap.status}`);
  const xml = await sitemap.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1].replaceAll("&amp;", "&")).pathname);
  const urls = paths.filter((path) => path !== "/" && !path.startsWith("/p/"));
  const categoryPaths = urls.filter((path) => path !== "/drei");
  if (categoryPaths.length === 0) throw new Error("El sitemap no contiene categorías");

  for (const path of new Set(urls)) await check(path);
  await check(`${categoryPaths[0]}?hasta=100`);

  const products = paths.filter((path) => path.startsWith("/p/"));
  for (const path of products.slice(0, 3)) await check(path);
} catch (error) {
  console.error("Fallo la verificación de páginas públicas:", error);
  process.exitCode = 1;
}

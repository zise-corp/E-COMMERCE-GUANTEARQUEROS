# Guantearqueros Bolivia

Tienda pública + panel administrativo en una sola app Next.js.
Dos marcas bajo la identidad de Guantearqueros: guantes de arquero y accesorios
(Buffon, HO Soccer, Uhlsport, Elite, GXP) e indumentaria **DREI Athletic**, que no es
un tema aparte sino una marca del catálogo con su tag azul.

| | |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| Estilos | Tailwind CSS v3 con los tokens del design system |
| Base | Postgres + Drizzle ORM |
| Imágenes | Cloudinary (`dvbtbadg1`), subida firmada desde el server |
| Pagos | YoPago (QR + tarjeta), webhook + polling |
| Auth admin | cookie httpOnly firmada (HMAC) + Argon2id |
| Validación | Zod en cada endpoint, server action y formulario |

---

## 1. Puesta en marcha

```bash
npm install
cp .env.example .env.local
```

Completá `.env.local` (ver sección 2), y después:

```bash
npm run db:migrate
npm run db:seed
npm run admin:create -- --user dani --pass "una-clave-larga-y-propia"
npm run dev
```

La tienda queda en `http://localhost:3000` y el panel en `http://localhost:3000/admin`.

Para ver la tienda con datos antes de cargar el catálogo real:

```bash
npm run db:seed -- --demo
```

Carga 12 productos de prueba (los del prototipo), sin imágenes: la tienda muestra el
placeholder de marca. Se borran desde el panel cuando ya no hagan falta.

## 2. Variables de entorno

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Postgres (Neon o Supabase), con `sslmode=require` | sí |
| `ADMIN_SESSION_SECRET` | Firma de las cookies de sesión y de pedido | sí |
| `CLOUDINARY_CLOUD_NAME` | `dvbtbadg1` | sí |
| `CLOUDINARY_API_KEY` | Firma de subidas | para subir fotos |
| `CLOUDINARY_API_SECRET` | Firma de subidas — **nunca sale del server** | para subir fotos |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | `dvbtbadg1` | sí |
| `YOPAGO_MODE` | `sandbox` (default) o `live` | no |
| `YOPAGO_API_URL` · `YOPAGO_API_KEY` · `YOPAGO_SECRET` · `YOPAGO_WEBHOOK_SECRET` | Pasarela real | solo en `live` |
| `NEXT_PUBLIC_SITE_URL` | Dominio público, para canonical/sitemap/webhook | sí en producción |
| `NEXT_PUBLIC_SUPPORT_EMAIL` · `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Modal de soporte | sí |

El secreto de sesión se genera así:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Rotá `CLOUDINARY_API_SECRET` antes de salir a producción.** La clave que circuló
> por chat hay que darla de baja desde el panel de Cloudinary y generar una nueva.

Sin `DATABASE_URL` el proyecto igual compila: las páginas públicas se renderizan
vacías y avisan por consola. Es a propósito, para que un clon recién bajado buildee.

## 3. Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run lint` | ESLint |
| `npm run db:generate` | Genera una migración desde `src/db/schema.ts` |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Categorías, subcategorías, marcas y secuencia de pedidos |
| `npm run db:seed -- --demo` | Lo anterior + productos de prueba |
| `npm run db:studio` | Drizzle Studio |
| `npm run admin:create -- --user X --pass Y` | Crea o actualiza un usuario del panel |

## 4. Estructura

```
src/
  app/
    (shop)/            tienda pública — layout, home, /c, /p, /checkout
    admin/             panel — login, resumen, categorías, productos, pedidos
    api/               orders, payments/yopago, search, admin/*
  components/
    shop/  admin/  ui/  brand/
  db/       schema.ts, seed.ts, queries/
  lib/      session, validators, money, images, yopago, notify, site, brand
drizzle/               migraciones SQL versionadas
public/brand/          escudo real (SVG + PNG)
referencias/           handoff de diseño y logos originales (no entra al build)
```

## 5. Decisiones que conviene conocer

**Precios congelados.** El cliente manda *qué* compra; el precio lo lee el server de la
base y lo copia a `order_items` junto con el nombre, la talla y los atributos.
`product_id` es nullable con `ON DELETE SET NULL`: borrar un producto no rompe el
historial.

**Número de pedido.** `orders.number` sale de la secuencia `orders_number_seq`
(arranca en 1041), así dos pedidos simultáneos no chocan.

**Una sola orden por sesión de checkout.** Al confirmar se crea la orden y se guarda su
id en una cookie httpOnly firmada. Si el cliente vuelve al paso 1 y reenvía, se hace
`PATCH` sobre la misma orden. Esa cookie también autoriza el polling y el pago: nadie
consulta ni paga pedidos ajenos.

**El webhook manda.** El paso 2 consulta cada 4 s, pero quien marca el pago como
confirmado es el webhook de YoPago. Es idempotente: el stock se descuenta una sola vez.

**Selector de ubicación propio.** Sin Google Maps ni tiles externos: la grilla oscura del
design system con el pin naranja de marca. Tres formas de dar el punto —
geolocalización, link de Maps pegado, o marcarlo a mano— para que nadie quede trabado.
El admin abre esas coordenadas en Google Maps con un click.

**Atributos manuales.** `products.attributes` es JSONB, un array `[{name, value}]` que el
admin tipea libre. Se muestran en la ficha en el orden guardado. Las tallas van aparte en
`products.sizes` porque afectan al carrito.

**Server actions con auth propia.** Las actions del panel son endpoints públicos: cada una
vuelve a verificar la sesión, sin confiar en que el middleware ya filtró.

## 6. Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel.
2. Cargá todas las variables de la sección 2 en *Settings → Environment Variables*.
   `NEXT_PUBLIC_SITE_URL` tiene que ser el dominio final.
3. Apuntá `guantearquerosbolivia.com.bo` al proyecto.
4. Aplicá las migraciones contra la base de producción (`npm run db:migrate` con el
   `DATABASE_URL` de producción) y corré `npm run db:seed`.
5. Creá el usuario del panel con `npm run admin:create`.
6. Registrá el webhook en YoPago apuntando a
   `https://guantearquerosbolivia.com.bo/api/payments/yopago/webhook`, poné
   `YOPAGO_MODE=live` y cargá las credenciales.

## 7. Fuera de alcance en esta etapa

- **Notificación al negocio** (WhatsApp/email al crearse un pedido). El enganche está en
  `src/lib/notify.ts` (`notifyNewOrder`, `notifyPaymentConfirmed`) y el campo
  `orders.notified_at` queda sin usar a propósito.
- Cuentas de cliente: el checkout es de invitado.
- Cupones y descuentos por código.
- Multi-idioma y multi-moneda: solo español boliviano y Bs.

## 8. Pendiente del dueño

- **Wordmark y logo DREI en SVG.** Hoy se componen con Anton, igual que en el prototipo.
  Cuando lleguen los archivos, van a `public/brand/` como
  `wordmark-guantearqueros.svg` y `drei-athletic.svg`, y se ponen en `true` los flags de
  `src/lib/brand.ts`. El escudo sí es el real, vectorizado del PNG original.
- **Credenciales de Cloudinary** (key + secret nuevos) y **de YoPago**.
- **Fotos de producto**: se suben desde el panel, van a
  `guantearqueros/productos/<slug>`.

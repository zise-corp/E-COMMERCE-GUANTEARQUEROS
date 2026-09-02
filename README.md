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
| Imágenes | ImageKit, subida directa autenticada desde el panel |
| Pagos | YoPago (QR + tarjeta), webhook + polling |
| Auth admin | cookie httpOnly firmada (HMAC) + Argon2id |
| Validación | Zod en cada endpoint, server action y formulario |

---

## 1. Puesta en marcha

```bash
npm install
cp .env.example .env.local
```

Completá `.env.local` (ver sección 2) — como mínimo `DATABASE_URL` y
`ADMIN_SESSION_SECRET` — y después:

```bash
npm run db:migrate
npm run db:seed
npm run admin:create -- --user dani --pass "una-clave-larga-y-propia"
npm run dev
```

La tienda queda en `http://localhost:3000` y el panel en `http://localhost:3000/admin`.

### Postgres en Windows

Si ya tenés el instalador oficial de PostgreSQL, la base se crea así (te va a pedir
la contraseña que pusiste al instalarlo):

```bash
"/c/Program Files/PostgreSQL/18/bin/createdb.exe" -U postgres -h localhost guantearqueros
```

y la conexión queda `postgresql://postgres:TU_PASSWORD@localhost:5432/guantearqueros`.
Si la contraseña tiene `@`, `:`, `/` o `?`, hay que escaparla en la URL.

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
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Endpoint público `https://ik.imagekit.io/...` | sí |
| `IMAGEKIT_PUBLIC_KEY` | Identifica la cuenta durante la subida | para subir fotos |
| `IMAGEKIT_PRIVATE_KEY` | Firma credenciales temporales — **nunca sale del server** | para subir fotos |
| `YOPAGO_MODE` | `sandbox` (default) o `live` | no |
| `YOPAGO_API_URL` · `YOPAGO_API_KEY` · `YOPAGO_SECRET` · `YOPAGO_WEBHOOK_SECRET` | Pasarela real | solo en `live` |
| `NEXT_PUBLIC_SITE_URL` | Dominio público, para canonical/sitemap/webhook | sí en producción |
| `NEXT_PUBLIC_SUPPORT_EMAIL` · `NEXT_PUBLIC_SUPPORT_WHATSAPP` · `NEXT_PUBLIC_DREI_WHATSAPP` | Contacto y modales de soporte | sí |

El secreto de sesión se genera así:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> La clave `IMAGEKIT_PRIVATE_KEY` es exclusivamente del servidor. Nunca debe usar el
> prefijo `NEXT_PUBLIC_` ni incluirse en commits.

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

## 3b. Si algo se ve raro

**La página sale sin estilos (HTML pelado, links azules).** Pasa cuando `.next`
mezcla artefactos de `npm run build` con los de `npm run dev`: el HTML pide un CSS
que el server ya no tiene y devuelve 404. Se arregla borrando la carpeta:

```bash
npm run clean && npm run dev
```

Después hacé una recarga forzada en el navegador (Ctrl+Shift+R): el CSS fallido
queda cacheado. Para evitarlo, corré `npm run clean` cuando alternes entre
`build` y `dev`.

**"Falta DATABASE_URL" al correr un script.** Los scripts sueltos leen `.env.local`
por `src/lib/load-env.ts`. Si lo ves, revisá que el archivo exista en la raíz.

**`password authentication failed`.** Casi siempre es el puerto: puede haber más de
una instancia de Postgres en la máquina (5432 y 5433), cada una con su contraseña.

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

## 6. Deploy en Netlify

El repositorio incluye `netlify.toml`. Netlify detecta Next.js y usa su adaptador
OpenNext para SSR, Server Actions, rutas API, middleware e imágenes; no es un export
estático y no hace falta instalar ni fijar manualmente `@netlify/plugin-nextjs`.

1. Subí el repo a GitHub y en Netlify elegí **Add new project → Import an existing
   project**. La configuración debe quedar con build `npm run build`, publicación
   `.next` y Node 22 (ya están versionados en `netlify.toml`).
2. En **Project configuration → Environment variables**, agregá las variables de la
   sección 2. Elegí todos los scopes necesarios, incluido **Builds**, porque las
   variables `NEXT_PUBLIC_*` se incorporan al bundle durante el build. No subas
   `.env.local` ni guardes claves privadas en `netlify.toml`.
3. Para el primer deploy podés usar la URL temporal de Netlify como
   `NEXT_PUBLIC_SITE_URL` (por ejemplo `https://nombre-del-sitio.netlify.app`). Cuando
   conectes el dominio final, reemplazala por `https://guantearquerosbolivia.com.bo`
   y dispará un nuevo deploy.
4. Usá una base Postgres externa con conexión pooled (Neon o Supabase) y SSL. Desde
   una terminal segura, cargá el `DATABASE_URL` de producción y ejecutá una sola vez:

   ```bash
   npm run db:migrate
   npm run db:seed
   npm run admin:create -- --user TU_USUARIO --pass "UNA_CLAVE_LARGA"
   ```

   No pongas migraciones ni `db:seed` dentro del comando de build: los deploys se
   ejecutan más de una vez y los previews también podrían tocar producción.
5. En **Domain management**, agregá el dominio y seguí los registros DNS indicados por
   Netlify. Luego actualizá `NEXT_PUBLIC_SITE_URL` y redeployá.
6. Cuando YoPago entregue las credenciales, registrá el webhook
   `https://TU_DOMINIO/api/payments/yopago/webhook`, configurá `YOPAGO_MODE=live` y
   cargá las cuatro variables `YOPAGO_*`. Hasta entonces dejá `YOPAGO_MODE=sandbox`.

### Variables recomendadas en Netlify

| Variable | Valor de producción | Sensibilidad |
|---|---|---|
| `DATABASE_URL` | URL pooled de Postgres con `sslmode=require` | secreta |
| `ADMIN_SESSION_SECRET` | salida aleatoria del comando de la sección 2 | secreta |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | `https://ik.imagekit.io/ID_DE_TU_CUENTA` | pública |
| `IMAGEKIT_PUBLIC_KEY` | clave pública de ImageKit | pública |
| `IMAGEKIT_PRIVATE_KEY` | clave privada de ImageKit | secreta |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS canónica, sin `/` final | pública |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | correo de ventas | pública |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | número internacional, solo dígitos | pública |
| `NEXT_PUBLIC_DREI_WHATSAPP` | número internacional de DREI, solo dígitos | pública |
| `YOPAGO_MODE` | `sandbox` inicialmente; `live` al habilitar cobros | no secreta |
| `YOPAGO_API_URL` | URL indicada por YoPago | no secreta |
| `YOPAGO_API_KEY` | credencial indicada por YoPago | secreta |
| `YOPAGO_SECRET` | secreto indicado por YoPago | secreta |
| `YOPAGO_WEBHOOK_SECRET` | secreto usado para validar el webhook | secreta |

`NETLIFY_NEXT_SKEW_PROTECTION=true` y `NODE_VERSION=22` ya se definen en
`netlify.toml`; no hace falta duplicarlas en el panel.

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
- **Credenciales de YoPago** para reemplazar el simulador por la pasarela real.
- **Fotos de producto**: se suben desde el panel a ImageKit y van a
  `/guantearqueros/productos/<slug>`.

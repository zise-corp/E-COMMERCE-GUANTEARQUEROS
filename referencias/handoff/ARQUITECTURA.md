# Arquitectura — Guantearqueros Bolivia

Tienda pública + panel administrativo, una sola app Next.js.
Dominio: `guantearquerosbolivia.com.bo` (tienda) · `/admin` (panel, login propio).

## 1. Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind CSS (tokens en `tailwind.config.ts`) |
| DB | Postgres (Neon o Supabase) |
| ORM | Drizzle ORM + drizzle-kit para migraciones |
| Imágenes | Cloudinary (cloud `dvbtbadg1`), upload firmado desde el server |
| Pagos | YoPago (QR + tarjeta), confirmación por polling y webhook |
| Auth admin | Cookie de sesión httpOnly + hash Argon2, tabla `admin_users` |
| Validación | Zod en cada route handler y en los formularios |
| Estado cliente | React state + `localStorage` para el carrito |

## 2. Estructura de carpetas

```
src/
  app/
    (shop)/
      layout.tsx                 # header + footer + carrito global
      page.tsx                   # home
      c/[categoria]/page.tsx     # listado categoría
      c/[categoria]/[sub]/page.tsx
      p/[slug]/page.tsx          # ficha de producto
      checkout/
        pago/page.tsx            # paso 2
        confirmacion/page.tsx    # paso 3
    admin/
      login/page.tsx
      layout.tsx                 # sidebar + topbar (protegido)
      page.tsx                   # resumen
      categorias/page.tsx
      productos/page.tsx
      productos/[id]/page.tsx
      pedidos/page.tsx
      pedidos/[n]/page.tsx
    api/
      orders/route.ts            # POST crea | PATCH actualiza orden pendiente
      orders/[id]/status/route.ts
      payments/yopago/route.ts   # crea intento de pago (QR/link)
      payments/yopago/webhook/route.ts
      admin/upload-signature/route.ts   # firma Cloudinary
  components/
    shop/  ProductCard, ProductGallery, CategoryNav, CampaignStrip,
           CartDrawer, ShippingForm, DeliveryToggle, LocationPicker,
           ConfirmDialog, PaymentMethodPicker, OrderSummary, SupportModal
    admin/ StatCard, SalesChart, StatusBreakdown, DataTable,
           ProductForm, AttributeRows, CloudinaryDropzone, OrderDetail, StatusStepper
    ui/    Button, Input, Select, Badge, Toggle, Modal, Drawer, Chip
  db/      schema.ts, index.ts, queries/
  lib/     cloudinary.ts, yopago.ts, session.ts, money.ts, validators.ts
```

## 3. Catálogo

Categorías → Subcategorías → Productos. Ambos niveles viven en la misma tabla
`categories` con `parent_id` autoreferencial, así el admin puede crear niveles sin migrar.

Categorías iniciales (seed): **Guantes, Poleras, Botas, Pelotas, Canilleras**.
Subcategorías del seed:

- Guantes → Competición, Entrenamiento, Junior
- Poleras → Arquero, Uniformes DREI, Calzas
- Botas → Césped firme, Futsal
- Pelotas → N°4, N°5
- Canilleras → Con tobillera, Placa simple

Marcas: Buffon, Uhlsport, HO Soccer, Elite, GXP, DREI.
DREI Athletic no es un tema aparte: es marca + tag visual azul dentro de la identidad de Guantearqueros.

### Atributos manuales

`products.attributes` es **jsonb**: un array de pares libres que el admin escribe a mano.

```json
[{ "name": "Color", "value": "Blanco con líneas negras" },
 { "name": "Tamaño", "value": "15 cm" }]
```

Sin listas cerradas ni tablas de opciones: el admin tipea nombre y valor, y la ficha de
producto los renderiza en el mismo orden. Las tallas seleccionables sí son un campo
aparte (`products.sizes text[]`) porque afectan al carrito.

## 4. Imágenes (Cloudinary)

- Carpeta `guantearqueros/productos/<slug>`.
- El browser sube directo a Cloudinary con firma generada en `/api/admin/upload-signature`; la API secret nunca sale del server.
- Se guarda solo el `public_id`; los tamaños se derivan con transformaciones:
  - grilla: `f_auto,q_auto,c_fill,w_600,h_450`
  - ficha: `f_auto,q_auto,c_fill,w_1200,h_1200`
  - thumb admin/carrito: `f_auto,q_auto,c_fill,w_120,h_120`
- Variables de entorno: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server), `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (client).
  La API secret que se compartió en el chat conviene rotarla antes de salir a producción.

## 5. Checkout — comportamiento

**Paso 1 · Envío (dentro del drawer del carrito)**
Nombre* · Teléfono/WhatsApp* · Nota. Toggle `pickup | delivery` (pickup por defecto).

- `pickup` → no pide nada más.
- `delivery` → departamento (10 opciones).
  - `Cochabamba` (región local): dirección escrita* + ubicación exacta (pin arrastrable, "usar mi ubicación", o pegar link de Google Maps). Si falla la geolocalización se muestra el error con alternativa manual.
  - Otro departamento: CI* + email*, con ayuda explicando que el transporte se coordina aparte.

Al enviar: modal de confirmación (ítems, total, modalidad/departamento) con "Volver" y "Sí, confirmar".
Confirmar → `POST /api/orders` crea la orden en estado `recibido` y guarda `orderId` en sesión.
Si el usuario vuelve al paso 1 y reenvía, se hace `PATCH /api/orders/:id` sobre la misma orden (no se duplica).
Si el guardado falla: se muestra el error y no se avanza.

**Paso 2 · Pago (YoPago)**
Desktop 7/12 + 5/12 sticky, mobile una columna con el resumen debajo.
Botón "Volver a envío" (mantiene la orden). Dos métodos (QR / Tarjeta); al elegir uno se
genera el pago automáticamente (spinner "Generando pago de Bs X..."). QR 192px mobile /
256px desktop con TX ID; tarjeta en iframe `min(70dvh, 500px)`. Badge SSL fijo.
Polling a `/api/orders/:id` cada 4s; el webhook de YoPago es la fuente de verdad.
Al confirmarse: paso 3, carrito vacío, scroll al inicio.

**Paso 3 · Confirmación**
Check grande, número de pedido en badge naranja, tarjeta de ayuda con el mismo modal de
soporte (email copiable + WhatsApp con el número de pedido precargado) y "Volver a la tienda".

**Notificación al negocio**: pendiente. Punto de integración marcado en
`lib/notify.ts` (`notifyNewOrder(order)`), llamado después del commit del pedido y del webhook de pago.

## 6. Precios congelados

`order_items` guarda `name`, `unit_price`, `attributes_snapshot` y `size` al momento de la compra.
`product_id` es nullable con `on delete set null`: si el producto se borra o cambia de precio,
el pedido histórico sigue mostrando lo que el cliente compró.

## 7. Panel admin

- `/admin/login` — credenciales propias, fuera de la vista pública. Middleware protege `/admin/*`.
- **Resumen**: KPIs (ventas del mes, pedidos, ticket promedio, stock crítico), ventas por semana, pedidos por estado, más vendidos.
- **Categorías**: alta/edición de categorías y subcategorías, orden de aparición.
- **Productos**: tabla filtrable por categoría, formulario con precio/precio anterior/stock, atributos manuales, subida a Cloudinary, toggles publicado/destacado.
- **Pedidos**: lista con filtro por estado y detalle con datos del cliente, campos condicionales de entrega (dirección + mapa clickeable, o CI + email), ítems con precio congelado, total y control de estado `recibido → en_proceso → completado | cancelado`.

## 8. Rendimiento y SEO

- Home y listados como Server Components con `revalidate: 300`; ficha de producto `generateStaticParams` + revalidación por tag al guardar en el admin.
- Carrito y checkout como Client Components.
- `next/image` con loader de Cloudinary; `sizes` explícito en grillas.
- Metadata por producto y categoría, JSON-LD `Product` con precio y disponibilidad.

## 9. Prototipos

- `Guantearqueros Tienda.dc.html` — tienda pública completa, con las variantes de checkout.
- `Guantearqueros Admin.dc.html` — panel (login, resumen, categorías, productos, pedidos).
- `Design System.dc.html` — tokens, tipografía, componentes y reglas de uso.

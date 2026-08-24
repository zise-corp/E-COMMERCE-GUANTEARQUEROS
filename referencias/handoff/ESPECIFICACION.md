# Handoff a Claude Code — Ecommerce Guantearqueros Bolivia

> Pegá este archivo completo como primer mensaje en Claude Code, dentro de la carpeta
> donde vas a crear el proyecto, junto con los demás archivos de este bundle.
> El logo original (PNG/SVG del escudo y el wordmark) lo adjunta el dueño aparte:
> ver la sección **9. Assets de marca** para saber dónde va cada archivo.

---

## 0. Qué tenés que hacer

Implementar una tienda virtual (ecommerce) + panel administrativo para
**Guantearqueros Bolivia**, un negocio de Cochabamba que hoy vende por WhatsApp.
Dos marcas en un solo sitio, bajo la identidad de Guantearqueros:

- **Guantearqueros Bolivia** (marca paraguas): guantes de arquero y accesorios —
  Buffon, HO Soccer, Uhlsport, Elite, GXP.
- **DREI Athletic** (sub-marca): indumentaria — camisetas, uniformes personalizados, calzas, poleras.

DREI **no** es un tema visual aparte: es una marca del catálogo con un tag azul propio.

## 1. Sobre los archivos de diseño de este bundle

Los `.dc.html` incluidos son **referencias de diseño hechas en HTML**: prototipos que
muestran el look y el comportamiento buscado, **no código de producción para copiar**.
Tu tarea es **recrear estos diseños en un proyecto Next.js real**, con los patrones y
librerías de ese stack. Abrilos en el navegador y usalos como fuente de verdad visual;
los valores exactos están documentados abajo.

Fidelidad: **alta (hifi)**. Colores, tipografía, espaciados e interacciones son finales.
Recrealos con precisión; donde este README y el HTML difieran, manda este README.

## 2. Stack obligatorio

| Capa | Elección |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| Estilos | Tailwind CSS v3 con los tokens de `tailwind.config.ts` (incluido) |
| DB | Postgres (Neon o Supabase) |
| ORM | Drizzle ORM + drizzle-kit |
| Imágenes | Cloudinary, cloud `dvbtbadg1` |
| Pagos | YoPago (QR + tarjeta) |
| Auth admin | cookie de sesión httpOnly + Argon2, tabla `admin_users` |
| Validación | Zod en cada route handler y formulario |
| Carrito | React context + `localStorage` |

No agregues librerías de UI (shadcn, MUI, Chakra). Los componentes se escriben a mano con
Tailwind: el diseño es angular y de alto contraste, y las librerías genéricas lo redondean.
Sí podés usar: `zod`, `drizzle-orm`, `next-cloudinary`, `argon2`, `recharts` (solo admin),
`react-leaflet` o Google Maps JS API (selector de ubicación).

## 3. Dirección visual — no negociable

Esto es lo que diferencia el proyecto de una tienda deportiva genérica:

1. **Base oscura mate**, nunca blanca. Fondo `#0A0A0A` con fade cálido
   (`radial-gradient(120% 80% at 50% -10%, #17120F 0%, #0A0A0A 55%)`) para que no se vea plano.
2. **Naranja `#FA2A00` protagonista**: CTA, precios, hover, filtro activo, acentos de sección.
3. **Rojo `#E10600` solo como tensión**: badge de descuento, stock bajo, estado cancelado.
   Nunca en superficies grandes ni pegado al naranja en bloques.
4. **Texturas deportivas reinterpretadas**, no imágenes pegadas: franjas diagonales
   `repeating-linear-gradient(115deg, #FA2A00 0 26px, #0A0A0A 26px 52px)` como franja de
   campaña y separador de footer.
5. **Tipografía**: **Anton** condensada para títulos y precios, siempre `skewX(-7deg)` y
   uppercase (sensación de velocidad, como el logo de DREI). **Manrope** para UI y texto de
   producto. Nada de tipografías finas o serif de lujo.
6. **Movimiento rápido y filoso**: transiciones de 150–250 ms, hover con borde naranja + glow,
   drawer que entra en 220 ms. Nada de easing lento tipo "cómodo".
7. **Geometría angular**: `border-radius` 0 por defecto (2px máximo en inputs). Los CTA usan
   corte diagonal `clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)`;
   el escudo/check usa `polygon(0 0, 100% 0, 100% 76%, 50% 100%, 0 76%)`.
8. **Sombras de color, no grises difusas**: `0 12px 40px rgba(250,42,0,0.35)` en primario.
9. **Jerarquía agresiva de precios**: precio en Anton naranja 26–56px, precio anterior tachado
   en `#6E6B67`, badge de descuento en rojo con corte diagonal.

Evitar activamente: plantilla de ecommerce genérica (banner + 3 columnas de features con
iconitos + grilla blanca), bordes muy redondeados, sombras pastel, ilustraciones flat, emoji.

## 4. Design tokens

Están listos en `tailwind.config.ts` (incluido en este bundle). Resumen:

**Superficies** — `ink-950 #0A0A0A` (fondo), `ink-900 #0D0D0C` (sección/drawer),
`ink-850 #131312` (card, input), `ink-800 #1C1C1B` (divisor), `ink-700 #232322`.
**Bordes** — `line #262625`, `line-strong #2B2B29`, `line-soft #1E1E1D`.
**Marca** — `brand #FA2A00`, `brand-hot #FF5A2B` (hover), `brand-deep #C81F00` (gradiente del escudo).
**Tensión** — `alert #E10600`, `alert-soft #FF6E68` (texto de alerta).
**DREI** — `drei #1B3A5C`, `drei-line #4E8FCB`, `drei-ink #BFD8EE`.
**Texto** — `content #F5F3F0`, `muted #A8A5A0`, `dim #6E6B67`, `faint #57554F`.
**Estados** — `ok #6FCF8E`, `warn #E2B93B`.

**Tipografía**
| Token | Familia | Tamaño / interlineado | Uso |
|---|---|---|---|
| display-xl | Anton | 108px / 0.86, skew -7°, uppercase | H1 del hero |
| display-lg | Anton | 56px / 0.92, skew -7° | H1 de página, ficha |
| display-md | Anton | 34px, skew -7° | títulos de sección |
| price | Anton | 26–56px, sin skew, `brand` | precios |
| body | Manrope 400 | 16px / 1.6 | párrafos |
| label | Manrope 800 | 11px, letter-spacing .16em, uppercase | labels, metadatos |

**Espaciado** escala de 4px (4, 8, 12, 16, 24, 32, 48, 72).
**Sombras** `glow-brand`, `glow-alert`, `card 0 16px 50px rgba(0,0,0,.6)`, `focus 0 0 0 3px rgba(250,42,0,.15)`.

Referencia visual completa: **Design System.dc.html**.

## 5. Arquitectura

Ver **ARQUITECTURA.md** (incluido) para el árbol de carpetas completo, rutas y endpoints.
Resumen de rutas:

```
/                          home
/c/[categoria]             listado de categoría
/c/[categoria]/[sub]       listado de subcategoría
/p/[slug]                  ficha de producto
/checkout/pago             paso 2
/checkout/confirmacion     paso 3
/admin/login               login propio del panel
/admin                     resumen
/admin/categorias          categorías y subcategorías
/admin/productos           tabla + formulario
/admin/pedidos             lista + detalle
```

API: `POST/PATCH /api/orders`, `PATCH /api/orders/[id]/status`,
`POST /api/payments/yopago`, `POST /api/payments/yopago/webhook`,
`POST /api/admin/upload-signature`.

Middleware protege `/admin/*` salvo `/admin/login`. El panel es invisible desde la tienda:
sin links, sin sitemap, `noindex`.

## 6. Base de datos

Usá `db/schema.ts` y `db/seed.ts` tal como vienen (Drizzle + Postgres). Puntos clave:

- `categories` con `parent_id` autoreferencial: categorías y subcategorías en una tabla.
- Seed de categorías: **Guantes, Poleras, Botas, Pelotas, Canilleras** + subcategorías del seed.
- Marcas: Buffon, Uhlsport, HO Soccer, Elite, GXP, DREI (DREI con `accent_hex = #1B3A5C`).
- **`products.attributes` jsonb** = atributos **manuales**: array `[{ name, value }]` que el
  admin tipea a mano, sin listas cerradas. Ej: `{ "name": "Color", "value": "Blanco con líneas negras" }`,
  `{ "name": "Tamaño", "value": "15 cm" }`. Se renderizan en la ficha en el orden guardado.
- `products.sizes text[]` es aparte de los atributos, porque la talla sí afecta al carrito.
- `order_items` congela `name`, `unit_price`, `size` y `attributes_snapshot`.
  `product_id` nullable con `on delete set null`: si el producto cambia de precio o se borra,
  el pedido histórico sigue mostrando lo que el cliente compró.
- `orders.number` es correlativo visible (#1041), independiente del `id`.

## 7. Pantallas — especificación

Todas las medidas son a 1440px de ancho. Contenedor: `max-width: 1360px; padding: 0 32px`.

### 7.1 Header (global, sticky)
Altura 74px, `bg rgba(10,10,10,.92)` + `backdrop-blur`, borde inferior `line`.
Izquierda: escudo 34×40 + wordmark Anton 22px skew -7° ("GUANTE" en `brand`, "ARQUEROS" en `content`).
Centro: nav de categorías, Manrope 700 12.5px uppercase letter-spacing .06em, hover naranja con
borde inferior de 2px; ítem "DREI" con cuadrito `drei-line` de 7px y hover azul.
Derecha: botón de búsqueda 40×40 (icono, abre overlay de búsqueda) + botón CARRITO naranja con
contador en cuadro negro. El nav debe encogerse/envolverse antes que salirse: nada de scroll horizontal.

### 7.2 Franja de campaña
42px de alto, fondo de franjas diagonales, marquee de 26s en loop con el texto de campaña
("DESCUENTOS EN TODA LA TIENDA" / "ENVÍOS A TODA BOLIVIA") en Anton 17px sobre cuadro negro,
skew -7°. Debe poder apagarse desde el admin (flag de campaña).

### 7.3 Home
- **Hero**, grid `1.05fr 0.95fr`, padding `72px 32px 40px`.
  Izquierda: eyebrow con borde naranja ("TEMPORADA 2026 · BOLIVIA"), H1 display-xl a dos líneas
  (segunda línea en `brand` con `text-shadow: 0 0 44px rgba(250,42,0,.45)`), párrafo `muted`
  máx. 460px, dos CTA (primario con corte diagonal, secundario con borde), y tres cifras
  (6 marcas / 24h Cochabamba / 9 departamentos) sobre borde superior.
  Derecha: imagen cuadrada con `clip-path` de esquinas cortadas, glow naranja detrás,
  degradado inferior y badge rojo "HASTA 30% OFF" skew -7°.
- **Categorías**: grid `repeat(auto-fit, minmax(180px,1fr))`, cards de 260px con imagen al 55%
  de opacidad, degradado, nombre en Anton 24px y contador de productos en naranja.
- **Franja de marcas**: fila con las 6 marcas en Anton 22px `#4A4845`, hover a blanco.
- **Destacados**: grid de 4, card con imagen 1:1, badge de descuento, banda roja de
  "Últimas N unidades" si `stock <= 5`, marca en label, nombre 15px/700, precio Anton 26px naranja
  y precio anterior tachado. Hover: borde naranja + `shadow-card`.
- **Bloque DREI**: grid `1fr .8fr`, fondo `linear-gradient(100deg, #10233A, #0D0D0C 62%)`,
  borde `#234666`, tag "SUB-MARCA", título Anton 56px skew -9°, CTA con borde `drei-line`.

### 7.4 Listado de categoría
Breadcrumb en label; H1 display-lg; contador de resultados.
Grid `258px 1fr`. Sidebar sticky (top 132px) con: marcas (checkbox cuadrado 15px que se llena de
naranja), tallas (chips de 40px, activo con borde naranja y fondo naranja al 12%), y precio máximo
(range con `accent-color: #FA2A00`). Grilla de productos de 3 columnas, imagen 4:3, tag azul
"DREI" arriba a la derecha cuando la marca es DREI. Estado vacío: caja con borde punteado.

### 7.5 Ficha de producto
Grid `1.05fr .95fr`. Izquierda: imagen 1:1 con badge de descuento en Anton 22px y 4 thumbs
(activo con borde naranja, inactivos al 55% de opacidad). Derecha: marca en label naranja + SKU,
H1 Anton 52px skew -6°, precio Anton 56px naranja + anterior tachado 20px, aviso de stock bajo
(borde izquierdo rojo de 3px, cuadrito que pulsa, texto `alert-soft`), descripción,
selector de talla (chips de 54px, activo = fondo naranja con texto negro), stepper de cantidad +
CTA "AGREGAR AL CARRITO" a ancho completo con corte diagonal, tabla de **atributos** (grid
`190px 1fr`, una fila por atributo manual) y dos cajas de envío (retiro / envío nacional).
Al agregar: se abre el drawer y aparece un toast blanco con corte diagonal, 2.2s.

### 7.6 Carrito lateral (drawer)
456px, entra desde la derecha en 220 ms, backdrop `rgba(4,4,4,.72)` con blur.
Ítems: thumb de 76px, marca en label, nombre 14px/700, variante (talla), stepper de cantidad,
"Quitar" (hover rojo), total de línea en Anton 19px naranja.
Pie fijo: subtotal en Anton 30px naranja, resumen de entrega, CTA principal.

### 7.7 Checkout paso 1 — Envío (dentro del drawer)
Campos siempre visibles: **Nombre*, Teléfono/WhatsApp*, Nota** (opcional).
Toggle de modalidad: dos cards lado a lado, "Retiro en el local" (por defecto) y
"Envío a domicilio"; la activa lleva borde naranja + fondo naranja al 9% + texto naranja.

Ramificación:
- **Retiro**: no pide nada más.
- **Envío** → select de departamento (Cochabamba, La Paz, El Alto, Santa Cruz, Oruro, Potosí,
  Chuquisaca, Tarija, Beni, Pando).
  - **Cochabamba** (región local, logística propia): aviso con borde naranja, **Dirección*** y
    **ubicación en mapa***. El mapa es un componente propio de 190px de alto, base oscura con
    grilla (`grid-map`), **pin naranja de marca** (`clip-path` de gota, glow naranja) — nunca el
    pin rojo por defecto de Google. Dos botones: "Usar mi ubicación" y "Pegar link Maps".
    Estado confirmado: barra verde `ok` con las coordenadas. Estado de error: overlay oscuro con
    texto rojo y botón "Marcar manualmente".
  - **Otro departamento** (despacho por transporte): aviso azul DREI explicando que el transporte
    se coordina aparte, **CI/documento*** y **email***.

Al enviar: **modal de confirmación** con resumen (cantidad de ítems, total, modalidad/departamento,
cliente) y dos acciones, "Volver" y "Sí, confirmar".
Al confirmar: `POST /api/orders` crea la orden en estado `recibido` y guarda el `orderId` en
sesión; recién entonces se navega al paso 2. Si el usuario vuelve al paso 1 y reenvía en la misma
sesión, `PATCH /api/orders/[id]` **actualiza la orden existente**, no crea otra.
Si el guardado falla: se muestra el error y no se avanza.

### 7.8 Checkout paso 2 — Pago (YoPago)
Stepper Envío → Pago → Confirmación (número en cuadro naranja cuando está cumplido).
Botón "← Volver a envío" arriba, que **no pierde** la orden creada.
Grid `7fr 5fr` en desktop, una columna apilada en mobile con el resumen **debajo**.
Izquierda: dos cards de método (QR simple / Tarjeta), activa con borde + fondo naranja tenue;
badge verde fijo "Pago seguro SSL" con escudo. Al elegir método se genera el pago
**automáticamente**, sin botón extra: placeholder con spinner y texto "Generando pago de Bs X…".
Resultado QR: centrado, 192px en mobile / 256px en desktop, con el TX ID debajo.
Resultado tarjeta: iframe de la pasarela con alto `min(70dvh, 500px)`.
Derecha (sticky, top 132px): resumen del pedido con ítems y total en Anton 34px naranja (sin campo
de descuento acá), aviso persistente con spinner "Esperando confirmación de pago… no cierres esta
ventana", y botón secundario "¿Problemas con el pago? Contactar soporte" que abre un modal con
email copiable al portapapeles y WhatsApp con el número de pedido precargado.
El estado se consulta por **polling** cada 4s a `/api/orders/[id]`; el webhook de YoPago es la
fuente de verdad. Al confirmarse: avanza solo al paso 3, limpia el carrito y hace scroll al inicio.

### 7.9 Checkout paso 3 — Confirmación
Check grande de 96px con `clip-shield` naranja, "¡Gracias por tu compra!" en Anton 58px,
número de pedido en badge naranja skew -8°, párrafo con la modalidad de entrega,
card "¿Necesitás ayuda?" con el mismo modal de soporte, y botón grande "Volver a la tienda".

**Responsivo en los 3 pasos**: mobile una sola columna, resumen debajo del formulario/pago,
inputs y botones a ancho completo, sin alturas fijas que no se adapten al viewport.

### 7.10 Footer (global)
Franja diagonal de 8px arriba. Grid `1.4fr 1fr 1fr 1fr`: wordmark + descripción, y tres columnas
(Tienda / Ayuda / Marcas). Barra inferior con copyright y "Pagos vía YoPago · Bs".

### 7.11 Panel admin
Mismo lenguaje de marca, **más densidad y menos impacto**: base gris oscura (`#0F0F0E`),
naranja reservado para acción y estado activo. Tipografía de tabla 13–13.5px, filas de ~44px.

- **Login** (`/admin/login`): card de 400px centrado sobre fade cálido, escudo + wordmark,
  usuario y contraseña, CTA naranja, y la URL del panel como pie.
- **Sidebar** 234px: escudo + wordmark + "ADMIN", ítems Resumen / Categorías / Productos / Pedidos
  (activo con barra naranja de 2px a la izquierda y fondo `#171716`), badges de conteo,
  pie con usuario, rol y "Salir".
- **Topbar** 62px sticky: título de sección en Anton 20px, subtítulo, buscador y
  botón naranja "+ Nuevo producto".
- **Resumen**: 4 KPIs (ventas del mes, pedidos, ticket promedio, stock crítico) con valor en
  Anton 34px y delta coloreada; gráfica de ventas por semana (12 barras, la última en naranja,
  el resto `#3A3A38`); "Pedidos por estado" con barra apilada + leyenda; tabla "Más vendidos"
  con ranking, barra de progreso naranja y unidades.
- **Categorías**: tabla con nombre + slug, chips de subcategorías, conteo de productos y acciones;
  panel lateral de 320px "Nueva categoría" con nombre, categoría padre (opcional) y orden.
- **Productos**: chips de filtro por categoría; tabla `52px 2fr 1fr 1fr 90px 100px 70px` con
  thumb, nombre + SKU + "N atributos", categoría, marca, stock (rojo si ≤5), precio y "Editar".
- **Formulario de producto** (modal de 860px): nombre, categoría + subcategoría, precio /
  precio anterior / stock, descripción, y el bloque **"Atributos manuales"** — filas
  `1fr 1.4fr 34px` de dos inputs libres (nombre y valor) más botón de eliminar, y un
  "+ Atributo" que agrega una fila vacía. Placeholders: "Color" / "Blanco con líneas negras".
  Columna derecha: dropzone de Cloudinary con grilla de 4 miniaturas (la primera marcada
  "PRINCIPAL"), select de marca, toggles "Publicado en la tienda" y "Destacado en home",
  y guardar/cancelar.
- **Pedidos**: chips de filtro por estado; tabla `70px 1.4fr 1.2fr 130px 110px 100px 70px` con
  número en Anton naranja, cliente + teléfono, modalidad de entrega, estado como badge coloreado,
  total, fecha y "Ver →".
- **Detalle de pedido** (drawer de 560px): bloques Cliente, Entrega (con los campos condicionales
  que correspondan — dirección + mapa clickeable si es Cochabamba, CI + email si es otro
  departamento), Ítems con **precio congelado**, total en Anton 30px naranja, y control de estado
  con 4 opciones (`recibido → en_proceso → completado`, o `cancelado`), la activa con el color
  de su estado. Nota visible de que la notificación WhatsApp/email queda para etapa posterior.

## 8. Estado, interacciones y estados de error

- **Carrito**: `{ productId, name, unitPrice, size, qty, imagePublicId }[]` en context +
  `localStorage`; el drawer tiene dos pasos (`items` | `shipping`).
- **Checkout**: `orderId` en sesión para no duplicar órdenes; `paymentMethod`,
  `paymentLoading`, `paymentStatus` con polling; la orden vive en el server, no en el cliente.
- **Formularios**: validación con Zod al blur y al enviar. Obligatorios según modalidad
  (ver 7.7). Error de campo: borde `alert` + mensaje 12px `alert-soft` debajo.
- **Geolocalización**: si el permiso falla o expira → estado de error del mapa con las dos
  alternativas (marcar manual o pegar link). Nunca dejar al usuario sin salida.
- **Loading**: spinner de 30px con borde superior naranja; skeletons en la grilla de productos.
- **Toast** de "Agregado al carrito": 2.2s, blanco sobre negro, corte diagonal, abajo a la derecha.
- **Transiciones**: hover 150 ms, drawer/modal 200–250 ms, marquee 26s lineal.
- **Responsive**: 1 columna bajo 640px, 2 en la grilla de productos, drawer a ancho completo,
  hit targets mínimos de 44px.

## 9. Assets de marca

El dueño te pasa los archivos originales. Ubicación y uso:

```
public/brand/
  escudo-guantearqueros.svg      # escudo naranja con la "G" — favicon, header, admin, mapa
  wordmark-guantearqueros.svg    # "GuanteArqueros" (G naranja, resto blanco) — header y footer
  drei-athletic.svg              # wordmark DREI — SOLO en la sección/categoría DREI
  og-image.jpg                   # 1200×630 para redes
```

Reglas:
- Si el logo llega en PNG, pedí o generá una versión SVG; si no hay, usá el PNG a 2× y
  `next/image` con `priority` en el header.
- En los prototipos el escudo y el wordmark están **simulados con CSS** (clip-path + Anton).
  Reemplazalos por los archivos reales manteniendo el mismo tamaño óptico:
  escudo 34×40 en el header, 24×29 en el sidebar del admin.
- El wordmark real reemplaza el texto CSS; no re-tipografíes el logo.
- Zona de respeto mínima alrededor del logo = altura de la "G".
- El logo de DREI **no** va en el header global: solo como identificador de su categoría.
- Fotografía de producto: fondo oscuro, producto centrado, alto contraste. En los prototipos hay
  imágenes de placeholder de internet; en producción **todas** las imágenes salen de Cloudinary.

## 10. Cloudinary

- Carpeta `guantearqueros/productos/<slug>`.
- Subida directa desde el browser con **firma generada en el server**
  (`POST /api/admin/upload-signature`); la API secret nunca se expone al cliente.
- Se guarda solo el `public_id`. Transformaciones:
  grilla `f_auto,q_auto,c_fill,w_600,h_450` · ficha `f_auto,q_auto,c_fill,w_1200,h_1200` ·
  thumb `f_auto,q_auto,c_fill,w_120,h_120`.
- Env vars: `CLOUDINARY_CLOUD_NAME=dvbtbadg1`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dvbtbadg1`.
  **Rotá la API secret antes de producción** (fue compartida en un chat).

## 11. Fuera de alcance en esta etapa

- **Notificación al negocio** (WhatsApp/email al crearse un pedido): dejá el punto de integración
  marcado en `lib/notify.ts` con `notifyNewOrder(order)`, llamado después del commit del pedido
  y del webhook de pago, y el campo `orders.notified_at` sin usar. **No la implementes.**
- Cuentas de cliente / login público: el checkout es de invitado.
- Cupones y descuentos por código (el campo no va en el resumen del paso 2).
- Multi-idioma y multi-moneda: solo español boliviano y Bs (BOB).

## 12. Orden de trabajo sugerido

1. `create-next-app` + Tailwind con `tailwind.config.ts` de este bundle + fuentes Anton/Manrope
   vía `next/font`, y los primitivos de `components/ui` (Button, Input, Select, Badge, Chip,
   Toggle, Modal, Drawer) siguiendo el Design System.
2. Drizzle + `schema.ts` + migración + `seed.ts` (categorías y marcas).
3. Layout público: header, franja de campaña, footer.
4. Home con datos reales de la DB.
5. Listado de categoría con filtros y ficha de producto.
6. Carrito (context + localStorage) y drawer.
7. Checkout paso 1 con toda la ramificación y el selector de ubicación.
8. `/api/orders` (crear/actualizar) y paso 2 con YoPago en modo sandbox + polling + webhook.
9. Paso 3 y modal de soporte.
10. Admin: login + middleware, resumen, categorías, productos (con atributos manuales y
    Cloudinary), pedidos con detalle y cambio de estado.
11. Metadata/SEO, JSON-LD `Product`, `noindex` en `/admin`, deploy en Vercel.

Hacé commits por bloque y andá pidiendo revisión al terminar cada punto.

## 13. Archivos de este bundle

| Archivo | Qué es |
|---|---|
| `README.md` | Este documento — la especificación completa |
| `ARQUITECTURA.md` | Stack, árbol de carpetas, rutas, API, flujo de checkout, Cloudinary |
| `Design System.dc.html` | Tokens, tipografía, componentes y reglas de uso (abrir en el navegador) |
| `Guantearqueros Tienda.dc.html` | Prototipo de la tienda pública, incluyendo los 3 pasos del checkout |
| `Guantearqueros Admin.dc.html` | Prototipo del panel admin (login, resumen, categorías, productos, pedidos) |
| `code/tailwind.config.ts` | Tokens listos para usar |
| `code/db/schema.ts` | Esquema Drizzle |
| `code/db/seed.ts` | Seed de categorías, subcategorías y marcas |

Cómo navegar los prototipos: la tienda arranca en la home; el header lleva a las categorías,
las cards a la ficha, "Agregar al carrito" abre el drawer, "Continuar" muestra el formulario de
envío (probá los dos modos y Cochabamba vs. otro departamento) y "Sí, confirmar" lleva al pago;
en el pago, el link "demo: simular pago confirmado" avanza al paso 3.
En el admin, el login entra con cualquier valor y la fila de un pedido abre su detalle.

# Análisis del proyecto Guante Arqueros Bolivia

Revisión del código: 23 de septiembre de 2026. Este documento describe el estado actual del repositorio; los prototipos de `referencias/handoff/` son antecedentes de diseño. No contiene credenciales, valores de configuración privados ni datos de clientes.

## Arquitectura

Una aplicación Next.js 15 con App Router, React 19 y TypeScript sirve la tienda, el panel y los endpoints HTTP. PostgreSQL usa Drizzle ORM y un pool `postgres.js` por proceso. Tailwind CSS y componentes propios forman la interfaz. ImageKit almacena imágenes; Leaflet/OpenStreetMap muestran ubicaciones. Netlify ejecuta el build con Node 22.

| Módulo | Responsabilidad |
|---|---|
| `src/app/(shop)` y `src/components/shop` | Portada, catálogo, ficha, carrito y checkout |
| `src/app/admin`, `src/components/admin`, `src/app/admin/actions.ts` | Panel, formularios y escrituras autenticadas |
| `src/app/api` | Cotización, pedidos, búsqueda, imágenes y pagos |
| `src/db/schema.ts`, `src/db/queries` | Once tablas, consultas y transacciones |
| `src/lib` | Sesiones, validación, precios, imágenes y adaptador YoPago |
| `drizzle/` | Veinte migraciones SQL, de `0000` a `0019` |

Las once tablas son `admin_users`, `login_attempts`, `brands`, `categories`, `products`, `product_images`, `orders`, `order_items`, `payment_attempts`, `payment_events` y `site_settings`. Categorías y subcategorías comparten tabla. El stock es por producto y no por talla. Los ítems del pedido conservan nombre, precio, imagen y atributos aunque después cambie o se elimine el producto.

## Flujos vigentes

La tienda muestra portada configurable, categorías, filtros, búsqueda, fichas y sección DREI. El carrito usa `localStorage`; el pedido activo de cada pestaña usa `sessionStorage`. La cotización de `POST /api/orders/quote` valida cliente e ítems y calcula precios, envío y descuento en el servidor. `POST` o `PATCH /api/orders` vuelven a verificar datos y precio, y la creación usa una clave idempotente. La cookie de comprador firmada autoriza un conjunto limitado de pedidos. La confirmación exige pago aprobado.

Las ciudades con sucursal son La Paz, Santa Cruz y Cochabamba. Permiten retiro o entrega local con ubicación. Para destinos sin sucursal se solicitan los datos de documento y contacto previstos en `src/lib/validators.ts`; la empresa de transporte se coordina posteriormente. Los ajustes de checkout se leen de la base y un fallo de lectura no se reemplaza con tarifas predeterminadas durante el cobro.

El panel permite gestionar productos, marcas, categorías, imágenes, pedidos, portada y ajustes. Las cookies administrativas y de pedido tienen propósitos y firmas separados. Las acciones verifican la sesión contra PostgreSQL; cambiar la contraseña revoca sesiones anteriores. El rol `superadmin` tiene un área limitada para restablecer la contraseña administrativa.

YoPago genera QR o URL de tarjeta en el servidor. `payment_attempts` conserva cada intento y `payment_events` conserva callbacks autenticados. El callback vincula el cobro mediante `transactionId` y `companyCode`, confirma dinero y actualiza inventario de forma transaccional e idempotente. Si el cobro llega sin stock suficiente, el pedido queda pagado en `paid_inventory_review` para revisión manual. El retorno del navegador no confirma pagos. No existe un simulador público. Consulta `INTEGRACION_PAGOS.md` antes de cambiar este flujo.

## Límites y puntos de mantenimiento

- El contrato completo, la firma adicional y la conciliación automática de YoPago requieren confirmación con el proveedor. El callback actual no recibe importe o moneda verificable en su cuerpo. Las pruebas de PGlite no sustituyen pruebas concurrentes con PostgreSQL real.
- Abandonar un pago solo modifica el estado local; no cancela la transacción externa. No hay reserva de stock, reembolso automatizado ni reposición automática.
- `src/lib/notify.ts` solo registra mensajes. No envía correo o WhatsApp ni emite facturas fiscales.
- La página DREI depende del slug `poleras` y del nombre de marca `DREI`. Renombrarlos requiere cambiar las consultas y la navegación.
- Las rutas de imagen guardadas en la base se resuelven contra `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`. Cambiar de cuenta ImageKit no mueve los archivos anteriores: hay que migrarlos o conservar URLs absolutas de origen. La clave privada solo pertenece a `.env.local` o al gestor de secretos del despliegue.
- Las páginas públicas usan caché de cinco minutos e invalidación al editar catálogo o confirmar pago. Algunas listas siguen paginando en cliente. La latencia de la base y la ubicación regional del despliegue influyen en el rendimiento.
- `scripts/verify-sql.ts` aplica las 20 migraciones, pero su comprobación explícita de tablas todavía no incluye las dos tablas de pagos.
- `npm run build` puede consultar PostgreSQL para generar páginas. Si la base no está accesible, el fallback público puede producir páginas vacías o el build puede agotar el tiempo de espera.

## Verificación local de esta revisión

Pasaron `npm run typecheck`, `npm run lint`, `npm run verify:sql` y `npm run verify:checkout`. Tras restaurarse el acceso a PostgreSQL, `npm run build` completó la generación de 36 páginas con datos de la base. El seed normal dejó listas categorías, marcas y la secuencia de pedidos sin cargar productos de demostración; se crearon las cuentas `admin` y `superadmin` con hash Argon2id y roles separados. No se ejecutaron migraciones, cobros ni cambios en pedidos. No se probaron subidas reales a ImageKit, callbacks reales de YoPago ni el despliegue remoto.

Esta base contiene las once tablas esperadas, pero no se encontró una tabla de historial de migraciones de Drizzle. Antes de ejecutar `db:migrate` sobre ella, hay que conciliar su esquema con el historial local para evitar reintentar migraciones ya aplicadas por otro método.

## Mapa para modificaciones

| Cambio | Revisar juntos |
|---|---|
| Portada o diseño | `src/app/(shop)/page.tsx`, componentes de tienda, `globals.css`, Tailwind |
| Categorías o DREI | `CategoryView`, navegación, `src/db/queries/catalog.ts`, acciones y slugs |
| Productos o imágenes | Formulario, validadores, esquema, acciones, carrito, `src/lib/images.ts` |
| Envío o descuento | Formulario, ajustes, validadores, cálculo de pedidos y resumen de pago |
| Pago o inventario | Adaptador YoPago, rutas de pago, `src/db/queries/payments.ts`, esquema y migraciones |
| Autenticación | `src/lib/session.ts`, `admin-auth.ts`, middleware y consumidores de cookies |
| Esquema de datos | Nueva migración, consultas, seed y verificadores |

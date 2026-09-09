# Análisis del proyecto Guantearqueros Bolivia

Fecha: 9 de septiembre de 2026. Revisión de arquitectura, código, configuración, documentación y verificaciones locales. No se modificó la implementación ni se ejecutaron migraciones o semillas sobre la base configurada.

## Correcciones posteriores al análisis

Este informe conserva el diagnóstico inicial como referencia histórica. Los siguientes puntos ya fueron corregidos en el código; no deben interpretarse como fallos vigentes:

- Sesiones separadas por propósito y validación de payload, con rechazo de cookies anteriores. El administrador también se verifica contra el usuario y la versión de sesión en PostgreSQL.
- Límite de login persistente y atómico en lugar de memoria por instancia. Cambiar la contraseña invalida sesiones anteriores.
- Cotización firmada del servidor, confirmación explícita del importe y rechazo de cambios de precios/datos antes de guardar.
- Creación idempotente mediante UUID y bloqueo transaccional; desglose de envío y descuento congelado. Los pedidos antiguos conservan total sin reconstruir el desglose desconocido.
- Selección explícita de pedido en pago/confirmación; la confirmación exige pago aprobado.
- Intentos del simulador identificados, edición bloqueada durante pago, invalidación al volver a envío y pago/stock atómicos con rollback completo ante falta de unidades.
- Sin vuelta automática a sandbox cuando faltan credenciales. Simulación en producción requiere habilitación explícita. El webhook live permanece cerrado hasta la integración real.
- Transiciones operativas protegidas y buscador de pedidos corregido para consultas por nombre.
- README y handoffs actualizados para distinguir implementación vigente de referencias históricas.

Migración nueva: `0013_checkout_security.sql`, aditiva, verificada en PGlite y aplicada a la base PostgreSQL de nube configurada el 9 de septiembre de 2026.

Siguen pendientes la integración oficial de YoPago, reservas y conciliación de cobros externos, reembolsos, notificaciones y los puntos de rendimiento/diseño no incluidos en esta corrección. Ver [INTEGRACION_PAGOS.md](INTEGRACION_PAGOS.md).

Verificaciones de esta corrección: TypeScript, ESLint, el build de producción con 88 rutas, 14 migraciones SQL y las regresiones de seguridad/checkout pasaron. La migración se aplicó a la base de nube; no se hicieron cobros ni pruebas de carga sobre ella.

---

## Arquitectura y alcance actual

Aplicación única con tienda pública y panel administrativo. Next.js 15.5.23 con App Router, React 19, TypeScript estricto y Tailwind CSS 3. PostgreSQL mediante Drizzle ORM y postgres.js. No hay backend separado ni cuentas de compradores: el checkout es de invitado.

| Capa | Ubicación | Responsabilidad |
|---|---|---|
| Tienda | `src/app/(shop)` | Inicio, categorías, subcategorías, DREI, producto y checkout |
| Panel | `src/app/admin` | Login, resumen, productos, categorías, marcas, pedidos, inicio y ajustes |
| HTTP | `src/app/api` | Búsqueda, carrito, descuentos, pedidos, pagos y consultas administrativas |
| Escrituras del panel | `src/app/admin/actions.ts` | Validación, autorización, persistencia y revalidación |
| Componentes | `src/components/{shop,admin,ui,brand}` | Interacciones, formularios y sistema visual |
| Datos | `src/db/schema.ts`, `src/db/queries` | Modelo y consultas de catálogo, pedidos, ajustes y dashboard |
| Reglas compartidas | `src/lib` | Validaciones, dinero, sesiones, imágenes, negocio y adaptador de pagos |
| Evolución de datos | `drizzle` | 13 migraciones SQL, desde 0000 hasta 0012 |
| Referencias | `referencias/handoff` | Prototipos de tienda, panel y sistema de diseño; especificación inicial |

La portada incluye carrusel de ofertas o novedades configurable, categorías con imágenes, catálogo paginado, bloque DREI, contacto y sucursales. Las categorías usan URLs `/{categoria}` y `/{categoria}/{sub}`; también existen rutas heredadas bajo `/c`. Las fichas están en `/p/{slug}`. Ofertas y Nuevos son categorías del sistema, calculadas a partir de los productos.

El catálogo permite marcas, tallas, atributos libres, personalización, imágenes ordenadas, precio anterior, publicación, destacado y novedad. Los filtros de categoría usan parámetros de URL para marca, talla y precio. DREI tiene identidad propia dentro de la tienda y protección especial en la administración.

El panel permite administrar catálogo, orden de categorías y marcas, imágenes con recorte, tarifas de envío, códigos de descuento y portada. Los pedidos cuentan con filtros, calendario, detalle, ubicación y estados operativos. El dashboard consulta ventas, inventario, distribución de pedidos y productos/categorías más vendidos.

## Datos y flujo de compra

Ocho tablas: `admin_users`, `brands`, `categories`, `products`, `product_images`, `orders`, `order_items` y `site_settings`. Categorías y subcategorías comparten tabla mediante `parent_id`. Tallas son un array de texto; atributos y ajustes usan JSONB. El inventario es por producto, no por talla.

Los ítems del pedido conservan nombre, precio, talla, imagen y atributos. Borrar un producto deja `product_id` en NULL y conserva el historial. El número comercial proviene de `orders_number_seq`, creada por el seed. Los estados de pedido y pago son independientes.

1. `CartProvider` conserva el carrito en localStorage y el identificador de pedido en sessionStorage; sincroniza el carrito entre pestañas.
2. `/checkout/envio` recoge cliente, entrega y datos de factura. La Paz es la región local actual: retiro o domicilio con coordenadas; otros destinos requieren CI y correo.
3. `ConfirmOrderModal` crea el pedido con POST o actualiza el existente con PATCH a `/api/orders`.
4. El servidor valida con Zod, lee precios y stock reales, calcula envío/descuento y guarda pedido e ítems en una transacción.
5. Una cookie firmada `gq_order` autoriza hasta diez pedidos de la sesión. Pago y confirmación seleccionan el último de esa lista.
6. `/checkout/pago` genera un intento QR o tarjeta. El cliente consulta el estado cada cuatro segundos.
7. El webhook actualiza el pago y descuenta stock. La interfaz avanza a confirmación y limpia el carrito.

## Integraciones, diseño y operación

- ImageKit: subida directa autenticada, firma desde endpoint administrativo y transformaciones por contexto. Quitar una imagen de la aplicación no implementa su borrado remoto.
- YoPago: simulador funcional y adaptador live provisional. El propio archivo `src/lib/yopago.ts` indica que endpoints y campos aún deben contrastarse con el contrato del proveedor.
- Mapas: Leaflet con tiles de OpenStreetMap para elegir/ver ubicación; Google Maps en enlaces e incrustaciones de sucursales. Los enlaces cortos de Maps no se resuelven: el parser necesita coordenadas en el texto.
- Notificaciones: `src/lib/notify.ts` solo registra mensajes; no envía WhatsApp ni correo. Solicitar factura únicamente guarda los datos correspondientes.
- Diseño: componentes propios, base oscura, naranja principal, acento azul DREI, tipografía Anton local y Manrope mediante `next/font/google`. Hay modales, drawers, control de foco, toasts y reglas responsive. No se verificó visualmente la fidelidad en navegador.
- SEO: metadata, canonical, JSON-LD de producto con escape de `<`, sitemap, Open Graph y exclusión del panel/checkout. Algunas descripciones aún mencionan retiro en Cochabamba.
- Renderizado: revalidación de 300 segundos en diversas rutas públicas, páginas dinámicas para checkout y panel. Las acciones del panel invalidan rutas; el webhook no invalida el catálogo tras descontar stock.
- Despliegue: configuración para Netlify y Node 22; artefactos separados `.next-dev` y `.next`. Pool PostgreSQL reutilizado por proceso, con límite menor durante build.

## Hallazgos prioritarios de la revisión de código

Estos hallazgos se derivan del código; no se realizaron ataques contra un despliegue ni cobros reales. Además, una comprobación local en memoria con una clave aleatoria confirmó que el verificador acepta un token de pedido sin `uid` ni `role`; no se usaron credenciales reales para esa comprobación.

| Prioridad | Hallazgo y efecto | Código relevante |
|---|---|---|
| Crítica | Confusión entre tipos de sesión. Las cookies de pedido y administrador usan la misma clave y `verifyToken` solo comprueba firma y expiración. El genérico TypeScript no valida el payload en ejecución. Un token válido de pedido presentado como cookie administrativa puede superar las comprobaciones que solo requieren una sesión no nula. | `src/lib/session.ts`, `src/lib/admin-auth.ts`, `src/middleware.ts` |
| Crítica si el simulador queda expuesto | `isSandbox()` vuelve a simulación incluso con modo live si falta API_URL. En sandbox el webhook acepta cualquier firma y puede modificar pedidos por número sin sesión de comprador. El endpoint de simulación también queda disponible, aunque exige la cookie del pedido. | `src/lib/yopago.ts`, `src/app/api/payments/yopago/webhook/route.ts`, `simulate/route.ts` |
| Alta | La idempotencia del pago no es atómica: se lee estado, se marca pagado y luego se descuenta inventario en operaciones separadas. Dos callbacks concurrentes pueden descontar dos veces; un fallo intermedio puede dejar un pago confirmado sin descontar stock. | Webhook, simulador y `src/db/queries/orders.ts` |
| Alta | No se comprueban importe, moneda ni correspondencia con el intento vigente en el webhook. Estados tardíos pueden sobrescribir pagado. El pedido se puede editar mientras existe un intento anterior, sin invalidarlo. | Rutas de pagos, `updateOrder`, `markPayment` |
| Alta | No hay reserva de inventario ni descuento condicionado a stock suficiente al confirmar. Dos compras pueden pagar las últimas unidades; `GREATEST(0, stock - cantidad)` evita negativos pero oculta la sobreventa. | `priceLines`, `decrementStockFor` |
| Alta | La página de confirmación solo verifica pertenencia/existencia del pedido; no exige pago confirmado. Se puede mostrar el paso final para un pedido pendiente y ejecutar la limpieza del carrito. | `src/app/(shop)/checkout/confirmacion/page.tsx`, `ConfirmationView.tsx` |
| Media | Envío, descuento y código aplicado no se congelan en columnas del pedido. La pantalla de pago reconstruye el envío con los ajustes actuales e infiere el descuento; cambiar tarifas altera el desglose de pedidos existentes. | `src/db/schema.ts`, `createOrder`, `src/app/(shop)/checkout/pago/page.tsx` |
| Media | La revisión previa al pago usa precios del carrito almacenado; el refresh solo actualiza imágenes. Si un precio cambia, el total que confirma el cliente puede diferir del total recalculado y cobrado por el servidor. | `ShippingCheckout.tsx`, `ConfirmOrderModal.tsx`, `CartProvider.tsx` |
| Media | La creación no tiene clave de idempotencia en servidor. PATCH evita duplicar en el camino normal, pero reintentar POST tras perder una respuesta puede crear otro pedido. Varias pestañas también pueden desalinear el pedido local y el último pedido de la cookie. | `/api/orders`, `CartProvider.tsx`, páginas de pago/confirmación |
| Media | Las transiciones operativas se aceptan sin reglas sobre estado previo o pago. Generar un intento tampoco rechaza explícitamente pedidos cancelados. No hay reposición automática de stock por cancelación/reembolso. | `setOrderStatus`, ruta de creación de pago |
| Media | El límite de intentos de login vive en memoria y por usuario: no es compartido entre instancias. La sesión no consulta revocación ni estado del usuario en cada autorización. | `src/app/admin/login/actions.ts`, `src/lib/admin-auth.ts` |

La primera corrección de seguridad debería separar y validar los tipos de token, no limitarse a cambiar sus nombres de cookie. El cierre de pagos necesita una operación transaccional con control de transiciones, identidad del intento y política explícita de inventario.

## Mantenimiento y crecimiento

El buscador de pedidos tiene un fallo concreto: al buscar solo letras, el término convertido a dígitos queda vacío y `telefono.includes("")` resulta verdadero; por tanto puede devolver todos los pedidos en lugar de filtrar por cliente. Además, `/drei` fija la categoría `poleras` y el nombre de marca `DREI`: renombrar la marca desde el panel o ubicar productos DREI en otras categorías puede dejar fuera productos de esa sección.

La paginación de portada ocurre en SQL, pero las categorías y varias tablas del panel cargan todos los resultados y paginan en cliente. El dashboard ejecuta numerosas consultas secuenciales. Faltan índices específicos para algunas relaciones consultadas frecuentemente, como `order_items.order_id` y `product_images.product_id`; su impacto debe medirse con volumen real.

Las métricas mensuales/semanales dependen de la zona horaria del servidor/base, mientras el calendario diario fuerza `America/La_Paz`. Los rankings por ítem usan precio bruto y no distribuyen descuentos; por ello no deben interpretarse como desglose exacto del total neto cobrado.

Desactivar una marca o categoría no aplica automáticamente una regla global de ocultación a sus productos: búsqueda, ficha y catálogo general filtran principalmente `published`. Es necesario definir si desactivar significa ocultar navegación o retirar productos de venta.

`withFallback` mantiene la tienda visible ante errores de lectura, pero puede presentar un catálogo vacío. También se usa al consultar ajustes de checkout: una lectura fallida puede sustituir tarifas/descuentos por valores predeterminados durante el cálculo de una orden. Conviene separar la tolerancia de presentación de las lecturas necesarias para cobrar.

La documentación contiene diferencias con la implementación: cupones ya existen; mapas usan servicios externos; la región local es La Paz; las cookies admiten varios pedidos; el PATCH está en `/api/orders`; los directorios de build/desarrollo ya están separados. Los prototipos describen el diseño inicial, no todo el comportamiento actual.

## Verificación y límites

- `npm run typecheck`: pasó.
- `npm run lint`: pasó sin errores ni advertencias de código; el comando anunció la deprecación de `next lint`.
- `npm run verify:sql`: pasó las 13 migraciones en PGlite, existencia de ocho tablas, secuencia, datos mínimos, snapshots, unicidad de número y conservación del historial al borrar producto.
- El verificador SQL utiliza datos de prueba propios; no ejecuta el seed completo ni los endpoints reales. No constituye una prueba del checkout, concurrencia ni autorización.
- `npm run build`: pasó y generó 86 páginas estáticas con acceso a PostgreSQL. La primera ejecución dentro del sandbox también compiló, pero recibió EACCES en lecturas de base y generó contenido de respaldo; se repitió fuera del sandbox y completó sin esos errores.
- No se ejecutaron pruebas visuales/E2E, pagos live, subidas reales a ImageKit ni pruebas de carga. No se verificó el despliegue remoto ni la vigencia contractual de las integraciones.

## Mapa para los próximos cambios

| Cambio | Archivos o módulos que deben revisarse juntos |
|---|---|
| Portada/estilo | `src/app/(shop)/page.tsx`, componentes shop, `globals.css`, `tailwind.config.ts` |
| Navegación/categorías | `CategoryView`, filtros, header/menú, consultas de catálogo, acciones administrativas y slugs |
| Productos/variantes | `ProductForm`, validadores, esquema, acciones, `AddToCart`, carrito y snapshots de pedido |
| Envíos/descuentos | `ShippingForm`, `ShippingCheckout`, ajustes, validadores, cálculo de pedidos y resumen de pago |
| Pagos/inventario | Adaptador YoPago, rutas de pago/webhook, consultas de pedidos y `PaymentClient` |
| Seguridad | Sesiones, autorización administrativa, middleware, login y todos los consumidores de cookies |
| Pedidos/reportes | Consultas orders/admin, gestores, calendario y detalle de pedido |
| Datos | Esquema, nueva migración, consultas, seed si corresponde y verificador SQL |

La estructura permite cambios por módulos. Antes de habilitar cobros reales, los puntos prioritarios son la separación de sesiones, el cierre transaccional de pagos e inventario y la validación del adaptador YoPago.

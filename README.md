# Guantearqueros Bolivia

Tienda pública y panel administrativo en una aplicación Next.js. Catálogo de guantes, accesorios e indumentaria DREI Athletic, en español y bolivianos (BOB).

Estado actualizado: 9 de septiembre de 2026. La tienda y el checkout están implementados. **YoPago live y su webhook permanecen deshabilitados hasta la integración final.** El simulador sirve para probar el flujo sin cobrar dinero.

## Stack y estructura

| Capa | Implementación |
|---|---|
| Aplicación | Next.js 15.5.23, App Router, React 19, TypeScript estricto |
| Estilos | Tailwind CSS 3, componentes propios, Anton local y Manrope |
| Datos | PostgreSQL, Drizzle ORM, postgres.js |
| Imágenes | ImageKit con subida autenticada y recorte |
| Mapas | Leaflet + OpenStreetMap; enlaces e incrustaciones de Google Maps |
| Seguridad | Cookies httpOnly firmadas por propósito, Argon2id, validación de payload y sesiones contra la base |
| Checkout | Cotización del servidor, importes congelados y creación idempotente |
| Despliegue | Netlify, Node 22, renderizado de Next.js mediante su adaptador |

```text
src/app/(shop)/          inicio, categorías, DREI, productos y checkout
src/app/admin/           login, resumen, catálogo, pedidos, inicio y ajustes
src/app/admin/actions.ts escrituras administrativas autenticadas
src/app/api/             búsqueda, carrito, descuentos, pedidos y simulador
src/components/         shop, admin, ui y brand
src/db/schema.ts        nueve tablas
src/db/queries/         catálogo, pedidos, pagos, ajustes y autenticación
src/lib/                validadores, sesiones, cotizaciones y configuración
drizzle/                migraciones SQL y snapshots versionados
scripts/                administrador y verificaciones locales
referencias/handoff/    prototipos y especificación histórica
```

## Instalación

```bash
npm install
```

Crea `.env.local` con las variables enumeradas más abajo. Configura PostgreSQL y un secreto de sesión aleatorio de al menos 24 caracteres. Puedes generar uno con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sobre la base de desarrollo elegida:

```bash
npm run db:migrate
npm run db:seed
npm run admin:create -- --user TU_USUARIO --pass "UNA_CLAVE_LARGA"
npm run dev
```

Tienda: http://localhost:3000. Panel: http://localhost:3000/admin. El seed opcional `npm run db:seed -- --demo` carga productos de muestra. No ejecutes seeds ni migraciones como parte del build.

### Actualización de una instalación existente

La migración **0013_checkout_security** agrega `login_attempts`, la versión de sesión del administrador, una clave única de checkout y el desglose de importes en pedidos. Es aditiva: no borra pedidos ni productos.

Aplica `npm run db:migrate` sobre la base correcta antes de servir el código actualizado. Las cookies anteriores dejan de ser válidas: los administradores deberán iniciar sesión nuevamente y los checkouts anteriores deberán iniciar una nueva sesión. El carrito de productos conserva su almacenamiento anterior.

Los pedidos históricos mantienen el total original. Sus columnas nuevas de subtotal/envío/descuento quedan en NULL, porque no se pueden reconstruir con certeza. La página de pago muestra ese total sin inventar un desglose con las tarifas actuales.

La migración fue verificada en una base embebida de pruebas y aplicada a la base PostgreSQL de nube configurada el 9 de septiembre de 2026.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL; para conexiones externas usar SSL según el proveedor |
| `ADMIN_SESSION_SECRET` | Secreto de servidor para firmas separadas por propósito |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Endpoint público de imágenes |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` | Autorización de subidas; la privada nunca va al navegador |
| `NEXT_PUBLIC_SITE_URL` | URL pública canónica, sin slash final |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_WHATSAPP`, `NEXT_PUBLIC_DREI_WHATSAPP` | Contacto |
| `YOPAGO_MODE` | Debe ser `live`; habilita exclusivamente los endpoints reales configurados |
| `YOPAGO_COMPANY_CODE` | Código de empresa entregado por YoPago; solo servidor |
| `YOPAGO_CALLBACK_USERNAME`, `YOPAGO_CALLBACK_PASSWORD` | Credenciales de autenticación del callback; solo servidor |
| `YOPAGO_QR_URL`, `YOPAGO_CARD_URL` | Endpoints de QR Simple y tarjeta |
| `YOPAGO_ALLOWED_CARD_HOSTS` | Hosts HTTPS permitidos para la redirección de tarjeta |
| `APP_BASE_URL` | Origen público HTTPS usado en las URLs de retorno; reutiliza `NEXT_PUBLIC_SITE_URL` si se omite |

La aplicación no expone un simulador de pagos. Para generar un cobro exige `YOPAGO_MODE=live`, el código de empresa, las credenciales del callback y una URL pública válida. Si falta cualquier dato, el intento se rechaza antes de contactar a YoPago.

Sin base configurada, el catálogo público puede renderizar contenido vacío/de respaldo. El checkout falla si no puede leer sus ajustes; nunca sustituye un error de base por tarifas predeterminadas para cobrar. Cuando la tabla es accesible pero aún no existe la fila de ajustes, se usan los valores iniciales documentados en `CHECKOUT_DEFAULT`.

## Funcionalidad actual

- Portada con ofertas/novedades, carrusel de categorías, catálogo paginado y bloque DREI configurable.
- Categorías y subcategorías, filtros por marca/talla/precio, búsqueda y fichas con galería.
- Productos con tallas, atributos libres, personalización opcional, precio anterior y flags de publicación, destacado y novedad.
- Panel con catálogo, marcas, imágenes, pedidos, calendario de ventas, métricas, ajustes de inicio, envíos y descuentos.
- Checkout de invitado: nombre, apellido, teléfono, nota y datos opcionales para solicitar factura. La solicitud no emite factura fiscal.
- La Paz es la región local para retiro o entrega con dirección/coordenadas. Otros destinos requieren CI y correo para el despacho por transporte.
- Códigos de descuento porcentuales o fijos sobre productos; el envío no se descuenta.
- Notificaciones automáticas pendientes: `notify.ts` registra mensajes, pero no envía WhatsApp ni correo.

Las rutas públicas son `/{categoria}`, `/{categoria}/{sub}`, `/p/{slug}` y `/drei`. Las rutas antiguas bajo `/c` redirigen permanentemente. Ofertas y Nuevos son categorías calculadas y protegidas.

## Seguridad administrativa

Las firmas incluyen un propósito independiente: `admin`, `order` o `quote`. Se valida ese propósito, la firma, la expiración y la estructura en ejecución. Una cookie de comprador o una cotización no autoriza acceso administrativo.

El middleware filtra las páginas del panel. Cada acción y endpoint administrativo verifica además usuario, rol y versión de sesión contra PostgreSQL. Actualizar la contraseña mediante `admin:create` incrementa esa versión e invalida las sesiones previas; borrar el usuario también las invalida. El middleware no redirige por sí solo desde el login basándose en una cookie potencialmente revocada.

Los intentos de login se reservan mediante un upsert atómico: máximo ocho intentos por nombre de usuario normalizado en diez minutos, compartidos entre instancias. Un acceso correcto limpia el contador. No es un sistema global contra abuso por IP. Las filas de `login_attempts` pueden depurarse cuando `until` haya vencido.

## Contrato del checkout

1. El carrito vive en localStorage y el pedido activo de cada pestaña en sessionStorage.
2. Al abrir la revisión final, `POST /api/orders/quote` valida los datos y calcula precios, stock disponible, envío y descuento en el servidor. Devuelve líneas, desglose y una cotización firmada válida durante diez minutos.
3. El cliente confirma ese importe. POST/PATCH a `/api/orders` incluyen la cotización y una clave UUID de intento. El servidor comprueba que los datos y precios siguen coincidiendo. Si cambiaron, pide una nueva revisión.
4. El pedido congela subtotal, envío, descuento, código y total; sus ?tems conservan nombres, precios, imágenes, tallas y atributos. Los cálculos monetarios se redondean en centavos.
5. Crear usa clave ?nica y bloqueo transaccional: reintentar el mismo intento devuelve el mismo pedido. Un reintento con datos distintos se rechaza. La clave debe conservarse al perder una respuesta.
6. La cookie de comprador autoriza hasta diez pedidos. Pago y confirmación exigen `?pedido=ID` y pertenencia a esa sesión; no seleccionan el ?ltimo pedido de otra pestaña.
7. Un pedido pagado, reembolsado o que ya avanzó operativamente no se edita. Un intento de pago pendiente también bloquea la edición.
8. La confirmación final exige estado pagado; navegar directamente con un pedido pendiente redirige al pago. Limpiar el carrito requiere que el pedido confirmado coincida con el activo de la pestaña.

La revisión final del servidor es la fuente del importe aceptado. El resumen inicial del carrito puede reflejar el precio visto anteriormente. La cotización no reserva inventario.

## Simulador y preparación de YoPago

`POST /api/payments/yopago` genera intentos reales. Repetir el mismo método devuelve el intento vigente y conserva el historial de intentos anteriores.

`POST /api/payments/yopago/simulate` exige cookie del pedido e identificador vigente de transacción. El servicio interno comprueba importe/moneda/referencia y actualiza pago e inventario en una sola transacción. Bloquea el pedido y descuenta por producto en orden estable, con condición de stock suficiente. Si cualquier producto falla, se revierte todo. Un pago confirmado no se revierte por un resultado tardío ni descuenta dos veces.

Un intento externo no se cancela localmente: la edición queda bloqueada mientras exista la posibilidad de cobro y debe resolverse conforme al contrato de cancelación de YoPago.

El estado operativo avanza `recibido -> en_proceso -> completado`, con pago confirmado. Un pedido recibido puede cancelarse si no tiene un cobro confirmado ni un intento pendiente. Cancelar no reembolsa. No hay reposición automática por reembolso.

**El webhook devuelve 503 y no escribe datos.** No se conservan endpoints o firmas supuestos para una API real.

Para la integración final, ver [INTEGRACION_PAGOS.md](INTEGRACION_PAGOS.md). Faltan el adaptador oficial, firma y validación de eventos, registro duradero de intentos/eventos, reservas con vencimiento, conciliación de cobros tardíos y reembolsos. El comportamiento de stock del simulador impide una confirmación local sin unidades, pero no resuelve por sí solo un cobro externo ya efectuado.

## Verificación

| Comando | Alcance |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint; Next.js informa la deprecación de su wrapper |
| `npm run verify:sql` | 14 migraciones, nueve tablas, secuencia e historial en PGlite |
| `npm run verify:checkout` | Sesiones, revocación, límite de login, cotizaciones, idempotencia, importes, stock y rollback en PGlite |
| `npm run build` | Compilación de producción |
| `npm run db:generate -- --name nombre` | Generar una nueva migración |
| `npm run db:migrate` | Aplicar migraciones a DATABASE_URL |

Los verificadores usan una base embebida sin cargar `.env.local`. PGlite serializa las transacciones: estas pruebas no sustituyen pruebas de concurrencia con conexiones PostgreSQL independientes ni pruebas de la pasarela.

El desarrollo usa `.next-dev` y producción `.next`. `npm run clean` elimina ambos directorios de artefactos si se necesita una compilación limpia.

## Despliegue

`netlify.toml` configura build `npm run build`, publicación `.next`, Node 22 y protección de versiones. Configura variables en Netlify y aplica las migraciones sobre la base elegida como paso controlado antes del despliegue. Las variables `NEXT_PUBLIC_*` se incorporan durante el build.

No subas `.env.local`, claves privadas ni contraseñas al repositorio. No incluyas migraciones ni seeds dentro del comando de build. Al cambiar el dominio, actualiza `NEXT_PUBLIC_SITE_URL` y reconstruye.

## Referencias y límites

Los handoffs HTML/Markdown son referencias históricas de diseño. Para arquitectura, seguridad y comportamiento actual rigen este README y el código.

El stock es por producto, no por talla. No hay cuentas de clientes, multimoneda, emisión fiscal ni notificaciones automáticas. Algunas páginas y tablas todavía paginan en cliente; el rendimiento con grandes catálogos y las métricas por zona horaria requieren evaluación independiente. El informe [ANALISIS_PROYECTO.md](ANALISIS_PROYECTO.md) distingue los hallazgos iniciales de las correcciones realizadas.

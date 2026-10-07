# Guante Arqueros Bolivia

Tienda pública y panel administrativo en una aplicación Next.js. Catálogo de guantes, accesorios e indumentaria DREI Athletic, en español y bolivianos (BOB).

Estado revisado: 23 de septiembre de 2026. La tienda, el checkout y la integración de QR/tarjeta con YoPago están implementados. La generación de cobros reales requiere `YOPAGO_MODE=live`; no hay simulador público. La validación del contrato operativo con YoPago y las pruebas de concurrencia en PostgreSQL siguen pendientes.

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
| Despliegue | Docker Compose en ALPHA VPS, Node 22 y Traefik con HTTPS |

```text
src/app/(shop)/          inicio, categorías, DREI, productos y checkout
src/app/admin/           login, resumen, catálogo, pedidos, inicio y ajustes
src/app/admin/actions.ts escrituras administrativas autenticadas
src/app/api/             búsqueda, carrito, descuentos, pedidos y pagos
src/components/         shop, admin, ui y brand
src/db/schema.ts        once tablas
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

Copia `.env.example` a `.env.local` y completa sus valores localmente. Configura PostgreSQL y un secreto de sesión aleatorio de al menos 24 caracteres. Puedes generar uno con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sobre la base de desarrollo elegida:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Tienda: http://localhost:3000. Panel: http://localhost:3000/admin. El seed opcional `npm run db:seed -- --demo` carga productos de muestra. No ejecutes seeds ni migraciones como parte del build.

### Crear o actualizar las cuentas del panel

El panel necesita una cuenta `admin` con rol `owner` y, si se utilizará el restablecimiento de contraseña, otra cuenta `superadmin` con rol `superadmin`. Ambas ingresan en `/admin/login`. `admin` administra la tienda; `superadmin` solo puede reemplazar la contraseña de `admin` desde `/admin/superadmin`. No se crea ninguna cuenta al ejecutar el seed.

Con PostgreSQL accesible y las migraciones aplicadas, ejecuta en PowerShell:

```powershell
Read-Host 'Nueva clave de admin' -AsSecureString | ConvertFrom-SecureString -AsPlainText | .\node_modules\.bin\tsx.cmd scripts/create-admin.ts --user admin --role owner --pass-stdin
Read-Host 'Nueva clave de superadmin' -AsSecureString | ConvertFrom-SecureString -AsPlainText | .\node_modules\.bin\tsx.cmd scripts/create-admin.ts --user superadmin --role superadmin --pass-stdin
```

Cada clave debe tener al menos diez caracteres. La entrada por stdin evita colocarla en el historial de comandos; el script solo guarda su hash Argon2id. Si la cuenta ya existe, cambia la clave e invalida sus sesiones anteriores. Cuando no se indica `--role` al actualizar una cuenta, se conserva el rol existente. Nunca reutilices la misma clave para ambas cuentas ni publiques las claves en tickets, documentación o Git.

### Actualización de una instalación existente

El directorio `drizzle/` contiene 20 migraciones, de `0000` a `0019`. Incluyen sesiones, cotizaciones, ajustes, intentos/eventos de pago y datos de documento del pedido. En una base nueva, aplica `npm run db:migrate` antes de servir el código. En la base existente, primero concilia el historial local con el esquema real y haz una copia de seguridad: el historial de Drizzle no se encontró en la revisión previa. `db:push` no reemplaza ese proceso de despliegue.

Las columnas de desglose añadidas a pedidos históricos pueden permanecer en `NULL`: no se reconstruyen con tarifas actuales. Las sesiones anteriores al cambio de formato de cookies deben iniciarse de nuevo.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL; para conexiones externas usar SSL según el proveedor |
| `ADMIN_SESSION_SECRET` | Secreto de servidor para firmas separadas por propósito |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Endpoint público de la cuenta ImageKit usada para imágenes nuevas y rutas almacenadas |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` | Autorización de subidas; la privada nunca va al navegador |
| `NEXT_PUBLIC_SITE_URL` | URL pública canónica, `https://guantearqueros.com`, sin slash final |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_WHATSAPP`, `NEXT_PUBLIC_DREI_WHATSAPP`, `NEXT_PUBLIC_SUPPORT_URL` | Contacto y sitio externo de soporte |
| `YOPAGO_MODE` | Debe ser `live`; habilita exclusivamente los endpoints reales configurados |
| `YOPAGO_COMPANY_CODE` | Código de comercio que el adaptador lee en runtime; nunca se incorpora a la imagen Docker |
| `YOPAGO_CALLBACK_USERNAME`, `YOPAGO_CALLBACK_PASSWORD` | Credenciales de autenticación del callback; solo servidor |
| `YOPAGO_QR_URL`, `YOPAGO_CARD_URL` | Endpoints de QR Simple y tarjeta |
| `YOPAGO_ALLOWED_CARD_HOSTS` | Hosts HTTPS permitidos para la redirección de tarjeta |
| `APP_BASE_URL` | Origen público HTTPS usado en las URLs de retorno; reutiliza `NEXT_PUBLIC_SITE_URL` si se omite |

La aplicación no expone un simulador de pagos. Para generar un cobro exige `YOPAGO_MODE=live`, código de comercio, credenciales de callback y una URL pública válida. Si falta una configuración obligatoria, el intento se rechaza antes de contactar a YoPago.

Al cambiar de cuenta ImageKit, actualiza juntas las claves y el endpoint en el entorno de despliegue y reconstruye la aplicación: `NEXT_PUBLIC_*` se incorpora al bundle durante el build. Las imágenes guardadas como rutas de la cuenta anterior no se transfieren automáticamente; hay que migrarlas o conservar URLs absolutas de origen antes de apuntarlas a la cuenta nueva. Nunca incluyas las claves privadas en documentación o código versionado.

Sin base configurada, el catálogo público puede renderizar contenido vacío/de respaldo. El checkout falla si no puede leer sus ajustes; nunca sustituye un error de base por tarifas predeterminadas para cobrar. Cuando la tabla es accesible pero aún no existe la fila de ajustes, se usan los valores iniciales documentados en `CHECKOUT_DEFAULT`.

## Funcionalidad actual

- Portada con ofertas/novedades, carrusel de categorías, catálogo paginado y bloque DREI configurable.
- Categorías y subcategorías, filtros por marca/talla/precio, búsqueda y fichas con galería.
- Productos con tallas, atributos libres, personalización opcional, precio anterior y flags de publicación, destacado y novedad.
- Panel con catálogo, marcas, imágenes, pedidos, calendario de ventas, métricas, ajustes de inicio, envíos y descuentos.
- Checkout de invitado: nombre, apellido, teléfono, nota y datos opcionales para solicitar factura. La solicitud no emite factura fiscal.
- La Paz, Santa Cruz y Cochabamba tienen sucursal y permiten retiro o entrega local con ubicación. Para otros destinos se solicitan datos de documento y contacto según las validaciones del formulario; la empresa de transporte se coordina después.
- Códigos de descuento porcentuales o fijos sobre productos; el envío no se descuenta.
- Notificaciones automáticas pendientes: `notify.ts` registra mensajes, pero no envía WhatsApp ni correo.

Las rutas públicas son `/{categoria}`, `/{categoria}/{sub}`, `/p/{slug}` y `/drei`. Las rutas antiguas bajo `/c` redirigen permanentemente. Ofertas y Nuevos son categorías calculadas y protegidas.

## Seguridad administrativa

Las firmas incluyen un propósito independiente: `admin`, `order` o `quote`. Se valida ese propósito, la firma, la expiración y la estructura en ejecución. Una cookie de comprador o una cotización no autoriza acceso administrativo.

El middleware filtra las páginas del panel. Cada acción y endpoint administrativo verifica además usuario, rol y versión de sesión contra PostgreSQL. Actualizar la contraseña mediante `admin:create` incrementa esa versión e invalida las sesiones previas; borrar el usuario también las invalida. El middleware no redirige por sí solo desde el login basándose en una cookie potencialmente revocada.

Los intentos de login se reservan mediante un upsert atómico: máximo ocho intentos por nombre de usuario normalizado en diez minutos, compartidos entre instancias. Un acceso correcto limpia el contador. No es un sistema global contra abuso por IP. Las filas de `login_attempts` pueden depurarse cuando `until` haya vencido.

ZISE utiliza una cuenta con rol `superadmin` en el mismo login. Ese rol se redirige a una pantalla aislada que únicamente puede reemplazar la contraseña de la cuenta `admin`; no puede abrir el dashboard, catálogo, pedidos, ajustes ni ejecutar sus acciones. El cambio incrementa la versión de sesión de `admin` y cierra todas sus sesiones anteriores. La contraseña del superadministrador se almacena únicamente como hash Argon2id en `admin_users`, igual que las demás credenciales.

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

## Pagos YoPago e inventario

`POST /api/checkout/qr` y `/api/checkout/card` generan o reutilizan intentos reales del pedido autorizado; `/api/payments/yopago` mantiene la ruta común. Cada intento se guarda en `payment_attempts` antes de llamar a YoPago. La llamada externa ocurre fuera de la transacción de base de datos. La respuesta se persiste antes de entregar el QR o la URL de tarjeta al navegador.

`POST /api/checkout/callback` y la ruta heredada `/api/payments/yopago/webhook` autentican las cabeceras de callback, buscan el intento por ID de transacción y código de comercio, y registran el evento en `payment_events`. El procesamiento evita repetir el descuento de stock. Si YoPago confirma dinero y falta inventario, el pedido queda pagado en `paid_inventory_review` para revisión manual. La página `/checkout/result` solo informa; no confirma un cobro.

Abandonar el flujo marca localmente el intento y el pedido, pero no cancela la transacción en YoPago. Un callback tardío todavía puede confirmar el dinero. No hay reservas de stock, reembolsos automatizados ni reposición automática. El estado operativo avanza `recibido -> en_proceso -> completado` con pago confirmado.

Antes de operar o modificar cobros, consulta [INTEGRACION_PAGOS.md](INTEGRACION_PAGOS.md): faltan confirmación formal del contrato del proveedor, pruebas con su entorno oficial, conciliación automática de cobros tardíos y pruebas concurrentes con PostgreSQL real.

## Verificación

| Comando | Alcance |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint sobre aplicación, scripts y configuración de Next.js |
| `npm run verify:sql` | 20 migraciones, tablas principales, secuencia e historial en PGlite; su lista explícita aún no comprueba las dos tablas de pagos |
| `npm run verify:checkout` | Sesiones, revocación, cotizaciones, idempotencia, callback, stock y revisión de inventario en PGlite |
| `npm run build` | Compilación de producción |
| `npm run db:generate -- --name nombre` | Generar una nueva migración |
| `npm run db:migrate` | Aplicar migraciones a DATABASE_URL |

Los verificadores usan una base embebida sin cargar `.env.local`. PGlite serializa las transacciones: estas pruebas no sustituyen pruebas de concurrencia con conexiones PostgreSQL independientes ni pruebas de la pasarela. El build puede consultar PostgreSQL durante la generación estática; si no está accesible, las páginas públicas pueden generarse con contenido de respaldo o agotar el tiempo de espera.

El desarrollo usa `.next-dev` y producción `.next`. `npm run clean` elimina ambos directorios de artefactos si se necesita una compilación limpia.

## Rendimiento del catálogo

Las páginas públicas de categorías y productos se regeneran cada cinco minutos. Las lecturas del árbol de categorías, listados, filtros y fichas usan la caché de datos de Next; cualquier escritura de categorías, marcas o productos desde el panel invalida esa caché. El webhook de YoPago también la invalida cuando descuenta stock.

El árbol ejecuta en paralelo sus lecturas independientes y calcula Ofertas/Nuevos en una sola agregación. La ficha trae producto e imágenes en una consulta. El pool de desarrollo mantiene sus conexiones durante cinco minutos para evitar repetir el handshake TLS tras una pausa corta.

La base configurada se encuentra detrás del pooler de Supabase en `us-west-2`. En la medición del 11 de septiembre de 2026, con 51 productos, PostgreSQL planificó la consulta de categoría en 1,266 ms y la ejecutó en 0,508 ms; desde el equipo local, sin embargo, una conexión nueva más `SELECT 1` tardó 1,99 s y una consulta caliente 187,5 ms. La distancia y apertura de conexión dominan el tiempo, no el volumen ni el plan SQL. Para producción conviene ubicar el VPS y PostgreSQL en regiones cercanas si es posible.

`next dev` compila una ruta la primera vez que se visita y no representa la velocidad del despliegue. Para evaluar navegación se debe usar `npm run build` seguido de `npm start`; el prefetch de enlaces y las páginas estáticas operan plenamente en ese modo.

## Despliegue

El despliegue principal es **ALPHA VPS con Docker Compose y Traefik**. `Dockerfile` compila Next.js en modo `standalone` con Node 22 y ejecuta como usuario sin privilegios. `docker-compose.yml` conecta el servicio a la red externa `web` sin abrir el puerto 3000 al host. Traefik sirve `guantearqueros.com` por HTTPS, redirige HTTP a HTTPS y `www.guantearqueros.com` al dominio canónico. Se esperan entrypoints `web` y `websecure`, un resolver TLS llamado `letsencrypt` y Traefik conectado a `web`. `netlify.toml` queda como configuración histórica y no interviene en este despliegue.

1. Apunta los registros DNS de `guantearqueros.com` y `www.guantearqueros.com` al VPS. Comprueba que Traefik tenga puertos 80/443, acceso al proveedor Docker, red `web` y resolver `letsencrypt` activos.
2. En la copia del proyecto del VPS, ejecuta `cp .env.example .env`, edita `.env` con los valores reales y protege el archivo con `chmod 600 .env`. Configura PostgreSQL, `ADMIN_SESSION_SECRET`, ImageKit y contactos; deja `YOPAGO_MODE=disabled` hasta validar la pasarela. Usa `NEXT_PUBLIC_SITE_URL=https://guantearqueros.com` y `APP_BASE_URL=https://guantearqueros.com`.
3. Revisa la base y las migraciones **antes** de arrancar la versión nueva. La base previamente inspeccionada no tenía historial de migraciones Drizzle; no ejecutes `npm run db:migrate` a ciegas ni lo incluyas en el build o arranque. Reconcilia primero el historial y haz copia de seguridad.
4. Ejecuta `docker compose config --quiet` para validar la configuración sin imprimir secretos, luego `docker compose up -d --build` y `docker compose ps`. Si el estado no es `healthy`, revisa `docker compose logs --tail=100 app`.
5. Comprueba `https://guantearqueros.com/api/health`, `https://guantearqueros.com/robots.txt` y `https://guantearqueros.com/sitemap.xml`. Verifica también que `http://` redirija a HTTPS y que `https://www.guantearqueros.com` redirija permanentemente al dominio sin `www`.

El `healthcheck` responde 200 solo cuando la configuración de sesión está presente y PostgreSQL puede consultar la tabla de categorías. Las claves privadas entran al contenedor mediante `.env` en runtime; `.dockerignore` impide copiarlas al contexto del build. Las variables `NEXT_PUBLIC_*` son públicas y se pasan como argumentos de compilación; si cambian, reconstruye con `docker compose up -d --build`. No publiques `.env`, claves privadas, contraseñas ni la salida completa de `docker compose config`.

### GitHub Actions: integración y despliegue

`.github/workflows/ci.yml` ejecuta en cada push y pull request `npm ci`, TypeScript, ESLint, las verificaciones SQL/checkout y el build con Node 22. Usa PGlite; no requiere acceso a la base de producción ni secretos. Revisa el resultado en la pestaña **Actions** del repositorio. Integra primero los cambios en `main`: la rama local actual `Amadeo` no se despliega directamente.

`.github/workflows/deploy.yml` se ejecuta automáticamente por cada push a `main`, incluido el merge de un pull request. También se puede iniciar desde **Actions → Deploy ALPHA VPS → Run workflow**, eligiendo `main`, para reintentos. Ejecuta sus propias verificaciones antes de conectar por SSH; solo despliega si pasan. En el VPS hace avance rápido de `main`, construye con Docker Compose, retira contenedores huérfanos del proyecto y espera a que la aplicación esté `healthy`. Luego `scripts/smoke-vps.mjs` comprueba portada, categorías y subcategorías publicadas, filtros, algunas fichas de producto, búsqueda, login, checkout, sitemap y robots desde el contenedor. Si alguna ruta falla, el despliegue termina con error. Solo después de estas comprobaciones ejecuta `docker image prune --all --force` y `docker builder prune --all --force`. Estas limpiezas abarcan el Docker del VPS: quitan imágenes sin contenedores asociados y caché de compilación sin uso, incluso de otros proyectos; futuras compilaciones o retrocesos de versión pueden requerir descargar o reconstruir imágenes. No eliminan imágenes activas, volúmenes ni datos de PostgreSQL. Si la aplicación no queda saludable, no se depuran imágenes ni caché. Rechaza una copia del servidor modificada o un commit distinto al verificado. No ejecuta migraciones ni crea usuarios. Si llegan varios commits mientras hay un despliegue en curso, un run anterior puede detenerse porque `main` ya avanzó; el run del commit más reciente hará el despliegue.

Preparación una sola vez:

1. Publica estos archivos en GitHub mediante pull request hacia `main` y confirma que CI termina correctamente. Configura protección de la rama `main` para exigir el job `ci_checks` antes de fusionar, si tu plan de GitHub lo permite.
2. Prepara la copia del repositorio en el VPS, en la rama `main`, con un usuario que pueda ejecutar `docker compose` y con el archivo `.env` privado. Si el repositorio es privado, configura en **ese VPS** una llave de despliegue de GitHub con permiso de lectura para que `git fetch origin main` funcione. La llave del VPS para leer GitHub es distinta de la llave que GitHub Actions usa para entrar por SSH al VPS.
3. Crea una llave SSH dedicada para GitHub Actions y agrega **solo su clave pública** a `~/.ssh/authorized_keys` del usuario del VPS. Guarda la clave privada en GitHub como secreto `VPS_SSH_PRIVATE_KEY`; no la pongas en `.env`, el repositorio ni este chat.
4. En **Settings → Secrets and variables → Actions → Variables**, crea `VPS_HOST=217.217.234.194`, `VPS_USER` (usuario SSH), `VPS_PROJECT_PATH` (ruta absoluta de la copia del proyecto) y, si el SSH no usa 22, `VPS_SSH_PORT`. En **Secrets**, agrega `VPS_SSH_PRIVATE_KEY` y `VPS_KNOWN_HOSTS`. Para `VPS_KNOWN_HOSTS`, obtén la línea pública con `ssh-keyscan -t ed25519 217.217.234.194`; compara su huella (`ssh-keygen -lf` sobre el resultado) con `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` ejecutado dentro del VPS antes de guardarla. Si usas otro puerto, añade `-p PUERTO` a `ssh-keyscan`.
5. Los secretos y variables anteriores quedan a nivel del repositorio para que el despliegue funcione también en planes sin environments para repositorios privados. Si tu plan permite proteger un environment de producción, se puede añadir después con revisores y restricción a `main`. No añadas la contraseña de PostgreSQL, `ADMIN_SESSION_SECRET`, ImageKit ni YoPago a GitHub Actions: permanecen en `.env` del VPS.
6. Comprueba en el VPS que `git fetch origin main`, `docker compose config --quiet` y `docker network inspect web` funcionan. Al fusionar cambios en `main`, el despliegue se inicia automáticamente; el botón manual sirve para reintentarlo. Si falla, consulta los logs del job en Actions y `docker compose logs --tail=100 app` en el VPS.

Este flujo comprueba el código y publica automáticamente cada actualización de `main`; no garantiza por sí solo DNS, configuración de Traefik/certificados, conexión a PostgreSQL ni el contrato de YoPago. Valida esos servicios durante el primer despliegue con las URL del paso 5 anterior.

## SEO e indexación

La portada, las categorías activas, la página DREI cuando está visible y los productos publicados tienen URL canónica. Los filtros de categoría y la paginación de la portada llevan `noindex` para evitar versiones duplicadas. `robots.txt` permite la tienda y bloquea panel y API; el checkout queda rastreable para que los buscadores puedan leer su `noindex`. El sitemap incluye solo rutas públicas canónicas; cada producto usa su fecha real de actualización y su imagen principal si existe. Se regenera con la caché pública cada cinco minutos tras cambios del catálogo.

La tienda publica metadatos Open Graph, tarjeta para redes y datos estructurados de organización, sucursales, navegación y ofertas de producto. No se anuncian reseñas, horarios ni políticas de envío en datos estructurados porque no hay datos verificables para ellos. Después del despliegue, verifica `https://guantearqueros.com/robots.txt` y `https://guantearqueros.com/sitemap.xml`, registra el dominio en Google Search Console y envía el sitemap. El dominio real debe estar configurado antes del build para que las URLs absolutas sean correctas.

Las búsquedas objetivo se expresan en los títulos, descripciones y textos visibles de la portada, categorías, subcategorías y fichas, con términos específicos de indumentaria deportiva y fútbol en Bolivia. Las etiquetas `meta keywords` también se generan por página, pero Google Search no las usa para posicionar; el contenido debe corresponder a productos realmente publicados. No agregues palabras de deportes o artículos ajenos al catálogo solo para ampliar tráfico.

## Referencias y límites

Los handoffs HTML/Markdown son referencias históricas de diseño. [ANALISIS_PROYECTO.md](ANALISIS_PROYECTO.md) resume la revisión vigente; para comportamiento exacto rige el código.

El stock es por producto, no por talla. No hay cuentas de clientes, emisión fiscal ni notificaciones automáticas. Algunas páginas y tablas todavía paginan en cliente; el rendimiento con grandes catálogos y las métricas por zona horaria requieren evaluación independiente.

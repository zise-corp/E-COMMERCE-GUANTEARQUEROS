# Integración YoPago

La tienda integra QR Simple y tarjeta mediante endpoints exclusivamente de servidor. Los datos de tarjeta nunca atraviesan esta aplicación. Esto reduce el alcance técnico, pero no constituye por sí solo una certificación PCI.

## Variables y activación

Para desarrollo local, copiar `.env.example` a `.env.local`; para el VPS con Docker Compose, usar `.env` en la raíz del proyecto. Configurar `YOPAGO_MODE=live`, `YOPAGO_COMPANY_CODE`, `APP_BASE_URL` público HTTPS y las credenciales de callback entregadas por YoPago. El adaptador lee el código de comercio desde el entorno. `YOPAGO_QR_URL` y `YOPAGO_CARD_URL` permiten sustituir los endpoints predeterminados cuando el proveedor entrega URLs distintas; `YOPAGO_ALLOWED_CARD_HOSTS` limita los dominios HTTPS aceptados para la redirección. No existe un simulador expuesto en la aplicación. Registrar como callback:

`https://guantearqueros.com/api/checkout/callback`

YoPago debe confirmar la política de reintentos y códigos HTTP, si existe una firma adicional, los campos completos del evento, duración del QR, entorno de pruebas, dominios de tarjeta y endpoint de reconciliación. No publiques credenciales ni ejemplos con valores reales.

## Flujo implementado

La orden se calcula en servidor. Cada solicitud de QR o tarjeta crea o reutiliza un registro en `payment_attempts`. La respuesta externa se valida y se persiste antes de llegar al navegador. El callback autentica las cabeceras `Username`/`Password`, encuentra el intento por `transactionId + companyCode`, registra un `payment_event` idempotente, confirma el pago y descuenta stock una sola vez. Si el dinero fue confirmado pero no queda stock, la orden queda en `paid_inventory_review` para conciliación manual. El callback actual recibe esos identificadores y datos informativos; no recibe un importe o moneda verificable en el cuerpo.

La ruta de retorno `/checkout/result` es solo informativa y nunca confirma dinero. El polling consulta exclusivamente el estado financiero mínimo mediante un UUID público y la sesión firmada.

## Operación

- QR: `POST /api/checkout/qr`
- Tarjeta: `POST /api/checkout/card`
- Callback: `POST /api/checkout/callback`
- Estado: `GET /api/orders/payment-status/[publicId]`

Los endpoints heredados `/api/payments/yopago` y `/api/payments/yopago/webhook` se conservan por compatibilidad.

En una base nueva, aplicar migraciones con `npm run db:migrate` en un despliegue controlado. En la base existente, primero conciliar el historial de Drizzle con el esquema real y hacer copia de seguridad; no ejecutar las migraciones a ciegas. Probar en el entorno oficial de YoPago, reenviar el mismo callback para verificar idempotencia y simular callbacks concurrentes y últimas unidades. Las notificaciones siguen siendo solo mensajes de log; no hay transporte de correo configurado.

## Contrato que debe confirmarse con YoPago

Confirmar en documentación oficial las URLs, credenciales, firma de webhook sobre cuerpo crudo, referencias, importes, monedas, estados, consulta de transacciones, idempotencia, vencimiento, cancelación, QR y formulario de tarjeta. No asumir que los campos coinciden con otro proveedor.

`payment_attempts` y `payment_events` ya conservan intentos y callbacks. Los intentos guardan pedido, proveedor, transacción externa, importe, moneda y estado; algunos campos previstos para vencimiento y fallos no implementan todavía una política completa de expiración o conciliación. Al ampliar el contrato, conservar intentos anteriores y definir identidad e idempotencia para cada evento del proveedor.

El callback actual autentica credenciales y valida la referencia disponible (`transactionId` y `companyCode`) contra el intento guardado. Hay que confirmar con YoPago si puede entregar importe, moneda, firma o consulta de transacción para verificaciones adicionales. Los eventos repetidos y fuera de orden requieren reglas explícitas. Nunca marcar un pago por un parámetro de redirección del navegador.

## Inventario y cobros tardíos

Definir duración y liberación de reservas antes de generar un cobro real, tomando en cuenta todas las tallas que comparten el stock del producto. La reserva debe ser atómica; los intentos vencidos o cancelados liberan unidades de forma idempotente.

Si un proveedor confirma dinero después de vencer una reserva o después de cancelar, registrar el hecho y enviarlo a conciliación. No rechazar silenciosamente un cobro ni dejarlo como pendiente indefinidamente porque falta stock. Decidir entre reposición, entrega coordinada y reembolso.

## Edición, cancelaciones y reembolsos

La edición se bloquea cuando existe un intento externo que todavía puede cobrar. Abandonar la pantalla marca el pedido localmente, pero no cancela el cobro en YoPago. Para permitir una nueva compra o edición tras ese punto hay que implementar y confirmar cancelación o expiración con la pasarela. Una respuesta de red perdida no equivale a una cancelación.

La cancelación de un pedido y el reembolso son operaciones distintas. Conservar referencias y resultados; definir reembolsos parciales/totales y si corresponde reponer inventario. Evitar que un webhook tardío revierta un pago ya confirmado.

## Operación y validación antes de habilitar live

Probar con el sandbox oficial: ?xito QR/tarjeta, rechazo, expiración, reintento, doble clic, pestañas simultáneas, eventos duplicados/desordenados, edición durante pago, ?ltimas unidades, caída después del commit, cancelación y cobro tardío.

Validar concurrencia con conexiones reales de PostgreSQL. Añadir procesamiento duradero de eventos, observabilidad y reintentos; una notificación fallida no debe revertir un pago. El polling y el catálogo deben reflejar el resultado confirmado.

La aplicación solo habilita la generación real cuando `YOPAGO_MODE=live`, `YOPAGO_COMPANY_CODE`, las credenciales de callback y la URL base obligatorias están configuradas. El código de comercio del entorno debe coincidir con la cuenta autorizada.

# Integración YoPago

La tienda integra QR Simple y tarjeta mediante endpoints exclusivamente de servidor. Los datos de tarjeta nunca atraviesan esta aplicación. Esto reduce el alcance técnico, pero no constituye por sí solo una certificación PCI.

## Variables y activación

Copiar `.env.example` a `.env.local` y configurar `YOPAGO_MODE=live`, `APP_BASE_URL` público HTTPS, el company code y las credenciales de callback entregadas por YoPago. No existe un simulador expuesto en la aplicación. Registrar como callback:

`https://dominio-real.com/api/checkout/callback`

YoPago debe confirmar antes del go-live la política de reintentos y códigos HTTP, si existe una firma adicional, los campos completos del evento, duración del QR, sandbox/tarjetas de prueba, dominios de tarjeta, iframe y endpoint de reconciliación.

## Flujo implementado

La orden se calcula en servidor. Cada solicitud de QR o tarjeta crea o reutiliza un registro en `payment_attempts`. La respuesta externa se valida y se persiste antes de llegar al navegador. El callback autentica `Username`/`Password`, encuentra el intento por `transaction_id + company_code`, registra un `payment_event` idempotente, confirma el pago y descuenta stock una sola vez. Si el dinero fue confirmado pero no queda stock, la orden queda en `paid_inventory_review` para conciliación manual.

La ruta de retorno `/checkout/result` es solo informativa y nunca confirma dinero. El polling consulta exclusivamente el estado financiero mínimo mediante un UUID público y la sesión firmada.

## Operación

- QR: `POST /api/checkout/qr`
- Tarjeta: `POST /api/checkout/card`
- Callback: `POST /api/checkout/callback`
- Estado: `GET /api/orders/payment-status/[publicId]`

Los endpoints heredados `/api/payments/yopago` y `/api/payments/yopago/webhook` se conservan por compatibilidad.

Aplicar migraciones con `npm run db:migrate`. Probar primero en el sandbox oficial, reenviar el mismo callback para verificar idempotencia y simular dos callbacks concurrentes y últimas unidades. Los fallos de notificación no revierten el pago; el transporte de correo sigue siendo un adaptador pendiente de configurar.

## Contrato que debe confirmarse con YoPago

Confirmar en documentación oficial las URLs, credenciales, firma de webhook sobre cuerpo crudo, referencias, importes, monedas, estados, consulta de transacciones, idempotencia, vencimiento, cancelación, QR y formulario de tarjeta. No asumir que los campos coinciden con otro proveedor.

Registrar intentos y eventos en tablas propias. Cada intento debe guardar su identidad interna, clave idempotente, proveedor, transacción externa, pedido/versión, importe, moneda, estado y vencimiento. Conservar intentos anteriores para conciliación; no sobrescribir una ?nica referencia como hace el simulador.

El adaptador debe autenticar el evento, validar su esquema y comprobar referencia, importe y moneda contra el intento guardado. Los eventos repetidos y fuera de orden deben tratarse según reglas explícitas. Nunca marcar un pago por un parámetro de redirección del navegador.

## Inventario y cobros tardíos

Definir duración y liberación de reservas antes de generar un cobro real, tomando en cuenta todas las tallas que comparten el stock del producto. La reserva debe ser atómica; los intentos vencidos o cancelados liberan unidades de forma idempotente.

Si un proveedor confirma dinero después de vencer una reserva o después de cancelar, registrar el hecho y enviarlo a conciliación. No rechazar silenciosamente un cobro ni dejarlo como pendiente indefinidamente porque falta stock. Decidir entre reposición, entrega coordinada y reembolso.

## Edición, cancelaciones y reembolsos

Bloquear edición mientras el proveedor todavía pueda cobrar el importe anterior. Volver a envío requiere cancelar/expirar el intento y confirmar esa cancelación con la pasarela. Una respuesta de red perdida no equivale a una cancelación.

La cancelación de un pedido y el reembolso son operaciones distintas. Conservar referencias y resultados; definir reembolsos parciales/totales y si corresponde reponer inventario. Evitar que un webhook tardío revierta un pago ya confirmado.

## Operación y validación antes de habilitar live

Probar con el sandbox oficial: ?xito QR/tarjeta, rechazo, expiración, reintento, doble clic, pestañas simultáneas, eventos duplicados/desordenados, edición durante pago, ?ltimas unidades, caída después del commit, cancelación y cobro tardío.

Validar concurrencia con conexiones reales de PostgreSQL. Añadir procesamiento duradero de eventos, observabilidad y reintentos; una notificación fallida no debe revertir un pago. El polling y el catálogo deben reflejar el resultado confirmado.

La aplicación solo habilita la generación real cuando `YOPAGO_MODE=live` y todas las credenciales obligatorias están configuradas.

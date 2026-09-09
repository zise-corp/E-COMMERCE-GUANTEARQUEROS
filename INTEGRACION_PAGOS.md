# Integración final de pagos

Este documento define el trabajo pendiente. No describe una integración live terminada.

## Base disponible

- Pedido con total y desglose inmutables una vez iniciado el pago.
- Identificador explícito del pedido y cookie que comprueba su pertenencia.
- Cotización firmada antes de crear/actualizar y clave idempotente para la creación.
- Servicio interno `applyPaymentResult` con validación de referencia, importe y moneda, bloqueo del pedido y actualización atómica de stock/pago.
- Simulador autenticado que permite probar ?xito, fallo, reintento y regreso al envío.
- Endpoints live cerrados; `/api/payments/yopago/webhook` devuelve 503.

## Contrato que debe obtenerse de YoPago

Confirmar en documentación oficial las URLs, credenciales, firma de webhook sobre cuerpo crudo, referencias, importes, monedas, estados, consulta de transacciones, idempotencia, vencimiento, cancelación, QR y formulario de tarjeta. No asumir que los campos coinciden con otro proveedor.

Registrar intentos y eventos en tablas propias. Cada intento debe guardar su identidad interna, clave idempotente, proveedor, transacción externa, pedido/versión, importe, moneda, estado y vencimiento. Conservar intentos anteriores para conciliación; no sobrescribir una ?nica referencia como hace el simulador.

El adaptador debe autenticar el evento, validar su esquema y comprobar referencia, importe y moneda contra el intento guardado. Los eventos repetidos y fuera de orden deben tratarse según reglas explícitas. Nunca marcar un pago por un parámetro de redirección del navegador.

## Inventario y cobros tardíos

Definir duración y liberación de reservas antes de generar un cobro real, tomando en cuenta todas las tallas que comparten el stock del producto. La reserva debe ser atómica; los intentos vencidos o cancelados liberan unidades de forma idempotente.

Si un proveedor confirma dinero después de vencer una reserva o después de cancelar, registrar el hecho y enviarlo a conciliación. No rechazar silenciosamente un cobro ni dejarlo como pendiente indefinidamente porque falta stock. Decidir entre reposición, entrega coordinada y reembolso.

`applyPaymentResult` es una base del simulador: su rollback ante falta de stock y su tratamiento terminal de fallido deberán adaptarse a esa política de conciliación. No conectarlo directamente a un webhook real sin implementar esa parte.

## Edición, cancelaciones y reembolsos

Bloquear edición mientras el proveedor todavía pueda cobrar el importe anterior. Volver a envío requiere cancelar/expirar el intento y confirmar esa cancelación con la pasarela. Una respuesta de red perdida no equivale a una cancelación.

La cancelación de un pedido y el reembolso son operaciones distintas. Conservar referencias y resultados; definir reembolsos parciales/totales y si corresponde reponer inventario. Evitar que un webhook tardío revierta un pago ya confirmado.

## Operación y validación antes de habilitar live

Probar con el sandbox oficial: ?xito QR/tarjeta, rechazo, expiración, reintento, doble clic, pestañas simultáneas, eventos duplicados/desordenados, edición durante pago, ?ltimas unidades, caída después del commit, cancelación y cobro tardío.

Validar concurrencia con conexiones reales de PostgreSQL. Añadir procesamiento duradero de eventos, observabilidad y reintentos; una notificación fallida no debe revertir un pago. El polling y el catálogo deben reflejar el resultado confirmado.

Solo habilitar live cuando pasen estas pruebas. En producción de venta real, `ALLOW_PAYMENT_SANDBOX` debe estar ausente o en false.

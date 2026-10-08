-- Expira solo el intento que actualmente muestra el pedido. El callback de
-- YoPago puede confirmar un pago tardío incluso después de este cambio local.
WITH expired_attempts AS (
  UPDATE payment_attempts AS attempt
  SET status = 'abandoned', updated_at = CURRENT_TIMESTAMP
  FROM orders AS sale
  WHERE attempt.order_id = sale.id
    AND attempt.status IN ('pending', 'created')
    AND sale.status = 'recibido'
    AND sale.payment_status = 'pendiente'
    AND sale.financial_status = 'payment_created'
    AND sale."transactionId" = attempt.transaction_id
    AND sale."companyCode" = attempt.company_code
    AND COALESCE(attempt.expires_at, attempt.created_at + INTERVAL '10 minutes') <= CURRENT_TIMESTAMP
  RETURNING attempt.order_id
)
UPDATE orders AS sale
SET financial_status = 'abandoned', updated_at = CURRENT_TIMESTAMP
WHERE sale.status = 'recibido'
  AND sale.payment_status = 'pendiente'
  AND sale.financial_status = 'payment_created'
  AND EXISTS (SELECT 1 FROM expired_attempts WHERE expired_attempts.order_id = sale.id)
RETURNING sale.id;

-- Alfa Informática — colunas de controle de e-mails enviados por pedido
--
-- Cada coluna registra o momento em que aquele tipo de e-mail foi disparado.
-- O UPDATE condicional (WHERE email_X_at IS NULL) garante idempotência:
-- mesmo que o webhook do Mercado Pago chegue mais de uma vez, o cliente
-- nunca recebe o mesmo e-mail duas vezes.
--
-- Rodar no Supabase: SQL Editor > New query > colar e executar.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS email_pix_gerado_at   TIMESTAMPTZ,  -- PIX gerado (aguardando pagamento)
  ADD COLUMN IF NOT EXISTS email_confirmacao_at  TIMESTAMPTZ,  -- pagamento aprovado (PIX ou cartão)
  ADD COLUMN IF NOT EXISTS email_analise_at      TIMESTAMPTZ,  -- cartão em análise / pending
  ADD COLUMN IF NOT EXISTS email_recusado_at     TIMESTAMPTZ;  -- pagamento recusado / cancelado

-- Índice parcial para diagnóstico rápido de e-mails pendentes de envio
-- (pedidos aprovados sem e-mail de confirmação = possível falha de envio).
CREATE INDEX IF NOT EXISTS idx_orders_email_confirmacao_pendente
  ON orders (id)
  WHERE status IN ('pago') AND email_confirmacao_at IS NULL;

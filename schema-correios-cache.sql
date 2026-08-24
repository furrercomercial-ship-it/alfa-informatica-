-- Alfa Informática — tabela de cache de cotações dos Correios
--
-- Criada para dar resiliência ao checkout: quando os Correios ficam
-- temporariamente indisponíveis no momento de finalizar o pedido,
-- mp-create-payment usa a cotação que correios-frete salvou aqui
-- (TTL 10 min), em vez de bloquear a venda.
--
-- A chave inclui CEP de origem + destino + pacote (peso e dimensões)
-- arredondados, então nunca há reutilização de cotação de outro carrinho
-- ou outro CEP.
--
-- Rodar no Supabase: SQL Editor > New query > colar e executar.

CREATE TABLE IF NOT EXISTS correios_frete_cache (
  cache_key  TEXT PRIMARY KEY,                             -- chave determinística (ver buildFreightCacheKey)
  opcoes     JSONB NOT NULL,                               -- array de OpcaoFrete (codigo, nome, valor, prazoDias)
  cached_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Índice para a query de busca por validade (usado em mp-create-payment)
CREATE INDEX IF NOT EXISTS idx_correios_frete_cache_expires
  ON correios_frete_cache (cache_key, expires_at);

-- Limpeza automática via cron do Supabase (pg_cron) — opcional mas
-- recomendado para manter a tabela pequena. Rodar separado se pg_cron
-- estiver habilitado no projeto:
--
-- SELECT cron.schedule(
--   'limpar-correios-frete-cache',
--   '*/30 * * * *',  -- a cada 30 minutos
--   $$DELETE FROM correios_frete_cache WHERE expires_at < NOW() - INTERVAL '1 hour'$$
-- );

-- RLS: Edge Functions usam service_role (bypassa RLS), mas é boa prática
-- habilitar RLS e bloquear acesso anônimo à tabela de cache.
ALTER TABLE correios_frete_cache ENABLE ROW LEVEL SECURITY;

-- Nenhum acesso público (só service_role via Edge Functions)
CREATE POLICY IF NOT EXISTS "correios_frete_cache_no_public"
  ON correios_frete_cache
  FOR ALL
  USING (false);

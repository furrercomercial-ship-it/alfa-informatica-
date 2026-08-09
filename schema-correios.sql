-- ============================================================================
-- Alfa Informática — Schema de Envio (Correios: cálculo de frete, etiqueta,
-- rastreio). Rodar DEPOIS de schema.sql já ter sido rodado.
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Idempotente: pode rodar de novo sem quebrar.
--
-- Este script NÃO configura credenciais nem faz nenhuma chamada externa — só
-- prepara o banco pra receber os dados que as Edge Functions
-- (correios-frete / correios-etiqueta / correios-rastreio) vão gravar.
-- `tracking_code` e `carrier` já existem em orders desde schema.sql — só as
-- duas colunas abaixo são novas.
-- ============================================================================

alter table public.orders add column if not exists correios_servico_codigo text;
alter table public.orders add column if not exists label_data jsonb;

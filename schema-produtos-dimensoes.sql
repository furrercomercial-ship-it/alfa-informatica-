-- ============================================================================
-- Alfa Informática — Dimensões estruturadas por produto (comprimento/largura/
-- altura em cm), pro cálculo de frete dos Correios usar peso/tamanho real
-- em vez do pacote fixo. `weight` (kg) já existia; `dimensions` (texto livre,
-- "30x20x10 cm") fica sem uso — não dava pra confiar num texto livre pra
-- calcular frete de verdade.
-- Rodar DEPOIS de schema.sql já ter rodado. Idempotente.
-- ============================================================================

alter table public.products add column if not exists comprimento_cm numeric(6,1);
alter table public.products add column if not exists largura_cm numeric(6,1);
alter table public.products add column if not exists altura_cm numeric(6,1);

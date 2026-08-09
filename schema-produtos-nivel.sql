-- ============================================================================
-- Alfa Informática — Campo "nível" em products (Home/Crazy/Insane/Lunatic/Mad),
-- pra seção "Escolha seu Nível" da home funcionar como uma categoria (vários
-- produtos por nível), em vez do experimento anterior de 1 produto fixo por
-- nível (tabela pc_setups, descartada).
-- Rodar DEPOIS de schema.sql já ter rodado. Idempotente.
-- ============================================================================

drop table if exists public.pc_setups;

alter table public.products add column if not exists nivel text
  check (nivel is null or nivel in ('home','crazy','insane','lunatic','mad'));

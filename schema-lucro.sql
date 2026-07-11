-- ============================================================================
-- Alfa Informática — Schema de Lucro/Despesas (rodar DEPOIS de schema.sql já
-- ter sido rodado). Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Idempotente: pode rodar de novo sem quebrar.
-- ============================================================================

-- ── PERMISSÃO NOVA (edição de custos/despesas — visualizar já existia) ─────
insert into public.permissions (key, label, module) values
  ('faturamento.editar', 'Editar custos e despesas', 'financeiro')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, allowed)
select 'administrador', 'faturamento.editar', true
on conflict (role, permission_key) do update set allowed = true;

insert into public.role_permissions (role, permission_key, allowed) values
  ('gerente', 'faturamento.editar', true),
  ('financeiro', 'faturamento.editar', true)
on conflict (role, permission_key) do update set allowed = excluded.allowed;

-- ── SNAPSHOT DO CUSTO NO MOMENTO DA VENDA ───────────────────────────────────
-- Sem isso, o lucro de pedidos antigos ficaria errado toda vez que o preço de
-- custo de um produto for atualizado depois. Fica nulo pra pedidos já
-- existentes (o painel de Lucro cai pro custo atual do produto nesse caso).
alter table public.order_items add column if not exists cost_price_snapshot numeric(12,2);

-- ============================================================================
-- DESPESAS (custos operacionais que não vêm do produto: aluguel, salários,
-- marketing, assinaturas, impostos etc.)
-- ============================================================================
create table if not exists public.despesas (
  id           bigint generated always as identity primary key,
  categoria    text not null,
  descricao    text,
  valor        numeric(12,2) not null,
  data         date not null default current_date,
  recorrente   boolean not null default false,   -- se true, repete todo mês a partir de "data"
  ativo        boolean not null default true,     -- desliga uma recorrência sem apagar o histórico
  created_at   timestamptz not null default now()
);

alter table public.despesas enable row level security;

drop policy if exists despesas_select on public.despesas;
create policy despesas_select on public.despesas for select
  using (public.has_permission('faturamento.visualizar'));

drop policy if exists despesas_write on public.despesas;
create policy despesas_write on public.despesas for all
  using (public.has_permission('faturamento.editar'))
  with check (public.has_permission('faturamento.editar'));

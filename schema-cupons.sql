-- ============================================================================
-- Alfa Informática — Schema de Cupons (rodar DEPOIS de schema.sql já ter sido
-- rodado). Cole tudo no SQL Editor do Supabase e clique em "Run". Idempotente.
-- ============================================================================

do $$ begin
  create type cupom_tipo as enum ('percentual','fixo');
exception when duplicate_object then null; end $$;

create table if not exists public.cupons (
  id                    bigint generated always as identity primary key,
  codigo                text not null unique,
  tipo                  cupom_tipo not null default 'percentual',
  valor                 numeric(12,2) not null,
  valor_minimo          numeric(12,2) not null default 0,
  limite_uso            int,                              -- null = ilimitado
  usos                  int not null default 0,
  validade_inicio       timestamptz,
  validade_fim          timestamptz,
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now()
);

drop trigger if exists cupons_set_updated_at on public.cupons;

-- Normaliza o código sempre em maiúsculas, tanto no insert quanto no update.
create or replace function public.normalizar_codigo_cupom()
returns trigger language plpgsql as $$
begin
  new.codigo = upper(trim(new.codigo));
  return new;
end;
$$;
drop trigger if exists cupons_normalizar_codigo on public.cupons;
create trigger cupons_normalizar_codigo before insert or update on public.cupons
  for each row execute function public.normalizar_codigo_cupom();

-- Incrementa o contador de uso de um cupom. security definer porque o cliente
-- (inclusive visitante sem login) precisa poder chamar isso ao finalizar um
-- pedido, sem ter permissão de escrita direta na tabela de cupons.
create or replace function public.incrementar_uso_cupom(p_codigo text)
returns void
language sql security definer set search_path = public
as $$
  update public.cupons set usos = usos + 1 where codigo = upper(trim(p_codigo));
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.cupons enable row level security;

-- Leitura pública dos cupons ativos (necessário pro checkout validar o código
-- digitado, inclusive por visitante sem login) — mesmo padrão já usado em
-- popups/banners. Staff com a permissão de preços vê tudo, inclusive inativos.
drop policy if exists cupons_select on public.cupons;
create policy cupons_select on public.cupons for select
  using (ativo = true or public.has_permission('precos.editar'));

drop policy if exists cupons_write on public.cupons;
create policy cupons_write on public.cupons for all
  using (public.has_permission('precos.editar'))
  with check (public.has_permission('precos.editar'));

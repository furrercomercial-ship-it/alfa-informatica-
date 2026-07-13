-- ============================================================================
-- Alfa Informática — Schema de Estoque + Notificações (rodar DEPOIS de
-- schema.sql já ter sido rodado). Cole tudo no SQL Editor do Supabase e
-- clique em "Run". Idempotente: pode rodar de novo sem quebrar.
-- ============================================================================

-- ── PERMISSÕES NOVAS ─────────────────────────────────────────────────────
insert into public.permissions (key, label, module) values
  ('estoque.visualizar',     'Ver estoque',                'estoque'),
  ('estoque.editar',         'Editar/movimentar estoque',  'estoque'),
  ('notificacoes.visualizar','Ver notificações',           'sistema')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, allowed)
select 'administrador', key, true from public.permissions
where key in ('estoque.visualizar', 'estoque.editar', 'notificacoes.visualizar')
on conflict (role, permission_key) do update set allowed = true;

insert into public.role_permissions (role, permission_key, allowed) values
  ('gerente','estoque.visualizar',true), ('gerente','estoque.editar',true), ('gerente','notificacoes.visualizar',true),
  ('funcionario','estoque.visualizar',true), ('funcionario','estoque.editar',true), ('funcionario','notificacoes.visualizar',true),
  ('financeiro','notificacoes.visualizar',true),
  ('suporte','notificacoes.visualizar',true)
on conflict (role, permission_key) do update set allowed = excluded.allowed;

-- ── PRODUTOS: localização física no estoque ─────────────────────────────
-- Lote e data de entrada não ficam aqui: um produto pode ter vários lotes
-- ao longo do tempo, então isso mora em cada linha de estoque_movimentacoes.
alter table public.products add column if not exists localizacao text;

-- ============================================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================================
create table if not exists public.estoque_movimentacoes (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references public.products(id) on delete cascade,
  tipo         text not null check (tipo in ('entrada_manual','saida_manual','venda','cancelamento','reposicao','ajuste')),
  quantidade   int not null,          -- assinado: positivo = entrada, negativo = saída
  saldo_apos   int not null default 0, -- preenchido pelo trigger abaixo, não precisa ser mandado pelo cliente
  motivo       text,
  lote         text,
  pedido_id    bigint references public.orders(id),
  usuario_id   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- Toda movimentação inserida nesta tabela — seja manual (Estoque → Movimentar)
-- ou automática (venda/cancelamento vindos do trigger de pedidos abaixo) —
-- passa por aqui, que é quem de fato altera products.stock. Fonte única de
-- verdade: ninguém precisa (nem deve) fazer UPDATE direto em products.stock
-- fora daqui pra registrar uma movimentação.
create or replace function public.estoque_mov_apply_stock()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  novo_saldo int;
begin
  update public.products set stock = stock + new.quantidade where id = new.product_id
    returning stock into novo_saldo;
  new.saldo_apos = novo_saldo;
  if new.usuario_id is null then
    new.usuario_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists estoque_mov_apply_stock on public.estoque_movimentacoes;
create trigger estoque_mov_apply_stock
  before insert on public.estoque_movimentacoes
  for each row execute function public.estoque_mov_apply_stock();

-- ============================================================================
-- NOTIFICAÇÕES
-- ============================================================================
create table if not exists public.notificacoes (
  id           bigint generated always as identity primary key,
  categoria    text not null check (categoria in ('pedidos','estoque','clientes','financeiro','sistema')),
  tipo         text not null,
  titulo       text not null,
  descricao    text,
  link_href    text,
  entidade     text,
  entidade_id  text,
  lida         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notificacoes_created_at_idx on public.notificacoes (created_at desc);
create index if not exists notificacoes_lida_idx on public.notificacoes (lida);
create index if not exists estoque_mov_product_idx on public.estoque_movimentacoes (product_id, created_at desc);

-- ── PEDIDOS: notificação de pedido novo ─────────────────────────────────
create or replace function public.orders_after_insert_notify()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
  values ('pedidos', 'novo_pedido', 'Novo pedido recebido',
          'Pedido #' || coalesce(new.order_number, new.id::text) || ' — R$ ' || to_char(new.total, 'FM999999990.00'),
          'admin-pedidos.html', 'pedido', new.id::text);
  return new;
end;
$$;

drop trigger if exists orders_after_insert_notify on public.orders;
create trigger orders_after_insert_notify
  after insert on public.orders
  for each row execute function public.orders_after_insert_notify();

-- ── PEDIDOS: mudança de status → baixa/reposição de estoque + notificação ──
-- "Pedido aprovado" aqui é o admin marcando o status como 'pago' em Pedidos
-- (não existe gateway de pagamento real neste projeto). Cancelar um pedido
-- que já estava pago repõe o estoque; as demais transições só notificam.
create or replace function public.orders_after_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  item record;
begin
  if new.status is distinct from old.status then

    if new.status = 'pago' and old.status <> 'pago' then
      for item in select product_id, qty from public.order_items where order_id = new.id and product_id is not null loop
        insert into public.estoque_movimentacoes (product_id, tipo, quantidade, motivo, pedido_id)
          values (item.product_id, 'venda', -item.qty, 'Pedido #' || coalesce(new.order_number, new.id::text), new.id);
      end loop;
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('pedidos', 'pedido_pago', 'Pagamento confirmado',
                'Pedido #' || coalesce(new.order_number, new.id::text) || ' foi marcado como pago.',
                'admin-pedidos.html', 'pedido', new.id::text);

    elsif new.status = 'cancelado' and old.status = 'pago' then
      for item in select product_id, qty from public.order_items where order_id = new.id and product_id is not null loop
        insert into public.estoque_movimentacoes (product_id, tipo, quantidade, motivo, pedido_id)
          values (item.product_id, 'cancelamento', item.qty, 'Cancelamento do pedido #' || coalesce(new.order_number, new.id::text), new.id);
      end loop;
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('pedidos', 'pedido_cancelado', 'Pedido cancelado',
                'Pedido #' || coalesce(new.order_number, new.id::text) || ' foi cancelado — estoque reposto.',
                'admin-pedidos.html', 'pedido', new.id::text);

    elsif new.status = 'enviado' then
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('pedidos', 'pedido_enviado', 'Pedido enviado',
                'Pedido #' || coalesce(new.order_number, new.id::text) || ' saiu para entrega.',
                'admin-pedidos.html', 'pedido', new.id::text);

    elsif new.status = 'entregue' then
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('pedidos', 'pedido_entregue', 'Pedido entregue',
                'Pedido #' || coalesce(new.order_number, new.id::text) || ' foi entregue.',
                'admin-pedidos.html', 'pedido', new.id::text);
    end if;

  end if;
  return new;
end;
$$;

drop trigger if exists orders_after_status_change on public.orders;
create trigger orders_after_status_change
  after update on public.orders
  for each row execute function public.orders_after_status_change();

-- ── PRODUTOS: estoque cruzando o mínimo/zero → notificação ──────────────
-- Só dispara na TRANSIÇÃO exata (evita notificação repetida a cada salvamento
-- enquanto o produto continua abaixo do mínimo).
create or replace function public.products_after_stock_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.stock is distinct from old.stock then
    if old.stock > 0 and new.stock <= 0 then
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('estoque', 'estoque_zerado', 'Produto sem estoque',
                new.name || ' zerou o estoque.', 'admin-estoque.html', 'produto', new.id::text);
    elsif old.stock > old.min_stock and new.stock <= new.min_stock and new.stock > 0 then
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('estoque', 'estoque_baixo', 'Estoque baixo',
                new.name || ' está com ' || new.stock || ' unidade(s), abaixo do mínimo (' || new.min_stock || ').',
                'admin-estoque.html', 'produto', new.id::text);
    elsif old.stock <= 0 and new.stock > 0 then
      insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
        values ('estoque', 'estoque_reposto', 'Estoque reposto',
                new.name || ' voltou a ter estoque (' || new.stock || ' unidade(s)).',
                'admin-estoque.html', 'produto', new.id::text);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists products_after_stock_change on public.products;
create trigger products_after_stock_change
  after update on public.products
  for each row execute function public.products_after_stock_change();

-- ── CLIENTES: novo cadastro → notificação ────────────────────────────────
create or replace function public.profiles_after_insert_notify()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role = 'cliente' then
    insert into public.notificacoes (categoria, tipo, titulo, descricao, link_href, entidade, entidade_id)
      values ('clientes', 'novo_cliente', 'Novo cliente cadastrado',
              coalesce(new.full_name, new.email, 'Cliente') || ' se cadastrou na loja.',
              'admin-clientes.html', 'cliente', new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_after_insert_notify on public.profiles;
create trigger profiles_after_insert_notify
  after insert on public.profiles
  for each row execute function public.profiles_after_insert_notify();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.estoque_movimentacoes enable row level security;
alter table public.notificacoes          enable row level security;

drop policy if exists estoque_mov_select on public.estoque_movimentacoes;
create policy estoque_mov_select on public.estoque_movimentacoes for select
  using (public.has_permission('estoque.visualizar'));

drop policy if exists estoque_mov_insert on public.estoque_movimentacoes;
create policy estoque_mov_insert on public.estoque_movimentacoes for insert
  with check (public.has_permission('estoque.editar'));

drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes for select
  using (public.has_permission('notificacoes.visualizar'));

drop policy if exists notificacoes_update on public.notificacoes;
create policy notificacoes_update on public.notificacoes for update
  using (public.has_permission('notificacoes.visualizar'))
  with check (public.has_permission('notificacoes.visualizar'));

drop policy if exists notificacoes_delete on public.notificacoes;
create policy notificacoes_delete on public.notificacoes for delete
  using (public.has_permission('notificacoes.visualizar'));

-- ============================================================================
-- Alfa Informática — Schema completo do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Este script é idempotente: pode ser rodado mais de uma vez sem quebrar.
-- ============================================================================

-- ── EXTENSÕES ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────────────────
do $$ begin
  create type order_status as enum ('aguardando_pagamento','pago','preparando','enviado','entregue','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- PROFILES (1:1 com auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  cpf         text,
  phone       text,
  role        text not null default 'cliente',
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;

-- Cria a profile automaticamente quando alguém se cadastra. Se raw_user_meta_data
-- já trouxer um "role" (usado pela Edge Function admin-create-staff ao criar
-- contas de equipe), usa esse papel — senão, cliente comum.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, coalesce(new.raw_user_meta_data->>'role', 'cliente'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- PERMISSÕES (RBAC editável — tabela, não hardcode)
-- ============================================================================
create table if not exists public.permissions (
  key         text primary key,
  label       text not null,
  module      text not null
);

insert into public.permissions (key, label, module) values
  ('produtos.editar',        'Editar produtos',              'produtos'),
  ('produtos.excluir',       'Excluir produtos',             'produtos'),
  ('precos.editar',          'Editar preços',                'produtos'),
  ('categorias.editar',      'Editar categorias',            'categorias'),
  ('pedidos.visualizar',     'Ver pedidos',                  'pedidos'),
  ('pedidos.editar',         'Alterar status de pedidos',    'pedidos'),
  ('clientes.visualizar',    'Ver clientes',                 'clientes'),
  ('clientes.editar',        'Bloquear/editar clientes',     'clientes'),
  ('avaliacoes.moderar',     'Moderar avaliações',           'avaliacoes'),
  ('faturamento.visualizar', 'Ver faturamento',              'financeiro'),
  ('banners.editar',         'Editar banners',                'marketing'),
  ('equipe.gerenciar',       'Gerenciar equipe e permissões','equipe'),
  ('configuracoes.editar',   'Editar configurações da loja', 'configuracoes')
on conflict (key) do nothing;

create table if not exists public.role_permissions (
  role            text not null,
  permission_key  text not null references public.permissions(key) on delete cascade,
  allowed         boolean not null default true,
  primary key (role, permission_key)
);

-- Defaults dos 6 cargos do pedido original. Administrador = dono/"Super Admin", sempre tudo liberado.
insert into public.role_permissions (role, permission_key, allowed)
select 'administrador', key, true from public.permissions
on conflict (role, permission_key) do update set allowed = true;

insert into public.role_permissions (role, permission_key, allowed) values
  ('gerente','produtos.editar',true), ('gerente','produtos.excluir',true), ('gerente','precos.editar',true),
  ('gerente','categorias.editar',true), ('gerente','pedidos.visualizar',true), ('gerente','pedidos.editar',true),
  ('gerente','clientes.visualizar',true), ('gerente','clientes.editar',true), ('gerente','avaliacoes.moderar',true),
  ('gerente','faturamento.visualizar',true), ('gerente','banners.editar',true),
  ('gerente','equipe.gerenciar',false), ('gerente','configuracoes.editar',false),

  ('financeiro','pedidos.visualizar',true), ('financeiro','pedidos.editar',false),
  ('financeiro','clientes.visualizar',true), ('financeiro','faturamento.visualizar',true),

  ('suporte','clientes.visualizar',true), ('suporte','clientes.editar',true),
  ('suporte','pedidos.visualizar',true), ('suporte','avaliacoes.moderar',true),

  ('editor','produtos.editar',true), ('editor','categorias.editar',true), ('editor','banners.editar',true),

  ('funcionario','produtos.editar',true), ('funcionario','pedidos.visualizar',true)
on conflict (role, permission_key) do update set allowed = excluded.allowed;

-- Helpers usados nas policies (security definer p/ poder ler profiles sem depender das próprias RLS)
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role <> 'cliente' and not is_blocked from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.has_permission(perm_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select rp.allowed
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role and rp.permission_key = perm_key
    where p.id = auth.uid() and not p.is_blocked
  ), false);
$$;

-- ============================================================================
-- CATEGORIAS
-- ============================================================================
create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  nome        text not null,
  slug        text not null unique,
  icone       text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.subcategories (
  id            bigint generated always as identity primary key,
  categoria_id  bigint not null references public.categories(id) on delete cascade,
  nome          text not null,
  slug          text not null,
  ordem         int not null default 0,
  ativo         boolean not null default true,
  unique (categoria_id, slug)
);

-- ============================================================================
-- PRODUTOS
-- ============================================================================
create table if not exists public.products (
  id                  bigint generated always as identity primary key,
  name                text not null,
  slug                text unique,
  brand               text,
  model               text,
  category_id         bigint references public.categories(id),
  subcategory_id      bigint references public.subcategories(id),
  sku                 text,
  ean                 text,
  ncm                 text,
  codigo_interno      text,
  short_description   text,
  description         text,
  specs               jsonb not null default '[]'::jsonb,
  price               numeric(12,2) not null default 0,
  old_price           numeric(12,2),
  cost_price          numeric(12,2),
  stock               int not null default 0,
  min_stock           int not null default 0,
  weight              numeric,
  dimensions          text,
  warranty            text,
  supplier            text,
  featured            boolean not null default false,
  is_new              boolean not null default false,
  best_seller         boolean not null default false,
  free_shipping       boolean not null default false,
  active              boolean not null default true,
  images              jsonb not null default '[]'::jsonb,
  video_url           text,
  rating              numeric not null default 0,
  reviews_count       int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ENDEREÇOS
-- ============================================================================
create table if not exists public.addresses (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  label           text,
  recipient_name  text,
  cep             text,
  street          text,
  number          text,
  complement      text,
  neighborhood    text,
  city            text,
  state           text,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- PEDIDOS
-- ============================================================================
create table if not exists public.orders (
  id                 bigint generated always as identity primary key,
  order_number       text unique,
  user_id            uuid references public.profiles(id),
  status             order_status not null default 'aguardando_pagamento',
  subtotal           numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  freight            numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  shipping_method    text,
  payment_method     text,
  address_snapshot   jsonb,
  tracking_code      text,
  carrier             text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id                      bigint generated always as identity primary key,
  order_id                bigint not null references public.orders(id) on delete cascade,
  product_id              bigint references public.products(id),
  product_name_snapshot   text,
  product_image_snapshot  text,
  unit_price              numeric(12,2) not null,
  qty                     int not null,
  line_total              numeric(12,2) not null
);

-- ============================================================================
-- AVALIAÇÕES
-- ============================================================================
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     bigint references public.products(id) on delete cascade,
  user_id        uuid references public.profiles(id),
  customer_name  text,
  rating         int not null,
  title          text,
  comment        text,
  media_urls     jsonb not null default '[]'::jsonb,
  status         review_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles         enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.categories       enable row level security;
alter table public.subcategories    enable row level security;
alter table public.products         enable row level security;
alter table public.addresses        enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.reviews          enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.has_permission('clientes.visualizar') or public.has_permission('equipe.gerenciar'));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_update_staff on public.profiles;
create policy profiles_update_staff on public.profiles for update
  using (public.has_permission('equipe.gerenciar') or public.has_permission('clientes.editar'));

-- permissions / role_permissions (leitura p/ staff, escrita só quem gerencia equipe)
drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions for select using (public.is_staff());

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions for select using (public.is_staff());

drop policy if exists role_permissions_write on public.role_permissions;
create policy role_permissions_write on public.role_permissions for all
  using (public.has_permission('equipe.gerenciar'))
  with check (public.has_permission('equipe.gerenciar'));

-- categories / subcategories
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select using (ativo = true or public.is_staff());

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all
  using (public.has_permission('categorias.editar'))
  with check (public.has_permission('categorias.editar'));

drop policy if exists subcategories_select on public.subcategories;
create policy subcategories_select on public.subcategories for select using (ativo = true or public.is_staff());

drop policy if exists subcategories_write on public.subcategories;
create policy subcategories_write on public.subcategories for all
  using (public.has_permission('categorias.editar'))
  with check (public.has_permission('categorias.editar'));

-- products
drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (active = true or public.is_staff());

-- Insert/update usam produtos.editar; delete é controlado separadamente por
-- produtos.excluir (policies "for all" incluiriam delete e vazariam permissão).
drop policy if exists products_write on public.products;
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert
  with check (public.has_permission('produtos.editar'));

drop policy if exists products_update on public.products;
create policy products_update on public.products for update
  using (public.has_permission('produtos.editar'))
  with check (public.has_permission('produtos.editar'));

drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete
  using (public.has_permission('produtos.excluir'));

-- addresses
drop policy if exists addresses_select on public.addresses;
create policy addresses_select on public.addresses for select
  using (user_id = auth.uid() or public.has_permission('clientes.visualizar'));

drop policy if exists addresses_write_self on public.addresses;
create policy addresses_write_self on public.addresses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- orders
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (user_id = auth.uid() or public.has_permission('pedidos.visualizar'));

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (user_id = auth.uid() or user_id is null or public.is_staff());

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
  using (public.has_permission('pedidos.editar'));

-- order_items
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('pedidos.visualizar')))
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert
  with check (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null or public.is_staff()))
  );

-- reviews
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.has_permission('avaliacoes.moderar'));

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists reviews_moderate on public.reviews;
create policy reviews_moderate on public.reviews for update
  using (public.has_permission('avaliacoes.moderar'));

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using (public.has_permission('avaliacoes.moderar'));

-- ============================================================================
-- CRIAR SUA CONTA ADMINISTRADOR (rode manualmente, uma única vez)
-- ============================================================================
-- Passo 1: Vá em Authentication → Users → "Add user" no painel do Supabase e
--          crie um usuário com seu e-mail/senha (marque "Auto Confirm User").
-- Passo 2: Rode o comando abaixo trocando o e-mail pelo que você usou:
--
--   update public.profiles set role = 'administrador'
--   where id = (select id from auth.users where email = 'SEU_EMAIL_AQUI@exemplo.com');
--
-- Pronto — essa conta já pode logar em admin-login.html com acesso total.

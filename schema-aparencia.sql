-- ============================================================================
-- Alfa Informática — Schema do módulo "Aparência" (rodar DEPOIS de schema.sql
-- e seed.sql já terem sido rodados). Cole tudo no SQL Editor do Supabase e
-- clique em "Run". Idempotente: pode rodar de novo sem quebrar.
-- ============================================================================

-- ============================================================================
-- SITE_SETTINGS (linha única — configurações gerais da loja)
-- ============================================================================
create table if not exists public.site_settings (
  id smallint primary key default 1,
  constraint site_settings_singleton check (id = 1),

  -- identidade
  site_name text not null default 'Alfa Informática',
  logo_dark_url text, logo_light_url text, favicon_url text,
  whatsapp_number text default '5565992655883',
  instagram_url text, facebook_url text, tiktok_url text, youtube_url text, linkedin_url text,
  contact_email text, contact_phone text, business_hours text,

  -- header
  header_sticky boolean not null default true,
  header_height int not null default 72,
  announcement_ativo boolean not null default false,
  announcement_texto text,
  announcement_link_url text,

  -- cores (paleta dark/light — valores default = exatamente os hardcoded hoje,
  -- então inserir essa linha não muda nada visualmente até alguém editar)
  theme_colors jsonb not null default '{
    "dark":  {"primary":"#0066FF","secondary":"#0052CC","button":"#0066FF","text":"#FFFFFF","title":"#FFFFFF","card":"#303030","header":"#1F1F1F","footer":"#1A1A1A","background":"#202020","link":"#0066FF","hover":"#0052CC"},
    "light": {"primary":"#0066FF","secondary":"#0052CC","button":"#0066FF","text":"#111827","title":"#111827","card":"#FFFFFF","header":"#FFFFFF","footer":"#F5F7FA","background":"#F5F7FA","link":"#0066FF","hover":"#0052CC"}
  }'::jsonb,

  -- seo
  seo_title text default 'Alfa Informática — Tecnologia e Games',
  seo_description text,
  seo_og_image_url text,

  -- scripts de terceiros
  scripts_head text, scripts_body_open text, scripts_body_close text,

  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- HERO SLIDES
-- ============================================================================
create table if not exists public.hero_slides (
  id bigint generated always as identity primary key,
  imagem_url text not null,
  titulo text, subtitulo text, cta_label text, cta_url text,
  overlay_ativo boolean not null default false,
  overlay_opacidade numeric not null default 0.35,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- BANNERS (genérico — hoje usado em "Ofertas em Destaque" da home)
-- ============================================================================
create table if not exists public.banners (
  id bigint generated always as identity primary key,
  placement text not null default 'ofertas_home',
  titulo text, imagem_url text not null, link_url text, cta_label text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- POPUPS
-- ============================================================================
do $$ begin
  create type popup_tipo as enum ('cupom','newsletter','promocao','aviso');
exception when duplicate_object then null; end $$;

create table if not exists public.popups (
  id bigint generated always as identity primary key,
  tipo popup_tipo not null,
  titulo text, mensagem text, imagem_url text,
  cta_label text, cta_url text, cupom_codigo text,
  frequencia text not null default 'uma_vez_sessao',
  frequencia_dias int,
  data_inicio timestamptz, data_fim timestamptz,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- HOMEPAGE SECTIONS (catálogo fixo das seções da home, não construtor genérico)
-- ============================================================================
create table if not exists public.homepage_sections (
  section_key text primary key,
  ordem int not null default 0,
  visivel boolean not null default true,
  titulo_override text,
  subtitulo_override text
);
insert into public.homepage_sections (section_key, ordem) values
  ('beneficios_categorias', 1), ('nivel', 2), ('produtos_destaque', 3),
  ('mais_vendidos', 4), ('ofertas_banner', 5), ('lancamentos', 6),
  ('perifericos_alta', 7), ('marcas', 8)
on conflict (section_key) do nothing;

-- ============================================================================
-- CATEGORIES — colunas novas (imagem/banner/cor/exibir na home)
-- ============================================================================
alter table public.categories add column if not exists imagem_url text;
alter table public.categories add column if not exists banner_url text;
alter table public.categories add column if not exists cor text;
alter table public.categories add column if not exists mostrar_home boolean not null default false;
alter table public.categories add column if not exists ordem_home int not null default 0;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.site_settings     enable row level security;
alter table public.hero_slides       enable row level security;
alter table public.banners           enable row level security;
alter table public.popups            enable row level security;
alter table public.homepage_sections enable row level security;

drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings for select using (true);
drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings for all
  using (public.has_permission('configuracoes.editar'))
  with check (public.has_permission('configuracoes.editar'));

drop policy if exists hero_slides_select on public.hero_slides;
create policy hero_slides_select on public.hero_slides for select using (ativo = true or public.is_staff());
drop policy if exists hero_slides_write on public.hero_slides;
create policy hero_slides_write on public.hero_slides for all
  using (public.has_permission('banners.editar'))
  with check (public.has_permission('banners.editar'));

drop policy if exists banners_select on public.banners;
create policy banners_select on public.banners for select using (ativo = true or public.is_staff());
drop policy if exists banners_write on public.banners;
create policy banners_write on public.banners for all
  using (public.has_permission('banners.editar'))
  with check (public.has_permission('banners.editar'));

drop policy if exists popups_select on public.popups;
create policy popups_select on public.popups for select using (ativo = true or public.is_staff());
drop policy if exists popups_write on public.popups;
create policy popups_write on public.popups for all
  using (public.has_permission('banners.editar'))
  with check (public.has_permission('banners.editar'));

drop policy if exists homepage_sections_select on public.homepage_sections;
create policy homepage_sections_select on public.homepage_sections for select using (true);
drop policy if exists homepage_sections_write on public.homepage_sections;
create policy homepage_sections_write on public.homepage_sections for all
  using (public.has_permission('banners.editar'))
  with check (public.has_permission('banners.editar'));

-- ============================================================================
-- STORAGE (bucket público de imagens do site)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read on storage.objects for select
  using (bucket_id = 'site-assets');

drop policy if exists site_assets_staff_write on storage.objects;
create policy site_assets_staff_write on storage.objects for all
  using (bucket_id = 'site-assets' and (public.has_permission('configuracoes.editar') or public.has_permission('banners.editar')))
  with check (bucket_id = 'site-assets' and (public.has_permission('configuracoes.editar') or public.has_permission('banners.editar')));

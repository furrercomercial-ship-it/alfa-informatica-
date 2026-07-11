-- ============================================================================
-- Alfa Informática — Schema do CMS visual (Design System + Textos + Blocos +
-- Páginas). Rodar DEPOIS de schema.sql e schema-aparencia.sql já terem sido
-- rodados. Cole tudo no SQL Editor do Supabase e clique em "Run". Idempotente.
-- ============================================================================

-- ── ENUMS ────────────────────────────────────────────────────────────────
do $$ begin
  create type block_visibilidade as enum ('todos','desktop','celular');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagina_tipo as enum ('institucional','contato','suporte','pedido_concluido','erro_404','categorias_listagem');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagina_status as enum ('rascunho','publicado');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- DESIGN SYSTEM — expande theme_colors de 11 pra ~51 chaves por tema (dark/
-- light), e adiciona tipografia + estilo de botão, cada um com uma coluna
-- "_draft" pro fluxo salvar-rascunho/publicar. Os valores novos abaixo foram
-- escolhidos pra bater com o que já está hardcoded no site hoje — publicar
-- isso não muda nada visualmente até alguém editar de propósito.
-- ============================================================================
update public.site_settings
set theme_colors = jsonb_set(
  jsonb_set(theme_colors, '{dark}', (theme_colors->'dark') || '{
    "sidebar":"#1F1F1F","subtitle":"#D1D5DB","muted":"#9CA3AF","link_hover":"#0052CC",
    "price":"#FFFFFF","price_old":"#9CA3AF","price_promo":"#16A34A","price_pix":"#16A34A","price_installment":"#16A34A",
    "rating_star":"#F59E0B","rating_text":"#9CA3AF","icon":"#0066FF","divider":"#404040","border":"#404040",
    "badge_bg":"#3B9EFF","badge_text":"#FFFFFF",
    "warning_bg":"rgba(245,158,11,.14)","warning_text":"#F59E0B",
    "success_bg":"rgba(22,163,74,.14)","success_text":"#16A34A",
    "danger_bg":"rgba(226,61,66,.14)","danger_text":"#E23D42",
    "btn_primary_bg":"#0066FF","btn_primary_text":"#FFFFFF","btn_primary_hover":"#0052CC",
    "btn_secondary_bg":"transparent","btn_secondary_text":"#0066FF","btn_secondary_hover":"#0052CC",
    "btn_buy_bg":"#16A34A","btn_buy_text":"#FFFFFF","btn_buy_hover":"#15803D",
    "input_bg":"#2B2B2B","input_border":"#404040","input_text":"#FFFFFF","placeholder":"#9CA3AF","focus_ring":"#0066FF",
    "switch_on":"#0066FF","checkbox":"#0066FF","radio":"#0066FF",
    "filter_bg":"#2B2B2B","filter_text":"#D1D5DB","breadcrumb_text":"#9CA3AF"
  }'::jsonb),
  '{light}',
  (theme_colors->'light') || '{
    "sidebar":"#FFFFFF","subtitle":"#4B5563","muted":"#8A8F9C","link_hover":"#0052CC",
    "price":"#111827","price_old":"#6B7280","price_promo":"#16A34A","price_pix":"#16A34A","price_installment":"#16A34A",
    "rating_star":"#F59E0B","rating_text":"#8A8F9C","icon":"#0066FF","divider":"#E6E8EC","border":"#E6E8EC",
    "badge_bg":"#3B9EFF","badge_text":"#FFFFFF",
    "warning_bg":"rgba(245,158,11,.12)","warning_text":"#B45309",
    "success_bg":"rgba(22,163,74,.12)","success_text":"#15803D",
    "danger_bg":"rgba(226,61,66,.12)","danger_text":"#C22127",
    "btn_primary_bg":"#0066FF","btn_primary_text":"#FFFFFF","btn_primary_hover":"#0052CC",
    "btn_secondary_bg":"transparent","btn_secondary_text":"#0066FF","btn_secondary_hover":"#0052CC",
    "btn_buy_bg":"#16A34A","btn_buy_text":"#FFFFFF","btn_buy_hover":"#15803D",
    "input_bg":"#FFFFFF","input_border":"#E6E8EC","input_text":"#111827","placeholder":"#8A8F9C","focus_ring":"#0066FF",
    "switch_on":"#0066FF","checkbox":"#0066FF","radio":"#0066FF",
    "filter_bg":"#FFFFFF","filter_text":"#4B5563","breadcrumb_text":"#8A8F9C"
  }'::jsonb)
where id = 1 and not (theme_colors->'dark' ? 'sidebar');

alter table public.site_settings add column if not exists theme_colors_draft jsonb;

alter table public.site_settings add column if not exists typography jsonb not null default '{
  "font_heading": "-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif",
  "font_body": "-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif",
  "titulo": {"size":"28px","weight":"800","line_height":"1.2","spacing":"-0.01em","transform":"none"},
  "subtitulo": {"size":"16px","weight":"600","line_height":"1.4","spacing":"0","transform":"none"},
  "texto": {"size":"14px","weight":"400","line_height":"1.6","spacing":"0","transform":"none"},
  "botao": {"size":"13px","weight":"700","line_height":"1","spacing":"0.02em","transform":"none"},
  "preco": {"size":"22px","weight":"800","line_height":"1.1","spacing":"0","transform":"none"},
  "menu": {"size":"13px","weight":"600","line_height":"1.2","spacing":"0","transform":"none"},
  "card": {"size":"13px","weight":"600","line_height":"1.4","spacing":"0","transform":"none"}
}'::jsonb;
alter table public.site_settings add column if not exists typography_draft jsonb;

-- raio 0px por padrão: o site já teve os cantos arredondados removidos de
-- propósito (ver histórico do git) — não reintroduzir isso sem o admin pedir.
alter table public.site_settings add column if not exists button_style jsonb not null default '{
  "primario": {"border_width":"0px","radius":"0px","shadow":"0 2px 10px rgba(0,102,255,.28)","padding":"12px 22px","height":"auto"},
  "secundario": {"border_width":"1px","radius":"0px","shadow":"none","padding":"12px 22px","height":"auto"},
  "comprar": {"border_width":"0px","radius":"0px","shadow":"0 2px 10px rgba(22,163,74,.25)","padding":"14px 24px","height":"auto"}
}'::jsonb;
alter table public.site_settings add column if not exists button_style_draft jsonb;

-- ============================================================================
-- TEXTOS EDITÁVEIS
-- ============================================================================
create table if not exists public.site_texts (
  chave         text primary key,
  valor         text not null,
  valor_padrao  text not null,
  categoria     text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id)
);

insert into public.site_texts (chave, valor, valor_padrao, categoria) values
  ('comprar','Comprar','Comprar','botoes'),
  ('adicionar_carrinho','Adicionar ao Carrinho','Adicionar ao Carrinho','botoes'),
  ('continuar_comprando','Continuar Comprando','Continuar Comprando','botoes'),
  ('finalizar_pedido','Finalizar Pedido','Finalizar Pedido','botoes'),
  ('produto_indisponivel','Produto Indisponível','Produto Indisponível','produto'),
  ('frete_gratis','Frete Grátis','Frete Grátis','produto'),
  ('avaliacoes','Avaliações','Avaliações','produto'),
  ('pix','PIX','PIX','pagamento'),
  ('parcelamento','Parcelamento','Parcelamento','pagamento'),
  ('estoque','Estoque','Estoque','produto'),
  ('categorias','Categorias','Categorias','navegacao'),
  ('filtros','Filtros','Filtros','navegacao'),
  ('meu_carrinho','Meu Carrinho','Meu Carrinho','carrinho'),
  ('resumo','Resumo','Resumo','carrinho'),
  ('cupom','Cupom','Cupom','carrinho'),
  ('minha_conta','Minha Conta','Minha Conta','conta'),
  ('meus_pedidos','Meus Pedidos','Meus Pedidos','conta'),
  ('favoritos','Favoritos','Favoritos','navegacao'),
  ('ver_mais','Ver mais','Ver mais','geral'),
  ('em_breve','Em breve','Em breve','geral')
on conflict (chave) do nothing;

-- ============================================================================
-- BLOCOS POR PÁGINA (catálogo fixo, não construtor genérico — mesmo espírito
-- de homepage_sections, que continua intocada)
-- ============================================================================
create table if not exists public.page_blocks (
  id              bigint generated always as identity primary key,
  page_key        text not null,
  block_key       text not null,
  titulo_override text,
  ordem           int not null default 0,
  visivel         boolean not null default true,
  visibilidade    block_visibilidade not null default 'todos',
  bloqueado       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id),
  unique (page_key, block_key)
);

drop trigger if exists page_blocks_set_updated_at on public.page_blocks;
create trigger page_blocks_set_updated_at before update on public.page_blocks
  for each row execute function public.set_updated_at();

-- Catálogo alinhado com a estrutura real de cada página (confirmado lendo o
-- HTML/JS de cada uma — nem toda seção "óbvia" existe de fato como bloco
-- empilhável; ex: produto.html tem galeria+preço lado a lado num grid só,
-- não dois blocos separados, e descrição/especificações são abas, não
-- seções distintas).
insert into public.page_blocks (page_key, block_key, ordem) values
  ('produto','principal',1),('produto','descricao_especificacoes',2),('produto','avaliacoes',3),
  ('categoria','breadcrumb',1),('categoria','cat_header',2),('categoria','subcategorias',3),('categoria','grid_produtos',4),
  ('carrinho','itens',1),('carrinho','ofertas',2),
  ('checkout','contato',1),('checkout','entrega',2),('checkout','envio',3),('checkout','pagamento',4),
  ('minha_conta','pedidos',1),('minha_conta','dados',2),('minha_conta','enderecos',3),('minha_conta','favoritos',4)
on conflict (page_key, block_key) do nothing;

-- ============================================================================
-- PÁGINAS CMS (institucional/contato/suporte/pedido concluído/404/categorias)
-- ============================================================================
create table if not exists public.paginas_cms (
  id                bigint generated always as identity primary key,
  slug              text not null unique,
  tipo              pagina_tipo not null default 'institucional',
  titulo            text not null,
  subtitulo         text,
  banner_url        text,
  conteudo_html     text,
  seo_titulo        text,
  seo_description   text,
  seo_og_image_url  text,
  cores_override    jsonb not null default '{}'::jsonb,
  configuracoes     jsonb not null default '{}'::jsonb,
  status            pagina_status not null default 'rascunho',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),
  updated_by        uuid references public.profiles(id)
);

drop trigger if exists paginas_cms_set_updated_at on public.paginas_cms;
create trigger paginas_cms_set_updated_at before update on public.paginas_cms
  for each row execute function public.set_updated_at();

-- As 3 páginas funcionais (pedido concluído / 404 / listagem de categorias)
-- nascem publicadas, porque o checkout e o roteamento de erro dependem delas
-- pra funcionar desde já. As institucionais/contato/suporte nascem em
-- rascunho — têm texto placeholder e não devem ficar públicas sem revisão
-- (principalmente política de privacidade/termos, que são conteúdo legal).
insert into public.paginas_cms (slug, tipo, titulo, subtitulo, conteudo_html, status) values
  ('sobre', 'institucional', 'Sobre a Alfa Informática', 'Quem somos e o que fazemos', '<p>Conte aqui a história da sua loja. Edite em Aparência → Páginas.</p>', 'rascunho'),
  ('politica-de-privacidade', 'institucional', 'Política de Privacidade', null, '<p>Edite este texto em Aparência → Páginas antes de publicar.</p>', 'rascunho'),
  ('termos-de-uso', 'institucional', 'Termos de Uso', null, '<p>Edite este texto em Aparência → Páginas antes de publicar.</p>', 'rascunho'),
  ('garantia', 'institucional', 'Garantia', null, '<p>Edite este texto em Aparência → Páginas antes de publicar.</p>', 'rascunho'),
  ('trocas-e-devolucoes', 'institucional', 'Trocas e Devoluções', null, '<p>Edite este texto em Aparência → Páginas antes de publicar.</p>', 'rascunho'),
  ('contato', 'contato', 'Fale Conosco', 'Estamos aqui pra ajudar', null, 'rascunho'),
  ('suporte', 'suporte', 'Central de Suporte', 'Tire suas dúvidas', null, 'rascunho'),
  ('pedido-concluido', 'pedido_concluido', 'Pedido Confirmado!', 'Obrigado pela sua compra', null, 'publicado'),
  ('404', 'erro_404', 'Página não encontrada', 'O link que você acessou não existe ou foi movido', null, 'publicado'),
  ('categorias', 'categorias_listagem', 'Todas as Categorias', null, null, 'publicado')
on conflict (slug) do nothing;

-- ============================================================================
-- HISTÓRICO DE VERSÕES (Design System, Blocos, Páginas — não reaproveita
-- scripts_historico, pra não arriscar a feature de Scripts já testada)
-- ============================================================================
create table if not exists public.conteudo_historico (
  id                bigint generated always as identity primary key,
  entidade          text not null check (entidade in ('design_system','pagina_cms','page_block','homepage_section')),
  entidade_id       text not null,
  acao              text not null,
  dados_anteriores  jsonb,
  dados_novos       jsonb,
  usuario_id        uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index if not exists idx_conteudo_historico_entidade on public.conteudo_historico(entidade, entidade_id);

-- ============================================================================
-- PERMISSÕES NOVAS — só Administrador recebe por padrão (mesmo padrão já
-- usado nas rodadas anteriores; outros cargos liberados manualmente depois)
-- ============================================================================
insert into public.permissions (key, label, module) values
  ('design_system.editar', 'Editar Design System (cores/tipografia/botões)', 'aparencia_cms'),
  ('textos.editar',        'Editar textos do site',                          'aparencia_cms'),
  ('blocos.editar',        'Reorganizar blocos das páginas',                 'aparencia_cms'),
  ('paginas.editar',       'Editar páginas do CMS',                          'aparencia_cms'),
  ('paginas.publicar',     'Publicar páginas do CMS',                        'aparencia_cms')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, allowed)
select 'administrador', key, true from public.permissions
where key in ('design_system.editar','textos.editar','blocos.editar','paginas.editar','paginas.publicar')
on conflict (role, permission_key) do update set allowed = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.site_texts        enable row level security;
alter table public.page_blocks       enable row level security;
alter table public.paginas_cms       enable row level security;
alter table public.conteudo_historico enable row level security;

drop policy if exists site_texts_select on public.site_texts;
create policy site_texts_select on public.site_texts for select using (true);
drop policy if exists site_texts_write on public.site_texts;
create policy site_texts_write on public.site_texts for all
  using (public.has_permission('textos.editar')) with check (public.has_permission('textos.editar'));

drop policy if exists page_blocks_select on public.page_blocks;
create policy page_blocks_select on public.page_blocks for select using (true);
drop policy if exists page_blocks_write on public.page_blocks;
create policy page_blocks_write on public.page_blocks for all
  using (public.has_permission('blocos.editar')) with check (public.has_permission('blocos.editar'));

drop policy if exists paginas_cms_select on public.paginas_cms;
create policy paginas_cms_select on public.paginas_cms for select
  using (status = 'publicado' or public.has_permission('paginas.editar'));
drop policy if exists paginas_cms_insert on public.paginas_cms;
create policy paginas_cms_insert on public.paginas_cms for insert
  with check (public.has_permission('paginas.editar'));
drop policy if exists paginas_cms_update on public.paginas_cms;
create policy paginas_cms_update on public.paginas_cms for update
  using (public.has_permission('paginas.editar')) with check (public.has_permission('paginas.editar'));
drop policy if exists paginas_cms_delete on public.paginas_cms;
create policy paginas_cms_delete on public.paginas_cms for delete
  using (public.has_permission('paginas.editar'));

drop policy if exists conteudo_historico_select on public.conteudo_historico;
create policy conteudo_historico_select on public.conteudo_historico for select
  using (public.has_permission('design_system.editar') or public.has_permission('blocos.editar') or public.has_permission('paginas.editar'));
drop policy if exists conteudo_historico_insert on public.conteudo_historico;
create policy conteudo_historico_insert on public.conteudo_historico for insert
  with check (public.has_permission('design_system.editar') or public.has_permission('blocos.editar') or public.has_permission('paginas.editar'));

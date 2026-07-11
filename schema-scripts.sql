-- ============================================================================
-- Alfa Informática — Schema da Central de Integrações e Scripts (rodar DEPOIS
-- de schema.sql e schema-aparencia.sql já terem sido rodados). Cole tudo no
-- SQL Editor do Supabase e clique em "Run". Idempotente.
-- ============================================================================

-- ── ENUMS ────────────────────────────────────────────────────────────────
do $$ begin
  create type integracao_tipo as enum ('ga4','gtm','meta_pixel','tiktok_pixel','clarity','google_ads','pinterest_tag','hotjar','chat_atendimento','personalizada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type integracao_status as enum ('ativo','inativo','erro','nao_configurado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ambiente_tipo as enum ('producao','desenvolvimento','ambos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_categoria as enum ('essencial','analytics','marketing','personalizacao');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_posicao as enum ('head','body_open','body_close');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_paginas_modo as enum ('todas','somente','exceto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_dispositivos as enum ('todos','desktop','tablet','celular');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_estrategia as enum ('normal','async','defer','apos_carregamento','apos_interacao','atraso');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_prioridade as enum ('alta','normal','baixa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type script_status as enum ('rascunho','ativo','inativo');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- INTEGRAÇÕES (GA4, GTM, Meta Pixel, TikTok Pixel, Clarity, Google Ads,
-- Pinterest Tag, Hotjar, Chat de atendimento, Integração personalizada)
-- ============================================================================
create table if not exists public.integracoes (
  id                 bigint generated always as identity primary key,
  tipo               integracao_tipo not null,
  nome               text not null,
  identificador      text,
  identificador_extra text,
  configuracoes      jsonb not null default '{}'::jsonb,   -- eventos ativos + código bruto (chat/personalizada)
  status             integracao_status not null default 'nao_configurado',
  ambiente           ambiente_tipo not null default 'producao',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id),
  updated_by         uuid references public.profiles(id)
);

drop trigger if exists integracoes_set_updated_at on public.integracoes;
create trigger integracoes_set_updated_at before update on public.integracoes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SCRIPTS PERSONALIZADOS
-- ============================================================================
create table if not exists public.scripts_custom (
  id             bigint generated always as identity primary key,
  nome           text not null,
  descricao      text,
  codigo         text not null,
  categoria      script_categoria not null default 'essencial',
  posicao        script_posicao not null default 'body_close',
  paginas_modo   script_paginas_modo not null default 'todas',
  paginas        jsonb not null default '[]'::jsonb,   -- ["home","categoria","produto",...]
  regras_url     jsonb not null default '[]'::jsonb,   -- [{"tipo":"contem","valor":"..."}]
  dispositivos   script_dispositivos not null default 'todos',
  estrategia     script_estrategia not null default 'normal',
  atraso_ms      int,
  prioridade     script_prioridade not null default 'normal',
  consentimento  script_categoria not null default 'essencial',
  ambiente       ambiente_tipo not null default 'producao',
  status         script_status not null default 'rascunho',
  versao         int not null default 1,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id)
);

drop trigger if exists scripts_custom_set_updated_at on public.scripts_custom;
create trigger scripts_custom_set_updated_at before update on public.scripts_custom
  for each row execute function public.set_updated_at();

-- ============================================================================
-- HISTÓRICO (integrações e scripts personalizados)
-- ============================================================================
create table if not exists public.scripts_historico (
  id                bigint generated always as identity primary key,
  entidade          text not null check (entidade in ('integracao','script')),
  entidade_id       bigint not null,
  acao              text not null,   -- criado / editado / ativado / desativado / excluido / restaurado
  dados_anteriores  jsonb,
  dados_novos       jsonb,
  usuario_id        uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index if not exists idx_scripts_historico_entidade on public.scripts_historico(entidade, entidade_id);

-- ============================================================================
-- SITE_SETTINGS — configurações gerais de scripts (toggles de emergência)
-- ============================================================================
alter table public.site_settings add column if not exists scripts_config jsonb not null default '{
  "custom_scripts_enabled": true,
  "pause_marketing": false,
  "pause_analytics": false,
  "allow_dev_scripts": false,
  "debug_logs": false,
  "block_during_maintenance": false
}'::jsonb;

-- ============================================================================
-- MIGRAÇÃO AUTOMÁTICA dos 3 campos antigos (site_settings.scripts_head/
-- scripts_body_open/scripts_body_close) para linhas de scripts_custom.
-- As colunas antigas NÃO são apagadas — ficam intactas como histórico.
-- Idempotente: só migra se ainda não existir uma linha com esse nome.
-- ============================================================================
insert into public.scripts_custom (nome, descricao, codigo, categoria, posicao, paginas_modo, dispositivos, estrategia, prioridade, consentimento, ambiente, status)
select 'Script antigo — Head', 'Migrado automaticamente do campo antigo "Scripts no <head>" (Aparência → Scripts).', s.scripts_head, 'essencial', 'head', 'todas', 'todos', 'normal', 'normal', 'essencial', 'producao', 'ativo'
from public.site_settings s
where s.id = 1 and s.scripts_head is not null and trim(s.scripts_head) <> ''
  and not exists (select 1 from public.scripts_custom where nome = 'Script antigo — Head');

insert into public.scripts_custom (nome, descricao, codigo, categoria, posicao, paginas_modo, dispositivos, estrategia, prioridade, consentimento, ambiente, status)
select 'Script antigo — Início do body', 'Migrado automaticamente do campo antigo "Início do <body>" (Aparência → Scripts).', s.scripts_body_open, 'essencial', 'body_open', 'todas', 'todos', 'normal', 'normal', 'essencial', 'producao', 'ativo'
from public.site_settings s
where s.id = 1 and s.scripts_body_open is not null and trim(s.scripts_body_open) <> ''
  and not exists (select 1 from public.scripts_custom where nome = 'Script antigo — Início do body');

insert into public.scripts_custom (nome, descricao, codigo, categoria, posicao, paginas_modo, dispositivos, estrategia, prioridade, consentimento, ambiente, status)
select 'Script antigo — Final do body', 'Migrado automaticamente do campo antigo "Final do <body>" (Aparência → Scripts).', s.scripts_body_close, 'essencial', 'body_close', 'todas', 'todos', 'normal', 'normal', 'essencial', 'producao', 'ativo'
from public.site_settings s
where s.id = 1 and s.scripts_body_close is not null and trim(s.scripts_body_close) <> ''
  and not exists (select 1 from public.scripts_custom where nome = 'Script antigo — Final do body');

-- ============================================================================
-- PERMISSÕES NOVAS — só Administrador recebe por padrão (execução de código
-- arbitrário no site público é sensível; outros cargos precisam ser liberados
-- manualmente em Equipe).
-- ============================================================================
insert into public.permissions (key, label, module) values
  ('integracoes.visualizar', 'Ver integrações e scripts',        'scripts'),
  ('integracoes.editar',     'Editar integrações',                'scripts'),
  ('scripts.adicionar',      'Adicionar/editar scripts personalizados', 'scripts'),
  ('scripts.publicar',       'Publicar scripts personalizados',   'scripts'),
  ('scripts.excluir',        'Excluir scripts e integrações',     'scripts'),
  ('scripts.historico',      'Ver histórico de alterações',       'scripts')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, allowed)
select 'administrador', key, true from public.permissions
where key in ('integracoes.visualizar','integracoes.editar','scripts.adicionar','scripts.publicar','scripts.excluir','scripts.historico')
on conflict (role, permission_key) do update set allowed = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.integracoes      enable row level security;
alter table public.scripts_custom   enable row level security;
alter table public.scripts_historico enable row level security;

-- integrações: leitura pública só das ativas (o site precisa ler sem login
-- pra injetar o script); staff com permissão vê tudo, inclusive inativas.
drop policy if exists integracoes_select on public.integracoes;
create policy integracoes_select on public.integracoes for select
  using (status = 'ativo' or public.has_permission('integracoes.visualizar'));

drop policy if exists integracoes_insert on public.integracoes;
create policy integracoes_insert on public.integracoes for insert
  with check (public.has_permission('integracoes.editar'));

drop policy if exists integracoes_update on public.integracoes;
create policy integracoes_update on public.integracoes for update
  using (public.has_permission('integracoes.editar'))
  with check (public.has_permission('integracoes.editar'));

drop policy if exists integracoes_delete on public.integracoes;
create policy integracoes_delete on public.integracoes for delete
  using (public.has_permission('scripts.excluir'));

-- scripts personalizados: mesmo padrão de leitura pública limitada a ativos.
-- "scripts.publicar" é um gate só de interface (mostra/esconde o botão
-- "Publicar" no editor) — não tem policy própria porque este projeto não
-- separa permissão por coluna/valor em nenhuma outra tabela (ex: preços).
drop policy if exists scripts_custom_select on public.scripts_custom;
create policy scripts_custom_select on public.scripts_custom for select
  using (status = 'ativo' or public.has_permission('integracoes.visualizar'));

drop policy if exists scripts_custom_insert on public.scripts_custom;
create policy scripts_custom_insert on public.scripts_custom for insert
  with check (public.has_permission('scripts.adicionar'));

drop policy if exists scripts_custom_update on public.scripts_custom;
create policy scripts_custom_update on public.scripts_custom for update
  using (public.has_permission('scripts.adicionar'))
  with check (public.has_permission('scripts.adicionar'));

drop policy if exists scripts_custom_delete on public.scripts_custom;
create policy scripts_custom_delete on public.scripts_custom for delete
  using (public.has_permission('scripts.excluir'));

-- histórico: só leitura por quem tem permissão; escrita liberada pra quem
-- pode editar integrações ou scripts (é sempre o próprio código que insere
-- uma linha de histórico ao salvar) — sem update/delete (log imutável).
drop policy if exists scripts_historico_select on public.scripts_historico;
create policy scripts_historico_select on public.scripts_historico for select
  using (public.has_permission('scripts.historico'));

drop policy if exists scripts_historico_insert on public.scripts_historico;
create policy scripts_historico_insert on public.scripts_historico for insert
  with check (public.has_permission('integracoes.editar') or public.has_permission('scripts.adicionar'));

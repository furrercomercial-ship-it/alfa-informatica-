-- ============================================================================
-- Alfa Informática — Schema de Notas Fiscais (rodar DEPOIS de schema.sql já
-- ter sido rodado). Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Idempotente: pode rodar de novo sem quebrar.
--
-- Este módulo NÃO emite NF-e nem fala com a SEFAZ. É só uma central de
-- armazenamento: o funcionário emite a nota no ERP externo, baixa o XML e o
-- PDF/DANFE, e anexa os dois arquivos ao pedido correspondente aqui no painel.
-- ============================================================================

-- ── PERMISSÕES NOVAS ─────────────────────────────────────────────────────
insert into public.permissions (key, label, module) values
  ('notas_fiscais.visualizar', 'Ver notas fiscais',                          'notas_fiscais'),
  ('notas_fiscais.gerenciar',  'Adicionar/editar/substituir notas fiscais',  'notas_fiscais'),
  ('notas_fiscais.excluir',    'Remover notas fiscais',                      'notas_fiscais')
on conflict (key) do nothing;

insert into public.role_permissions (role, permission_key, allowed)
select 'administrador', key, true from public.permissions
where key in ('notas_fiscais.visualizar', 'notas_fiscais.gerenciar', 'notas_fiscais.excluir')
on conflict (role, permission_key) do update set allowed = true;

insert into public.role_permissions (role, permission_key, allowed) values
  ('gerente','notas_fiscais.visualizar',true), ('gerente','notas_fiscais.gerenciar',true),
  ('funcionario','notas_fiscais.visualizar',true), ('funcionario','notas_fiscais.gerenciar',true),
  ('financeiro','notas_fiscais.visualizar',true),
  ('suporte','notas_fiscais.visualizar',true)
on conflict (role, permission_key) do update set allowed = excluded.allowed;

-- ============================================================================
-- NOTAS FISCAIS
-- ============================================================================
create table if not exists public.notas_fiscais (
  id                      bigint generated always as identity primary key,
  pedido_id               bigint not null references public.orders(id) on delete restrict,
  tipo_documento          text not null default 'principal'
                            check (tipo_documento in ('principal','complementar','devolucao')),
  numero_nfe              text not null,
  serie                   text not null,
  chave_acesso            text not null unique
                            check (chave_acesso ~ '^[0-9]{44}$'),
  data_emissao            date not null,
  data_saida              date,
  valor_total             numeric(12,2) not null,
  natureza_operacao       text,
  protocolo_autorizacao   text,
  emitente_nome           text,
  emitente_documento      text,
  cliente_nome            text,
  cliente_documento       text,
  status                  text not null default 'anexada'
                            check (status in ('anexada','pendente','cancelada','substituida')),
  xml_storage_path        text not null,
  pdf_storage_path        text not null,
  xml_nome_original       text,
  pdf_nome_original       text,
  xml_tamanho             int,
  pdf_tamanho             int,
  observacoes             text,
  -- Preparação pra uma futura integração automática (webhook/API do ERP) —
  -- nenhuma integração real existe ainda; todo cadastro manual usa 'manual'.
  source                  text not null default 'manual',
  external_id             text,
  integration_status      text,
  integration_provider    text,
  criado_por              uuid references public.profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Exclusão lógica: nunca apagamos o registro fiscal de verdade, só marcamos.
  deleted_at              timestamptz,
  deleted_by              uuid references public.profiles(id),
  deletion_reason         text
);

drop trigger if exists notas_fiscais_set_updated_at on public.notas_fiscais;
create trigger notas_fiscais_set_updated_at before update on public.notas_fiscais
  for each row execute function public.set_updated_at();

-- Só uma NF-e "principal" ativa por pedido — a estrutura já aceita
-- 'complementar'/'devolucao' no futuro sem entrar nessa trava.
create unique index if not exists notas_fiscais_pedido_principal_uidx
  on public.notas_fiscais (pedido_id)
  where tipo_documento = 'principal' and deleted_at is null;

create index if not exists notas_fiscais_pedido_idx      on public.notas_fiscais (pedido_id);
create index if not exists notas_fiscais_numero_idx       on public.notas_fiscais (numero_nfe);
create index if not exists notas_fiscais_cliente_doc_idx  on public.notas_fiscais (cliente_documento);
create index if not exists notas_fiscais_emissao_idx      on public.notas_fiscais (data_emissao);
create index if not exists notas_fiscais_status_idx       on public.notas_fiscais (status);

-- Trava a exclusão lógica: um UPDATE comum (editar campos) não pode setar
-- deleted_at sem a permissão de excluir — sem isso, RLS de UPDATE sozinha
-- não diferencia "editar" de "apagar", já que os dois são a mesma operação.
create or replace function public.notas_fiscais_guard_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at and not public.has_permission('notas_fiscais.excluir') then
    raise exception 'Sem permissão para excluir notas fiscais.';
  end if;
  return new;
end;
$$;

drop trigger if exists notas_fiscais_guard_delete on public.notas_fiscais;
create trigger notas_fiscais_guard_delete before update on public.notas_fiscais
  for each row execute function public.notas_fiscais_guard_delete();

-- ============================================================================
-- HISTÓRICO (auditoria — dedicado a este módulo, mesmo padrão de
-- scripts_historico/conteudo_historico: log imutável, só insert)
-- ============================================================================
create table if not exists public.notas_fiscais_historico (
  id                bigint generated always as identity primary key,
  nota_fiscal_id    bigint not null references public.notas_fiscais(id) on delete cascade,
  acao              text not null check (acao in ('criada','editada','arquivos_substituidos','removida')),
  dados_anteriores  jsonb,
  dados_novos       jsonb,
  usuario_id        uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index if not exists notas_fiscais_historico_nota_idx on public.notas_fiscais_historico (nota_fiscal_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.notas_fiscais          enable row level security;
alter table public.notas_fiscais_historico enable row level security;

drop policy if exists notas_fiscais_select on public.notas_fiscais;
create policy notas_fiscais_select on public.notas_fiscais for select
  using (
    public.has_permission('notas_fiscais.visualizar')
    and (deleted_at is null or public.has_permission('notas_fiscais.excluir'))
  );

drop policy if exists notas_fiscais_insert on public.notas_fiscais;
create policy notas_fiscais_insert on public.notas_fiscais for insert
  with check (public.has_permission('notas_fiscais.gerenciar'));

drop policy if exists notas_fiscais_update on public.notas_fiscais;
create policy notas_fiscais_update on public.notas_fiscais for update
  using (public.has_permission('notas_fiscais.gerenciar'))
  with check (public.has_permission('notas_fiscais.gerenciar'));

drop policy if exists notas_fiscais_historico_select on public.notas_fiscais_historico;
create policy notas_fiscais_historico_select on public.notas_fiscais_historico for select
  using (public.has_permission('notas_fiscais.visualizar'));

drop policy if exists notas_fiscais_historico_insert on public.notas_fiscais_historico;
create policy notas_fiscais_historico_insert on public.notas_fiscais_historico for insert
  with check (public.has_permission('notas_fiscais.gerenciar') or public.has_permission('notas_fiscais.excluir'));

-- ============================================================================
-- STORAGE — bucket privado + políticas
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('notas-fiscais', 'notas-fiscais', false, 15728640)
on conflict (id) do nothing;

drop policy if exists notas_fiscais_storage_select on storage.objects;
create policy notas_fiscais_storage_select on storage.objects for select
  to authenticated
  using (bucket_id = 'notas-fiscais' and public.has_permission('notas_fiscais.visualizar'));

drop policy if exists notas_fiscais_storage_insert on storage.objects;
create policy notas_fiscais_storage_insert on storage.objects for insert
  to authenticated
  with check (bucket_id = 'notas-fiscais' and public.has_permission('notas_fiscais.gerenciar'));

drop policy if exists notas_fiscais_storage_update on storage.objects;
create policy notas_fiscais_storage_update on storage.objects for update
  to authenticated
  using (bucket_id = 'notas-fiscais' and public.has_permission('notas_fiscais.gerenciar'));

drop policy if exists notas_fiscais_storage_delete on storage.objects;
create policy notas_fiscais_storage_delete on storage.objects for delete
  to authenticated
  using (bucket_id = 'notas-fiscais' and public.has_permission('notas_fiscais.excluir'));

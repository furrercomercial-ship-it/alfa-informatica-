-- ============================================================================
-- Alfa Informática — Schema de Pagamentos (Mercado Pago, ambiente de TESTE)
-- Rodar DEPOIS de schema.sql e schema-estoque.sql já terem sido rodados.
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Idempotente: pode rodar de novo sem quebrar.
--
-- Este script NÃO configura credenciais nem faz nenhuma chamada externa — só
-- prepara o banco pra receber os dados de pagamento que as Edge Functions
-- (mp-create-payment / mp-webhook) vão gravar. Nenhum dado de cartão é
-- armazenado aqui em nenhuma hipótese.
-- ============================================================================

-- ── ORDER_STATUS: novos estados (mantém o enum único já existente em vez de
-- criar um campo paralelo — orders_after_status_change continua sendo o
-- único lugar que reage a mudança de status). Cada ALTER TYPE ADD VALUE roda
-- sozinho: não pode ser usado na mesma transação em que foi adicionado, então
-- este script só declara os valores — não insere/usa nenhum deles.
alter type order_status add value if not exists 'processando';
alter type order_status add value if not exists 'recusado';
alter type order_status add value if not exists 'estornado';
alter type order_status add value if not exists 'estorno_parcial';
alter type order_status add value if not exists 'expirado';

-- ============================================================================
-- PAGAMENTOS — um registro por tentativa de pagamento (Order do Mercado Pago)
-- ============================================================================
create table if not exists public.pagamentos (
  id                  bigint generated always as identity primary key,
  pedido_id           bigint not null references public.orders(id) on delete restrict,
  mp_order_id         text,
  mp_payment_id       text,
  external_reference  text not null,
  valor               numeric(12,2) not null,
  moeda               text not null default 'BRL',
  metodo              text check (metodo in ('pix', 'credit_card')),
  status              text not null default 'pendente'
                        check (status in ('pendente','em_processamento','aprovado','recusado','cancelado','estornado','estorno_parcial')),
  status_detail       text,
  ambiente_teste      boolean not null default true,
  -- Só um retrato pequeno e não sensível da resposta do Mercado Pago (id,
  -- status, método, datas) — nunca número de cartão, CVV ou token.
  resposta_resumida   jsonb,
  idempotency_key     text not null unique,
  criado_por          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists pagamentos_set_updated_at on public.pagamentos;
create trigger pagamentos_set_updated_at before update on public.pagamentos
  for each row execute function public.set_updated_at();

create index if not exists pagamentos_pedido_idx     on public.pagamentos (pedido_id);
create index if not exists pagamentos_mp_order_idx    on public.pagamentos (mp_order_id);
create index if not exists pagamentos_mp_payment_idx  on public.pagamentos (mp_payment_id);

-- ============================================================================
-- WEBHOOK — log de auditoria + deduplicação (notificação repetida do Mercado
-- Pago não pode reprocessar/duplicar nada: a unicidade de mp_notification_id
-- é o que garante isso, não uma checagem de aplicação que pode falhar)
-- ============================================================================
create table if not exists public.pagamentos_webhook_eventos (
  id                  bigint generated always as identity primary key,
  mp_notification_id  text not null unique,
  tipo                text,
  acao                text,
  data_id             text,
  processado_em       timestamptz,
  payload_resumido    jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists pagamentos_webhook_eventos_data_id_idx on public.pagamentos_webhook_eventos (data_id);

-- ============================================================================
-- RATE LIMIT — mp-create-payment roda sem verificação de JWT do Supabase
-- (precisa aceitar checkout de visitante), então essa checagem por IP é o
-- que impede a rota de ficar livre pra qualquer volume de chamadas.
-- ============================================================================
create table if not exists public.checkout_rate_limit (
  id          bigint generated always as identity primary key,
  ip          text not null,
  created_at  timestamptz not null default now()
);

create index if not exists checkout_rate_limit_ip_idx on public.checkout_rate_limit (ip, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.pagamentos                 enable row level security;
alter table public.pagamentos_webhook_eventos  enable row level security;
alter table public.checkout_rate_limit         enable row level security;
-- Sem nenhuma policy aqui de propósito — só a Edge Function (service_role)
-- lê/escreve; ninguém mais precisa ver essa tabela.

-- Só leitura pro dono do pedido ou quem tem permissão de ver pedidos — toda
-- escrita acontece exclusivamente pelas Edge Functions com a service_role
-- key, que ignora RLS por definição, então de propósito não existe nenhuma
-- policy de insert/update/delete aqui.
drop policy if exists pagamentos_select on public.pagamentos;
create policy pagamentos_select on public.pagamentos for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = pedido_id and (o.user_id = auth.uid() or public.has_permission('pedidos.visualizar'))
    )
  );

-- Log de webhook é interno — só staff com acesso a pedidos consulta (auditoria).
drop policy if exists pagamentos_webhook_eventos_select on public.pagamentos_webhook_eventos;
create policy pagamentos_webhook_eventos_select on public.pagamentos_webhook_eventos for select
  using (public.has_permission('pedidos.visualizar'));

-- ============================================================================
-- BUSCA SEGURA DE PEDIDO POR NÚMERO (corrige uma lacuna que já existia antes
-- desta integração: a policy orders_select de schema.sql exige
-- user_id = auth.uid(), o que nunca bate pra pedido de visitante sem conta
-- porque NULL = NULL não é verdadeiro em SQL — visitante nunca conseguia
-- reconsultar o próprio pedido). Em vez de abrir a tabela toda (o que
-- vazaria pedido de QUALQUER visitante pra qualquer um), esta function
-- devolve só o pedido cujo order_number exato foi informado — o mesmo nível
-- de "segredo na URL" que a tela de confirmação já usa hoje.
create or replace function public.buscar_pedido_por_numero(p_numero text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  resultado jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'subtotal', o.subtotal,
    'discount', o.discount,
    'freight', o.freight,
    'total', o.total,
    'shipping_method', o.shipping_method,
    'payment_method', o.payment_method,
    'created_at', o.created_at,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name_snapshot', oi.product_name_snapshot,
        'product_image_snapshot', oi.product_image_snapshot,
        'qty', oi.qty,
        'unit_price', oi.unit_price,
        'line_total', oi.line_total
      ))
      from public.order_items oi where oi.order_id = o.id
    ), '[]'::jsonb),
    'pagamento', (
      select jsonb_build_object(
        'status', p.status,
        'status_detail', p.status_detail,
        'metodo', p.metodo,
        'ambiente_teste', p.ambiente_teste,
        'resposta_resumida', p.resposta_resumida
      )
      from public.pagamentos p
      where p.pedido_id = o.id
      order by p.created_at desc
      limit 1
    )
  )
  into resultado
  from public.orders o
  where o.order_number = p_numero;

  return resultado;
end;
$$;

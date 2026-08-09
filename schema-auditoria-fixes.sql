-- ============================================================================
-- Alfa Informática — Correções da auditoria completa do sistema (rodar DEPOIS
-- de schema.sql, schema-estoque.sql, schema-cupons.sql e schema-pagamentos.sql
-- já terem sido rodados). Cole tudo no SQL Editor do Supabase e clique em
-- "Run". Idempotente: pode rodar de novo sem quebrar.
-- ============================================================================

-- ============================================================================
-- 1) ESTOQUE NUNCA PODE FICAR NEGATIVO
-- Trava no banco, não só na Edge Function: se duas vendas concorrentes
-- tentassem baixar a última unidade, o segundo UPDATE que deixaria o
-- estoque negativo simplesmente falha (e a Edge Function que chamou isso
-- fica sabendo e não marca o pedido como pago — ver mp-create-payment/
-- mp-webhook, que agora tratam esse erro específico).
-- ============================================================================
alter table public.products drop constraint if exists products_stock_nao_negativo;
alter table public.products add constraint products_stock_nao_negativo check (stock >= 0);

-- ============================================================================
-- 2) CUPOM: LIMITE DE USO POR CLIENTE (além do limite global que já existia)
-- ============================================================================
create table if not exists public.cupom_usos (
  id          bigint generated always as identity primary key,
  cupom_id    bigint not null references public.cupons(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  pedido_id   bigint references public.orders(id),
  created_at  timestamptz not null default now(),
  unique (cupom_id, user_id)
);

alter table public.cupom_usos enable row level security;

-- Só a Edge Function (service_role) grava — o cliente nunca teria como
-- fraudar isso escrevendo direto na tabela. Staff com acesso a preços pode
-- consultar quem já usou o quê.
drop policy if exists cupom_usos_select on public.cupom_usos;
create policy cupom_usos_select on public.cupom_usos for select
  using (user_id = auth.uid() or public.has_permission('precos.editar'));

-- ============================================================================
-- 3) PIX PENDENTE EXPIRA SOZINHO
-- 'expirado' já existia no enum (schema-pagamentos.sql) mas nada nunca usava.
-- Essa function marca como expirado todo pedido "aguardando_pagamento" (Pix
-- que nunca foi pago) com mais de 24h. Ela é chamada:
--   a) sob demanda, pelo admin-pedidos.html sempre que a lista carrega, e
--      pelo buscar_pedido_por_numero sempre que um pedido específico é
--      consultado (cobre os casos mais comuns sem depender de nada além
--      disso já funcionar);
--   b) de hora em hora, via pg_cron, SE essa extensão estiver disponível no
--      seu projeto Supabase (Database → Extensions → pg_cron). Se não
--      estiver, o item (a) já garante que a expiração acontece assim que
--      alguém olha o pedido — só não roda "sozinha" em segundo plano.
-- ============================================================================
create or replace function public.expirar_pedidos_pendentes()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.orders
  set status = 'expirado'
  where status = 'aguardando_pagamento'
    and created_at < now() - interval '24 hours';
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'alfa-expirar-pedidos-pendentes',
    '0 * * * *',
    $cron$select public.expirar_pedidos_pendentes();$cron$
  );
exception when others then
  raise notice 'pg_cron indisponível neste projeto — expiração automática de pedidos vai depender só das chamadas em admin-pedidos.html/buscar_pedido_por_numero (item a). Pra rodar sozinha de hora em hora, ative a extensão pg_cron em Database > Extensions no painel do Supabase e rode este script de novo.';
end $$;

-- ============================================================================
-- 4) RASTREIO: expõe tracking_code/carrier pro cliente ver o próprio pedido
-- (redefine a function que já existia em schema-pagamentos.sql, adicionando
-- os 2 campos que faltavam + a chamada de expiração do item 3).
-- ============================================================================
create or replace function public.buscar_pedido_por_numero(p_numero text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  resultado jsonb;
begin
  update public.orders set status = 'expirado'
  where order_number = p_numero and status = 'aguardando_pagamento' and created_at < now() - interval '24 hours';

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
    'tracking_code', o.tracking_code,
    'carrier', o.carrier,
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

-- ============================================================================
-- 5) PEDIDOS: staff com "pedidos.editar" só pode mexer no que a tela de
-- Pedidos realmente usa (status, rastreio, transportadora, observações) —
-- não em total/desconto/frete/comprador direto via UPDATE na tabela. Só
-- vale pra sessão de staff (auth.role() = 'authenticated'); as Edge
-- Functions usam a service_role key e continuam podendo gravar tudo, porque
-- é delas que vem o cálculo de verdade.
-- ============================================================================
create or replace function public.orders_guard_staff_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.subtotal is distinct from old.subtotal
       or new.discount is distinct from old.discount
       or new.freight is distinct from old.freight
       or new.total is distinct from old.total
       or new.order_number is distinct from old.order_number
       or new.user_id is distinct from old.user_id
       or new.address_snapshot is distinct from old.address_snapshot
       or new.payment_method is distinct from old.payment_method
       or new.shipping_method is distinct from old.shipping_method
    then
      raise exception 'Só é permitido alterar status, rastreio, transportadora e observações do pedido por aqui.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_staff_update on public.orders;
create trigger orders_guard_staff_update
  before update on public.orders
  for each row execute function public.orders_guard_staff_update();

-- ============================================================================
-- 6) LOG DE AUDITORIA — ações administrativas sensíveis (excluir produto,
-- mudar status de pedido, bloquear cliente, gerenciar equipe/permissões).
-- Gravado pelo próprio front (AdminShell.logAction(), ver admin-shell.js)
-- logo após cada ação já ter passado pela checagem de permissão da página —
-- imutável (sem policy de update/delete: nem staff apaga o próprio rastro).
-- ============================================================================
create table if not exists public.admin_audit_log (
  id           bigint generated always as identity primary key,
  usuario_id   uuid references public.profiles(id),
  acao         text not null,
  entidade     text not null,
  entidade_id  text,
  detalhes     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_entidade_idx on public.admin_audit_log (entidade, entidade_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log for select
  using (public.has_permission('equipe.gerenciar'));

drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log for insert
  with check (public.is_staff() and usuario_id = auth.uid());

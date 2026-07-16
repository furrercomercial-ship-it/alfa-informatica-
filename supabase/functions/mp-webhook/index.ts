// Alfa Informática — Edge Function: recebe as notificações Webhook do
// Mercado Pago (Checkout Transparente / API de Orders), valida a assinatura,
// reconsulta o status real diretamente na API do Mercado Pago (nunca confia
// só no corpo da notificação) e atualiza o pedido interno.
//
// Idempotente por construção: cada notificação tem um `id` próprio do
// Mercado Pago, gravado com UNIQUE em pagamentos_webhook_eventos — uma
// notificação repetida esbarra nessa restrição e é ignorada sem reprocessar
// nada (sem duplicar baixa de estoque, atualização de pedido ou e-mail).
//
// AMBIENTE DE TESTE: usa exclusivamente as credenciais de teste configuradas
// via `supabase secrets set` (nunca credenciais de produção).
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase functions deploy mp-webhook --no-verify-jwt
//   supabase secrets set MP_ACCESS_TOKEN=<seu Access Token DE TESTE>
//   supabase secrets set MP_WEBHOOK_SECRET=<segredo do webhook, em Suas integrações > Webhooks>
//
// --no-verify-jwt é necessário porque quem chama essa rota é o Mercado Pago,
// não um usuário logado no Supabase — a autenticidade é garantida pela
// validação de assinatura abaixo, não por um JWT do Supabase.
//
// URL a cadastrar no painel do Mercado Pago (Suas integrações > Webhooks):
//   https://<seu-project-ref>.supabase.co/functions/v1/mp-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')!;
const MP_API_BASE = 'https://api.mercadopago.com';

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Comparação em tempo constante simples — evita vazar por tempo de resposta
// quanto da assinatura já bate, sem depender de biblioteca externa.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function mapMpStatus(status: string | undefined, statusDetail: string | undefined): string {
  const s = (status || '').toLowerCase();
  const d = (statusDetail || '').toLowerCase();
  if (s === 'processed' || s === 'approved' || d === 'accredited') return 'aprovado';
  if (d.startsWith('cc_rejected') || s === 'rejected') return 'recusado';
  if (s === 'cancelled') return 'cancelado';
  if (s === 'refunded') return 'estornado';
  if (s === 'partially_refunded') return 'estorno_parcial';
  if (s === 'pending' || s === 'action_required' || d.includes('pending')) return 'pendente';
  return 'em_processamento';
}

// order_status (enum do pedido) reage só às transições que já existem hoje
// no trigger orders_after_status_change — baixa de estoque só acontece
// quando vira 'pago', então esse mapeamento é deliberadamente conservador.
function statusToOrderStatus(pagamentoStatus: string): string | null {
  const map: Record<string, string> = {
    aprovado: 'pago',
    recusado: 'recusado',
    cancelado: 'cancelado',
    estornado: 'estornado',
    estorno_parcial: 'estorno_parcial',
  };
  return map[pagamentoStatus] || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  // Mercado Pago espera 200/201 rápido — qualquer erro de leitura do corpo
  // não deve travar a resposta esperando retry infinito do lado deles.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // ── valida a assinatura ────────────────────────────────────────────
    const xSignature = req.headers.get('x-signature') || '';
    const xRequestId = req.headers.get('x-request-id') || '';
    const url = new URL(req.url);
    const dataIdFromQuery = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
    const dataId = String(dataIdFromQuery || body?.data?.id || '').toLowerCase();

    const parts: Record<string, string> = {};
    xSignature.split(',').forEach((p) => {
      const [k, v] = p.split('=');
      if (k && v) parts[k.trim()] = v.trim();
    });
    const ts = parts.ts;
    const v1 = parts.v1;

    if (!ts || !v1 || !dataId) {
      console.error('[mp-webhook] assinatura ausente ou notificação sem data.id');
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: corsHeaders() });
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest);
    if (!timingSafeEqual(expected, v1)) {
      console.error('[mp-webhook] assinatura inválida — notificação rejeitada');
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: corsHeaders() });
    }

    // ── deduplicação: notificação repetida não reprocessa nada ──────────
    const notificationId = String(body.id ?? `${body.type}-${dataId}-${ts}`);
    const { error: insertEventErr } = await admin.from('pagamentos_webhook_eventos').insert({
      mp_notification_id: notificationId,
      tipo: body.type || null,
      acao: body.action || null,
      data_id: dataId,
      payload_resumido: { type: body.type, action: body.action, data_id: dataId },
    });
    if (insertEventErr) {
      // unique_violation (23505) = já processamos essa notificação antes.
      if (insertEventErr.code === '23505') {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: corsHeaders() });
      }
      console.error('[mp-webhook] falha ao registrar evento', insertEventErr.message);
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders() });
    }

    // ── reconsulta o estado real na API do Mercado Pago (nunca confia só
    // no corpo da notificação) ──────────────────────────────────────────
    const isOrderEvent = body.type === 'order' || body.topic === 'order';
    const mpUrl = isOrderEvent ? `${MP_API_BASE}/v1/orders/${dataId}` : `${MP_API_BASE}/v1/payments/${dataId}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let mpRes: Response;
    try {
      mpRes = await fetch(mpUrl, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }, signal: controller.signal });
    } catch (e) {
      clearTimeout(timer);
      console.error('[mp-webhook] falha de conexão ao reconsultar o Mercado Pago', String(e));
      // Responde 200 mesmo assim pra não gerar retentativa agressiva; o
      // próximo webhook (ou uma consulta manual) resolve depois.
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }
    clearTimeout(timer);

    if (!mpRes.ok) {
      console.error('[mp-webhook] Mercado Pago não confirmou o recurso', mpRes.status);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }
    const mpData = await mpRes.json().catch(() => ({}));

    const mpOrderId = isOrderEvent ? String(mpData.id) : (mpData.order?.id ? String(mpData.order.id) : null);
    const mpPaymentId = isOrderEvent ? (mpData.transactions?.payments?.[0]?.id ? String(mpData.transactions.payments[0].id) : null) : String(mpData.id);
    const rawStatus = isOrderEvent ? mpData.status : mpData.status;
    const rawStatusDetail = isOrderEvent ? (mpData.status_detail || mpData.transactions?.payments?.[0]?.status_detail) : mpData.status_detail;
    const normalizedStatus = mapMpStatus(rawStatus, rawStatusDetail);

    // ── encontra o pagamento correspondente já registrado por
    // mp-create-payment (por mp_payment_id, senão por mp_order_id) ──────
    let pagamento = null as any;
    if (mpPaymentId) {
      const { data } = await admin.from('pagamentos').select('*').eq('mp_payment_id', mpPaymentId).maybeSingle();
      pagamento = data;
    }
    if (!pagamento && mpOrderId) {
      const { data } = await admin.from('pagamentos').select('*').eq('mp_order_id', mpOrderId).maybeSingle();
      pagamento = data;
    }

    if (!pagamento) {
      console.error('[mp-webhook] notificação sem pagamento correspondente no banco — ignorada', dataId);
      await admin.from('pagamentos_webhook_eventos').update({ processado_em: new Date().toISOString() }).eq('mp_notification_id', notificationId);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }

    await admin.from('pagamentos').update({
      mp_order_id: mpOrderId || pagamento.mp_order_id,
      mp_payment_id: mpPaymentId || pagamento.mp_payment_id,
      status: normalizedStatus,
      status_detail: rawStatusDetail || null,
      resposta_resumida: { ...(pagamento.resposta_resumida || {}), webhook_status: rawStatus, webhook_status_detail: rawStatusDetail },
    }).eq('id', pagamento.id);

    const newOrderStatus = statusToOrderStatus(normalizedStatus);
    if (newOrderStatus) {
      // Só atualiza se o status realmente mudou — orders_after_status_change
      // (baixa de estoque/notificação) já cuida de não duplicar nada além
      // disso, mas evita um UPDATE/trigger à toa quando não há mudança.
      const { data: pedidoAtual } = await admin.from('orders').select('status').eq('id', pagamento.pedido_id).single();
      if (pedidoAtual && pedidoAtual.status !== newOrderStatus) {
        await admin.from('orders').update({ status: newOrderStatus }).eq('id', pagamento.pedido_id);
      }
    }

    await admin.from('pagamentos_webhook_eventos').update({ processado_em: new Date().toISOString() }).eq('mp_notification_id', notificationId);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
  } catch (e) {
    console.error('[mp-webhook] erro inesperado', String(e));
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders() });
  }
});

// Alfa Informática — Edge Function: cria o pedido interno + a Order de
// pagamento no Mercado Pago (Checkout Transparente, API de Orders).
//
// Roda no servidor porque é o único lugar seguro pra usar o Access Token do
// Mercado Pago (nunca deve ir para o navegador) e porque é aqui que TODO o
// valor da compra é recalculado do zero a partir do banco — nada que o
// frontend mandar como preço/desconto/frete/total é usado pra cobrar.
//
// AMBIENTE DE TESTE: este código usa exclusivamente as credenciais de teste
// configuradas via `supabase secrets set` (nunca credenciais de produção).
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase link --project-ref ybkgevyahpkkxhiexejy
//   supabase functions deploy mp-create-payment
//   supabase secrets set MP_ACCESS_TOKEN=<seu Access Token DE TESTE, em Suas integrações > Credenciais>
//
// O Access Token NUNCA deve ser colado em nenhum arquivo do projeto — só no
// comando `supabase secrets set`, que o guarda de forma segura no servidor.
// SUPABASE_SERVICE_ROLE_KEY já deve estar configurada (mesma usada por
// admin-create-staff); se não estiver, rode também:
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua service_role key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_API_BASE = 'https://api.mercadopago.com';

// Mesmas 3 opções que já existem em checkout.html — precisam viver aqui
// também porque o frontend só pode mandar o ID escolhido, nunca o preço.
const SHIPPING_OPTIONS: Record<string, { name: string; price: number }> = {
  economico: { name: 'Econômico', price: 18.90 },
  expresso: { name: 'Expresso', price: 34.90 },
  retirada: { name: 'Retirada na loja', price: 0 },
};

const PIX_DISCOUNT_RATE = 0.05; // mesma regra de negócio já existente no checkout hoje

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
    ...extra,
  };
}

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: corsHeaders() });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function mapMpStatus(orderStatus: string | undefined, statusDetail: string | undefined): string {
  const s = (orderStatus || '').toLowerCase();
  const d = (statusDetail || '').toLowerCase();
  if (s === 'processed' && (d === 'accredited' || d === '')) return 'aprovado';
  if (d.startsWith('cc_rejected') || s === 'rejected') return 'recusado';
  if (s === 'cancelled') return 'cancelado';
  if (s === 'pending' || s === 'action_required' || d.includes('pending')) return 'pendente';
  return 'em_processamento';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return fail(405, 'Método não permitido.');

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identifica o cliente logado, se houver — checkout de visitante continua
    // permitido (mesma regra que orders_insert já aceita user_id null).
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader) {
      const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (user) userId = user.id;
    }

    const body = await req.json().catch(() => null);
    if (!body) return fail(400, 'Dados inválidos.');

    const {
      idempotency_key: idempotencyKey,
      items,
      shipping_method_id: shippingMethodId,
      coupon_code: couponCode,
      address,
      payment_method: paymentMethod,
      payer,
      card,
    } = body;

    if (!idempotencyKey || typeof idempotencyKey !== 'string') return fail(400, 'Requisição inválida.');
    if (!Array.isArray(items) || !items.length) return fail(400, 'Carrinho vazio.');
    if (!['pix', 'credit_card'].includes(paymentMethod)) return fail(400, 'Selecione uma forma de pagamento.');
    if (paymentMethod === 'credit_card' && (!card || !card.token)) return fail(400, 'Dados do cartão inválidos.');
    if (!payer || !payer.email || !payer.cpf) return fail(400, 'Preencha e-mail e CPF para continuar.');

    // ── idempotência: se essa idempotency_key já foi processada (duplo
    // clique, retry de rede), devolve o resultado que já existe em vez de
    // criar um pedido/pagamento novo.
    const { data: existing } = await admin
      .from('pagamentos').select('*, orders(order_number)')
      .eq('idempotency_key', idempotencyKey).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({
        ok: true,
        order_number: existing.orders?.order_number,
        status: existing.status,
        status_detail: existing.status_detail,
        pix: existing.resposta_resumida?.pix || null,
      }), { headers: corsHeaders() });
    }

    // ── recalcula tudo a partir do banco — nunca confia em preço/desconto/
    // frete/total vindos do frontend.
    const productIds = items.map((i: any) => i.product_id).filter(Boolean);
    if (!productIds.length) return fail(400, 'Carrinho inválido.');

    const { data: products, error: prodErr } = await admin
      .from('products').select('id,name,price,stock,active,images,cost_price')
      .in('id', productIds);
    if (prodErr) return fail(500, 'Não foi possível validar os produtos. Tente novamente.');

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));
    let subtotal = 0;
    const orderItemsPayload: any[] = [];
    for (const item of items) {
      const p = productMap.get(item.product_id);
      const qty = Number(item.qty) || 0;
      if (!p || !p.active) return fail(400, `Um dos produtos do carrinho não está mais disponível.`);
      if (qty < 1) return fail(400, 'Quantidade inválida.');
      if (p.stock < qty) return fail(409, `Estoque insuficiente para "${p.name}".`);
      const lineTotal = Number(p.price) * qty;
      subtotal += lineTotal;
      orderItemsPayload.push({
        product_id: p.id, product_name_snapshot: p.name,
        product_image_snapshot: p.images && p.images[0] ? p.images[0] : null,
        unit_price: p.price, qty, line_total: lineTotal, cost_price_snapshot: p.cost_price ?? null,
      });
    }

    // cupom (mesmas regras que hoje só existiam no cliente)
    let discount = 0;
    let couponApplied: string | null = null;
    if (couponCode) {
      const { data: cupom } = await admin.from('cupons').select('*').eq('codigo', String(couponCode).toUpperCase().trim()).eq('ativo', true).maybeSingle();
      if (!cupom) return fail(400, 'Cupom inválido.');
      const now = new Date();
      if (cupom.validade_inicio && new Date(cupom.validade_inicio) > now) return fail(400, 'Este cupom ainda não está válido.');
      if (cupom.validade_fim && new Date(cupom.validade_fim) < now) return fail(400, 'Este cupom expirou.');
      if (cupom.limite_uso && cupom.usos >= cupom.limite_uso) return fail(400, 'Este cupom já atingiu o limite de uso.');
      if (cupom.valor_minimo && subtotal < cupom.valor_minimo) return fail(400, 'O pedido não atinge o valor mínimo para este cupom.');
      const cupomDiscount = cupom.tipo === 'percentual' ? subtotal * (cupom.valor / 100) : Number(cupom.valor);
      discount += Math.min(cupomDiscount, subtotal);
      couponApplied = cupom.codigo;
    }

    // frete
    const shipping = SHIPPING_OPTIONS[shippingMethodId];
    if (!shipping) return fail(400, 'Selecione uma forma de envio.');
    const freight = shipping.price;

    // desconto de Pix (mesma regra já existente no checkout)
    if (paymentMethod === 'pix') discount += subtotal * PIX_DISCOUNT_RATE;

    const total = Math.max(0, subtotal - discount + freight);
    if (total <= 0) return fail(400, 'Valor do pedido inválido.');

    // ── cria o pedido interno como aguardando pagamento
    const orderNumber = 'ALFA-' + Date.now().toString(36).toUpperCase();
    const { data: order, error: orderErr } = await admin.from('orders').insert({
      order_number: orderNumber,
      user_id: userId,
      status: 'aguardando_pagamento',
      subtotal, discount, freight, total,
      shipping_method: shipping.name,
      payment_method: paymentMethod === 'pix' ? 'Pix' : 'Cartão de crédito',
      address_snapshot: address || null,
    }).select().single();
    if (orderErr || !order) return fail(500, 'Não foi possível criar o pedido. Tente novamente.');

    await admin.from('order_items').insert(orderItemsPayload.map((i) => ({ ...i, order_id: order.id })));
    if (couponApplied) await admin.rpc('incrementar_uso_cupom', { p_codigo: couponApplied });

    // ── monta a Order do Mercado Pago
    const [firstName, ...restName] = String(payer.first_name || payer.email).split(' ');
    const mpBody: any = {
      type: 'online',
      processing_mode: 'automatic',
      external_reference: String(order.id),
      total_amount: total.toFixed(2),
      description: `Pedido ${orderNumber} — Alfa Informática`,
      payer: {
        email: payer.email,
        first_name: firstName || payer.email,
        last_name: payer.last_name || restName.join(' ') || '-',
        identification: { type: 'CPF', number: String(payer.cpf).replace(/\D/g, '') },
      },
      transactions: {
        payments: [
          paymentMethod === 'credit_card'
            ? {
                amount: total.toFixed(2),
                payment_method: {
                  id: card.payment_method_id || 'master',
                  type: 'credit_card',
                  token: card.token,
                  installments: Number(card.installments) || 1,
                },
              }
            : {
                // Pix na API de Orders: taxonomia "bank_transfer"/"pix". Se o
                // Mercado Pago devolver erro de payment_method aqui, é o
                // primeiro lugar a ajustar — não achei um exemplo oficial de
                // corpo de requisição Pix na documentação consultada.
                amount: total.toFixed(2),
                payment_method: { id: 'pix', type: 'bank_transfer' },
              },
        ],
      },
    };

    let mpRes: Response;
    try {
      mpRes = await fetchWithTimeout(`${MP_API_BASE}/v1/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(mpBody),
      });
    } catch (e) {
      console.error('[mp-create-payment] falha de conexão com o Mercado Pago', String(e));
      await admin.from('pagamentos').insert({
        pedido_id: order.id, external_reference: String(order.id), valor: total, metodo: paymentMethod,
        status: 'recusado', status_detail: 'connection_error', idempotency_key: idempotencyKey, criado_por: userId,
      });
      return fail(502, 'Não foi possível conectar ao Mercado Pago. Tente novamente em instantes.');
    }

    const mpData = await mpRes.json().catch(() => ({}));

    if (!mpRes.ok) {
      console.error('[mp-create-payment] Mercado Pago recusou a requisição', mpRes.status, JSON.stringify(mpData).slice(0, 500));
      await admin.from('pagamentos').insert({
        pedido_id: order.id, external_reference: String(order.id), valor: total, metodo: paymentMethod,
        status: 'recusado', status_detail: mpData?.message || 'request_error',
        idempotency_key: idempotencyKey, criado_por: userId,
      });
      return fail(400, 'Pagamento não pôde ser processado. Verifique os dados e tente novamente.');
    }

    const mpPayment = mpData?.transactions?.payments?.[0] || {};
    const normalizedStatus = mapMpStatus(mpData.status, mpData.status_detail || mpPayment.status_detail);

    // Pix: QR code costuma vir dentro do pagamento — guarda o que existir,
    // sem quebrar se a Order vier num formato um pouco diferente.
    const pixInfo = paymentMethod === 'pix'
      ? {
          qr_code: mpPayment?.point_of_interaction?.transaction_data?.qr_code
            || mpData?.point_of_interaction?.transaction_data?.qr_code || null,
          qr_code_base64: mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64
            || mpData?.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        }
      : null;

    await admin.from('pagamentos').insert({
      pedido_id: order.id,
      mp_order_id: mpData.id ? String(mpData.id) : null,
      mp_payment_id: mpPayment.id ? String(mpPayment.id) : null,
      external_reference: String(order.id),
      valor: total, moeda: 'BRL', metodo: paymentMethod,
      status: normalizedStatus, status_detail: mpData.status_detail || mpPayment.status_detail || null,
      ambiente_teste: mpData.live_mode === false || mpData.live_mode === undefined,
      resposta_resumida: {
        id: mpData.id, status: mpData.status, status_detail: mpData.status_detail,
        payment_id: mpPayment.id, payment_status: mpPayment.status, pix: pixInfo,
      },
      idempotency_key: idempotencyKey, criado_por: userId,
    });

    // Cartão aprovado sincronamente no modo automático: já reflete no pedido
    // sem esperar o webhook (ele confirma de novo, é idempotente).
    if (normalizedStatus === 'aprovado') {
      await admin.from('orders').update({ status: 'pago' }).eq('id', order.id);
    } else if (normalizedStatus === 'recusado') {
      await admin.from('orders').update({ status: 'recusado' }).eq('id', order.id);
    }

    return new Response(JSON.stringify({
      ok: true, order_number: orderNumber, status: normalizedStatus,
      status_detail: mpData.status_detail || null, pix: pixInfo,
    }), { headers: corsHeaders() });
  } catch (e) {
    console.error('[mp-create-payment] erro inesperado', String(e));
    return fail(500, 'Não foi possível processar o pagamento. Tente novamente.');
  }
});

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
//   supabase functions deploy mp-create-payment --no-verify-jwt
//   supabase secrets set MP_ACCESS_TOKEN=<seu Access Token DE TESTE, em Suas integrações > Credenciais>
//   supabase secrets set MP_TEST_BUYER_EMAIL=<e-mail da Conta de teste tipo Comprador, en Suas integrações > Contas de teste>
//
// O Access Token NUNCA deve ser colado em nenhum arquivo do projeto — só no
// comando `supabase secrets set`, que o guarda de forma segura no servidor.
// SUPABASE_SERVICE_ROLE_KEY NÃO precisa ser configurada manualmente — o
// Supabase já injeta ela automaticamente em toda Edge Function hospedada.
//
// Também depende das secrets CORREIOS_* (ver ../_shared/correios.ts e
// supabase/.env.example) — o frete agora é recalculado de verdade com os
// Correios em vez de usar uma tabela de preço fixa.
//
// --no-verify-jwt é necessário porque o checkout aceita compra de visitante
// sem login (a chave pública do projeto não é um JWT, então o Supabase
// bloquearia até a chamada de visitante antes de chegar aqui). Como isso
// torna a rota chamável por qualquer um, a proteção contra abuso — limite
// de tentativas por IP, checagem de origem, validação de payload — é feita
// à mão logo no início da função (ver RATE_LIMIT_* abaixo).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularFrete, calcularPacoteAgregado } from '../_shared/correios.ts';
import { enviarEmailPedidoConfirmado } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_API_BASE = 'https://api.mercadopago.com';
// Ambiente de TESTE: a conta por trás do MP_ACCESS_TOKEN é um usuário de
// teste vendedor — a Mercado Pago exige que o comprador TAMBÉM seja uma
// conta de teste válida (e-mail @testuser.com de uma "Conta de teste" tipo
// Comprador, criada em Suas integrações > Contas de teste), nunca um e-mail
// real de cliente. Enquanto essa variável estiver configurada, ela
// substitui o e-mail do formulário só na chamada pro Mercado Pago (o e-mail
// real do cliente continua salvo normalmente em orders/pagamentos, pra não
// perder o dado) — configurar com:
//   supabase secrets set MP_TEST_BUYER_EMAIL=test_user_XXXXXXXXX@testuser.com
const MP_TEST_BUYER_EMAIL = Deno.env.get('MP_TEST_BUYER_EMAIL') || '';

// Cidades onde a própria Alfa entrega (nunca passa pelos Correios) — mesma
// regra de checkout.html. Grátis a partir do valor mínimo; abaixo disso o
// cliente combina o frete no WhatsApp, então não existe opção de checkout
// automática nesse caso (shippingMethodId nunca seria 'entrega_local').
const CIDADES_ENTREGA_LOCAL = ['cuiaba', 'cuiabá', 'varzea grande', 'várzea grande'];
const ENTREGA_LOCAL_VALOR_MINIMO_GRATIS = 200;

const DEFAULT_PIX_DISCOUNT_PERCENT = 5; // fallback pra produto sem o campo preenchido

// Como a função roda sem verificação de JWT do Supabase (precisa aceitar
// visitante sem login), estas duas defesas substituem o que o Supabase
// deixaria de barrar automaticamente:
const ALLOWED_ORIGINS = [
  'https://alfa-informatica-dhs9.vercel.app',
  'http://localhost',
  'http://127.0.0.1',
];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8; // tentativas de pagamento por IP por minuto

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
  if ((s === 'processed' || s === 'approved') && (d === 'accredited' || d === '')) return 'aprovado';
  if (d.startsWith('cc_rejected') || s === 'rejected') return 'recusado';
  if (s === 'cancelled' || s === 'canceled') return 'cancelado';
  if (s === 'pending' || s === 'action_required' || s === 'processing' || d.includes('pending')) return 'pendente';
  return 'em_processamento';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return fail(405, 'Método não permitido.');

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── validação de origem: só bloqueia quando o header existe e não bate
    // com nenhum domínio conhecido — visitante testando local (file://) ou
    // alguns clientes legítimos não mandam Origin nenhum, então não trava
    // esses casos; quem barra abuso de volume é o rate limit abaixo. ──────
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
      console.error('[mp-create-payment] origem não reconhecida rejeitada', origin);
      return fail(403, 'Origem não permitida.');
    }

    // ── rate limit por IP: sem isso, uma função sem verificação de JWT fica
    // livre pra qualquer volume de chamadas de qualquer lugar. ───────────
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: recentCount } = await admin
      .from('checkout_rate_limit').select('id', { count: 'exact', head: true })
      .eq('ip', clientIp).gte('created_at', since);
    if ((recentCount || 0) >= RATE_LIMIT_MAX) {
      return fail(429, 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.');
    }
    await admin.from('checkout_rate_limit').insert({ ip: clientIp });

    // Checkout de visitante NÃO é mais permitido — precisa estar logado.
    // Confia só no que o próprio Supabase valida a partir do Authorization
    // (token da sessão), nunca em nada que o front mande dizendo quem é o
    // usuário — por isso essa checagem tem que ficar aqui, não só no
    // checkout.html (que só melhora a experiência, não impede um chamador
    // direto da function de tentar passar por visitante).
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader) {
      const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await callerClient.auth.getUser();
      if (user) userId = user.id;
    }
    if (!userId) return fail(401, 'Você precisa estar logado para finalizar a compra.');

    // Cliente bloqueado não pode comprar — as outras rotas administrativas
    // já checavam isso, essa (a mais importante, porque move dinheiro)
    // ainda não checava.
    const { data: buyerProfile } = await admin.from('profiles').select('is_blocked').eq('id', userId).single();
    if (buyerProfile?.is_blocked) return fail(403, 'Sua conta está bloqueada. Entre em contato com o suporte.');

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

    // Validação completa do payload — a função roda sem JWT do Supabase, e
    // um chamador malicioso pode mandar qualquer coisa; nada aqui é
    // confiado sem checagem de formato/tamanho antes de tocar o banco.
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 100) return fail(400, 'Requisição inválida.');
    if (!Array.isArray(items) || !items.length || items.length > 50) return fail(400, 'Carrinho inválido.');
    // product_id/qty às vezes chegam como string (ex: produto.html manda
    // `id: String(p.id)` no botão "Comprar agora") — Number.isInteger('42')
    // é sempre false, então validar o tipo cru rejeitava carrinho válido.
    // Normaliza pra número aqui, ANTES de validar e de tudo que usa
    // productMap.get() mais abaixo (que precisa da mesma chave numérica que
    // o Supabase devolve pra `products.id`).
    const normalizedItems = items.map((i: any) => ({
      product_id: Number(i && i.product_id),
      qty: Number(i && i.qty),
    }));
    if (normalizedItems.some((i) => !Number.isInteger(i.product_id) || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 100)) {
      return fail(400, 'Carrinho inválido.');
    }
    if (!['pix', 'credit_card'].includes(paymentMethod)) return fail(400, 'Selecione uma forma de pagamento.');
    if (paymentMethod === 'credit_card' && (!card || typeof card.token !== 'string' || card.token.length > 200)) {
      return fail(400, 'Dados do cartão inválidos.');
    }
    if (!payer || typeof payer.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email) || payer.email.length > 200) {
      return fail(400, 'Informe um e-mail válido.');
    }
    if (!payer.cpf || String(payer.cpf).replace(/\D/g, '').length !== 11) {
      return fail(400, 'Informe um CPF válido (11 números).');
    }
    if (typeof shippingMethodId !== 'string' || shippingMethodId.length > 50) return fail(400, 'Selecione uma forma de envio.');
    if (couponCode !== null && couponCode !== undefined && (typeof couponCode !== 'string' || couponCode.length > 40)) {
      return fail(400, 'Cupom inválido.');
    }

    // Log de diagnóstico do payload CRU recebido — compara com o que o
    // console do navegador mostrou ter sido enviado (ver checkout.html,
    // log "[Checkout] cardData obtido do SDK"). Se installments/payment_
    // method_id chegarem null/undefined aqui mas o navegador mostrou valor,
    // o problema é na serialização/transporte, não no SDK nem no backend.
    console.log('[mp-create-payment] payload recebido do frontend', JSON.stringify({
      payment_method: paymentMethod,
      shipping_method_id: shippingMethodId,
      coupon_code: couponCode || null,
      items_count: Array.isArray(items) ? items.length : 0,
      payer_email_presente: !!(payer && payer.email),
      card: card ? {
        token_presente: !!card.token,
        token_tamanho: card.token ? String(card.token).length : 0,
        installments: card.installments,
        payment_method_id: card.payment_method_id,
      } : null,
    }));

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
    const productIds = normalizedItems.map((i) => i.product_id).filter(Boolean);
    if (!productIds.length) return fail(400, 'Carrinho inválido.');

    const { data: products, error: prodErr } = await admin
      .from('products').select('id,name,price,stock,active,images,cost_price,pix_discount_percent,weight,comprimento_cm,largura_cm,altura_cm')
      .in('id', productIds);
    if (prodErr) return fail(500, 'Não foi possível validar os produtos. Tente novamente.');

    const productMap = new Map((products || []).map((p: any) => [p.id, p]));
    let subtotal = 0;
    let pixDiscountTotal = 0;
    const orderItemsPayload: any[] = [];
    for (const item of normalizedItems) {
      const p = productMap.get(item.product_id);
      const qty = item.qty;
      if (!p || !p.active) return fail(400, `Um dos produtos do carrinho não está mais disponível.`);
      if (qty < 1) return fail(400, 'Quantidade inválida.');
      if (p.stock < qty) return fail(409, `Estoque insuficiente para "${p.name}".`);
      // Sem peso/dimensão cadastrada não dá pra calcular o frete direito —
      // bloqueia a venda até o cadastro ser completado (mesma checagem que
      // já trava o botão de comprar em produto.html/alfa-replica.html, mas
      // aqui é a que realmente impede a compra, não só a tela).
      if (!p.weight || !p.comprimento_cm || !p.largura_cm || !p.altura_cm) {
        return fail(400, `"${p.name}" está com o cadastro incompleto (peso/dimensões) e não pode ser vendido ainda.`);
      }
      const lineTotal = Number(p.price) * qty;
      subtotal += lineTotal;
      const pixPercent = p.pix_discount_percent != null ? Number(p.pix_discount_percent) : DEFAULT_PIX_DISCOUNT_PERCENT;
      pixDiscountTotal += lineTotal * (pixPercent / 100);
      orderItemsPayload.push({
        product_id: p.id, product_name_snapshot: p.name,
        product_image_snapshot: p.images && p.images[0] ? p.images[0] : null,
        unit_price: p.price, qty, line_total: lineTotal, cost_price_snapshot: p.cost_price ?? null,
      });
    }

    // cupom (mesmas regras que hoje só existiam no cliente)
    let discount = 0;
    let couponApplied: string | null = null;
    let couponAppliedId: number | null = null;
    if (couponCode) {
      const { data: cupom } = await admin.from('cupons').select('*').eq('codigo', String(couponCode).toUpperCase().trim()).eq('ativo', true).maybeSingle();
      if (!cupom) return fail(400, 'Cupom inválido.');
      const now = new Date();
      if (cupom.validade_inicio && new Date(cupom.validade_inicio) > now) return fail(400, 'Este cupom ainda não está válido.');
      if (cupom.validade_fim && new Date(cupom.validade_fim) < now) return fail(400, 'Este cupom expirou.');
      if (cupom.limite_uso && cupom.usos >= cupom.limite_uso) return fail(400, 'Este cupom já atingiu o limite de uso.');
      if (cupom.valor_minimo && subtotal < cupom.valor_minimo) return fail(400, 'O pedido não atinge o valor mínimo para este cupom.');
      // Uso único por cliente — antes só existia o limite global de usos.
      const { count: jaUsou } = await admin.from('cupom_usos').select('id', { count: 'exact', head: true }).eq('cupom_id', cupom.id).eq('user_id', userId);
      if (jaUsou) return fail(400, 'Você já usou este cupom antes.');
      const cupomDiscount = cupom.tipo === 'percentual' ? subtotal * (cupom.valor / 100) : Number(cupom.valor);
      discount += Math.min(cupomDiscount, subtotal);
      couponApplied = cupom.codigo;
      couponAppliedId = cupom.id;
    }

    // frete — nunca confia no preço vindo do cliente (mesmo espírito da
    // recomputação de produtos/cupom acima): só aceita o ID do serviço
    // escolhido e recalcula o valor direto com os Correios.
    let freight = 0;
    let shippingName = 'Retirada na loja';
    let servicoCodigo: string | null = null;
    if (shippingMethodId === 'entrega_local') {
      const cidadeEndereco = String(address?.cid || '').toLowerCase().trim();
      if (!CIDADES_ENTREGA_LOCAL.includes(cidadeEndereco)) {
        return fail(400, 'Entrega local só disponível para Cuiabá/Várzea Grande.');
      }
      if (subtotal < ENTREGA_LOCAL_VALOR_MINIMO_GRATIS) {
        return fail(400, `Entrega local grátis só a partir de ${ENTREGA_LOCAL_VALOR_MINIMO_GRATIS.toFixed(2)}. Abaixo disso, combine o frete pelo WhatsApp.`);
      }
      shippingName = 'Entrega local (Alfa)';
    } else if (shippingMethodId !== 'retirada') {
      if (!address || !address.cep) return fail(400, 'Endereço com CEP é obrigatório para envio pelos Correios.');
      // Pacote real (peso/dimensão dos produtos cadastrados no admin),
      // igual o que correios-frete já mostrou no checkout — recalculado
      // aqui do zero a partir do banco, não confia em nada vindo do cliente.
      const pacote = calcularPacoteAgregado(normalizedItems.map((item) => {
        const p = productMap.get(item.product_id);
        return { pesoKg: p?.weight, comprimentoCm: p?.comprimento_cm, larguraCm: p?.largura_cm, alturaCm: p?.altura_cm, qty: item.qty };
      }));
      let opcoesFrete;
      try {
        opcoesFrete = await calcularFrete({ cepDestino: address.cep, pacote });
      } catch (e) {
        console.error('[mp-create-payment] falha ao consultar frete nos Correios', String(e));
        return fail(502, 'Não foi possível confirmar o frete no momento. Tente novamente.');
      }
      const escolhida = opcoesFrete.find((o) => o.codigo === shippingMethodId);
      if (!escolhida) return fail(400, 'Selecione uma forma de envio válida.');
      freight = escolhida.valor;
      shippingName = escolhida.nome;
      servicoCodigo = escolhida.codigo;
    }

    // desconto de Pix — soma do % configurado por produto (padrão do admin)
    if (paymentMethod === 'pix') discount += pixDiscountTotal;

    const total = Math.max(0, subtotal - discount + freight);
    if (total <= 0) return fail(400, 'Valor do pedido inválido.');

    // ── cria o pedido interno como aguardando pagamento
    const orderNumber = 'ALFA-' + Date.now().toString(36).toUpperCase();
    const { data: order, error: orderErr } = await admin.from('orders').insert({
      order_number: orderNumber,
      user_id: userId,
      status: 'aguardando_pagamento',
      subtotal, discount, freight, total,
      shipping_method: shippingName,
      correios_servico_codigo: servicoCodigo,
      payment_method: paymentMethod === 'pix' ? 'Pix' : 'Cartão de crédito',
      address_snapshot: address || null,
    }).select().single();
    if (orderErr || !order) return fail(500, 'Não foi possível criar o pedido. Tente novamente.');

    await admin.from('order_items').insert(orderItemsPayload.map((i) => ({ ...i, order_id: order.id })));
    if (couponApplied) {
      await admin.rpc('incrementar_uso_cupom', { p_codigo: couponApplied });
      if (couponAppliedId) await admin.from('cupom_usos').insert({ cupom_id: couponAppliedId, user_id: userId, pedido_id: order.id });
    }

    // ── reivindica a idempotency_key ANTES de chamar o Mercado Pago (não só
    // depois): fecha a janela de corrida em que duas requisições quase
    // simultâneas com a mesma chave passariam pela checagem inicial (que só
    // olha o que já existe) e chamariam a API duas vezes. Se a constraint
    // única barrar aqui, é porque outra requisição com essa chave já está
    // em andamento — devolve erro pra essa tentativa recuar (o pedido dela
    // fica órfão como "aguardando_pagamento", sem tentativa de cobrança).
    const { data: pagamento, error: pagClaimErr } = await admin.from('pagamentos').insert({
      pedido_id: order.id, external_reference: String(order.id), valor: total,
      moeda: 'BRL', metodo: paymentMethod, status: 'pendente',
      idempotency_key: idempotencyKey, criado_por: userId,
    }).select().single();
    if (pagClaimErr || !pagamento) {
      console.error('[mp-create-payment] não foi possível reivindicar a idempotency_key', pagClaimErr?.code, pagClaimErr?.message);
      return fail(409, 'Essa tentativa de pagamento já está em andamento. Aguarde alguns segundos.');
    }

    // ── monta a Order do Mercado Pago
    const [firstName, ...restName] = String(payer.first_name || payer.email).split(' ');
    const mpPayerEmail = MP_TEST_BUYER_EMAIL || payer.email;
    if (MP_TEST_BUYER_EMAIL) {
      console.log('[mp-create-payment] usando MP_TEST_BUYER_EMAIL (conta de comprador de teste) no lugar do e-mail do formulário — ambiente de teste');
    }
    const mpBody: any = {
      type: 'online',
      processing_mode: 'automatic',
      external_reference: String(order.id),
      total_amount: total.toFixed(2),
      description: `Pedido ${orderNumber} — Alfa Informática`,
      payer: {
        email: mpPayerEmail,
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

    // Log de diagnóstico do que estamos mandando pro Mercado Pago — nunca
    // inclui número de cartão/CVV (eles nem chegam até aqui, só o token de
    // uso único do SDK, mascarado por precaução) e também não inclui CPF/
    // e-mail/nome do cliente em texto puro (são dados pessoais — LGPD; os
    // logs da Edge Function ficam guardados no painel do Supabase). Isso
    // permite auditar exatamente o payload de uma tentativa real sem expor
    // dado sensível.
    console.log('[mp-create-payment] enviando order ao Mercado Pago', JSON.stringify({
      ...mpBody,
      payer: {
        email: '[presente]',
        first_name: '[presente]',
        last_name: '[presente]',
        identification: { type: mpBody.payer.identification.type, number: '[presente]' },
      },
      transactions: {
        payments: mpBody.transactions.payments.map((p: any) => ({
          ...p,
          payment_method: { ...p.payment_method, token: p.payment_method.token ? '[presente]' : undefined },
        })),
      },
    }));

    const mpUrl = `${MP_API_BASE}/v1/orders`;
    console.log('[mp-create-payment] chamando', mpUrl);

    let mpRes: Response;
    try {
      mpRes = await fetchWithTimeout(mpUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(mpBody),
      });
    } catch (e: any) {
      console.error('[mp-create-payment] falha de conexão com o Mercado Pago', mpUrl, String(e), e?.stack || null);
      await admin.from('pagamentos').update({ status: 'recusado', status_detail: 'connection_error' }).eq('id', pagamento.id);
      return fail(502, 'Não foi possível conectar ao Mercado Pago. Tente novamente em instantes.');
    }

    const mpData = await mpRes.json().catch(() => ({}));

    if (!mpRes.ok) {
      // Formato real de erro da Mercado Pago é {"errors":[{"code":...,
      // "message":...}]} — NUNCA {error, message, cause} soltos no nível
      // raiz (essa suposição anterior fazia mp_error/mp_message/mp_cause
      // ficarem sempre null, mesmo com a Mercado Pago respondendo um motivo
      // de verdade). mp_errors e mp_body abaixo carregam a resposta CRUA,
      // sem nenhum campo escolhido a dedo — nunca descartamos o que veio.
      const mpErrorsList = Array.isArray(mpData?.errors) ? mpData.errors : null;
      const mpFirstMessage = mpErrorsList && mpErrorsList[0] ? (mpErrorsList[0].message || mpErrorsList[0].code) : null;
      console.error('[mp-create-payment] Mercado Pago recusou a requisição', mpUrl, mpRes.status, JSON.stringify(mpData));
      await admin.from('pagamentos').update({
        status: 'recusado', status_detail: mpFirstMessage || 'request_error',
      }).eq('id', pagamento.id);
      // Devolve o erro REAL e COMPLETO do Mercado Pago (visível na aba Rede
      // do navegador, sem precisar abrir o painel do Supabase) — não é dado
      // sensível, é só a razão técnica da recusa.
      return new Response(JSON.stringify({
        ok: false,
        error: 'Pagamento não pôde ser processado. Verifique os dados e tente novamente.',
        mp_status: mpRes.status,
        mp_message: mpFirstMessage,
        mp_errors: mpErrorsList,
        mp_body: mpData,
      }), { status: 400, headers: corsHeaders() });
    }

    const mpPayment = mpData?.transactions?.payments?.[0] || {};
    const normalizedStatus = mapMpStatus(mpData.status, mpData.status_detail || mpPayment.status_detail);

    // Log da resposta de sucesso COMPLETA só pra Pix — nunca tínhamos visto
    // uma Order de Pix aprovada/pendente de verdade até agora, então o
    // caminho abaixo pra achar o QR code era um chute educado. Sem token de
    // cartão/CVV aqui (Pix não tem), mas a Mercado Pago ecoa de volta o
    // payer (CPF/e-mail/nome) — mascarado abaixo pelo mesmo motivo do log
    // de envio acima (dado pessoal não vai pra log em texto puro).
    if (paymentMethod === 'pix') {
      console.log('[mp-create-payment] resposta completa da Order de Pix', JSON.stringify({
        ...mpData,
        payer: mpData.payer ? { ...mpData.payer, email: '[presente]', first_name: '[presente]', last_name: '[presente]', identification: mpData.payer.identification ? { ...mpData.payer.identification, number: '[presente]' } : undefined } : undefined,
      }));
    }

    // Pix: confirmado numa Order real (log acima) que o QR code vem dentro
    // de transactions.payments[0].payment_method — não em
    // point_of_interoperation.transaction_data como a doc de outras APIs da
    // Mercado Pago sugeria. ticket_url é um link hospedado pela própria
    // Mercado Pago com o mesmo Pix, útil como alternativa ao QR/copia-e-cola.
    const pixInfo = paymentMethod === 'pix'
      ? {
          qr_code: mpPayment?.payment_method?.qr_code || null,
          qr_code_base64: mpPayment?.payment_method?.qr_code_base64 || null,
          ticket_url: mpPayment?.payment_method?.ticket_url || null,
        }
      : null;

    await admin.from('pagamentos').update({
      mp_order_id: mpData.id ? String(mpData.id) : null,
      mp_payment_id: mpPayment.id ? String(mpPayment.id) : null,
      status: normalizedStatus, status_detail: mpData.status_detail || mpPayment.status_detail || null,
      ambiente_teste: mpData.live_mode === false || mpData.live_mode === undefined,
      resposta_resumida: {
        id: mpData.id, status: mpData.status, status_detail: mpData.status_detail,
        payment_id: mpPayment.id, payment_status: mpPayment.status, pix: pixInfo,
      },
    }).eq('id', pagamento.id);

    // Cartão aprovado sincronamente no modo automático: já reflete no pedido
    // sem esperar o webhook (ele confirma de novo, é idempotente).
    if (normalizedStatus === 'aprovado') {
      // Se isso falhar (ex: baixa de estoque do trigger bateria negativo —
      // ver "products_stock_nao_negativo" em schema-auditoria-fixes.sql),
      // o pedido fica preso em "aguardando_pagamento" mesmo já pago de
      // verdade no Mercado Pago — de propósito: é a trava contra vender
      // 2x a última unidade em checkouts simultâneos. Isso NÃO pode travar
      // a resposta do pagamento (o cliente já pagou), só fica visível pro
      // admin resolver manualmente em Pedidos (o pedido nunca vira "pago"
      // sozinho quando isso acontece, então chama atenção lá).
      const { error: statusErr } = await admin.from('orders').update({ status: 'pago' }).eq('id', order.id);
      if (statusErr) {
        console.error('[mp-create-payment] pedido pago no MP mas não pôde ser marcado como pago (provável estoque insuficiente)', orderNumber, statusErr.message);
      }

      // E-mail só sai quando o pagamento já está confirmado (nunca no Pix
      // pendente — esse caso é tratado depois pelo mp-webhook, quando o
      // pagamento compensar). Nunca deve travar a resposta, por isso fica
      // isolado num try/catch próprio, só logando se falhar.
      //
      // Destinatário/nome vêm do cadastro (profiles), NUNCA do `payer` que
      // o corpo da requisição manda — esse é só o que vai pro Mercado Pago
      // como dado do pagador, e é controlado pelo próprio chamador (poderia
      // ser qualquer e-mail/nome, inclusive de terceiros). Usar profiles
      // garante que o e-mail só vai pro dono de verdade da conta logada.
      try {
        const { data: perfil } = await admin.from('profiles').select('email,full_name').eq('id', userId).single();
        if (perfil?.email) await enviarEmailPedidoConfirmado({
          destinatario: perfil.email,
          nomeCliente: perfil.full_name || perfil.email,
          orderNumber,
          itens: orderItemsPayload.map((i: any) => ({ nome: i.product_name_snapshot, qty: i.qty, preco: i.unit_price })),
          subtotal, discount, freight, total,
          shippingMethod: shippingName,
          paymentMethod: paymentMethod === 'pix' ? 'Pix' : 'Cartão de crédito',
        });
      } catch (e) {
        console.error('[mp-create-payment] falha ao enviar e-mail de confirmação', String(e));
      }
    } else if (normalizedStatus === 'recusado') {
      await admin.from('orders').update({ status: 'recusado' }).eq('id', order.id);
    }

    return new Response(JSON.stringify({
      ok: true, order_number: orderNumber, status: normalizedStatus,
      status_detail: mpData.status_detail || null, pix: pixInfo,
    }), { headers: corsHeaders() });
  } catch (e: any) {
    console.error('[mp-create-payment] erro inesperado', String(e), e?.stack || null);
    return fail(500, 'Não foi possível processar o pagamento. Tente novamente.');
  }
});

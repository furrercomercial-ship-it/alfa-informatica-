// Alfa Informática — Edge Function: calcula o frete real (PAC/SEDEX) pra um
// CEP de destino, usando a API dos Correios (ver ../_shared/correios.ts).
// Usa peso/dimensão REAIS dos produtos do carrinho (cadastrados em
// admin-produtos.html), agregados via calcularPacoteAgregado() — item sem
// peso/dimensão cadastrado cai no pacote padrão só pra aquele item.
//
// Roda sem autenticação de usuário porque o checkout aceita visitante sem
// login e precisa mostrar o frete antes de qualquer cadastro — mesma razão
// de mp-create-payment usar --no-verify-jwt. Só LÊ produtos (nunca escreve),
// então não precisa de rate limit dedicado: não há custo/abuso financeiro
// possível por trás dessa chamada (o pagamento em si recalcula tudo de
// novo em mp-create-payment, essa function aqui é só pra mostrar o valor
// antes de finalizar).
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase link --project-ref ybkgevyahpkkxhiexejy
//   supabase functions deploy correios-frete --no-verify-jwt
//   (secrets CORREIOS_* já devem estar configuradas — ver supabase/.env.example)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calcularFrete, calcularPacoteAgregado, buildFreightCacheKey, PACOTE_PADRAO } from '../_shared/correios.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_ORIGINS = [
  'https://alfa-informatica-dhs9.vercel.app',
  'http://localhost',
  'http://127.0.0.1',
];

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return fail(405, 'Método não permitido.');

  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    console.error('[correios-frete] origem não reconhecida rejeitada', origin);
    return fail(403, 'Origem não permitida.');
  }

  try {
    const body = await req.json().catch(() => null);
    const cepDestino = String(body?.cep_destino || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cepDestino)) return fail(400, 'CEP inválido.');

    // items é opcional (compatibilidade) — sem ele, cai no pacote padrão
    // genérico dentro de calcularFrete(). Mesma validação de formato usada
    // em mp-create-payment: normaliza pra número, rejeita lixo.
    const itemsRaw = Array.isArray(body?.items) ? body.items : [];
    const items = itemsRaw
      .map((i: any) => ({ product_id: Number(i && i.product_id), qty: Number(i && i.qty) }))
      .filter((i: any) => Number.isInteger(i.product_id) && Number.isInteger(i.qty) && i.qty > 0)
      .slice(0, 50);

    // admin sempre inicializado — necessário tanto pra buscar produtos quanto
    // pra salvar o cache da cotação (fallback do mp-create-payment).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let pacote;
    if (items.length) {
      const { data: produtos } = await admin
        .from('products').select('id,weight,comprimento_cm,largura_cm,altura_cm')
        .in('id', items.map((i: any) => i.product_id));
      const produtoMap = new Map((produtos || []).map((p: any) => [p.id, p]));
      pacote = calcularPacoteAgregado(items.map((i: any) => {
        const p = produtoMap.get(i.product_id);
        return { pesoKg: p?.weight, comprimentoCm: p?.comprimento_cm, larguraCm: p?.largura_cm, alturaCm: p?.altura_cm, qty: i.qty };
      }));
    }

    const opcoes = await calcularFrete({ cepDestino, pacote });

    // Persiste a cotação no banco (TTL 10 min) para que mp-create-payment
    // possa usar como fallback se os Correios ficarem temporariamente
    // indisponíveis entre a cotação e a finalização do pedido.
    if (items.length > 0) {
      try {
        const effectivePacote = pacote ?? PACOTE_PADRAO;
        const cacheKey = buildFreightCacheKey(cepDestino, effectivePacote);
        await admin.from('correios_frete_cache').upsert({
          cache_key: cacheKey,
          opcoes,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
      } catch (cacheErr) {
        console.warn('[correios-frete] falha ao salvar cache (não crítico)', String(cacheErr));
      }
    }

    return new Response(JSON.stringify({ ok: true, opcoes }), { headers: corsHeaders() });
  } catch (e: any) {
    console.error('[correios-frete] erro', String(e), e?.stack || null);
    return fail(502, 'Não foi possível calcular o frete agora. Tente novamente.');
  }
});

// Alfa Informática — Edge Function: calcula o frete real (PAC/SEDEX) pra um
// CEP de destino, usando a API dos Correios (ver ../_shared/correios.ts).
//
// Roda sem autenticação de usuário porque o checkout aceita visitante sem
// login e precisa mostrar o frete antes de qualquer cadastro — mesma razão
// de mp-create-payment usar --no-verify-jwt. Não faz nenhuma escrita no
// banco (só consulta externa), então não precisa de rate limit dedicado:
// não há custo/abuso financeiro possível por trás dessa chamada.
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase link --project-ref ybkgevyahpkkxhiexejy
//   supabase functions deploy correios-frete --no-verify-jwt
//   (secrets CORREIOS_* já devem estar configuradas — ver supabase/.env.example)

import { calcularFrete } from '../_shared/correios.ts';

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

    const opcoes = await calcularFrete({ cepDestino });
    return new Response(JSON.stringify({ ok: true, opcoes }), { headers: corsHeaders() });
  } catch (e: any) {
    console.error('[correios-frete] erro', String(e), e?.stack || null);
    return fail(502, 'Não foi possível calcular o frete agora. Tente novamente.');
  }
});

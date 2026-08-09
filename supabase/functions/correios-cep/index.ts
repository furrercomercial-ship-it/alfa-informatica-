// Alfa Informática — Edge Function: consulta endereço (cidade/UF/bairro/rua)
// a partir de um CEP, usando a API dos Correios (ver ../_shared/correios.ts).
// Usada pra auto-completar o formulário de endereço no checkout.
//
// Roda sem autenticação de usuário, mesma razão de correios-frete (checkout
// de visitante). Sem escrita no banco, sem rate limit dedicado.
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase link --project-ref ybkgevyahpkkxhiexejy
//   supabase functions deploy correios-cep --no-verify-jwt
//   (secrets CORREIOS_* já devem estar configuradas — ver supabase/.env.example)

import { consultarCep } from '../_shared/correios.ts';

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
    console.error('[correios-cep] origem não reconhecida rejeitada', origin);
    return fail(403, 'Origem não permitida.');
  }

  try {
    const body = await req.json().catch(() => null);
    const cep = String(body?.cep || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cep)) return fail(400, 'CEP inválido.');

    const endereco = await consultarCep(cep);
    return new Response(JSON.stringify({ ok: true, endereco }), { headers: corsHeaders() });
  } catch (e: any) {
    console.error('[correios-cep] erro', String(e), e?.stack || null);
    return fail(502, 'Não foi possível consultar o CEP agora.');
  }
});

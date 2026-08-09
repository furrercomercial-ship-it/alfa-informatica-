// Alfa Informática — Edge Function: consulta o rastreio de um pedido nos
// Correios e atualiza o status do pedido pra "entregue" quando detectado.
// Admin-only, mesmo padrão de autenticação/permissão (pedidos.editar) de
// correios-etiqueta/index.ts. Disparo manual só (sem cron/auto-refresh
// nesta fase).
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase link --project-ref ybkgevyahpkkxhiexejy
//   supabase functions deploy correios-rastreio
//   (secrets CORREIOS_* já devem estar configuradas — ver supabase/.env.example)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { consultarRastreio } from '../_shared/correios.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerProfile } = await admin.from('profiles').select('role,is_blocked').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.is_blocked) {
      return new Response(JSON.stringify({ error: 'Conta sem permissão.' }), { status: 403, headers: corsHeaders });
    }
    const { data: canEdit } = await admin
      .from('role_permissions').select('allowed')
      .eq('role', callerProfile.role).eq('permission_key', 'pedidos.editar').eq('allowed', true).maybeSingle();
    if (!canEdit) {
      return new Response(JSON.stringify({ error: 'Você não tem permissão para editar pedidos.' }), { status: 403, headers: corsHeaders });
    }

    const { order_id: orderId } = await req.json();
    if (!orderId) return new Response(JSON.stringify({ error: 'Pedido inválido.' }), { status: 400, headers: corsHeaders });

    const { data: order } = await admin.from('orders').select('id,tracking_code,status').eq('id', orderId).single();
    if (!order?.tracking_code) {
      return new Response(JSON.stringify({ error: 'Pedido ainda não tem código de rastreio.' }), { status: 400, headers: corsHeaders });
    }

    let eventos;
    try {
      ({ eventos } = await consultarRastreio(order.tracking_code));
    } catch (e) {
      console.error('[correios-rastreio] falha ao consultar rastreio', String(e));
      return new Response(JSON.stringify({ error: 'Não foi possível consultar o rastreio agora. Tente novamente.' }), { status: 502, headers: corsHeaders });
    }

    // TODO CORREIOS (#6): confirmar o texto/código real que indica entrega
    // — assumido "entreg" (cobre "Entregue"/"Objeto entregue") na descrição.
    const entregue = eventos.some((ev) => /entreg/i.test(ev.descricao || ''));
    let statusAtualizado = false;
    if (entregue && order.status !== 'entregue') {
      await admin.from('orders').update({ status: 'entregue' }).eq('id', orderId);
      statusAtualizado = true;
    }

    return new Response(JSON.stringify({ ok: true, eventos, status_atualizado: statusAtualizado }), { headers: corsHeaders });
  } catch (e) {
    console.error('[correios-rastreio] erro inesperado', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }
});

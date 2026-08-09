// Alfa Informática — Edge Function: gera a etiqueta de postagem (Correios)
// pra um pedido já pago, e grava o código de rastreio no pedido. Admin-only,
// exige login staff com a permissão pedidos.editar — mesmo padrão de
// verificação de admin-create-staff/index.ts (JWT do chamador -> profile ->
// role_permissions -> só então usa o client de service_role).
//
// Deploy (rodar localmente, uma vez, com a Supabase CLI já instalada e logada):
//   supabase link --project-ref ybkgevyahpkkxhiexejy
//   supabase functions deploy correios-etiqueta
//   (secrets CORREIOS_* já devem estar configuradas — ver supabase/.env.example)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { gerarEtiqueta } from '../_shared/correios.ts';

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

    const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single();
    if (!order) return new Response(JSON.stringify({ error: 'Pedido não encontrado.' }), { status: 404, headers: corsHeaders });

    // Idempotente: se já tem etiqueta gerada, devolve o que já existe em vez
    // de gerar de novo (pré-postagens dos Correios normalmente não são
    // livremente recriáveis pro mesmo pedido).
    if (order.label_data) {
      return new Response(JSON.stringify({ ok: true, ...order.label_data, ja_existia: true }), { headers: corsHeaders });
    }
    if (!['pago', 'preparando'].includes(order.status)) {
      return new Response(JSON.stringify({ error: 'Pedido precisa estar Pago ou Em Preparação para gerar etiqueta.' }), { status: 400, headers: corsHeaders });
    }
    if (!order.correios_servico_codigo) {
      return new Response(JSON.stringify({ error: 'Este pedido é retirada na loja ou não tem envio pelos Correios.' }), { status: 400, headers: corsHeaders });
    }

    const { data: items } = await admin.from('order_items').select('*').eq('order_id', orderId);
    const addr = order.address_snapshot || {};
    if (!addr.cep || !addr.rua || !addr.dest) {
      return new Response(JSON.stringify({ error: 'Endereço do pedido incompleto para gerar etiqueta.' }), { status: 400, headers: corsHeaders });
    }

    let resultado;
    try {
      resultado = await gerarEtiqueta({
        servicoCodigo: order.correios_servico_codigo,
        destinatario: {
          nome: addr.dest, cep: addr.cep, rua: addr.rua, numero: addr.numero,
          bairro: addr.bairro, cidade: addr.cid, uf: addr.uf, telefone: addr.tel,
        },
        conteudo: (items || []).map((i: any) => ({ descricao: i.product_name_snapshot, valor: Number(i.unit_price) })),
      });
    } catch (e) {
      console.error('[correios-etiqueta] falha ao gerar etiqueta', String(e));
      return new Response(JSON.stringify({ error: 'Não foi possível gerar a etiqueta agora. Tente novamente.' }), { status: 502, headers: corsHeaders });
    }

    await admin.from('orders').update({
      tracking_code: resultado.trackingCode, carrier: 'Correios', label_data: resultado,
    }).eq('id', orderId);

    return new Response(JSON.stringify({ ok: true, ...resultado }), { headers: corsHeaders });
  } catch (e) {
    console.error('[correios-etiqueta] erro inesperado', String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
  }
});

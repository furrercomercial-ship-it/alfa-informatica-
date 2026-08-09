// Alfa Informática — envio do e-mail de confirmação de pedido, via Resend
// (https://resend.com/docs/api-reference/emails/send-email — API estável e
// pública, ao contrário da dos Correios, então não é chute).
//
// Quem chama isso NUNCA deve deixar uma falha de e-mail derrubar o fluxo
// principal (o pagamento já foi processado quando isso roda) — por isso
// essa função não lança erro, só loga e devolve { ok:false }.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
// Sem domínio próprio verificado no Resend ainda — esse remetente genérico
// funciona sem configuração extra. Trocar aqui quando tiver domínio próprio
// (ex: 'Alfa Informática <pedidos@alfainformatica.com.br>').
const REMETENTE = 'Alfa Informática <onboarding@resend.dev>';
const SITE_BASE_URL = 'https://alfa-informatica-dhs9.vercel.app';

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export type ItemPedidoEmail = { nome: string; qty: number; preco: number };

export async function enviarEmailPedidoConfirmado(params: {
  destinatario: string;
  nomeCliente: string;
  orderNumber: string;
  itens: ItemPedidoEmail[];
  subtotal: number;
  discount: number;
  freight: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
}): Promise<{ ok: boolean }> {
  if (!RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY não configurada — e-mail não enviado.');
    return { ok: false };
  }

  const linkPedido = `${SITE_BASE_URL}/pedido-concluido.html?pedido=${encodeURIComponent(params.orderNumber)}`;
  const primeiroNome = escapeHtml((params.nomeCliente || '').split(' ')[0] || 'cliente');

  const linhasItens = params.itens.map((i) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.qty}x ${escapeHtml(i.nome)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">R$ ${fmtBRL(i.preco * i.qty)}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <h2 style="color:#0066FF;">Pagamento confirmado!</h2>
      <p>Oi, ${primeiroNome} — o pagamento do seu pedido <strong>${params.orderNumber}</strong> foi confirmado. Obrigado por comprar na Alfa Informática!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tbody>${linhasItens}</tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:3px 0;">Subtotal</td><td style="padding:3px 0;text-align:right;">R$ ${fmtBRL(params.subtotal)}</td></tr>
        ${params.discount ? `<tr><td style="padding:3px 0;">Desconto</td><td style="padding:3px 0;text-align:right;">− R$ ${fmtBRL(params.discount)}</td></tr>` : ''}
        <tr><td style="padding:3px 0;">Frete (${params.shippingMethod})</td><td style="padding:3px 0;text-align:right;">${params.freight ? 'R$ ' + fmtBRL(params.freight) : 'Grátis'}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #eee;">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-top:1px solid #eee;">R$ ${fmtBRL(params.total)}</td></tr>
      </table>
      <p style="font-size:14px;color:#555;">Pagamento: ${params.paymentMethod}</p>
      <a href="${linkPedido}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0066FF;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Acompanhar meu pedido</a>
      <p style="font-size:12px;color:#999;margin-top:28px;">Alfa Informática — este é um e-mail automático, não é preciso responder.</p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: REMETENTE,
        to: [params.destinatario],
        subject: `Pedido ${params.orderNumber} confirmado — Alfa Informática`,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[email] Resend recusou o envio', res.status, JSON.stringify(data));
      return { ok: false };
    }
    console.log('[email] enviado', params.orderNumber, '->', params.destinatario);
    return { ok: true };
  } catch (e) {
    console.error('[email] falha ao chamar Resend', String(e));
    return { ok: false };
  }
}

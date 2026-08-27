// Alfa Informática — envio de e-mails transacionais via Resend.
//
// Quatro tipos de e-mail:
//   1. enviarEmailPixGerado        — PIX gerado, aguardando pagamento
//   2. enviarEmailPedidoConfirmado — pagamento aprovado (PIX ou cartão)
//   3. enviarEmailPagamentoEmAnalise  — cartão pendente / em processamento
//   4. enviarEmailPagamentoNaoAprovado — cartão recusado ou cancelado
//
// Nenhuma função lança exceção — retorna { ok: false } em caso de erro para
// nunca derrubar o fluxo principal (o pagamento já foi processado).
//
// Idempotência: é responsabilidade do CHAMADOR (mp-create-payment /
// mp-webhook) garantir que cada tipo de e-mail seja disparado no máximo uma
// vez por pedido, usando UPDATE ... WHERE email_X_at IS NULL RETURNING id
// antes de chamar qualquer função deste módulo.
//
// Remetente: configurável via secret RESEND_FROM_EMAIL.
//   — Com domínio próprio verificado no Resend:
//       supabase secrets set RESEND_FROM_EMAIL="Alfa Informática <pedidos@alfainformatica.com.br>"
//   — Sem domínio próprio (padrão):
//       usa onboarding@resend.dev (pode cair no spam — verificar domínio)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const REMETENTE = Deno.env.get('RESEND_FROM_EMAIL') || 'Alfa Informática <onboarding@resend.dev>';
const SITE_BASE_URL = 'https://alfa-informatica-dhs9.vercel.app';
const LOGO_URL = `${SITE_BASE_URL}/logo-dark.png`;
const CORREIOS_RASTREIO_BASE = 'https://rastreamento.correios.com.br/app/index.php?objetos=';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── blocos HTML reutilizáveis ─────────────────────────────────────────────────

function _botao(texto: string, url: string, cor = '#1a56db'): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 4px;">
    <tr>
      <td style="border-radius:6px;background:${cor};">
        <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(texto)}</a>
      </td>
    </tr>
  </table>`;
}

function _linkSecundario(texto: string, url: string): string {
  return `<p style="margin:12px 0 0;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
    <a href="${esc(url)}" target="_blank" style="color:#1a56db;text-decoration:underline;">${esc(texto)}</a>
  </p>`;
}

function _badge(texto: string, corFundo: string, corTexto = '#ffffff'): string {
  return `<p style="margin:0 0 16px;">
    <span style="display:inline-block;padding:5px 14px;border-radius:20px;background:${corFundo};color:${corTexto};font-size:12px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:.5px;">${esc(texto)}</span>
  </p>`;
}

function _divider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
    <tr><td style="height:1px;background:#e5e7eb;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;
}

function _tabelaItens(
  itens: ItemPedidoEmail[],
  subtotal: number,
  discount: number,
  freight: number,
  total: number,
  shippingMethod: string,
): string {
  const linhasProdutos = itens.map((i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;font-family:Arial,Helvetica,sans-serif;">
        <span style="color:#6b7280;font-size:12px;">${i.qty}×</span> ${esc(i.nome)}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;">R$ ${fmtBRL(i.preco * i.qty)}</td>
    </tr>`).join('');

  const freightValor = freight > 0 ? `R$ ${fmtBRL(freight)}` : '<span style="color:#057a55;">Grátis</span>';

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0 20px;">
    <tbody>
      ${linhasProdutos}
      <tr>
        <td style="padding:10px 0 4px;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">Subtotal</td>
        <td style="padding:10px 0 4px;font-size:13px;color:#6b7280;text-align:right;font-family:Arial,Helvetica,sans-serif;">R$ ${fmtBRL(subtotal)}</td>
      </tr>
      ${discount > 0 ? `<tr>
        <td style="padding:3px 0;font-size:13px;color:#057a55;font-family:Arial,Helvetica,sans-serif;">Desconto</td>
        <td style="padding:3px 0;font-size:13px;color:#057a55;text-align:right;font-family:Arial,Helvetica,sans-serif;">− R$ ${fmtBRL(discount)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">${esc(shippingMethod || 'Frete')}</td>
        <td style="padding:3px 0;font-size:13px;color:#6b7280;text-align:right;font-family:Arial,Helvetica,sans-serif;">${freightValor}</td>
      </tr>
      <tr>
        <td style="padding:14px 0 4px;font-size:17px;font-weight:bold;color:#111827;border-top:2px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">Total</td>
        <td style="padding:14px 0 4px;font-size:17px;font-weight:bold;color:#111827;text-align:right;border-top:2px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">R$ ${fmtBRL(total)}</td>
      </tr>
    </tbody>
  </table>`;
}

// Envelope HTML completo: logo, header colorido, corpo, footer
function _emailWrap(headerCor: string, headerTitulo: string, corpo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${esc(headerTitulo)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#eef2ff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#eef2ff;">
    <tr>
      <td style="padding:28px 12px;">

        <!-- Container 560px -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="560"
          style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dde3f0;">

          <!-- Logo -->
          <tr>
            <td style="padding:20px 32px;text-align:center;background:#ffffff;border-bottom:1px solid #e5e7eb;">
              <a href="${SITE_BASE_URL}" target="_blank" style="display:inline-block;text-decoration:none;">
                <img src="${LOGO_URL}" alt="Alfa Informática" height="44" width="auto"
                  style="height:44px;max-width:200px;display:block;margin:0 auto;" border="0">
              </a>
            </td>
          </tr>

          <!-- Header colorido -->
          <tr>
            <td style="padding:22px 32px;background:${headerCor};">
              <h1 style="margin:0;font-size:19px;font-weight:bold;color:#ffffff;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">${headerTitulo}</h1>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.6;">
              ${corpo}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
                <strong style="color:#6b7280;">Alfa Informática</strong> &mdash; Cuiabá, MT<br>
                Este é um e-mail automático, não é necessário responder.<br>
                <a href="${SITE_BASE_URL}" target="_blank" style="color:#9ca3af;text-decoration:underline;">alfainformatica.com.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── função de envio (privada) ─────────────────────────────────────────────────

async function _enviar(to: string, subject: string, html: string): Promise<{ ok: boolean }> {
  if (!RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY não configurada — e-mail não enviado.');
    return { ok: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMETENTE, to: [to], subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[email] Resend recusou', res.status, JSON.stringify(data));
      return { ok: false };
    }
    console.log('[email] enviado ok —', subject);
    return { ok: true };
  } catch (e) {
    console.error('[email] falha ao chamar Resend', String(e));
    return { ok: false };
  }
}

// ── tipos públicos ────────────────────────────────────────────────────────────

export type ItemPedidoEmail = { nome: string; qty: number; preco: number };

// ── 1. PIX gerado — aguardando pagamento ─────────────────────────────────────

export async function enviarEmailPixGerado(params: {
  destinatario: string;
  nomeCliente: string;
  orderNumber: string;
  total: number;
  pixQrCode: string | null;
  pixTicketUrl: string | null;
  accessToken: string;
}): Promise<{ ok: boolean }> {
  const { destinatario, nomeCliente, orderNumber, total, pixQrCode, pixTicketUrl, accessToken } = params;
  const primeiroNome = esc((nomeCliente || '').split(' ')[0] || 'cliente');
  const linkPedido = `${SITE_BASE_URL}/pedido-concluido.html?pedido=${encodeURIComponent(orderNumber)}&token=${accessToken}`;

  const blocoCodigoPix = pixQrCode
    ? `${_divider()}
       <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#374151;font-family:Arial,Helvetica,sans-serif;">Código PIX copia e cola:</p>
       <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
         <tr>
           <td style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;">
             <p style="margin:0;font-size:11px;color:#374151;font-family:'Courier New',Courier,monospace;word-break:break-all;line-height:1.5;">${esc(pixQrCode)}</p>
           </td>
         </tr>
       </table>
       <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">Copie o código acima e cole no app do seu banco.</p>`
    : '';

  const btnPrincipal = pixTicketUrl
    ? _botao('Ver QR Code e pagar', pixTicketUrl, '#1a56db')
    : _botao('Acessar pedido e pagar', linkPedido, '#1a56db');

  const corpo = `
    ${_badge('⏳ Aguardando pagamento PIX', '#1a56db')}
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">Olá, <strong>${primeiroNome}</strong>!</p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">
      Recebemos seu pedido <strong>#${esc(orderNumber)}</strong>. Para confirmar a compra, realize o pagamento via PIX.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;margin:0 0 8px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#0369a1;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">VALOR DO PEDIDO</p>
          <p style="margin:0;font-size:26px;font-weight:bold;color:#0c4a6e;font-family:Arial,Helvetica,sans-serif;">R$ ${fmtBRL(total)}</p>
        </td>
      </tr>
    </table>

    ${blocoCodigoPix}
    ${_divider()}

    ${btnPrincipal}
    ${_linkSecundario('Acompanhar meu pedido', linkPedido)}

    ${_divider()}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#92400e;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
            ⚠️ <strong>Seu pedido só será confirmado após o pagamento ser aprovado.</strong><br>
            O código PIX expira em até 30 minutos. Após o pagamento, você receberá um e-mail de confirmação.
          </p>
        </td>
      </tr>
    </table>`;

  const html = _emailWrap('#1a56db', `Pagamento PIX — Pedido #${orderNumber}`, corpo);
  return _enviar(destinatario, `Pagamento PIX — Pedido #${orderNumber}`, html);
}

// ── 2. Pedido confirmado — pagamento aprovado ─────────────────────────────────

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
  trackingCode?: string | null;
  accessToken: string;
}): Promise<{ ok: boolean }> {
  const { destinatario, nomeCliente, orderNumber, itens, subtotal, discount, freight, total, shippingMethod, paymentMethod, trackingCode, accessToken } = params;
  const primeiroNome = esc((nomeCliente || '').split(' ')[0] || 'cliente');
  const linkPedido = `${SITE_BASE_URL}/pedido-concluido.html?pedido=${encodeURIComponent(orderNumber)}&token=${accessToken}`;

  const blocoRastreio = trackingCode
    ? `${_divider()}
       <p style="margin:0 0 4px;font-size:13px;color:#374151;font-family:Arial,Helvetica,sans-serif;">
         📦 Código de rastreamento: <strong style="font-family:'Courier New',Courier,monospace;">${esc(trackingCode)}</strong>
       </p>
       ${_linkSecundario('Rastrear minha encomenda nos Correios ↗', `${CORREIOS_RASTREIO_BASE}${encodeURIComponent(trackingCode)}`)}`
    : '';

  const corpo = `
    ${_badge('✓ Pagamento aprovado', '#057a55')}
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">Olá, <strong>${primeiroNome}</strong>!</p>
    <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;">
      O pagamento do seu pedido <strong>#${esc(orderNumber)}</strong> foi confirmado. Obrigado por comprar na Alfa Informática!
    </p>

    ${_tabelaItens(itens, subtotal, discount, freight, total, shippingMethod)}

    <p style="margin:0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">
      Pagamento: <strong>${esc(paymentMethod)}</strong>
    </p>

    ${blocoRastreio}
    ${_divider()}

    ${_botao('Acompanhar meu pedido', linkPedido, '#057a55')}`;

  const html = _emailWrap('#057a55', `Pedido #${orderNumber} confirmado!`, corpo);
  return _enviar(destinatario, `Pedido #${orderNumber} confirmado — Alfa Informática`, html);
}

// ── 3. Pagamento em análise — cartão pendente / em processamento ──────────────

export async function enviarEmailPagamentoEmAnalise(params: {
  destinatario: string;
  nomeCliente: string;
  orderNumber: string;
  total: number;
  accessToken: string;
}): Promise<{ ok: boolean }> {
  const { destinatario, nomeCliente, orderNumber, total, accessToken } = params;
  const primeiroNome = esc((nomeCliente || '').split(' ')[0] || 'cliente');
  const linkPedido = `${SITE_BASE_URL}/pedido-concluido.html?pedido=${encodeURIComponent(orderNumber)}&token=${accessToken}`;

  const corpo = `
    ${_badge('🔍 Pagamento em análise', '#b45309')}
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">Olá, <strong>${primeiroNome}</strong>!</p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">
      Recebemos seu pedido <strong>#${esc(orderNumber)}</strong> e o pagamento via cartão de crédito está sendo verificado.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin:0 0 20px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#92400e;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">VALOR DO PEDIDO</p>
          <p style="margin:0;font-size:26px;font-weight:bold;color:#78350f;font-family:Arial,Helvetica,sans-serif;">R$ ${fmtBRL(total)}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">
      Assim que o pagamento for aprovado, você receberá um e-mail de confirmação e o pedido será processado.<br>
      Normalmente esse processo leva poucos minutos, mas pode levar até 2 dias úteis.
    </p>

    ${_divider()}
    ${_botao('Acompanhar meu pedido', linkPedido, '#b45309')}`;

  const html = _emailWrap('#b45309', `Pagamento em análise — Pedido #${orderNumber}`, corpo);
  return _enviar(destinatario, `Pagamento em análise — Pedido #${orderNumber}`, html);
}

// ── 4. Pagamento não aprovado — recusado / cancelado ─────────────────────────

export async function enviarEmailPagamentoNaoAprovado(params: {
  destinatario: string;
  nomeCliente: string;
  orderNumber: string;
  accessToken: string;
}): Promise<{ ok: boolean }> {
  const { destinatario, nomeCliente, orderNumber, accessToken } = params;
  const primeiroNome = esc((nomeCliente || '').split(' ')[0] || 'cliente');
  const linkPedido = `${SITE_BASE_URL}/pedido-concluido.html?pedido=${encodeURIComponent(orderNumber)}&token=${accessToken}`;

  const corpo = `
    ${_badge('✕ Pagamento não aprovado', '#c81e1e')}
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">Olá, <strong>${primeiroNome}</strong>!</p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">
      Infelizmente o pagamento do pedido <strong>#${esc(orderNumber)}</strong> não foi aprovado.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;margin:0 0 20px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#991b1b;font-family:Arial,Helvetica,sans-serif;">Motivos comuns:</p>
          <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#7f1d1d;font-family:Arial,Helvetica,sans-serif;line-height:1.8;">
            <li>Dados do cartão incorretos</li>
            <li>Saldo ou limite insuficiente</li>
            <li>Pagamento bloqueado pelo banco emissor</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">
      Você pode tentar novamente com outro cartão, ou escolher pagar via PIX com desconto.
    </p>

    ${_divider()}
    ${_botao('Tentar novamente', `${SITE_BASE_URL}/checkout.html`, '#c81e1e')}
    ${_linkSecundario('Ver detalhes do pedido', linkPedido)}`;

  const html = _emailWrap('#c81e1e', `Pagamento não aprovado — Pedido #${orderNumber}`, corpo);
  return _enviar(destinatario, `Pagamento não aprovado — Pedido #${orderNumber}`, html);
}

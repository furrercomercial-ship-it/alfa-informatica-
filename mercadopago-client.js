/* Alfa Informática — Cliente Mercado Pago compartilhado pelo checkout.
   A Public Key é segura no navegador por definição (é feita pra isso) —
   quem NUNCA pode aparecer aqui é o Access Token, que só existe dentro das
   Edge Functions (mp-create-payment / mp-webhook), configurado via
   `supabase secrets set` no servidor.

   Requer que <script src="https://sdk.mercadopago.com/js/v2"></script> seja
   carregado ANTES deste arquivo (mesma ordem que supabase-js -> supabase-client.js). */
window.MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-e6c119ce-9267-47e8-b2b3-74f9e0f72549';

window.MPClient = (function () {
  let mp = null;

  function init() {
    if (mp) return mp;
    if (typeof MercadoPago === 'undefined') {
      console.error('[MPClient] SDK do Mercado Pago não carregou — confira o <script> do sdk.mercadopago.com/js/v2.');
      return null;
    }
    if (!window.MERCADO_PAGO_PUBLIC_KEY || window.MERCADO_PAGO_PUBLIC_KEY.indexOf('COLOCAR_') === 0) {
      console.error('[MPClient] Public Key de teste não configurada em mercadopago-client.js.');
      return null;
    }
    mp = new MercadoPago(window.MERCADO_PAGO_PUBLIC_KEY, { locale: 'pt-BR' });
    return mp;
  }

  // Monta o formulário oficial de cartão do Mercado Pago (Secure Fields por
  // baixo — número, validade e CVV nunca passam pelo nosso JS/DOM, só por
  // iframes do próprio Mercado Pago). `elementIds` aponta pros ids dos
  // containers/inputs já existentes no HTML do checkout.
  function mountCardForm(elementIds, amount, onReady) {
    const client = init();
    if (!client) return null;

    const cardForm = client.cardForm({
      amount: String(amount),
      iframe: true,
      form: {
        id: elementIds.formId,
        cardNumber: { id: elementIds.cardNumber, placeholder: '0000 0000 0000 0000' },
        expirationDate: { id: elementIds.expirationDate, placeholder: 'MM/AA' },
        securityCode: { id: elementIds.securityCode, placeholder: 'CVV' },
        cardholderName: { id: elementIds.cardholderName, placeholder: 'Nome impresso no cartão' },
        issuer: { id: elementIds.issuer, placeholder: 'Banco emissor' },
        installments: { id: elementIds.installments, placeholder: 'Parcelas' },
        identificationType: { id: elementIds.identificationType, placeholder: 'Tipo de documento' },
        identificationNumber: { id: elementIds.identificationNumber, placeholder: 'CPF do titular do cartão' },
        cardholderEmail: { id: elementIds.cardholderEmail, placeholder: 'E-mail' },
      },
      callbacks: {
        onFormMounted: (error) => {
          if (error) { console.error('[MPClient] erro ao montar o formulário de cartão', error); return; }
          // onFormMounted é chamado pelo SDK de forma síncrona, ainda por
          // dentro desta própria chamada a client.cardForm(...) — nesse
          // instante a atribuição "const cardForm = ..." logo abaixo ainda
          // não terminou, então usar `cardForm` aqui direto dá
          // "Cannot access 'cardForm' before initialization" e quebra o
          // formulário silenciosamente. setTimeout(0) adia a leitura pro
          // próximo tick, quando cardForm já está garantidamente atribuído.
          setTimeout(() => { if (onReady) onReady(cardForm); }, 0);
        },
        onError: (error) => console.error('[MPClient] erro no formulário de cartão', error),
        // O SDK NÃO preenche <select> sozinho — os campos de parcelas/banco
        // emissor são só onde ele lê o valor escolhido, quem desenha as
        // opções somos nós, a partir do que esses dois retornos avisam.
        // Faz log do formato bruto de propósito: se o formato vier
        // diferente do que a doc descreve, dá pra ver exatamente o que
        // ajustar sem precisar adivinhar de novo.
        onIssuersReceived: (error, issuers) => {
          console.log('[MPClient] onIssuersReceived', error, issuers);
          if (error) return;
          var select = document.getElementById(elementIds.issuer);
          if (!select) return;
          var list = Array.isArray(issuers) ? issuers : [];
          select.innerHTML = list.length
            ? list.map((i) => '<option value="' + i.id + '">' + i.name + '</option>').join('')
            : '<option value="">Banco emissor</option>';
        },
        onInstallmentsReceived: (error, installments) => {
          console.log('[MPClient] onInstallmentsReceived', error, installments);
          if (error) return;
          var select = document.getElementById(elementIds.installments);
          if (!select) return;
          // installmentsResponse é UM objeto { payer_costs: [...] }, não uma
          // lista de objetos — confirmado na doc oficial do SDK
          // (github.com/mercadopago/sdk-js/blob/main/docs/card-form.md).
          // A versão anterior lia installments[0].payer_costs, que nunca
          // existe porque `installments` não é array — por isso o select
          // sempre caía no placeholder, mesmo com o callback OK.
          var payerCosts = (installments && Array.isArray(installments.payer_costs)) ? installments.payer_costs : [];
          select.innerHTML = payerCosts.length
            ? payerCosts.map((pc) => '<option value="' + pc.installments + '">' + (pc.recommended_message || (pc.installments + 'x')) + '</option>').join('')
            : '<option value="">Parcelas</option>';
        },
        onIdentificationTypesReceived: (error, types) => {
          console.log('[MPClient] onIdentificationTypesReceived', error, types);
          if (error) return;
          var select = document.getElementById(elementIds.identificationType);
          if (!select || select.options.length) return; // já populado, não sobrescreve
          var list = Array.isArray(types) ? types : [];
          select.innerHTML = list.map((t) => '<option value="' + t.id + '">' + (t.name || t.id) + '</option>').join('');
        },
      },
    });

    return cardForm;
  }

  // Lê os dados já tokenizados do formulário (chamar só depois de
  // onFormMounted e do usuário preencher tudo) — nunca expõe número/CVV,
  // só o token de uso único já gerado pelo Mercado Pago.
  function getCardFormData(cardForm) {
    if (!cardForm) return null;
    try {
      const data = cardForm.getCardFormData();
      return {
        token: data.token,
        installments: data.installments,
        paymentMethodId: data.paymentMethodId,
        issuerId: data.issuerId,
      };
    } catch (e) {
      console.error('[MPClient] não foi possível ler os dados do cartão', e);
      return null;
    }
  }

  return { init, mountCardForm, getCardFormData };
})();

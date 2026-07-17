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
          if (onReady) onReady(cardForm);
        },
        onError: (error) => console.error('[MPClient] erro no formulário de cartão', error),
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

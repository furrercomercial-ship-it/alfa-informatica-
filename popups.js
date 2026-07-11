/* Alfa Informática — Exibe popups cadastrados em Aparência > Popups.
   Mostra no máximo um por vez (o primeiro elegível, por ordem), respeitando
   a frequência escolhida (sempre / uma vez por visita / uma vez por
   dispositivo). Requer supabase-client.js carregado antes. */
(function () {
  function seenKey(id) { return 'alfa_popup_seen_' + id; }

  function alreadySeen(p) {
    if (p.frequencia === 'sempre') return false;
    if (p.frequencia === 'uma_vez_dispositivo') return !!localStorage.getItem(seenKey(p.id));
    return !!sessionStorage.getItem(seenKey(p.id)); // uma_vez_sessao (padrão)
  }
  function markSeen(p) {
    if (p.frequencia === 'uma_vez_dispositivo') localStorage.setItem(seenKey(p.id), '1');
    else if (p.frequencia !== 'sempre') sessionStorage.setItem(seenKey(p.id), '1');
  }

  var BADGE_LABEL = { cupom: 'Cupom Exclusivo', promocao: 'Promoção', newsletter: 'Novidade', aviso: 'Aviso' };
  var ICON_TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.17L4 3a1 1 0 0 0-1 1l.17 5.59a2 2 0 0 0 .66 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.82Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>';
  var ICON_FLAME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  var BADGE_ICON = { cupom: ICON_TAG, promocao: ICON_FLAME, newsletter: ICON_MAIL, aviso: ICON_ALERT };
  var ICON_SCISSORS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>';
  var ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  var ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  function render(p) {
    var overlay = document.createElement('div');
    overlay.className = 'alfa-popup-overlay';
    overlay.innerHTML =
      '<div class="alfa-popup-card' + (p.imagem_url ? '' : ' no-media') + '" data-tipo="' + (p.tipo || 'cupom') + '">' +
        '<button class="alfa-popup-close" aria-label="Fechar">&times;</button>' +
        (p.imagem_url ? '<div class="alfa-popup-media"><img src="' + p.imagem_url + '" alt=""></div>' : '') +
        '<div class="alfa-popup-content">' +
          '<span class="alfa-popup-badge">' + (BADGE_ICON[p.tipo] || ICON_TAG) + (BADGE_LABEL[p.tipo] || 'Oferta') + '</span>' +
          (p.titulo ? '<h3 class="alfa-popup-title">' + p.titulo + '</h3>' : '') +
          (p.mensagem ? '<p class="alfa-popup-msg">' + p.mensagem + '</p>' : '') +
          (p.cupom_codigo ? '<div class="alfa-popup-cupom">' + ICON_SCISSORS + '<span>' + p.cupom_codigo + '</span></div>' : '') +
          (p.cta_label ? '<a class="alfa-popup-cta" href="' + (p.cta_url || '#') + '"><span>' + p.cta_label + '</span>' + ICON_ARROW + '</a>' : '') +
          '<div class="alfa-popup-foot">' + ICON_LOCK + 'Oferta por tempo limitado</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    function close() { overlay.classList.add('closing'); setTimeout(function () { overlay.remove(); }, 180); markSeen(p); }
    overlay.querySelector('.alfa-popup-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    var cupomEl = overlay.querySelector('.alfa-popup-cupom');
    if (cupomEl && navigator.clipboard) {
      cupomEl.addEventListener('click', function () {
        navigator.clipboard.writeText(p.cupom_codigo).then(function () {
          cupomEl.classList.add('copied');
          setTimeout(function () { cupomEl.classList.remove('copied'); }, 1800);
        });
      });
    }
  }

  async function init() {
    if (!window.sb) return;
    try {
      var nowIso = new Date().toISOString();
      var { data } = await window.sb.from('popups').select('*').eq('ativo', true).order('ordem');
      if (!data || !data.length) return;
      var eligible = data.find(function (p) {
        if (p.data_inicio && p.data_inicio > nowIso) return false;
        if (p.data_fim && p.data_fim < nowIso) return false;
        return !alreadySeen(p);
      });
      if (eligible) setTimeout(function () { render(eligible); }, 1200);
    } catch (e) { console.error('popups', e); }
  }
  init();
})();

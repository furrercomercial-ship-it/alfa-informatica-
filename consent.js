/* Alfa Informática — Banner de consentimento de cookies (LGPD-style).
   Decisão fica em localStorage (mesmo padrão de tema/carrinho/favoritos —
   este projeto não tem conta de visitante anônimo pra guardar isso no banco).
   Categorias: essencial (sempre true), analytics, marketing, personalizacao.
   Scripts marcados como analytics/marketing só rodam depois que a categoria
   correspondente for autorizada aqui — ver script-engine.js. */
window.AlfaConsent = (function () {
  var KEY = 'alfa_consent';
  var listeners = [];

  function get() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') return raw;
    } catch (e) {}
    return { essencial: true, analytics: false, marketing: false, personalizacao: false, decided: false, date: null };
  }

  function save(consent) {
    localStorage.setItem(KEY, JSON.stringify(consent));
    listeners.forEach(function (cb) { cb(consent); });
  }

  function set(patch) {
    var consent = Object.assign(get(), patch, { essencial: true, decided: true, date: new Date().toISOString() });
    save(consent);
    hideBanner();
    return consent;
  }

  function has(categoria) {
    if (categoria === 'essencial' || !categoria) return true;
    return !!get()[categoria];
  }

  function acceptAll() { return set({ analytics: true, marketing: true, personalizacao: true }); }
  function rejectNonEssential() { return set({ analytics: false, marketing: false, personalizacao: false }); }

  var CATS = [
    { key: 'essencial', label: 'Essenciais', desc: 'Necessários pro site funcionar (carrinho, login, tema). Não podem ser desligados.', locked: true },
    { key: 'analytics', label: 'Analytics', desc: 'Ajudam a entender como os visitantes usam o site (ex: Google Analytics).' },
    { key: 'marketing', label: 'Marketing', desc: 'Usados por anúncios pra medir resultado de campanhas (ex: Meta Pixel, TikTok Pixel).' },
    { key: 'personalizacao', label: 'Personalização', desc: 'Lembram preferências pra deixar sua experiência mais relevante.' },
  ];

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  function hideBanner() {
    var b = document.getElementById('alfaConsentBanner');
    if (b) b.remove();
  }

  function renderBanner() {
    if (document.getElementById('alfaConsentBanner')) return;
    var consent = get();
    var banner = el(
      '<div class="alfa-consent-banner" id="alfaConsentBanner">' +
        '<div class="alfa-consent-main">' +
          '<div class="alfa-consent-txt">' +
            '<strong>Usamos cookies</strong>' +
            '<span>Usamos cookies essenciais pro site funcionar e, com sua permissão, cookies de analytics e marketing pra melhorar sua experiência.</span>' +
          '</div>' +
          '<div class="alfa-consent-btns">' +
            '<button type="button" class="alfa-consent-btn alfa-consent-ghost" data-act="prefs">Personalizar</button>' +
            '<button type="button" class="alfa-consent-btn alfa-consent-outline" data-act="reject">Rejeitar não essenciais</button>' +
            '<button type="button" class="alfa-consent-btn alfa-consent-primary" data-act="accept">Aceitar tudo</button>' +
          '</div>' +
        '</div>' +
        '<div class="alfa-consent-prefs" id="alfaConsentPrefs" hidden>' +
          CATS.map(function (c) {
            var checked = c.locked || consent[c.key];
            return '<label class="alfa-consent-cat' + (c.locked ? ' locked' : '') + '">' +
              '<div class="alfa-consent-cat-txt"><b>' + c.label + '</b><span>' + c.desc + '</span></div>' +
              '<input type="checkbox" data-cat="' + c.key + '" ' + (checked ? 'checked' : '') + (c.locked ? ' disabled' : '') + '>' +
            '</label>';
          }).join('') +
          '<button type="button" class="alfa-consent-btn alfa-consent-primary" data-act="save-prefs">Salvar preferências</button>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(banner);

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'accept') acceptAll();
      else if (act === 'reject') rejectNonEssential();
      else if (act === 'prefs') document.getElementById('alfaConsentPrefs').hidden = false;
      else if (act === 'save-prefs') {
        var patch = {};
        banner.querySelectorAll('[data-cat]').forEach(function (input) { patch[input.dataset.cat] = input.checked; });
        set(patch);
      }
    });
  }

  function showPreferences() {
    renderBanner();
    document.getElementById('alfaConsentPrefs').hidden = false;
  }

  function mountReopenButton() {
    if (document.getElementById('alfaConsentReopen')) return;
    var btn = el('<button type="button" id="alfaConsentReopen" class="alfa-consent-reopen" title="Preferências de cookies">🍪</button>');
    btn.addEventListener('click', showPreferences);
    document.body.appendChild(btn);
  }

  function init() {
    mountReopenButton();
    if (!get().decided) renderBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { get: get, has: has, set: set, acceptAll: acceptAll, rejectNonEssential: rejectNonEssential, onChange: function (cb) { listeners.push(cb); }, showPreferences: showPreferences };
})();

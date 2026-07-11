/* Alfa Informática — Aplica o Design System (site_settings.theme_colors) no
   site público. Carregado bem cedo em cada página; o <script> inline no
   <head> já define document.documentElement.dataset.theme antes disso.

   Histórico: uma versão anterior deste arquivo foi desativada por causar
   cores erradas no modo claro. Causa raiz: as cores eram aplicadas como
   estilo inline (que sempre vence a regra CSS [data-theme="light"]{...})
   só uma vez, no carregamento da página — ao trocar de tema pelo botão
   claro/escuro (que não recarrega a página, ver Store.setTheme em
   store.js), o estilo inline antigo ficava "preso" e brigava com o tema
   novo. A correção: observar mudanças no atributo data-theme e reaplicar
   as cores certas sempre que ele mudar. */
window.AlfaThemeLoader = (function () {
  var cache = null, cacheTypo = null, cacheBtn = null;

  // chave em theme_colors -> variável CSS aplicada. As 11 primeiras já são
  // consumidas em todo o site hoje; as demais (--alfa-*) são o vocabulário
  // novo do Design System — inertes até cada página passar a usar var(--alfa-x)
  // em algum seletor (feito aos poucos, sem risco pro que já funciona).
  var MAP = {
    primary: '--primary', secondary: '--primary-hover', button: '--primary',
    text: '--text-main', title: '--text-main', card: '--bg-card',
    header: '--bg-header', footer: '--bg-footer', background: '--bg-main',
    link: '--primary', hover: '--primary-hover',

    sidebar: '--alfa-sidebar', subtitle: '--alfa-subtitle', muted: '--alfa-muted', link_hover: '--alfa-link-hover',
    price: '--alfa-price', price_old: '--alfa-price-old', price_promo: '--alfa-price-promo',
    price_pix: '--alfa-price-pix', price_installment: '--alfa-price-installment',
    rating_star: '--alfa-rating-star', rating_text: '--alfa-rating-text',
    icon: '--alfa-icon', divider: '--alfa-divider', border: '--alfa-border',
    badge_bg: '--alfa-badge-bg', badge_text: '--alfa-badge-text',
    warning_bg: '--alfa-warning-bg', warning_text: '--alfa-warning-text',
    success_bg: '--alfa-success-bg', success_text: '--alfa-success-text',
    danger_bg: '--alfa-danger-bg', danger_text: '--alfa-danger-text',
    btn_primary_bg: '--alfa-btn-primary-bg', btn_primary_text: '--alfa-btn-primary-text', btn_primary_hover: '--alfa-btn-primary-hover',
    btn_secondary_bg: '--alfa-btn-secondary-bg', btn_secondary_text: '--alfa-btn-secondary-text', btn_secondary_hover: '--alfa-btn-secondary-hover',
    btn_buy_bg: '--alfa-btn-buy-bg', btn_buy_text: '--alfa-btn-buy-text', btn_buy_hover: '--alfa-btn-buy-hover',
    input_bg: '--alfa-input-bg', input_border: '--alfa-input-border', input_text: '--alfa-input-text',
    placeholder: '--alfa-placeholder', focus_ring: '--alfa-focus-ring',
    switch_on: '--alfa-switch-on', checkbox: '--alfa-checkbox', radio: '--alfa-radio',
    filter_bg: '--alfa-filter-bg', filter_text: '--alfa-filter-text', breadcrumb_text: '--alfa-breadcrumb-text',
  };

  function currentMode() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  function applyTypography(typography) {
    if (!typography) return;
    var root = document.documentElement.style;
    if (typography.font_heading) root.setProperty('--alfa-font-heading', typography.font_heading);
    if (typography.font_body) root.setProperty('--alfa-font-body', typography.font_body);
    ['titulo', 'subtitulo', 'texto', 'botao', 'preco', 'menu', 'card'].forEach(function (papel) {
      var t = typography[papel];
      if (!t) return;
      if (t.size) root.setProperty('--alfa-tipo-' + papel + '-size', t.size);
      if (t.weight) root.setProperty('--alfa-tipo-' + papel + '-weight', t.weight);
      if (t.line_height) root.setProperty('--alfa-tipo-' + papel + '-line-height', t.line_height);
      if (t.spacing) root.setProperty('--alfa-tipo-' + papel + '-spacing', t.spacing);
      if (t.transform) root.setProperty('--alfa-tipo-' + papel + '-transform', t.transform);
    });
  }

  function applyButtonStyle(buttonStyle) {
    if (!buttonStyle) return;
    var root = document.documentElement.style;
    ['primario', 'secundario', 'comprar'].forEach(function (papel) {
      var b = buttonStyle[papel];
      if (!b) return;
      if (b.border_width) root.setProperty('--alfa-btn-' + papel + '-border-width', b.border_width);
      if (b.radius) root.setProperty('--alfa-btn-' + papel + '-radius', b.radius);
      if (b.shadow) root.setProperty('--alfa-btn-' + papel + '-shadow', b.shadow);
      if (b.padding) root.setProperty('--alfa-btn-' + papel + '-padding', b.padding);
      if (b.height) root.setProperty('--alfa-btn-' + papel + '-height', b.height);
    });
  }

  function apply(themeColors) {
    if (!themeColors) return;
    var palette = themeColors[currentMode()];
    if (!palette) return;
    var root = document.documentElement.style;
    Object.keys(MAP).forEach(function (key) {
      if (palette[key] != null && palette[key] !== '') root.setProperty(MAP[key], palette[key]);
    });
  }

  function applyAll() {
    // window.__alfaPreviewOverride é preenchido pelo editor de Design System
    // (admin-aparencia-cores.html) quando esta página está rodando dentro do
    // iframe de preview — deixa ver o rascunho em tempo real sem publicar.
    var override = window.__alfaPreviewOverride;
    var colors = override ? override.theme_colors : cache;
    var typo = override ? override.typography : cacheTypo;
    var btn = override ? override.button_style : cacheBtn;
    apply(colors);
    applyTypography(typo);
    applyButtonStyle(btn);
  }

  async function init() {
    if (!window.sb) return;
    try {
      var { data } = await window.sb
        .from('site_settings')
        .select('theme_colors,typography,button_style')
        .eq('id', 1).single();
      if (!data) return;
      cache = data.theme_colors;
      cacheTypo = data.typography;
      cacheBtn = data.button_style;
      applyAll();
    } catch (e) { console.error('theme-loader', e); }
  }

  // Reaplica sempre que o tema (claro/escuro) muda em tempo real.
  new MutationObserver(function () {
    applyAll();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // O editor de Design System roda num domínio separado do site (painel e
  // loja são dois deploys/repos diferentes), então não dá pra escrever
  // direto em window.__alfaPreviewOverride do iframe (bloqueado por
  // same-origin policy). postMessage é o jeito cross-origin de fazer isso.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'alfa-preview-override') return;
    if (e.data.mode) document.documentElement.dataset.theme = e.data.mode;
    window.__alfaPreviewOverride = e.data.payload;
    applyAll();
  });

  init();
  return { reapply: applyAll };
})();

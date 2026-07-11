/* Alfa Informática — Motor de injeção da Central de Integrações e Scripts.
   Substitui a injeção antiga (que vivia em site-meta.js, lendo direto os 3
   campos de texto de site_settings). Agora lê as tabelas `integracoes` e
   `scripts_custom`, aplica as regras (ambiente/dispositivo/página/URL/
   consentimento) e injeta cada script no lugar certo, na hora certa.
   Depende de consent.js (AlfaConsent) e event-manager.js (AlfaEvents), que
   devem ser carregados ANTES deste arquivo. */
window.AlfaScripts = (function () {
  var injected = new Set();        // "integracao:12" / "script:7" já injetados nesta página
  var codeHashes = {};             // hash simples do código -> [ids] (duplicados, pro diagnóstico)
  var lastDiagnostics = null;

  // ── Templates das integrações conhecidas — só pedem o ID, geram o snippet oficial ──
  var TEMPLATES = {
    ga4: function (id) {
      return '<script async src="https://www.googletagmanager.com/gtag/js?id=' + id + '"><\/script>' +
        '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + id + '");<\/script>';
    },
    gtm_head: function (id) {
      return '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","' + id + '");<\/script>';
    },
    gtm_noscript: function (id) {
      return '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + id + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>';
    },
    meta_pixel: function (id) {
      return '<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","' + id + '");fbq("track","PageView");<\/script>';
    },
    tiktok_pixel: function (id) {
      return '<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var o="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=o,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=o+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};ttq.load("' + id + '");ttq.page();}(window,document,"ttq");<\/script>';
    },
    clarity: function (id) {
      return '<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","' + id + '");<\/script>';
    },
    hotjar: function (id) {
      return '<script>(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:' + JSON.stringify(id) + ',hjsv:6};a=o.getElementsByTagName("head")[0];r=o.createElement("script");r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,"https://static.hotjar.com/c/hotjar-",".js?sv=");<\/script>';
    },
    pinterest_tag: function (id) {
      return '<script>!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk("load","' + id + '");pintrk("page");<\/script>';
    },
    google_ads: function (id) {
      return '<script async src="https://www.googletagmanager.com/gtag/js?id=' + id + '"><\/script>' +
        '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + id + '");<\/script>';
    },
  };

  // ── Contexto da página atual ─────────────────────────────────────────
  function currentPageKey() {
    var f = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!f || f === 'alfa-replica.html' || f === '') return 'home';
    if (f.indexOf('categoria') === 0) return 'categoria';
    if (f.indexOf('produto') === 0) return 'produto';
    if (f.indexOf('carrinho') === 0) return 'carrinho';
    if (f.indexOf('checkout') === 0) return 'checkout';
    if (f.indexOf('favoritos') === 0) return 'favoritos';
    if (f.indexOf('auth') === 0) return 'auth';
    return 'outra';
  }
  function currentDevice() {
    var ua = navigator.userAgent || '';
    if (/iPad|Tablet(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'celular';
    return 'desktop';
  }
  function currentAmbiente() {
    var h = location.hostname;
    return (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) ? 'desenvolvimento' : 'producao';
  }

  function matchesUrlRule(rule) {
    var href = location.href, val = rule.valor || '';
    if (rule.tipo === 'exata') return href === val || location.pathname === val;
    if (rule.tipo === 'contem') return href.indexOf(val) !== -1;
    if (rule.tipo === 'comeca_com') return href.indexOf(val) === 0;
    if (rule.tipo === 'nao_contem') return href.indexOf(val) === -1;
    return false;
  }

  function matchesPaginas(script) {
    if (script.paginas_modo === 'todas') return true;
    var pageKey = currentPageKey();
    var listMatch = (script.paginas || []).indexOf(pageKey) !== -1;
    var urlMatch = (script.regras_url || []).some(matchesUrlRule);
    var anyMatch = listMatch || urlMatch;
    return script.paginas_modo === 'somente' ? anyMatch : !anyMatch; // 'exceto'
  }

  function matchesDispositivo(script) {
    return script.dispositivos === 'todos' || script.dispositivos === currentDevice();
  }

  function matchesAmbiente(script, cfg) {
    var env = currentAmbiente();
    if (script.ambiente === 'ambos') return true;
    if (script.ambiente === 'producao') return env === 'producao';
    if (script.ambiente === 'desenvolvimento') return env === 'desenvolvimento' && !!cfg.allow_dev_scripts;
    return false;
  }

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
    return h;
  }

  // ── Injeção real no DOM (recria <script> pra forçar execução, já que
  //    innerHTML não executa script injetado dessa forma) ────────────────
  function injectHTML(html, targetEl, method, tagId) {
    if (!html) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    Array.from(tmp.childNodes).forEach(function (node) {
      var toInsert = node;
      if (node.tagName === 'SCRIPT') {
        var s = document.createElement('script');
        Array.from(node.attributes).forEach(function (a) { s.setAttribute(a.name, a.value); });
        s.textContent = node.textContent;
        toInsert = s;
      }
      if (toInsert.setAttribute) {
        toInsert.setAttribute('data-alfa-script-id', tagId);
        toInsert.setAttribute('data-alfa-injected-at', Date.now());
      }
      targetEl[method](toInsert);
    });
  }

  function targetFor(posicao) {
    if (posicao === 'head') return { el: document.head, method: 'appendChild' };
    if (posicao === 'body_open') return { el: document.body, method: 'prepend' };
    return { el: document.body, method: 'appendChild' };
  }

  function doInject(item) {
    if (injected.has(item.id)) return;
    injected.add(item.id);
    var h = hashCode(item.codigo || '');
    (codeHashes[h] = codeHashes[h] || []).push(item.id);

    var t = targetFor(item.posicao);
    var run = function () { injectHTML(item.codigo, t.el, t.method, item.id); };

    if (item.estrategia === 'apos_carregamento') {
      if (document.readyState === 'complete') run();
      else window.addEventListener('load', run, { once: true });
    } else if (item.estrategia === 'apos_interacao') {
      var fired = false;
      var trigger = function () { if (fired) return; fired = true; run(); };
      ['click', 'scroll', 'keydown', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, trigger, { once: true, passive: true });
      });
    } else if (item.estrategia === 'atraso') {
      setTimeout(run, item.atraso_ms || 0);
    } else {
      // normal / async / defer — async/defer só têm efeito real em <script src>,
      // que já vem com o atributo certo no próprio template/código quando aplicável.
      run();
    }
  }

  // ── Constrói a lista de itens injetáveis a partir de integrações + scripts ──
  function buildIntegrationItems(integracoes) {
    var items = [];
    integracoes.forEach(function (i) {
      if (i.status !== 'ativo' || !i.identificador) return;
      var codigo = '';
      var posicao = 'head';
      if (i.tipo === 'ga4') codigo = TEMPLATES.ga4(i.identificador);
      else if (i.tipo === 'gtm') { codigo = TEMPLATES.gtm_head(i.identificador); }
      else if (i.tipo === 'meta_pixel' || i.tipo === 'tiktok_pixel') {
        window.__alfaEventConfig = window.__alfaEventConfig || {};
        window.__alfaEventConfig[i.tipo] = (i.configuracoes && i.configuracoes.eventos_ativos) || {};
        codigo = i.tipo === 'meta_pixel' ? TEMPLATES.meta_pixel(i.identificador) : TEMPLATES.tiktok_pixel(i.identificador);
      }
      else if (i.tipo === 'clarity') codigo = TEMPLATES.clarity(i.identificador);
      else if (i.tipo === 'hotjar') codigo = TEMPLATES.hotjar(i.identificador);
      else if (i.tipo === 'pinterest_tag') codigo = TEMPLATES.pinterest_tag(i.identificador);
      else if (i.tipo === 'google_ads') {
        codigo = TEMPLATES.google_ads(i.identificador);
        if (i.identificador_extra) window.__alfaGoogleAdsConversion = { sendTo: i.identificador + '/' + i.identificador_extra };
      } else if (i.tipo === 'chat_atendimento' || i.tipo === 'personalizada') {
        codigo = (i.configuracoes && i.configuracoes.codigo) || '';
        posicao = 'body_close';
      }
      if (!codigo) return;

      var consentimento = ['meta_pixel', 'tiktok_pixel', 'pinterest_tag', 'google_ads'].indexOf(i.tipo) !== -1 ? 'marketing'
        : ['ga4', 'gtm', 'clarity', 'hotjar'].indexOf(i.tipo) !== -1 ? 'analytics' : 'essencial';

      items.push({
        id: 'integracao:' + i.id, categoria: consentimento, consentimento: consentimento,
        ambiente: i.ambiente, posicao: posicao, codigo: codigo,
        estrategia: 'normal', atraso_ms: null, prioridade: 'alta', dispositivos: 'todos', paginas_modo: 'todas',
      });

      if (i.tipo === 'gtm') {
        items.push({
          id: 'integracao:' + i.id + ':noscript', categoria: consentimento, consentimento: consentimento,
          ambiente: i.ambiente, posicao: 'body_open', codigo: TEMPLATES.gtm_noscript(i.identificador),
          estrategia: 'normal', atraso_ms: null, prioridade: 'alta', dispositivos: 'todos', paginas_modo: 'todas',
        });
      }
    });
    return items;
  }

  function buildScriptItems(scripts) {
    return scripts.filter(function (s) { return s.status === 'ativo'; }).map(function (s) {
      return {
        id: 'script:' + s.id, categoria: s.categoria, consentimento: s.consentimento,
        ambiente: s.ambiente, posicao: s.posicao, codigo: s.codigo,
        estrategia: s.estrategia, atraso_ms: s.atraso_ms, prioridade: s.prioridade,
        dispositivos: s.dispositivos, paginas_modo: s.paginas_modo, paginas: s.paginas, regras_url: s.regras_url,
      };
    });
  }

  var PRIORITY_ORDER = { alta: 0, normal: 1, baixa: 2 };
  var cfgCache = null, allItemsCache = null;
  // Modo de teste do painel admin (ver "Testar" em admin-aparencia-scripts.html):
  // a aba Diagnóstico abre este site num iframe oculto só pra conferir se o
  // código está correto — não é uma visita real, então não faz sentido exigir
  // consentimento de cookies nesse caso específico.
  var adminTestMode = /(?:^|[?&])alfa_admin_test=1/.test(location.search);

  function passesGates(item, cfg) {
    if (cfg.block_during_maintenance) return false;
    if (item.id.indexOf('script:') === 0 && !cfg.custom_scripts_enabled) return false;
    if (cfg.pause_marketing && item.categoria === 'marketing') return false;
    if (cfg.pause_analytics && item.categoria === 'analytics') return false;
    if (!matchesAmbiente(item, cfg)) return false;
    if (!matchesDispositivo(item)) return false;
    if (item.paginas_modo && !matchesPaginas(item)) return false;
    if (!adminTestMode && (!window.AlfaConsent || !window.AlfaConsent.has(item.consentimento))) return false;
    return true;
  }

  function runPass() {
    if (!allItemsCache || !cfgCache) return;
    var toRun = allItemsCache.filter(function (item) { return !injected.has(item.id) && passesGates(item, cfgCache); });
    toRun.sort(function (a, b) { return PRIORITY_ORDER[a.prioridade] - PRIORITY_ORDER[b.prioridade]; });
    toRun.forEach(doInject);
    window.__alfaReady = true;
    if (window.AlfaEvents) window.AlfaEvents.track('page_view', { page: location.pathname });
  }

  async function init() {
    if (!window.sb) return;
    try {
      var [{ data: settings }, { data: integracoes }, { data: scripts }] = await Promise.all([
        window.sb.from('site_settings').select('scripts_config').eq('id', 1).single(),
        window.sb.from('integracoes').select('*').eq('status', 'ativo'),
        window.sb.from('scripts_custom').select('*').eq('status', 'ativo'),
      ]);
      cfgCache = (settings && settings.scripts_config) || {};
      allItemsCache = buildIntegrationItems(integracoes || []).concat(buildScriptItems(scripts || []));
      runPass();
      if (window.AlfaConsent) window.AlfaConsent.onChange(runPass);
    } catch (e) { console.error('script-engine', e); }
  }

  function diagnostics() {
    var duplicados = Object.values(codeHashes).filter(function (ids) { return ids.length > 1; });
    lastDiagnostics = {
      ts: Date.now(),
      totalInjetados: injected.size,
      duplicados: duplicados,
      detectado: {
        ga4_gtm: typeof window.gtag === 'function' || typeof window.dataLayer !== 'undefined',
        meta_pixel: typeof window.fbq === 'function',
        tiktok_pixel: typeof window.ttq !== 'undefined',
        clarity: typeof window.clarity === 'function',
        hotjar: typeof window.hj === 'function',
      },
      recursos: (performance.getEntriesByType('resource') || [])
        .filter(function (r) { return /googletagmanager|facebook|tiktok|clarity\.ms|hotjar|pinimg/.test(r.name); })
        .map(function (r) { return { nome: r.name, duracaoMs: Math.round(r.duration) }; }),
    };
    return lastDiagnostics;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { diagnostics: diagnostics, _injected: injected };
})();

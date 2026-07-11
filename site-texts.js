/* Alfa Informática — Aplica textos editáveis (site_texts) no site público.
   Qualquer elemento marcado com data-text="chave" recebe o valor salvo no
   painel (Aparência → Textos). Mesmo padrão de theme-loader.js/page-blocks.js:
   busca uma vez e guarda em cache; páginas com conteúdo montado via JS (ex:
   produto.html) chamam AlfaTexts.apply() de novo depois de renderizar. */
window.AlfaTexts = (function () {
  var map = null;

  async function load() {
    if (!window.sb) return {};
    try {
      var { data } = await window.sb.from('site_texts').select('chave,valor');
      map = {};
      (data || []).forEach(function (t) { map[t.chave] = t.valor; });
    } catch (e) {
      console.error('site-texts', e);
      map = map || {};
    }
    return map;
  }

  function apply() {
    if (!map) return;
    document.querySelectorAll('[data-text]').forEach(function (el) {
      var val = map[el.dataset.text];
      if (val != null && val !== '') el.textContent = val;
    });
  }

  (async function () { await load(); apply(); })();

  return { apply: function () { if (map) apply(); else load().then(apply); } };
})();

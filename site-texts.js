/* Alfa Informática — Aplica textos editáveis (site_texts) no site público.
   Qualquer elemento marcado com data-text="chave" recebe o valor salvo no
   painel (Aparência → Textos). Mesmo padrão de theme-loader.js: busca uma
   vez, aplica; elementos sem marcação continuam com o texto fixo de sempre. */
(async function () {
  if (!window.sb) return;
  try {
    var { data } = await window.sb.from('site_texts').select('chave,valor');
    if (!data || !data.length) return;
    var map = {};
    data.forEach(function (t) { map[t.chave] = t.valor; });
    document.querySelectorAll('[data-text]').forEach(function (el) {
      var val = map[el.dataset.text];
      if (val != null && val !== '') el.textContent = val;
    });
    window.AlfaTexts = map;
  } catch (e) { console.error('site-texts', e); }
})();

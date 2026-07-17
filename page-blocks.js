/* Alfa Informática — Aplica ordem/visibilidade de blocos (page_blocks) no
   site público. Diferente de theme-loader/site-texts (que só tocam texto/
   estilo), aqui às vezes um bloco marcado com data-block só existe DEPOIS
   que a própria página termina de renderizar seu conteúdo dinâmico (produto,
   carrinho, checkout puxam dados do Supabase antes de montar o HTML). Por
   isso este arquivo não roda sozinho: cada página chama
   window.AlfaBlocks.apply('chave_da_pagina') depois de montar seu HTML.

   Um bloco marcado pode estar em qualquer lugar do documento — apply()
   reúne todos os [data-block] esperados daquela página e os reagrupa, na
   ordem certa, dentro do pai do primeiro bloco encontrado (funciona mesmo
   quando os blocos nascem em containers HTML separados, como a galeria de
   produto e a seção de avaliações). */
window.AlfaBlocks = (function () {
  var cache = {}; // page_key -> [{block_key, ordem, visivel, visibilidade}]

  function currentDevice() {
    var ua = navigator.userAgent || '';
    return /Mobi|Android|iPhone|iPod/i.test(ua) ? 'celular' : 'desktop';
  }

  async function loadConfig(pageKey) {
    if (cache[pageKey]) return cache[pageKey];
    if (!window.sb) return [];
    try {
      var { data } = await window.sb.from('page_blocks').select('*').eq('page_key', pageKey).order('ordem');
      cache[pageKey] = data || [];
    } catch (e) { console.error('page-blocks', e); cache[pageKey] = []; }
    return cache[pageKey];
  }

  async function apply(pageKey) {
    var config = await loadConfig(pageKey);
    if (!config.length) return;
    var device = currentDevice();

    var found = {};
    document.querySelectorAll('[data-block]').forEach(function (el) {
      found[el.dataset.block] = el;
    });

    var ordered = config.filter(function (c) { return found[c.block_key]; });
    if (!ordered.length) return;
    var parent = found[ordered[0].block_key].parentNode;

    // Âncora fixa: o nó logo depois do ÚLTIMO bloco marcado, na ordem ORIGINAL
    // do DOM (antes de qualquer troca). Sem isso, um simples appendChild
    // jogaria os blocos pro fim do container, ultrapassando irmãos não
    // marcados que devem continuar por último (ex: botão "Sair da conta" em
    // auth.html). insertBefore(el, âncora) mantém os não marcados no lugar.
    var byDomOrder = ordered.slice().sort(function (a, b) {
      var pa = Array.prototype.indexOf.call(parent.children, found[a.block_key]);
      var pb = Array.prototype.indexOf.call(parent.children, found[b.block_key]);
      return pa - pb;
    });
    var anchor = found[byDomOrder[byDomOrder.length - 1].block_key].nextSibling;

    ordered.forEach(function (c, i) {
      var el = found[c.block_key];
      var hideByDevice = c.visibilidade === 'desktop' && device !== 'desktop'
        || c.visibilidade === 'celular' && device !== 'celular';
      // Só força "display:none" quando o admin desativou o bloco — nunca força
      // "mostrar", pra não brigar com páginas que já escondem um bloco por
      // motivo de conteúdo (ex: barra de subcategorias vazia em categoria.html).
      if (!c.visivel || hideByDevice) el.style.display = 'none';
      if (c.titulo_override) {
        var titleEl = el.querySelector('[data-block-title]');
        if (titleEl) titleEl.textContent = c.titulo_override;
      }
      // insertBefore em nó já conectado ao documento SEMPRE remove e
      // reinsere por baixo dos panos, mesmo quando o destino já é onde o nó
      // já está — pra a maioria dos elementos isso não importa, mas se
      // algum bloco tiver um iframe vivo lá dentro (ex: formulário de
      // cartão do Mercado Pago no checkout), isso reseta esse iframe do
      // zero a cada chamada. Só mexe no DOM quando a posição realmente
      // precisa mudar.
      var target = (i + 1 < ordered.length) ? found[ordered[i + 1].block_key] : anchor;
      if (el.parentNode !== parent || el.nextSibling !== target) {
        parent.insertBefore(el, target);
      }
    });
  }

  return { apply: apply };
})();

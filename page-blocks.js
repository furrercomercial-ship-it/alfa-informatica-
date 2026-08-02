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
  var queue = {}; // page_key -> Promise da última apply() em andamento

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

  // Páginas como o checkout chamam apply() várias vezes seguidas (a cada
  // renderAll(), inclusive em onblur de campo) sem esperar a chamada
  // anterior terminar. Como applyNow() é assíncrona e recalcula a posição
  // dos blocos a partir do DOM atual, duas chamadas sobrepostas liam o DOM
  // no meio uma da outra e produziam uma ordem final inconsistente (blocos
  // trocando de lugar sozinhos). Por isso apply() só enfileira: cada
  // chamada espera a anterior terminar antes de ler o DOM e reordenar.
  function apply(pageKey) {
    var prev = queue[pageKey] || Promise.resolve();
    var next = prev.then(function () { return applyNow(pageKey); }).catch(function (e) { console.error('page-blocks', e); });
    queue[pageKey] = next;
    return next;
  }

  async function applyNow(pageKey) {
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

    // Percorre de TRÁS pra FRENTE, usando sempre o elemento já processado
    // (ou a âncora, pro último) como referência do insertBefore. Andar pra
    // FRENTE (elemento i usando o elemento i+1 como referência) parece
    // equivalente mas não é: no momento em que i é processado, i+1 ainda
    // não foi movido pra sua posição final, então usá-lo como referência
    // podia deslocar elementos já corretos (ex: "Entrega" acabava sendo
    // empurrado pra depois de "Pagamento" só porque a config tinha um
    // empate de "ordem" entre dois blocos mais adiante na lista). De trás
    // pra frente, a referência de cada passo já está garantidamente na
    // posição final, então o resultado é sempre determinístico e correto
    // numa única passada — nunca depende da ordem anterior do DOM.
    var ref = anchor;
    for (var i = ordered.length - 1; i >= 0; i--) {
      var c = ordered[i];
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
      if (el.parentNode !== parent || el.nextSibling !== ref) {
        parent.insertBefore(el, ref);
      }
      ref = el;
    }
  }

  return { apply: apply };
})();

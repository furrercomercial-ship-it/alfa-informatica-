/* ══════════════════════════════════════════════════════════════
   HEADER ÚNICO — Alfa Informática
   Fonte única de verdade para o header (HTML + comportamento) usado
   em todas as páginas do site. Baseado exatamente no header da home
   (alfa-replica.html). Para alterar o header em todo o site, edite
   só este arquivo (e header.css para o visual).

   Requer, nesta ordem, antes deste script:
     <script src="store.js"></script>
     <script src="products.js"></script>
     <script src="header.js"></script>
   E um placeholder no topo do <body>:
     <div id="site-header"></div>
   ══════════════════════════════════════════════════════════════ */
(function(){

  var HEADER_HTML = '<div class="hdr-announce" id="hdrAnnounce" style="display:none"><a id="hdrAnnounceLink" href="#"><span id="hdrAnnounceTxt"></span></a></div>'
  +'<header class="hdr">'
  +'<div class="hdr-top">'
  +'  <button class="mob-menu-btn" id="mobMenuBtn" type="button" aria-label="Abrir menu de categorias"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>'
  +'  <a href="alfa-replica.html" class="hdr-logo"><img class="theme-logo" src="'+(Store.getTheme()==='dark'?'logo-dark.png':'logo-light.png')+'" alt="Alfa Informática"></a>'
  +'  <div class="search-wrap" id="searchWrap">'
  +'    <div class="hdr-search">'
  +'      <input class="hdr-search-in" id="searchIn" type="text" placeholder="Digite o que você procura..." autocomplete="off">'
  +'      <button class="hdr-search-btn" onclick="doSearch()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> BUSCAR</button>'
  +'    </div>'
  +'    <div class="search-drop" id="searchDrop"></div>'
  +'  </div>'
  +'  <div class="hdr-acts-group">'
  +'  <button class="theme-toggle" id="themeToggle" onclick="Store.toggleTheme()" type="button">'
  +'    <span class="theme-toggle-track"><span class="theme-toggle-knob"></span></span>'
  +'    <span class="theme-toggle-label">Modo Claro</span>'
  +'  </button>'
  +'  <a href="auth.html" class="hdr-act" id="hdr-user-btn">'
  +'    <svg class="hdr-act-icon" width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  +'    <div class="hdr-act-text">'
  +'      <span class="hdr-act-line1" id="hdr-user-lbl">Minha Conta</span>'
  +'      <span class="hdr-act-line2" id="hdr-user-line2">Entrar / Cadastrar</span>'
  +'    </div>'
  +'  </a>'
  +'  <a href="carrinho.html" class="hdr-act hdr-act-cart">'
  +'    <div class="hdr-cart-icon-wrap">'
  +'      <div class="hdr-badge" id="cart-badge" style="display:none">0</div>'
  +'      <svg class="hdr-act-icon" width="43" height="43" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>'
  +'    </div>'
  +'    <div class="hdr-act-text">'
  +'      <span class="hdr-act-line1">Meu Carrinho</span>'
  +'      <span class="hdr-act-line2" id="cart-total-lbl">0 Itens R$0,00</span>'
  +'    </div>'
  +'  </a>'
  +'  </div>'
  +'</div>'
  +'<nav class="hdr-nav">'
  +'  <div class="hdr-nav-inner">'
  +'    <div class="cat-wrap">'
  +'      <button type="button" class="nav-ativo" id="catTrigger" aria-haspopup="true" aria-expanded="false" aria-controls="mobMenuOverlay" onclick="toggleMobileMenu(event)"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><rect width="14" height="1.8" rx=".9" fill="currentColor"/><rect y="4.6" width="14" height="1.8" rx=".9" fill="currentColor"/><rect y="9.2" width="14" height="1.8" rx=".9" fill="currentColor"/></svg>Todas Categorias<svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
  +'    </div>'
  +'    <a href="categoria.html?cat=promocoes" class="nav-promo">Promoções</a>'
  +'    <a href="categoria.html?cat=pc-gamer">PC Gamer</a>'
  +'    <a href="categoria.html?cat=hardware">Hardware</a>'
  +'    <a href="categoria.html?cat=perifericos">Periféricos</a>'
  +'    <a href="categoria.html?cat=monitores">Monitores</a>'
  +'    <a href="categoria.html?cat=notebooks">Notebooks</a>'
  +'    <a href="categoria.html?cat=cadeiras">Cadeiras</a>'
  +'    <a href="https://wa.me/5565992655883" class="nav-atend" target="_blank" rel="noopener noreferrer">Atendimento Online</a>'
  +'  </div>'
  +'</nav>'
  +'</header>'
  +'<div class="mob-menu-overlay" id="mobMenuOverlay">'
  +'  <div class="mob-menu-panel">'
  +'    <div class="mob-menu-head">'
  +'      <img class="mob-menu-logo theme-logo" src="'+(Store.getTheme()==='dark'?'logo-dark.png':'logo-light.png')+'" alt="Alfa Informática">'
  +'      <button class="mob-menu-close" id="mobMenuClose" type="button" aria-label="Fechar menu">&times;</button>'
  +'    </div>'
  +'    <div class="mob-menu-title">Categorias</div>'
  +'    <div class="mob-menu-list" id="mobMenuList"></div>'
  +'  </div>'
  +'</div>';

  var mount = document.getElementById('site-header');
  if (mount) mount.outerHTML = HEADER_HTML;

  /* ── BUSCA (autocomplete via catálogo completo — products.js) ── */
  (function(){
    var inp = document.getElementById('searchIn');
    var drop = document.getElementById('searchDrop');
    var wrap = document.getElementById('searchWrap');
    if (!inp || !drop) return;
    function getProducts(){
      return (window.PRODUCTS_DB || []).map(function(p){
        return {name:p.name, brand:p.brand, price:'R$ '+p.price.toLocaleString('pt-BR',{minimumFractionDigits:2}), img:p.images&&p.images[0]?p.images[0]:''};
      });
    }
    var selIdx = -1;
    function renderDrop(q){
      q = q.trim().toLowerCase();
      if (!q){ drop.classList.remove('open'); return; }
      var res = getProducts().filter(function(p){
        return p.name.toLowerCase().indexOf(q)>-1 || p.brand.toLowerCase().indexOf(q)>-1;
      }).slice(0,8);
      selIdx = -1;
      if (!res.length){
        drop.innerHTML = '<div class="search-none">Nenhum produto encontrado para "<b>'+q+'</b>"</div>';
        drop.classList.add('open'); return;
      }
      drop.innerHTML = '<div class="search-drop-head">'+res.length+' resultado'+(res.length!==1?'s':'')+'</div>'+
        res.map(function(p,i){
          return '<a class="search-item" href="produto.html?q='+encodeURIComponent(p.name).replace(/[!'()*]/g,function(c){return '%'+c.charCodeAt(0).toString(16);})+'" data-idx="'+i+'">'+
            '<div class="search-item-img">'+(p.img?'<img src="'+p.img+'" alt="">':'<span class="search-item-img-ph">📦</span>')+'</div>'+
            '<div class="search-item-info"><div class="search-item-brand">'+p.brand+'</div><div class="search-item-name">'+p.name+'</div></div>'+
            '<div class="search-item-right"><span class="search-item-price">'+p.price+'</span><span class="search-item-arrow">›</span></div>'+
          '</a>';
        }).join('');
      drop.classList.add('open');
    }
    inp.addEventListener('input', function(){ renderDrop(this.value); });
    inp.addEventListener('focus', function(){ if (this.value.trim()) renderDrop(this.value); });
    inp.addEventListener('keydown', function(e){
      var items = drop.querySelectorAll('.search-item');
      if (e.key==='ArrowDown'){ e.preventDefault(); selIdx = Math.min(selIdx+1, items.length-1); }
      else if (e.key==='ArrowUp'){ e.preventDefault(); selIdx = Math.max(selIdx-1, -1); }
      else if (e.key==='Escape'){ drop.classList.remove('open'); return; }
      else if (e.key==='Enter'){ if (selIdx>-1 && items[selIdx]){ items[selIdx].click(); } else doSearch(); return; }
      items.forEach(function(it,i){ it.classList.toggle('active', i===selIdx); });
      if (selIdx>-1 && items[selIdx]) items[selIdx].scrollIntoView({block:'nearest'});
    });
    document.addEventListener('click', function(e){ if (!wrap.contains(e.target)) drop.classList.remove('open'); });
    window.doSearch = function(){
      var q = inp.value.trim();
      if (q) location.href = 'categoria.html?q='+encodeURIComponent(q);
    };
  })();

  /* ── MENU MOBILE DE CATEGORIAS (hambúrguer) ── */
  (function(){
    var btn = document.getElementById('mobMenuBtn');
    var overlay = document.getElementById('mobMenuOverlay');
    var closeBtn = document.getElementById('mobMenuClose');
    if (!btn || !overlay) return;
    var built = false;

    function subLinksHtml(cat){
      return cat.subcategorias.slice().sort(function(a,b){ return a.ordem - b.ordem; }).map(function(s){
        return '<a href="categoria.html?cat=' + s.slug + '" class="mob-sub-item">' + s.nome + '</a>';
      }).join('');
    }

    function buildMobileMenu(){
      if (built) return;
      built = true;
      var listEl = document.getElementById('mobMenuList');
      var cats = (window.CATEGORIES_DB || []).slice().sort(function(a,b){ return a.ordem - b.ordem; });
      listEl.innerHTML = cats.map(function(cat){
        var hasChildren = cat.subcategorias && cat.subcategorias.length > 0;
        if (!hasChildren){
          return '<div class="mob-cat-item" data-slug="' + cat.slug + '">'
            + '<a href="categoria.html?cat=' + cat.slug + '" class="mob-cat-row mob-cat-link"><span class="mob-cat-icon">' + cat.icone + '</span><span class="mob-cat-name">' + cat.nome + '</span></a>'
            + '</div>';
        }
        return '<div class="mob-cat-item" data-slug="' + cat.slug + '">'
          + '<button type="button" class="mob-cat-row" aria-expanded="false" aria-controls="mob-subs-' + cat.slug + '" onclick="toggleMobCat(this)">'
          +   '<span class="mob-cat-icon">' + cat.icone + '</span>'
          +   '<span class="mob-cat-name">' + cat.nome + '</span>'
          +   '<span class="mob-cat-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>'
          + '</button>'
          + '<div class="mob-sub-list" id="mob-subs-' + cat.slug + '" data-built="0"></div>'
          + '</div>';
      }).join('');
    }

    var lastTrigger = null;
    window.toggleMobileMenu = function(ev){
      var isOpen = overlay.classList.toggle('open');
      var catTrigger = document.getElementById('catTrigger');
      if (isOpen){
        lastTrigger = (ev && ev.currentTarget) || document.activeElement || btn;
        buildMobileMenu();
        document.body.style.overflow = 'hidden';
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'true');
        if (closeBtn) closeBtn.focus();
      } else {
        document.body.style.overflow = '';
        if (catTrigger) catTrigger.setAttribute('aria-expanded', 'false');
        (lastTrigger || btn).focus();
      }
    };
    window.toggleMobCat = function(rowBtn){
      var item = rowBtn.closest('.mob-cat-item');
      var subsEl = item.querySelector('.mob-sub-list');
      var slug = item.dataset.slug;
      var cat = (window.CATEGORIES_DB || []).find(function(c){ return c.slug === slug; });
      if (subsEl.dataset.built !== '1'){
        subsEl.innerHTML = cat ? subLinksHtml(cat) : '';
        subsEl.dataset.built = '1';
      }
      var isOpen = item.classList.toggle('open');
      rowBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    btn.addEventListener('click', window.toggleMobileMenu);
    if (closeBtn) closeBtn.addEventListener('click', window.toggleMobileMenu);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) window.toggleMobileMenu(); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && overlay.classList.contains('open')) window.toggleMobileMenu();
    });
  })();

  /* ── TEMA, CARRINHO E USUÁRIO ── */
  function updateHdrBadges(){
    var cc = Store.cartCount();
    var ct = Store.cartTotal ? Store.cartTotal() : 0;
    var cb = document.getElementById('cart-badge');
    if (cb){ cb.textContent = cc; cb.style.display = cc>0 ? 'flex' : 'none'; }
    var tl = document.getElementById('cart-total-lbl');
    if (tl) tl.textContent = cc + (cc===1 ? ' Item ' : ' Itens ') + 'R$' + (ct||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    var user = Store.getUser ? Store.getUser() : null;
    var lbl = document.getElementById('hdr-user-lbl');
    if (lbl && user) lbl.textContent = user.name.split(' ')[0];
    var lbl2 = document.getElementById('hdr-user-line2');
    if (lbl2) lbl2.textContent = user ? 'Minha Conta' : 'Entrar / Cadastrar';
  }
  Store.syncThemeUI();
  Store.on('cart', updateHdrBadges);
  Store.on('favorites', updateHdrBadges);
  Store.on('user', updateHdrBadges);
  updateHdrBadges();

  /* ── BARRA DE AVISO + STICKY (Aparência > Header) ── */
  if (window.sb) {
    window.sb.from('site_settings').select('header_sticky,announcement_ativo,announcement_texto,announcement_link_url').eq('id', 1).single().then(function (res) {
      var data = res.data;
      if (!data) return;
      if (data.header_sticky === false) {
        var hdr = document.querySelector('.hdr');
        if (hdr) hdr.style.position = 'static';
      }
      if (data.announcement_ativo && data.announcement_texto) {
        var bar = document.getElementById('hdrAnnounce');
        var txt = document.getElementById('hdrAnnounceTxt');
        var link = document.getElementById('hdrAnnounceLink');
        if (bar && txt) {
          txt.textContent = data.announcement_texto;
          if (link) link.href = data.announcement_link_url || '#';
          bar.style.display = 'block';
        }
      }
    }).catch(function (e) { console.error('header settings', e); });
  }

})();

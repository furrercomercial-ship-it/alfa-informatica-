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

  var HEADER_HTML = '<header class="hdr">'
  +'<div class="hdr-top">'
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
  +'      <span class="hdr-act-line2">Entrar / Cadastrar</span>'
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
  +'      <a href="categoria.html" class="nav-ativo"><svg width="14" height="11" viewBox="0 0 14 11" fill="none"><rect width="14" height="1.8" rx=".9" fill="currentColor"/><rect y="4.6" width="14" height="1.8" rx=".9" fill="currentColor"/><rect y="9.2" width="14" height="1.8" rx=".9" fill="currentColor"/></svg>Todas Categorias<svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>'
  +'      <nav class="megamenu"><div class="megamenu-inner">'
  +'        <div class="mega-left">'
  +'          <div class="mega-left-head">Departamentos</div>'
  +'          <a class="mega-cat" data-cat="computadores" href="categoria.html?cat=computadores"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>Computadores<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="hardware" href="categoria.html?cat=hardware"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/></svg></span>Hardware<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="perifericos" href="categoria.html?cat=perifericos"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9 L7 15 L17 15 L18 9 Z"/><path d="M5 5 L19 5 L18 9 L6 9 Z"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg></span>Periféricos<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="monitores" href="categoria.html?cat=monitores"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>Monitores<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="celulares" href="categoria.html?cat=celulares"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></span>Celulares<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="redes" href="categoria.html?cat=redes"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M20.07 4.93a10 10 0 0 1 0 14.14"/><path d="M3.93 4.93a10 10 0 0 0 0 14.14"/></svg></span>Redes<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="impressao" href="categoria.html?cat=impressao"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></span>Impressão<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="moveis" href="categoria.html?cat=moveis"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3"/><path d="M2 11v5a2 2 0 002 2h16a2 2 0 002-2v-5a2 2 0 00-4 0v2H6v-2a2 2 0 00-4 0z"/><line x1="6" y1="18" x2="6" y2="22"/><line x1="18" y1="18" x2="18" y2="22"/></svg></span>Móveis<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="audio" href="categoria.html?cat=audio"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></span>Áudio<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="games" href="categoria.html?cat=games"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59l-.99 8.5A4 4 0 005.69 21h.01a4 4 0 003.23-1.63l.68-1.01a2 2 0 011.62-.84h1.54a2 2 0 011.62.84l.68 1.01A4 4 0 0018.3 21h.01a4 4 0 003.978-3.91l-.99-8.5A4 4 0 0017.32 5z"/></svg></span>Games<span class="mega-cat-arrow">›</span></a>'
  +'          <a class="mega-cat" data-cat="outros" href="categoria.html?cat=outros"><span class="mega-cat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>Outros<span class="mega-cat-arrow">›</span></a>'
  +'        </div>'
  +'        <div class="mega-right">'
  +'          <div class="mega-subs" id="subs-computadores"><p class="mega-sub-title">Computadores</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=pc-gamer"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3" width="10" height="18" rx="1.5"/><circle cx="10" cy="7" r="1"/><line x1="7.5" y1="17" x2="12.5" y2="17"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">PC Gamer</span><span class="mega-sub-desc">Alta performance para jogar</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=pc-office"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">PC Office</span><span class="mega-sub-desc">Produtividade sem limites</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=notebooks"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M1 18h22"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Notebooks</span><span class="mega-sub-desc">Mobilidade e desempenho</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=servidores"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><line x1="7" y1="7.5" x2="7.01" y2="7.5"/><line x1="7" y1="16.5" x2="7.01" y2="16.5"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Servidores</span><span class="mega-sub-desc">Estabilidade para sua empresa</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=seminovos"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Seminovos</span><span class="mega-sub-desc">Qualidade com preço menor</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-hardware"><p class="mega-sub-title">Hardware</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=processadores"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="7" y="7" width="10" height="10" rx="1"/><line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/><line x1="9" y1="19" x2="9" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/><line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="5" y2="9"/><line x1="2" y1="14" x2="5" y2="14"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Processadores</span><span class="mega-sub-desc">O cérebro do seu setup</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=placas-mae"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M13 8h5"/><path d="M13 13h5"/><path d="M6 14v4h4"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Placas-mãe</span><span class="mega-sub-desc">A base de tudo</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=placas-de-video"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="7" width="20" height="10" rx="1.5"/><circle cx="7" cy="12" r="2"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="16" y2="14"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Placas de Vídeo</span><span class="mega-sub-desc">Gráficos de alta performance</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=memorias-ram"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="9" width="18" height="7" rx="1"/><line x1="7" y1="9" x2="7" y2="6"/><line x1="11" y1="9" x2="11" y2="6"/><line x1="15" y1="9" x2="15" y2="6"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Memórias RAM</span><span class="mega-sub-desc">Mais velocidade multitarefa</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=ssd-hd"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0018 0V5"/><path d="M3 12a9 3 0 0018 0"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">SSD / HD</span><span class="mega-sub-desc">Armazenamento rápido e seguro</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=fontes"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Fontes</span><span class="mega-sub-desc">Energia estável pro seu PC</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=gabinetes"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="1.5"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Gabinetes</span><span class="mega-sub-desc">Estilo e ventilação</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=coolers-gabinete"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 12c0-3 2-5 4-5s2 2 0 4-4 1-4 1z"/><path d="M12 12c0 3-2 5-4 5s-2-2 0-4 4-1 4-1z"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Coolers p/ Gabinete</span><span class="mega-sub-desc">Fluxo de ar eficiente</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=coolers-processador"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Coolers p/ Processador</span><span class="mega-sub-desc">Temperatura sob controle</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=water-coolers"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2s6 7 6 12a6 6 0 01-12 0c0-5 6-12 6-12z"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Water Coolers</span><span class="mega-sub-desc">Refrigeração líquida silenciosa</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-perifericos"><p class="mega-sub-title">Periféricos</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=mouse"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="7" y="2" width="10" height="20" rx="5"/><line x1="12" y1="6" x2="12" y2="10"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Mouse</span><span class="mega-sub-desc">Precisão em cada clique</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=mousepad"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Mousepad</span><span class="mega-sub-desc">Conforto e deslize perfeito</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=teclados"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="9" x2="6" y2="9.01"/><line x1="10" y1="9" x2="10" y2="9.01"/><line x1="14" y1="9" x2="14" y2="9.01"/><line x1="18" y1="9" x2="18" y2="9.01"/><line x1="6" y1="13" x2="18" y2="13.01"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Teclados</span><span class="mega-sub-desc">Mecânicos e membrana</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=headsets"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 14v-2a9 9 0 0118 0v2"/><rect x="1" y="14" width="6" height="7" rx="2"/><rect x="17" y="14" width="6" height="7" rx="2"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Headsets</span><span class="mega-sub-desc">Áudio imersivo para jogos</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=fones"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 14v-3a8 8 0 0116 0v3"/><path d="M2 14a2 2 0 012-2 2 2 0 012 2v3a2 2 0 01-2 2 2 2 0 01-2-2z"/><path d="M22 14a2 2 0 00-2-2 2 2 0 00-2 2v3a2 2 0 002 2 2 2 0 002-2z"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Fones de Ouvido</span><span class="mega-sub-desc">Para música e chamadas</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=microfones"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Microfones</span><span class="mega-sub-desc">Voz clara para streaming</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=webcam"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M4 20c2-2 5-3 8-3s6 1 8 3"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Webcam</span><span class="mega-sub-desc">Imagem nítida em video calls</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-monitores"><p class="mega-sub-title">Monitores</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=monitores-gaming"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Monitores</span><span class="mega-sub-desc">Alta taxa de atualização</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=tvs"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="6" width="20" height="13" rx="2"/><polyline points="8 2 12 6 16 2"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">TVs</span><span class="mega-sub-desc">Entretenimento em grande tela</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-celulares"><p class="mega-sub-title">Celulares</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=celulares-smartphones"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Celulares</span><span class="mega-sub-desc">Os últimos lançamentos</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=cabos-celular"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9a3 3 0 003 3h10a3 3 0 003-3"/><path d="M4 9V6a2 2 0 012-2"/><path d="M20 9V6a2 2 0 00-2-2"/><line x1="8" y1="15" x2="8" y2="21"/><line x1="16" y1="15" x2="16" y2="21"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Cabos para Celular</span><span class="mega-sub-desc">Carregamento rápido</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=adaptadores"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="9" width="6" height="6"/><path d="M9 3v4"/><path d="M15 3v4"/><path d="M9 17v4"/><path d="M15 17v4"/><path d="M3 9h4"/><path d="M3 15h4"/><path d="M17 9h4"/><path d="M17 15h4"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Adaptadores</span><span class="mega-sub-desc">Compatibilidade total</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-redes"><p class="mega-sub-title">Redes</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=switch"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="8" width="20" height="8" rx="1.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="10" y1="12" x2="10.01" y2="12"/><line x1="14" y1="12" x2="14.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Switch</span><span class="mega-sub-desc">Rede cabeada estável</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=repetidores"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49"/><path d="M7.76 7.76a6 6 0 000 8.49"/><path d="M20.07 4.93a10 10 0 010 14.14"/><path d="M3.93 4.93a10 10 0 000 14.14"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Repetidores</span><span class="mega-sub-desc">Wi-Fi em toda a casa</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=placas-rede"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/><path d="M8 8h4"/><path d="M8 16h6"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Placas de Rede</span><span class="mega-sub-desc">Mais velocidade de conexão</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=cabos-rede"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9a3 3 0 003 3h10a3 3 0 003-3"/><path d="M4 9V6a2 2 0 012-2"/><path d="M20 9V6a2 2 0 00-2-2"/><line x1="8" y1="15" x2="8" y2="21"/><line x1="16" y1="15" x2="16" y2="21"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Cabos de Rede</span><span class="mega-sub-desc">Conexão estável e rápida</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-impressao"><p class="mega-sub-title">Impressão</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=impressoras"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Impressoras</span><span class="mega-sub-desc">Para casa e escritório</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-moveis"><p class="mega-sub-title">Móveis</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=cadeiras"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 10V4a1 1 0 011-1h10a1 1 0 011 1v6"/><path d="M6 10h12v6H6z"/><line x1="7" y1="16" x2="6" y2="22"/><line x1="17" y1="16" x2="18" y2="22"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Cadeiras</span><span class="mega-sub-desc">Conforto para longas sessões</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=mesas"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 8h20"/><path d="M4 8v13"/><path d="M20 8v13"/><path d="M2 8l2-5h16l2 5"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Mesas</span><span class="mega-sub-desc">Setup organizado</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-audio"><p class="mega-sub-title">Áudio</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=caixas-de-som"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Caixas de Som</span><span class="mega-sub-desc">Som potente pro seu ambiente</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-games"><p class="mega-sub-title">Games</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=video-games"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59l-.99 8.5A4 4 0 005.69 21h.01a4 4 0 003.23-1.63l.68-1.01a2 2 0 011.62-.84h1.54a2 2 0 011.62.84l.68 1.01A4 4 0 0018.3 21h.01a4 4 0 003.978-3.91l-.99-8.5A4 4 0 0017.32 5z"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Video Games</span><span class="mega-sub-desc">Consoles e acessórios</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-subs" id="subs-outros"><p class="mega-sub-title">Outros</p><div class="mega-sub-grid">'
  +'            <a class="mega-sub-card" href="categoria.html?cat=projetores"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="9" cy="12" r="2.5"/><line x1="17" y1="10" x2="17" y2="10.01"/><line x1="17" y1="14" x2="17" y2="14.01"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Projetores</span><span class="mega-sub-desc">Telas grandes onde quiser</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=eletronicos"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Eletrônicos</span><span class="mega-sub-desc">Gadgets pro dia a dia</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=licencas"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="15" r="4"/><path d="M10.5 12.5L20 3"/><path d="M17 6l3 3"/><path d="M14 9l2 2"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Licenças</span><span class="mega-sub-desc">Softwares originais</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'            <a class="mega-sub-card" href="categoria.html?cat=acessorios"><span class="mega-sub-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span><span class="mega-sub-body"><span class="mega-sub-name">Acessórios de Informática</span><span class="mega-sub-desc">Complementos essenciais</span></span><span class="mega-sub-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></span></a>'
  +'          </div></div>'
  +'          <div class="mega-foot">'
  +'            <div class="mega-foot-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Compra 100% Segura</div>'
  +'            <div class="mega-foot-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Entrega para todo Brasil</div>'
  +'            <div class="mega-foot-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Produtos Originais</div>'
  +'            <div class="mega-foot-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 14v-3a9 9 0 0118 0v3"/><path d="M21 14a2 2 0 00-2-2 2 2 0 00-2 2v3a2 2 0 002 2 2 2 0 002-2z"/><path d="M3 14a2 2 0 012-2 2 2 0 012 2v3a2 2 0 01-2 2 2 2 0 01-2-2z"/></svg>Suporte Especializado</div>'
  +'          </div>'
  +'        </div>'
  +'      </div></nav>'
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
  +'</header>';

  var mount = document.getElementById('site-header');
  if (mount) mount.outerHTML = HEADER_HTML;

  /* ── BUSCA (autocomplete via catálogo completo — products.js) ── */
  (function(){
    var inp = document.getElementById('searchIn');
    var drop = document.getElementById('searchDrop');
    var wrap = document.getElementById('searchWrap');
    if (!inp || !drop) return;
    var products = (window.PRODUCTS_DB || []).map(function(p){
      return {name:p.name, brand:p.brand, price:'R$ '+p.price.toLocaleString('pt-BR',{minimumFractionDigits:2}), img:p.images&&p.images[0]?p.images[0]:''};
    });
    var selIdx = -1;
    function renderDrop(q){
      q = q.trim().toLowerCase();
      if (!q){ drop.classList.remove('open'); return; }
      var res = products.filter(function(p){
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

  /* ── MEGA MENU (hover) ── */
  (function(){
    var wrap = document.querySelector('.cat-wrap');
    var menu = document.querySelector('.megamenu');
    var cats = document.querySelectorAll('.mega-cat');
    var subs = document.querySelectorAll('.mega-subs');
    var closeTimer = null;

    function activate(cat){
      cats.forEach(function(c){ c.classList.remove('mm-active'); });
      subs.forEach(function(s){ s.classList.remove('mm-active'); });
      cat.classList.add('mm-active');
      var t = document.getElementById('subs-'+cat.dataset.cat);
      if (t) t.classList.add('mm-active');
    }
    function openMenu(){
      clearTimeout(closeTimer);
      menu.style.display = 'flex';
      var first = cats[0];
      if (first && !document.querySelector('.mega-cat.mm-active')) activate(first);
    }
    function scheduleClose(){
      closeTimer = setTimeout(function(){ menu.style.display = 'none'; }, 300);
    }
    if (wrap){ wrap.addEventListener('mouseenter', openMenu); wrap.addEventListener('mouseleave', scheduleClose); }
    if (menu){ menu.addEventListener('mouseenter', openMenu); menu.addEventListener('mouseleave', scheduleClose); }
    cats.forEach(function(cat){ cat.addEventListener('mouseenter', function(){ activate(cat); }); });
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
  }
  Store.syncThemeUI();
  Store.on('cart', updateHdrBadges);
  Store.on('favorites', updateHdrBadges);
  Store.on('user', updateHdrBadges);
  updateHdrBadges();

})();

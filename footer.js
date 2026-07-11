/* Alfa Informática — Rodapé compartilhado (mesmo padrão do header.js).
   Requer, antes deste script: supabase-client.js. E um placeholder:
     <div id="site-footer"></div>
   Conteúdo (contato/redes/horário) vem de site_settings; links de categoria
   vêm de categories. */
(function () {
  var mount = document.getElementById('site-footer');
  if (!mount) return;

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  Promise.all([
    window.sb.from('site_settings').select('*').eq('id', 1).single(),
    window.sb.from('categories').select('nome,slug').eq('ativo', true).order('ordem').limit(8),
  ]).then(function (results) {
    var settings = (results[0] && results[0].data) || {};
    var cats = (results[1] && results[1].data) || [];
    var wpp = settings.whatsapp_number || '5565992655883';
    var insta = settings.instagram_url || 'https://instagram.com/informatica_alfa';
    var instaName = insta.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '');
    var phoneDigits = (settings.contact_phone || '65992655883').replace(/\D/g, '');
    var phoneLabel = settings.contact_phone || '(65) 99265-5883';
    var hours = settings.business_hours;

    var catLinks = cats.length
      ? cats.map(function (c) { return '<a href="categoria.html?cat=' + encodeURIComponent(c.slug) + '" class="ft2-link">' + escapeHtml(c.nome) + '</a>'; }).join('')
      : '';

    var scheduleHtml = hours
      ? '<div class="ft2-schedule"><div class="ft2-sched-row"><span class="ft2-sched-day">Horário</span><span class="ft2-sched-time">' + escapeHtml(hours) + '</span></div></div>'
      : '<div class="ft2-schedule"><div class="ft2-sched-row"><span class="ft2-sched-day">Segunda a Sexta</span><span class="ft2-sched-time">08:00 &ndash; 18:00</span></div><div class="ft2-sched-sep"></div><div class="ft2-sched-row"><span class="ft2-sched-day">S&aacute;bado</span><span class="ft2-sched-time">08:00 &ndash; 13:00</span></div></div>';

    mount.outerHTML = '<footer class="ft2-main"><div class="sec-wrap"><div class="ft2-grid">'
      + '<div>'
      + '<img src="' + (settings.logo_dark_url || 'logo-dark.png') + '" alt="' + escapeHtml(settings.site_name || 'Alfa Informática') + '" class="ft2-logo theme-logo">'
      + '<span class="ft2-tag">Hardware &bull; Perif&eacute;ricos &bull; Setup Gamer</span>'
      + '<p class="ft2-about">Especialistas em hardware, perif&eacute;ricos e computadores gamer de alta performance.</p>'
      + '<a href="tel:+' + phoneDigits + '" class="ft2-phone"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>' + escapeHtml(phoneLabel) + '</a>'
      + '<a href="' + insta + '" class="ft2-insta" target="_blank" rel="noopener noreferrer"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="ftIg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="30%" stop-color="#e6683c"/><stop offset="55%" stop-color="#dc2743"/><stop offset="80%" stop-color="#cc2366"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ftIg)" stroke-width="2"/><circle cx="12" cy="12" r="4.5" stroke="url(#ftIg)" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.1" fill="#dc2743"/></svg><div class="ft2-insta-txt"><span class="ft2-insta-label">Instagram</span><span class="ft2-insta-name">' + escapeHtml(instaName) + '</span></div></a>'
      + '</div>'
      + '<div><p class="ft2-col-h">Atendimento</p>'
      + '<a href="https://wa.me/' + wpp + '?text=' + encodeURIComponent('Olá, preciso de ajuda no site da Alfa Informática.') + '" class="ft2-link" target="_blank" rel="noopener noreferrer">Central de Ajuda</a>'
      + '<a href="https://wa.me/' + wpp + '?text=' + encodeURIComponent('Olá, preciso falar sobre troca ou devolução.') + '" class="ft2-link" target="_blank" rel="noopener noreferrer">Trocas e Devolu&ccedil;&otilde;es</a>'
      + '<a href="https://wa.me/' + wpp + '?text=' + encodeURIComponent('Olá, preciso de atendimento sobre garantia.') + '" class="ft2-link" target="_blank" rel="noopener noreferrer">Garantia</a>'
      + '<a href="https://wa.me/' + wpp + '?text=' + encodeURIComponent('Olá, gostaria de falar com a Alfa Informática.') + '" class="ft2-link" target="_blank" rel="noopener noreferrer">Fale Conosco</a>'
      + scheduleHtml
      + '</div>'
      + '<div><p class="ft2-col-h">Categorias</p>' + catLinks + '</div>'
      + '<div><p class="ft2-col-h">Formas de Pagamento</p>'
      + '<div class="ft2-pay-grid">'
      + '<div class="ft2-pay-chip"><svg width="38" height="14" viewBox="0 0 40 14"><text x="1" y="13" font-family="Arial,Helvetica,sans-serif" font-style="italic" font-weight="900" font-size="16" fill="#1A1F71" letter-spacing="-1">VISA</text></svg></div>'
      + '<div class="ft2-pay-chip fpc-mc"><svg width="30" height="20" viewBox="0 0 32 20"><circle cx="12" cy="10" r="9" fill="#EB001B"/><circle cx="20" cy="10" r="9" fill="#F79E1B" style="mix-blend-mode:multiply"/></svg></div>'
      + '<div class="ft2-pay-chip"><div class="fpc-elo-logo"><div class="fpc-elo-y"></div><div class="fpc-elo-c"></div><div class="fpc-elo-k"></div></div></div>'
      + '<div class="ft2-pay-chip"><svg width="46" height="14" viewBox="0 0 56 18" fill="none"><path d="M9 9L15 3L21 9L15 15Z" fill="#32BCAD"/><text x="27" y="14" font-family="Arial,sans-serif" font-weight="800" font-size="13" fill="#32BCAD" letter-spacing=".4">Pix</text></svg></div>'
      + '<div class="ft2-pay-chip fpc-boleto"><svg width="24" height="18" viewBox="0 0 24 18"><rect x="0" y="0" width="2" height="18" fill="#1a1a1a"/><rect x="4" y="0" width="1" height="18" fill="#1a1a1a"/><rect x="6.5" y="0" width="2" height="18" fill="#1a1a1a"/><rect x="10" y="0" width="1.5" height="18" fill="#1a1a1a"/><rect x="13" y="0" width="2" height="18" fill="#1a1a1a"/><rect x="17" y="0" width="1" height="18" fill="#1a1a1a"/><rect x="19.5" y="0" width="2" height="18" fill="#1a1a1a"/><rect x="23" y="0" width="1" height="18" fill="#1a1a1a"/></svg></div>'
      + '</div>'
      + '<p class="ft2-col-h" style="margin-top:4px;">Seguran&ccedil;a</p>'
      + '<div class="ft2-seal-list">'
      + '<div class="ft2-seal-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>Compra 100% Segura</div>'
      + '<div class="ft2-seal-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>SSL Certificado</div>'
      + '<div class="ft2-seal-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>Pagamento Protegido</div>'
      + '<div class="ft2-seal-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Garantia Oficial</div>'
      + '</div></div>'
      + '</div>'
      + '<div class="ft2-bottom"><p class="ft2-bottom-txt">&copy; ' + new Date().getFullYear() + ' ' + escapeHtml(settings.site_name || 'Alfa Informática') + '. Todos os direitos reservados.</p><p class="ft2-bottom-txt">Desenvolvido por Alfa Inform&aacute;tica</p></div>'
      + '</div></footer>';

    if (window.Store && Store.syncThemeUI) Store.syncThemeUI();
  });
})();

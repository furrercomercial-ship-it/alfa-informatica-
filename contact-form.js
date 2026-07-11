/* Alfa Informática — Componente compartilhado de contato (contato.html e
   suporte.html): renderiza o card de informações (WhatsApp/e-mail/horário/
   mapa) e liga o formulário — como o site não tem servidor de e-mail, o
   envio abre o WhatsApp com a mensagem pronta (mesmo padrão já usado no
   checkout). */
window.AlfaContactForm = (function () {
  function render(container, config) {
    config = config || {};
    var rows = [];
    if (config.whatsapp) rows.push({
      icon: '<path d="M17.5 14.4c-.3-.15-1.75-.87-2-.97-.28-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17 0-.37 0-.57 0-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z"/>',
      lbl: 'WhatsApp', val: config.whatsapp, href: 'https://wa.me/' + config.whatsapp.replace(/\D/g, ''),
    });
    if (config.email) rows.push({
      icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
      lbl: 'E-mail', val: config.email, href: 'mailto:' + config.email,
    });
    if (config.horario) rows.push({
      icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      lbl: 'Horário de atendimento', val: config.horario,
    });
    container.innerHTML = rows.map(function (r) {
      return '<div class="ct-info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + r.icon + '</svg>' +
        '<div><div class="ct-info-lbl">' + r.lbl + '</div><div class="ct-info-val">' + (r.href ? '<a href="' + r.href + '" target="_blank" rel="noopener">' + r.val + '</a>' : r.val) + '</div></div></div>';
    }).join('') || '<p style="color:var(--text-muted);font-size:13px;">Configure WhatsApp/e-mail/horário em Aparência → Páginas.</p>';
    if (config.mapa_url) {
      container.insertAdjacentHTML('beforeend', '<iframe class="ct-map" src="' + config.mapa_url + '" loading="lazy"></iframe>');
    }
  }

  function wireForm(form, msgEl, fieldIds, config) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById(fieldIds.name).value.trim();
      var email = document.getElementById(fieldIds.email).value.trim();
      var text = document.getElementById(fieldIds.text).value.trim();
      if (!name || !email || !text) return;

      if (window.AlfaEvents) window.AlfaEvents.track('page_view', { page: 'contato_form_submit' });

      if (config && config.whatsapp) {
        var msg = '📩 *Mensagem via site — Alfa Informática*\n\n👤 ' + name + '\n✉️ ' + email + '\n\n' + text;
        window.open('https://wa.me/' + config.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg), '_blank');
      }

      msgEl.textContent = 'Mensagem pronta! Se abriu uma aba do WhatsApp, é só enviar por lá.';
      msgEl.className = 'ct-msg success';
      form.reset();
    });
  }

  return { render: render, wireForm: wireForm };
})();

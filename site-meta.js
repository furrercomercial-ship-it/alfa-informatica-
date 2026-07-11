/* Alfa Informática — Aplica favicon e meta description (Aparência > SEO) em
   todas as páginas da loja. Só adiciona coisas que hoje não existem (favicon,
   meta description) — nunca sobrescreve o <title> de cada página.
   A injeção de scripts de terceiros (Aparência > Scripts) NÃO mora mais
   aqui — foi assumida pelo motor novo em script-engine.js (mais completo:
   respeita consentimento de cookies, página, dispositivo etc). Ver
   schema-scripts.sql pra migração dos campos antigos scripts_head/
   scripts_body_open/scripts_body_close, que continuam no banco intactos. */
(async function () {
  try {
    var { data } = await window.sb
      .from('site_settings')
      .select('favicon_url,seo_description')
      .eq('id', 1).single();
    if (!data) return;

    if (data.favicon_url) {
      var link = document.querySelector('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = data.favicon_url;
    }
    if (data.seo_description && !document.querySelector('meta[name="description"]')) {
      var meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = data.seo_description;
      document.head.appendChild(meta);
    }
  } catch (e) { console.error('site-meta', e); }
})();

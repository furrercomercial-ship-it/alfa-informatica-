/* Alfa Informática — Categorias (carregado do Supabase)
   Mesmo contrato de antes: window.CATEGORIES_DB começa vazio, é populado
   in place com os dados reais e dispara 'categories:ready' no document. */
window.CATEGORIES_DB = [];

(async function loadCategories() {
  const [{ data: cats, error: catErr }, { data: subs, error: subErr }] = await Promise.all([
    window.sb.from('categories').select('id,nome,slug,icone,ordem').eq('ativo', true).order('ordem', { ascending: true }),
    window.sb.from('subcategories').select('id,categoria_id,nome,slug,ordem').eq('ativo', true).order('ordem', { ascending: true }),
  ]);

  if (catErr || subErr) {
    console.error('Erro ao carregar categorias do Supabase:', catErr || subErr);
    document.dispatchEvent(new CustomEvent('categories:ready'));
    return;
  }

  const mapped = (cats || []).map(c => ({
    id: c.id,
    slug: c.slug,
    nome: c.nome,
    ordem: c.ordem,
    icone: c.icone,
    subcategorias: (subs || [])
      .filter(s => s.categoria_id === c.id)
      .map(s => ({ id: s.id, categoria_id: s.categoria_id, slug: s.slug, nome: s.nome, ordem: s.ordem })),
  }));

  window.CATEGORIES_DB.length = 0;
  window.CATEGORIES_DB.push(...mapped);
  document.dispatchEvent(new CustomEvent('categories:ready'));
})();

/* Alfa Informática — Produtos (carregado do Supabase)
   Mantém o mesmo contrato de antes (window.PRODUCTS_DB populado de forma síncrona
   pro resto do site continuar funcionando sem reescrever cada página): inicializa
   vazio, busca do banco, popula o array *in place* e dispara o evento
   'products:ready' no document. Quem consome deve renderizar direto se o array já
   tiver itens, ou escutar o evento uma vez, senão. */
window.PRODUCTS_DB = [];

(async function loadProducts() {
  const { data, error } = await window.sb
    .from('products')
    .select('id,name,brand,price,old_price,stock,rating,reviews_count,images,description,specs,subcategories(slug)')
    .eq('active', true)
    .order('id', { ascending: true });

  if (error) {
    console.error('Erro ao carregar produtos do Supabase:', error);
    document.dispatchEvent(new CustomEvent('products:ready'));
    return;
  }

  const mapped = (data || []).map(row => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    price: Number(row.price),
    old: row.old_price != null ? Number(row.old_price) : undefined,
    cat: row.subcategories ? row.subcategories.slug : null,
    stock: row.stock,
    rating: Number(row.rating),
    reviews: row.reviews_count,
    images: row.images && row.images.length ? row.images : ['img teste.jpg'],
    description: row.description,
    specs: row.specs || [],
  }));

  window.PRODUCTS_DB.length = 0;
  window.PRODUCTS_DB.push(...mapped);
  document.dispatchEvent(new CustomEvent('products:ready'));
})();

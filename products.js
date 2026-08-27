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
    .select('id,name,brand,model,sku,price,old_price,pix_discount_percent,stock,rating,reviews_count,images,description,specs,featured,best_seller,is_new,nivel,weight,comprimento_cm,largura_cm,altura_cm,subcategories(slug)')
    .eq('active', true)
    .is('deleted_at', null)
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
    model: row.model || '',
    sku: row.sku || '',
    price: Number(row.price),
    old: row.old_price != null ? Number(row.old_price) : undefined,
    pixDiscountPercent: row.pix_discount_percent != null ? Number(row.pix_discount_percent) : null,
    featured: !!row.featured,
    bestSeller: !!row.best_seller,
    isNew: !!row.is_new,
    nivel: row.nivel || null,
    weight: row.weight != null ? Number(row.weight) : null,
    comprimentoCm: row.comprimento_cm != null ? Number(row.comprimento_cm) : null,
    larguraCm: row.largura_cm != null ? Number(row.largura_cm) : null,
    alturaCm: row.altura_cm != null ? Number(row.altura_cm) : null,
    // Sem peso/dimensão cadastrada, o frete não pode ser calculado direito
    // — bloqueado pra compra até alguém completar o cadastro (ver
    // admin-produtos.html, que já exige isso pra produto novo/editado).
    freteOk: !!(row.weight && row.comprimento_cm && row.largura_cm && row.altura_cm),
    cat: row.subcategories ? row.subcategories.slug : null,
    stock: row.stock,
    rating: Number(row.rating),
    reviews: row.reviews_count,
    images: row.images && row.images.length ? row.images : [],
    description: row.description,
    specs: row.specs || [],
  }));

  window.PRODUCTS_DB.length = 0;
  window.PRODUCTS_DB.push(...mapped);
  document.dispatchEvent(new CustomEvent('products:ready'));
})();

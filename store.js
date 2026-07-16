/* Alfa Informática — Global Store
   USER fala com o Supabase (banco real); CART/FAVORITES/CHECKOUT temporário/
   THEME/ORDERS/ADDRESSES/REVIEWS continuam em localStorage por enquanto. */
const Store = {
  // ── USER (Supabase Auth) ─────────────────────────────
  // Store.getUser() continua síncrono pro resto do site (header.js etc.):
  // a sessão real do Supabase é espelhada pra cá via Store._syncSession(),
  // chamado pelo listener supabase.auth.onAuthStateChange no fim deste arquivo.
  getUser:     () => JSON.parse(localStorage.getItem('alfa_user') || 'null'),
  setUser:     (u) => { localStorage.setItem('alfa_user', JSON.stringify(u)); Store.emit('user'); },
  clearUser:   () => { localStorage.removeItem('alfa_user'); Store.emit('user'); },
  isLoggedIn:  () => !!Store.getUser(),

  mockLogin: async (email, pass) => {
    const { error } = await window.sb.auth.signInWithPassword({ email, password: pass });
    if (error) return { ok: false, msg: 'E-mail ou senha incorretos.' };
    return { ok: true };
  },
  mockRegister: async (name, email, pass, cpf, phone) => {
    const { data, error } = await window.sb.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
    if (error) return { ok: false, msg: /already|registered|exists/i.test(error.message) ? 'E-mail já cadastrado.' : error.message };
    if (data.user) await window.sb.from('profiles').update({ full_name: name, cpf: cpf || '', phone: phone || '' }).eq('id', data.user.id);
    return { ok: true };
  },
  updateUser: async (patch) => {
    Store.setUser({ ...(Store.getUser() || {}), ...patch });
    const { data } = await window.sb.auth.getUser();
    if (data.user) await window.sb.from('profiles').update({ full_name: patch.name, cpf: patch.cpf, phone: patch.phone }).eq('id', data.user.id);
  },
  resetPassword: async (email) => {
    const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'auth.html?mode=reset' });
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  },
  setNewPassword: async (pass) => {
    const { error } = await window.sb.auth.updateUser({ password: pass });
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  },
  _syncSession: async (session) => {
    if (!session) { localStorage.removeItem('alfa_user'); Store.emit('user'); return; }
    const { data: profile } = await window.sb.from('profiles').select('full_name,cpf,phone').eq('id', session.user.id).single();
    Store.setUser({
      name: (profile && profile.full_name) || session.user.email,
      email: session.user.email,
      cpf: (profile && profile.cpf) || '',
      phone: (profile && profile.phone) || '',
    });
  },

  // ── CART ──────────────────────────────────────────────
  getCart:  () => JSON.parse(localStorage.getItem('alfa_cart') || '[]'),
  addToCart: (product) => {
    const cart = Store.getCart();
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.qty += 1; else cart.push({ ...product, qty: 1, selected: true });
    localStorage.setItem('alfa_cart', JSON.stringify(cart));
    Store.emit('cart');
    if (window.AlfaEvents) window.AlfaEvents.track('add_to_cart', { value: product.price, items: [{ id: product.id, name: product.name, category: product.category, price: product.price, qty: 1 }] });
  },
  removeFromCart: (id) => {
    const removed = Store.getCart().find(i => i.id === id);
    localStorage.setItem('alfa_cart', JSON.stringify(Store.getCart().filter(i => i.id !== id)));
    Store.emit('cart');
    if (window.AlfaEvents && removed) window.AlfaEvents.track('remove_from_cart', { value: removed.price, items: [{ id: removed.id, name: removed.name, price: removed.price, qty: removed.qty }] });
  },
  updateQty: (id, qty) => {
    if (qty <= 0) { Store.removeFromCart(id); return; }
    const cart = Store.getCart();
    const item = cart.find(i => i.id === id);
    if (item) item.qty = qty;
    localStorage.setItem('alfa_cart', JSON.stringify(cart));
    Store.emit('cart');
  },
  toggleSelected: (id) => {
    const cart = Store.getCart();
    const item = cart.find(i => i.id === id);
    if (item) item.selected = !item.selected;
    localStorage.setItem('alfa_cart', JSON.stringify(cart));
    Store.emit('cart');
  },
  selectAll: (val) => {
    const cart = Store.getCart().map(i => ({ ...i, selected: val }));
    localStorage.setItem('alfa_cart', JSON.stringify(cart));
    Store.emit('cart');
  },
  cartCount:   () => Store.getCart().reduce((s, i) => s + i.qty, 0),
  cartTotal:   () => Store.getCart().reduce((s, i) => s + i.price * i.qty, 0),
  clearCart:   () => { localStorage.removeItem('alfa_cart'); Store.emit('cart'); },

  // ── FAVORITES ─────────────────────────────────────────
  getFavorites:   () => JSON.parse(localStorage.getItem('alfa_favorites') || '[]'),
  toggleFavorite: (product) => {
    const favs = Store.getFavorites();
    const idx = favs.findIndex(f => f.id === product.id);
    if (idx >= 0) favs.splice(idx, 1); else favs.push(product);
    localStorage.setItem('alfa_favorites', JSON.stringify(favs));
    Store.emit('favorites');
    return idx < 0;
  },
  isFavorite: (id) => Store.getFavorites().some(f => f.id === id),
  favCount:   () => Store.getFavorites().length,

  // ── CHECKOUT ──────────────────────────────────────────
  getCheckoutItems:  () => JSON.parse(localStorage.getItem('alfa_checkout') || '[]'),
  setCheckoutItems:  (items) => localStorage.setItem('alfa_checkout', JSON.stringify(items)),

  // ── THEME ─────────────────────────────────────────────
  getTheme: () => localStorage.getItem('alfa_theme') || 'dark',
  setTheme: (t) => {
    localStorage.setItem('alfa_theme', t);
    document.documentElement.dataset.theme = t;
    Store.syncThemeUI();
    Store.emit('theme');
  },
  toggleTheme: () => Store.setTheme(Store.getTheme() === 'dark' ? 'light' : 'dark'),
  initTheme: () => { document.documentElement.dataset.theme = Store.getTheme(); },
  syncThemeUI: () => {
    const dark = Store.getTheme() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.classList.toggle('is-dark', dark);
      const lbl = btn.querySelector('.theme-toggle-label');
      if (lbl) lbl.textContent = dark ? 'Modo Claro' : 'Modo Escuro';
    });
    document.querySelectorAll('.theme-logo').forEach(img => {
      img.src = dark ? 'logo-dark.png' : 'logo-light.png';
    });
  },

  // ── ORDERS (Supabase) ─────────────────────────────────
  // O pedido em si passou a ser criado pela Edge Function mp-create-payment
  // (checkout.html chama window.sb.functions.invoke diretamente) — o valor
  // cobrado nunca mais é calculado/confiado aqui no navegador.
  ORDER_STATUS_LABELS: {
    aguardando_pagamento: 'Aguardando Pagamento', processando: 'Processando', pago: 'Pago',
    preparando: 'Em Preparação', enviado: 'Em Transporte', entregue: 'Entregue',
    cancelado: 'Cancelado', recusado: 'Pagamento Recusado', estornado: 'Estornado',
    estorno_parcial: 'Estornado Parcialmente', expirado: 'Expirado',
  },
  getOrders: async () => {
    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) return [];
    const { data, error } = await window.sb
      .from('orders')
      .select('id,order_number,status,total,created_at,order_items(product_name_snapshot,qty)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []).map(o => ({
      id: o.order_number || o.id,
      date: new Date(o.created_at).toLocaleDateString('pt-BR'),
      status: Store.ORDER_STATUS_LABELS[o.status] || o.status,
      total: Store.fmt(Number(o.total)),
      items: (o.order_items || []).map(i => i.qty + 'x ' + i.product_name_snapshot).join(', '),
    }));
  },

  // ── ADDRESSES (mock) ──────────────────────────────────
  getAddresses:   () => JSON.parse(localStorage.getItem('alfa_addresses') || '[]'),
  addAddress:     (addr) => {
    const list = Store.getAddresses();
    list.push({ ...addr, id: Date.now() });
    localStorage.setItem('alfa_addresses', JSON.stringify(list));
  },
  removeAddress:  (id) => {
    localStorage.setItem('alfa_addresses', JSON.stringify(Store.getAddresses().filter(a => a.id !== id)));
  },

  // ── REVIEWS (Supabase) ────────────────────────────────
  // Fotos/vídeos anexados pelo cliente viram data URL (base64) via FileReader
  // no formulário, já que não há upload de arquivo real neste projeto.
  getReviews: async () => {
    const { data, error } = await window.sb.from('reviews').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },
  getReviewsByProduct: async (productId, opts) => {
    const onlyApproved = !opts || opts.onlyApproved !== false;
    let q = window.sb.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
    if (onlyApproved) q = q.eq('status', 'approved');
    const { data, error } = await q;
    if (error) { console.error(error); return []; }
    return data || [];
  },
  addReview: async (data) => {
    const { data: { session } } = await window.sb.auth.getSession();
    const payload = {
      product_id: data.product_id,
      user_id: session ? session.user.id : null,
      customer_name: data.customer_name,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      media_urls: data.media_urls || [],
      // Usuário com conta logada: publica direto. Visitante sem login: fica pendente até aprovação no painel admin.
      status: session ? 'approved' : 'pending',
    };
    const { data: created, error } = await window.sb.from('reviews').insert(payload).select().single();
    if (error) { console.error(error); return null; }
    Store.emit('reviews');
    return created;
  },
  updateReviewStatus: async (id, status) => {
    await window.sb.from('reviews').update({ status }).eq('id', id);
    Store.emit('reviews');
  },
  deleteReview: async (id) => {
    await window.sb.from('reviews').delete().eq('id', id);
    Store.emit('reviews');
  },

  // ── EVENTS ────────────────────────────────────────────
  _L: {},
  on:   (ev, cb) => { (Store._L[ev] = Store._L[ev] || []).push(cb); },
  emit: (ev)     => { (Store._L[ev] || []).forEach(cb => cb()); },

  // ── HELPERS ───────────────────────────────────────────
  fmt: (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
};

window.sb.auth.onAuthStateChange((_event, session) => { Store._syncSession(session); });

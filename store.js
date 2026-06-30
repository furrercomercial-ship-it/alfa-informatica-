/* Alfa Informática — Global Store (localStorage) */
/* Trocar os métodos de user por Supabase Auth quando disponível */
const Store = {
  // ── USER ──────────────────────────────────────────────
  getUser:     () => JSON.parse(localStorage.getItem('alfa_user') || 'null'),
  setUser:     (u) => { localStorage.setItem('alfa_user', JSON.stringify(u)); Store.emit('user'); },
  clearUser:   () => { localStorage.removeItem('alfa_user'); Store.emit('user'); },
  isLoggedIn:  () => !!Store.getUser(),

  // Mock auth — substituir por Supabase.auth.signIn()
  mockLogin: (email, pass) => {
    const users = JSON.parse(localStorage.getItem('alfa_users') || '[]');
    const u = users.find(u => u.email === email && u.pass === pass);
    if (!u) return { ok: false, msg: 'E-mail ou senha incorretos.' };
    Store.setUser({ name: u.name, email: u.email });
    return { ok: true };
  },
  mockRegister: (name, email, pass) => {
    const users = JSON.parse(localStorage.getItem('alfa_users') || '[]');
    if (users.find(u => u.email === email)) return { ok: false, msg: 'E-mail já cadastrado.' };
    users.push({ name, email, pass });
    localStorage.setItem('alfa_users', JSON.stringify(users));
    Store.setUser({ name, email });
    return { ok: true };
  },

  // ── CART ──────────────────────────────────────────────
  getCart:  () => JSON.parse(localStorage.getItem('alfa_cart') || '[]'),
  addToCart: (product) => {
    const cart = Store.getCart();
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.qty += 1; else cart.push({ ...product, qty: 1, selected: true });
    localStorage.setItem('alfa_cart', JSON.stringify(cart));
    Store.emit('cart');
  },
  removeFromCart: (id) => {
    localStorage.setItem('alfa_cart', JSON.stringify(Store.getCart().filter(i => i.id !== id)));
    Store.emit('cart');
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

  // ── EVENTS ────────────────────────────────────────────
  _L: {},
  on:   (ev, cb) => { (Store._L[ev] = Store._L[ev] || []).push(cb); },
  emit: (ev)     => { (Store._L[ev] || []).forEach(cb => cb()); },

  // ── HELPERS ───────────────────────────────────────────
  fmt: (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
};

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
    Store.setUser({ name: u.name, email: u.email, cpf: u.cpf || '', phone: u.phone || '' });
    return { ok: true };
  },
  mockRegister: (name, email, pass, cpf, phone) => {
    const users = JSON.parse(localStorage.getItem('alfa_users') || '[]');
    if (users.find(u => u.email === email)) return { ok: false, msg: 'E-mail já cadastrado.' };
    users.push({ name, email, pass, cpf: cpf || '', phone: phone || '' });
    localStorage.setItem('alfa_users', JSON.stringify(users));
    Store.setUser({ name, email, cpf: cpf || '', phone: phone || '' });
    if (!Store.getOrders().length) Store._seedOrders();
    return { ok: true };
  },
  updateUser: (patch) => {
    const u = { ...(Store.getUser() || {}), ...patch };
    Store.setUser(u);
    const users = JSON.parse(localStorage.getItem('alfa_users') || '[]');
    const idx = users.findIndex(x => x.email === (Store.getUser().email));
    if (idx >= 0) { users[idx] = { ...users[idx], ...patch }; localStorage.setItem('alfa_users', JSON.stringify(users)); }
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
  },

  // ── ORDERS (mock) ─────────────────────────────────────
  getOrders: () => JSON.parse(localStorage.getItem('alfa_orders') || '[]'),
  addOrder:  (order) => {
    const orders = Store.getOrders();
    orders.unshift(order);
    localStorage.setItem('alfa_orders', JSON.stringify(orders));
  },
  _seedOrders: () => {
    const fmt = Store.fmt;
    Store.addOrder({ id: '48213', date: '28/06/2026', status: 'Entregue', total: fmt(1249), items: 'Intel Core i5-14600K 3.5GHz 14-Core LGA1700' });
    Store.addOrder({ id: '48097', date: '14/06/2026', status: 'Em transporte', total: fmt(699), items: 'Corsair Vengeance 32GB DDR5 6000MHz Kit (2x16GB)' });
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

  // ── EVENTS ────────────────────────────────────────────
  _L: {},
  on:   (ev, cb) => { (Store._L[ev] = Store._L[ev] || []).push(cb); },
  emit: (ev)     => { (Store._L[ev] || []).forEach(cb => cb()); },

  // ── HELPERS ───────────────────────────────────────────
  fmt: (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
};

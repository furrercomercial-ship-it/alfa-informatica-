/* Alfa Informática — Categorias (mock "banco de dados")
   Estrutura pensada pra bater com uma tabela real:
     Categoria:    {id, nome, icone, slug, ordem, subcategorias}
     Subcategoria: {id, categoria_id, nome, slug, ordem}
   Trocar por fetch/Supabase quando houver backend — quem consome
   (header.js) já trata isso como se fosse uma resposta de API. */
window.CATEGORIES_DB = [
  {
    id: 1, slug: 'computadores', nome: 'Computadores', ordem: 3,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    subcategorias: [
      { id: 101, categoria_id: 1, slug: 'pc-gamer',   nome: 'PC Gamer',   ordem: 1 },
      { id: 102, categoria_id: 1, slug: 'pc-office',  nome: 'PC Office',  ordem: 2 },
      { id: 103, categoria_id: 1, slug: 'notebooks',  nome: 'Notebooks',  ordem: 3 },
      { id: 104, categoria_id: 1, slug: 'servidores', nome: 'Servidores', ordem: 4 },
      { id: 105, categoria_id: 1, slug: 'seminovos',  nome: 'Seminovos',  ordem: 5 },
    ],
  },
  {
    id: 2, slug: 'hardware', nome: 'Hardware', ordem: 1,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/></svg>',
    subcategorias: [
      { id: 201, categoria_id: 2, slug: 'processadores',        nome: 'Processadores',        ordem: 1 },
      { id: 202, categoria_id: 2, slug: 'placas-mae',           nome: 'Placas-mãe',            ordem: 2 },
      { id: 203, categoria_id: 2, slug: 'placas-de-video',      nome: 'Placas de Vídeo',       ordem: 3 },
      { id: 204, categoria_id: 2, slug: 'memorias-ram',         nome: 'Memórias RAM',          ordem: 4 },
      { id: 205, categoria_id: 2, slug: 'ssd-hd',                nome: 'SSD / HD',              ordem: 5 },
      { id: 206, categoria_id: 2, slug: 'fontes',                nome: 'Fontes',                ordem: 6 },
      { id: 207, categoria_id: 2, slug: 'gabinetes',             nome: 'Gabinetes',             ordem: 7 },
      { id: 208, categoria_id: 2, slug: 'coolers-gabinete',      nome: 'Coolers p/ Gabinete',   ordem: 8 },
      { id: 209, categoria_id: 2, slug: 'coolers-processador',   nome: 'Coolers p/ Processador', ordem: 9 },
      { id: 210, categoria_id: 2, slug: 'water-coolers',         nome: 'Water Coolers',         ordem: 10 },
    ],
  },
  {
    id: 3, slug: 'perifericos', nome: 'Periféricos', ordem: 2,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9 L7 15 L17 15 L18 9 Z"/><path d="M5 5 L19 5 L18 9 L6 9 Z"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
    subcategorias: [
      { id: 301, categoria_id: 3, slug: 'mouse',      nome: 'Mouse',            ordem: 1 },
      { id: 302, categoria_id: 3, slug: 'mousepad',   nome: 'Mousepad',         ordem: 2 },
      { id: 303, categoria_id: 3, slug: 'teclados',   nome: 'Teclados',         ordem: 3 },
      { id: 304, categoria_id: 3, slug: 'headsets',   nome: 'Headsets',         ordem: 4 },
      { id: 305, categoria_id: 3, slug: 'fones',      nome: 'Fones de Ouvido',  ordem: 5 },
      { id: 306, categoria_id: 3, slug: 'microfones', nome: 'Microfones',      ordem: 6 },
      { id: 307, categoria_id: 3, slug: 'webcam',     nome: 'Webcam',           ordem: 7 },
    ],
  },
  {
    id: 4, slug: 'monitores', nome: 'Monitores', ordem: 4,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    subcategorias: [
      { id: 401, categoria_id: 4, slug: 'monitores-gaming', nome: 'Monitores', ordem: 1 },
      { id: 402, categoria_id: 4, slug: 'tvs',               nome: 'TVs',       ordem: 2 },
    ],
  },
  {
    id: 5, slug: 'celulares', nome: 'Celulares', ordem: 6,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    subcategorias: [
      { id: 501, categoria_id: 5, slug: 'celulares-smartphones', nome: 'Celulares',           ordem: 1 },
      { id: 502, categoria_id: 5, slug: 'cabos-celular',          nome: 'Cabos para Celular',  ordem: 2 },
      { id: 503, categoria_id: 5, slug: 'adaptadores',            nome: 'Adaptadores',         ordem: 3 },
    ],
  },
  {
    id: 6, slug: 'redes', nome: 'Redes', ordem: 7,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M20.07 4.93a10 10 0 0 1 0 14.14"/><path d="M3.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
    subcategorias: [
      { id: 601, categoria_id: 6, slug: 'switch',       nome: 'Switch',          ordem: 1 },
      { id: 602, categoria_id: 6, slug: 'repetidores',  nome: 'Repetidores',     ordem: 2 },
      { id: 603, categoria_id: 6, slug: 'placas-rede',  nome: 'Placas de Rede',  ordem: 3 },
      { id: 604, categoria_id: 6, slug: 'cabos-rede',   nome: 'Cabos de Rede',   ordem: 4 },
    ],
  },
  {
    id: 7, slug: 'impressao', nome: 'Impressão', ordem: 10,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    subcategorias: [
      { id: 701, categoria_id: 7, slug: 'impressoras', nome: 'Impressoras', ordem: 1 },
    ],
  },
  {
    id: 8, slug: 'moveis', nome: 'Móveis', ordem: 5,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3"/><path d="M2 11v5a2 2 0 002 2h16a2 2 0 002-2v-5a2 2 0 00-4 0v2H6v-2a2 2 0 00-4 0z"/><line x1="6" y1="18" x2="6" y2="22"/><line x1="18" y1="18" x2="18" y2="22"/></svg>',
    subcategorias: [
      { id: 801, categoria_id: 8, slug: 'cadeiras', nome: 'Cadeiras', ordem: 1 },
      { id: 802, categoria_id: 8, slug: 'mesas',    nome: 'Mesas',    ordem: 2 },
    ],
  },
  {
    id: 9, slug: 'audio', nome: 'Áudio', ordem: 8,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    subcategorias: [
      { id: 901, categoria_id: 9, slug: 'caixas-de-som', nome: 'Caixas de Som', ordem: 1 },
    ],
  },
  {
    id: 10, slug: 'games', nome: 'Games', ordem: 9,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59l-.99 8.5A4 4 0 005.69 21h.01a4 4 0 003.23-1.63l.68-1.01a2 2 0 011.62-.84h1.54a2 2 0 011.62.84l.68 1.01A4 4 0 0018.3 21h.01a4 4 0 003.978-3.91l-.99-8.5A4 4 0 0017.32 5z"/></svg>',
    subcategorias: [
      { id: 1001, categoria_id: 10, slug: 'video-games', nome: 'Video Games', ordem: 1 },
    ],
  },
  {
    id: 11, slug: 'outros', nome: 'Outros', ordem: 11,
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    subcategorias: [
      { id: 1101, categoria_id: 11, slug: 'projetores',  nome: 'Projetores',                ordem: 1 },
      { id: 1102, categoria_id: 11, slug: 'eletronicos', nome: 'Eletrônicos',                ordem: 2 },
      { id: 1103, categoria_id: 11, slug: 'licencas',    nome: 'Licenças',                   ordem: 3 },
      { id: 1104, categoria_id: 11, slug: 'acessorios',  nome: 'Acessórios de Informática',   ordem: 4 },
    ],
  },
];

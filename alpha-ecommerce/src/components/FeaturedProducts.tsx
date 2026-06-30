import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Heart, Star, ChevronRight } from 'lucide-react'

interface Product {
  id: number
  name: string
  brand: string
  emoji: string
  price: number
  originalPrice?: number
  rating: number
  reviews: number
  badge?: 'NOVO' | 'OFERTA' | 'TOP'
  color: string
}

const BASE: Product[] = [
  { id: 1,  name: 'Teclado Mecânico HyperX Alloy Origins RGB', brand: 'HyperX',         emoji: '⌨️', price: 399.99,  originalPrice: 499.99,  rating: 4.8, reviews: 892,  badge: 'TOP',   color: '#cc0000' },
  { id: 2,  name: 'Mouse Gamer Logitech G502 Hero 25K',         brand: 'Logitech',        emoji: '🖱️', price: 299.99,                          rating: 4.9, reviews: 1243, badge: 'TOP',   color: '#0055ff' },
  { id: 3,  name: 'Headset Gamer HyperX Cloud III Wireless',    brand: 'HyperX',         emoji: '🎧', price: 549.99,  originalPrice: 649.99,  rating: 4.7, reviews: 567,               color: '#cc0000' },
  { id: 4,  name: 'SSD 2TB Samsung 870 Evo SATA III',          brand: 'Samsung',         emoji: '💾', price: 449.99,                          rating: 4.9, reviews: 2341, badge: 'TOP',   color: '#1a78ff' },
  { id: 5,  name: 'RAM 32GB DDR5 6000MHz CL36 Vengeance',      brand: 'Corsair',         emoji: '🔧', price: 699.99,  originalPrice: 849.99,  rating: 4.8, reviews: 445,  badge: 'OFERTA', color: '#ff6600' },
  { id: 6,  name: 'Placa-Mãe B650 Gaming X AX Wi-Fi',          brand: 'Gigabyte',        emoji: '🔌', price: 899.99,                          rating: 4.7, reviews: 312,               color: '#0099ff' },
  { id: 7,  name: 'RTX 4060 Ti 16GB Ventus 3X OC',             brand: 'MSI',             emoji: '🎮', price: 2199.99, originalPrice: 2499.99, rating: 4.8, reviews: 789,  badge: 'OFERTA', color: '#dd0000' },
  { id: 8,  name: 'Monitor 24" 180Hz AOC Q24G3S IPS',          brand: 'AOC',             emoji: '🖥️', price: 799.99,                          rating: 4.6, reviews: 1024, badge: 'NOVO',   color: '#0077ff' },
]

const TABS = ['Mais Vendidos', 'Novidades', 'PCs Gamer', 'Periféricos'] as const
type Tab = typeof TABS[number]

const PRODUCTS: Record<Tab, Product[]> = {
  'Mais Vendidos': BASE,
  'Novidades':     BASE.map(p => ({ ...p, id: p.id + 100, badge: 'NOVO' as const })),
  'PCs Gamer':     BASE.slice(0, 4).map(p => ({ ...p, id: p.id + 200 })),
  'Periféricos':   BASE.slice(4, 8).map(p => ({ ...p, id: p.id + 300 })),
}

const BADGE: Record<string, { bg: string; color: string }> = {
  NOVO:   { bg: '#00cc66', color: '#000' },
  OFERTA: { bg: '#ff2244', color: '#fff' },
  TOP:    { bg: '#f59e0b', color: '#000' },
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function ProductCard({ product, index }: { product: Product; index: number }) {
  const badge = product.badge ? BADGE[product.badge] : null

  return (
    <motion.div
      className="group relative rounded-2xl border border-[#12122e] bg-[#080816] overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.22 } }}
    >
      <div className="absolute inset-0 rounded-2xl border border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ borderColor: 'rgba(0,85,255,0.4)', boxShadow: '0 0 28px rgba(0,85,255,0.08)' }} />

      {/* Image area */}
      <div
        className="relative h-48 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${product.color}16, #04040e 100%)` }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             style={{ background: `linear-gradient(90deg, transparent, ${product.color}, transparent)` }} />

        <span className="text-[70px] opacity-[0.15] select-none pointer-events-none">{product.emoji}</span>

        {badge && (
          <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ background: badge.bg, color: badge.color }}>
            {product.badge}
          </span>
        )}
        <button className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[rgba(0,0,0,0.4)] flex items-center justify-center text-[#6666aa] hover:text-[#ff4466] transition-colors backdrop-blur-sm">
          <Heart size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-xs font-semibold text-[#00aaff] uppercase tracking-wide mb-1">{product.brand}</p>
        <h3 className="text-sm font-semibold text-white leading-snug mb-2 line-clamp-2">{product.name}</h3>

        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={11}
              className={i < Math.floor(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-[#2a2a44]'} />
          ))}
          <span className="text-xs text-[#6666aa]">({product.reviews.toLocaleString()})</span>
        </div>

        <div className="mb-4">
          {product.originalPrice && (
            <span className="text-xs text-[#44446a] line-through block">R$ {fmt(product.originalPrice)}</span>
          )}
          <span className="text-xl font-black text-white">R$ {fmt(product.price)}</span>
          <span className="text-xs text-[#00cc66] block mt-0.5">12x de R$ {fmt(product.price / 12)}</span>
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 active:scale-95 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0055ff, #0077ff)' }}
        >
          <ShoppingCart size={14} />
          Comprar
        </button>
      </div>
    </motion.div>
  )
}

export default function FeaturedProducts() {
  const [activeTab, setActiveTab] = useState<Tab>('Mais Vendidos')
  const products = PRODUCTS[activeTab]

  return (
    <section id="featured" className="py-20 bg-[#04040e]">
      <div className="max-w-[1380px] mx-auto px-6">

        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="text-3xl lg:text-[38px] font-black text-white tracking-tight">Produtos em Destaque</h2>
            <div className="w-12 h-[3px] bg-gradient-to-r from-[#0055ff] to-[#00aaff] rounded-full mt-3" />
          </div>
          <a href="#" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#00aaff] hover:text-white transition-colors">
            Ver catálogo completo <ChevronRight size={14} />
          </a>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-2 mb-8 overflow-x-auto pb-1"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200"
              style={
                activeTab === tab
                  ? { background: 'rgba(0,85,255,0.18)', color: '#00aaff', border: '1px solid rgba(0,85,255,0.35)' }
                  : { background: 'transparent', color: '#7777aa', border: '1px solid #12122e' }
              }
            >
              {tab}
            </button>
          ))}
        </motion.div>

        {/* Products grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

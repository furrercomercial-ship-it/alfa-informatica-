import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Heart, Star, Clock } from 'lucide-react'

interface Offer {
  id: number
  name: string
  brand: string
  emoji: string
  originalPrice: number
  salePrice: number
  discount: number
  sold: number
  total: number
  rating: number
  color: string
}

const OFFERS: Offer[] = [
  { id: 1, name: 'GeForce RTX 4070 Super 12GB GDDR6X', brand: 'ASUS TUF Gaming', emoji: '🎮', originalPrice: 3399.99, salePrice: 2889.99, discount: 15, sold: 34, total: 50, rating: 4.9, color: '#6633ff' },
  { id: 2, name: 'Ryzen 7 7700X 8-Core 4.5GHz Unlocked', brand: 'AMD', emoji: '⚡', originalPrice: 1499.99, salePrice: 1199.99, discount: 20, sold: 28, total: 40, rating: 4.8, color: '#cc3300' },
  { id: 3, name: 'Monitor 27" 165Hz 1ms IPS QHD', brand: 'LG UltraGear', emoji: '🖥️', originalPrice: 1149.99, salePrice: 899.99, discount: 22, sold: 19, total: 30, rating: 4.7, color: '#0055ff' },
  { id: 4, name: 'SSD 1TB NVMe PCIe Gen4 7400MB/s', brand: 'Samsung 980 Pro', emoji: '💾', originalPrice: 349.99, salePrice: 249.99, discount: 29, sold: 41, total: 60, rating: 4.9, color: '#00aaff' },
]

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const pad = (n: number) => String(n).padStart(2, '0')

function useCountdown() {
  const calc = () => {
    const now = new Date()
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const d = Math.max(0, end.getTime() - now.getTime())
    return {
      h: Math.floor(d / 3600000),
      m: Math.floor((d % 3600000) / 60000),
      s: Math.floor((d % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-[50px] h-[54px] rounded-lg flex items-center justify-center text-2xl font-black text-[#00aaff] tabular-nums"
        style={{ background: '#12122e', border: '1px solid #1e1e4a' }}
      >
        {pad(value)}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-[#44446a]">{label}</span>
    </div>
  )
}

function OfferCard({ offer, index }: { offer: Offer; index: number }) {
  const progress = (offer.sold / offer.total) * 100
  const remaining = offer.total - offer.sold

  return (
    <motion.div
      className="group relative rounded-2xl border border-[#12122e] bg-[#080816] overflow-hidden"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.22 } }}
      style={{ transition: 'border-color 0.3s, box-shadow 0.3s' }}
    >
      {/* Hover border effect via Framer whileHover isn't needed — use CSS group-hover */}
      <div className="absolute inset-0 rounded-2xl border border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
           style={{ borderColor: 'rgba(0,85,255,0.45)', boxShadow: '0 0 32px rgba(0,85,255,0.1)' }} />

      {/* Image */}
      <div
        className="relative h-52 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${offer.color}18 0%, #08081600 100%)` }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, transparent, ${offer.color}, transparent)` }}
        />
        <span className="text-[80px] opacity-[0.15] select-none pointer-events-none">{offer.emoji}</span>

        <span className="absolute top-3 left-3 bg-[#ff2244] text-white text-xs font-bold px-2.5 py-1 rounded-lg">
          -{offer.discount}%
        </span>
        <button className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[rgba(0,0,0,0.45)] flex items-center justify-center text-[#6666aa] hover:text-[#ff4466] transition-colors backdrop-blur-sm">
          <Heart size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs font-semibold text-[#00aaff] uppercase tracking-wide mb-1">{offer.brand}</p>
        <h3 className="text-sm font-semibold text-white leading-snug mb-2.5 line-clamp-2">{offer.name}</h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={11} className={i < Math.floor(offer.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-[#2a2a44]'} />
          ))}
          <span className="text-xs text-[#6666aa] ml-0.5">{offer.rating}</span>
        </div>

        {/* Stock */}
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-[#12122e] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #0055ff, #00aaff)' }}
              initial={{ width: 0 }}
              whileInView={{ width: `${progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.25 }}
            />
          </div>
          <p className="text-[11px] text-[#ff5522] mt-1.5 font-medium">
            🔥 Restam apenas {remaining} unidades!
          </p>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className="text-xs text-[#44446a] line-through">R$ {fmt(offer.originalPrice)}</span>
          <p className="text-2xl font-black text-white leading-tight">R$ {fmt(offer.salePrice)}</p>
          <span className="text-xs text-[#00cc66]">12x de R$ {fmt(offer.salePrice / 12)} sem juros</span>
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 active:scale-95 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #0055ff, #0077ff)', boxShadow: '0 4px 16px rgba(0,85,255,0.3)' }}
        >
          <ShoppingCart size={15} />
          Adicionar ao Carrinho
        </button>
      </div>
    </motion.div>
  )
}

export default function OffersSection() {
  const time = useCountdown()

  return (
    <section id="offers" style={{ background: 'linear-gradient(180deg, #04040e 0%, #06060f 50%, #04040e 100%)' }} className="py-20">
      <div className="max-w-[1380px] mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <h2 className="text-3xl lg:text-[38px] font-black text-white tracking-tight">Ofertas do Dia</h2>
            </div>
            <div className="w-12 h-[3px] bg-gradient-to-r from-[#0055ff] to-[#00aaff] rounded-full mt-3" />
            <p className="text-[#6666aa] text-sm mt-2">Preços exclusivos por tempo limitado</p>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-1.5 text-sm text-[#6666aa]">
              <Clock size={14} />
              Encerra em:
            </div>
            <div className="flex items-center gap-1.5">
              <CountdownUnit value={time.h} label="hrs" />
              <span className="text-[#00aaff] text-xl font-black mb-5">:</span>
              <CountdownUnit value={time.m} label="min" />
              <span className="text-[#00aaff] text-xl font-black mb-5">:</span>
              <CountdownUnit value={time.s} label="seg" />
            </div>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {OFFERS.map((o, i) => <OfferCard key={o.id} offer={o} index={i} />)}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-[#00aaff] transition-all duration-200 hover:bg-[rgba(0,170,255,0.08)]"
            style={{ border: '1px solid rgba(0,170,255,0.3)' }}
          >
            Ver todas as ofertas →
          </a>
        </motion.div>
      </div>
    </section>
  )
}

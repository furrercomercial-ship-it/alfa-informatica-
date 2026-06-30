import { motion } from 'framer-motion'
import { Cpu, Monitor, Laptop, Mouse, Wifi, Gamepad2, Armchair, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Category {
  id: number
  name: string
  subtitle: string
  Icon: LucideIcon
  color: string
}

const CATEGORIES: Category[] = [
  { id: 1, name: 'Placas de Vídeo', subtitle: '+2.8k produtos', Icon: Layers,   color: '#6633ff' },
  { id: 2, name: 'Processadores',   subtitle: '+1.2k produtos', Icon: Cpu,       color: '#0055ff' },
  { id: 3, name: 'PCs Gamer',       subtitle: '+450 configs',   Icon: Gamepad2,  color: '#0077ff' },
  { id: 4, name: 'Notebooks',       subtitle: '+890 produtos',  Icon: Laptop,    color: '#00aaff' },
  { id: 5, name: 'Monitores',       subtitle: '+620 produtos',  Icon: Monitor,   color: '#0099ff' },
  { id: 6, name: 'Periféricos',     subtitle: '+3.1k produtos', Icon: Mouse,     color: '#0055ff' },
  { id: 7, name: 'Cadeiras Gamer',  subtitle: '+180 modelos',   Icon: Armchair,  color: '#4455dd' },
  { id: 8, name: 'Redes',           subtitle: '+1.4k produtos', Icon: Wifi,      color: '#0066dd' },
]

function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  const Icon = cat.Icon

  return (
    <motion.a
      href="#"
      className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border border-[#12122e] bg-[#080816] no-underline cursor-pointer"
      style={{ textDecoration: 'none' }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.065, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.22 } }}
    >
      {/* Hover border glow (CSS transition handles color change) */}
      <div
        className="absolute inset-0 rounded-2xl border border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ borderColor: `${cat.color}55`, boxShadow: `0 0 28px ${cat.color}18 inset, 0 0 20px ${cat.color}10` }}
      />

      {/* Icon container */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${cat.color}22, ${cat.color}0c)`,
          border: `1px solid ${cat.color}33`,
        }}
      >
        <Icon
          size={26}
          className="transition-all duration-300"
          style={{ color: cat.color }}
        />
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-sm font-semibold text-[#b0b0d0] group-hover:text-white transition-colors duration-200 leading-snug">
          {cat.name}
        </p>
        <p className="text-[11px] text-[#44446a] mt-1">{cat.subtitle}</p>
      </div>
    </motion.a>
  )
}

export default function CategoriesSection() {
  return (
    <section id="categories" className="py-20 bg-[#04040e]">
      <div className="max-w-[1380px] mx-auto px-6">

        {/* Header */}
        <motion.div
          className="flex items-end justify-between mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="text-3xl lg:text-[38px] font-black text-white tracking-tight">
              Explore por Categoria
            </h2>
            <div className="w-12 h-[3px] bg-gradient-to-r from-[#0055ff] to-[#00aaff] rounded-full mt-3" />
            <p className="text-[#6666aa] text-sm mt-2">Encontre exatamente o que você procura</p>
          </div>
          <a
            href="#"
            className="hidden md:flex items-center gap-1 text-sm font-semibold text-[#00aaff] hover:text-white transition-colors duration-200"
          >
            Ver todas →
          </a>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.id} cat={cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

import { motion } from 'framer-motion'
import { Truck, Shield, Headphones, Lock, CreditCard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Benefit {
  Icon: LucideIcon
  title: string
  desc: string
  color: string
}

const BENEFITS: Benefit[] = [
  { Icon: Truck,       title: 'Frete Grátis',     desc: 'Para todo o Brasil acima de R$ 299',      color: '#00cc66' },
  { Icon: Shield,      title: 'Garantia',          desc: '12 meses em todos os produtos',           color: '#0055ff' },
  { Icon: Headphones,  title: 'Suporte 24/7',      desc: 'Especialistas técnicos disponíveis',      color: '#00aaff' },
  { Icon: Lock,        title: 'Compra Segura',     desc: 'Criptografia SSL em todas transações',   color: '#6633ff' },
  { Icon: CreditCard,  title: '12x sem Juros',     desc: 'Nos principais cartões do mercado',      color: '#ff9900' },
]

export default function BenefitsSection() {
  return (
    <section className="py-20 bg-[#04040e]">
      <div className="max-w-[1380px] mx-auto px-6">

        {/* Neon divider top */}
        <div
          className="h-px mb-16 opacity-30"
          style={{ background: 'linear-gradient(90deg, transparent, #0055ff, #00aaff, transparent)' }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.Icon
            return (
              <motion.div
                key={b.title}
                className="group flex flex-col items-center text-center gap-4 p-6 rounded-2xl border border-[#12122e] bg-[#080816] cursor-default"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5, transition: { duration: 0.22 } }}
              >
                {/* Hover glow overlay */}
                <div
                  className="absolute inset-0 rounded-2xl border border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ borderColor: `${b.color}44`, boxShadow: `0 0 24px ${b.color}14 inset` }}
                />

                {/* Icon */}
                <div
                  className="relative w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${b.color}22, ${b.color}0c)`,
                    border: `1px solid ${b.color}33`,
                  }}
                >
                  <Icon size={24} style={{ color: b.color }} />
                </div>

                <div className="relative">
                  <p className="text-sm font-bold text-white mb-1">{b.title}</p>
                  <p className="text-xs text-[#6666aa] leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Neon divider bottom */}
        <div
          className="h-px mt-16 opacity-30"
          style={{ background: 'linear-gradient(90deg, transparent, #0055ff, #00aaff, transparent)' }}
        />
      </div>
    </section>
  )
}

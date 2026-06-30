import { motion } from 'framer-motion'

const BRANDS = [
  { name: 'ASUS',         color: '#1a78ff' },
  { name: 'MSI',          color: '#dd2200' },
  { name: 'Gigabyte',     color: '#0099ff' },
  { name: 'Corsair',      color: '#ff6600' },
  { name: 'Logitech',     color: '#0055ff' },
  { name: 'HyperX',       color: '#cc0000' },
  { name: 'Redragon',     color: '#ff2244' },
  { name: 'NVIDIA',       color: '#76b900' },
  { name: 'AMD',          color: '#ed1c24' },
  { name: 'Intel',        color: '#0071c5' },
  { name: 'Cooler Master',color: '#2266ff' },
  { name: 'DeepCool',     color: '#00aaff' },
]

/* Duplicate list for seamless infinite loop */
const DOUBLED = [...BRANDS, ...BRANDS]

export default function BrandsSection() {
  return (
    <section className="py-20 bg-[#060614]">

      {/* Section title */}
      <div className="max-w-[1380px] mx-auto px-6 mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl lg:text-[38px] font-black text-white tracking-tight">
            Marcas Parceiras
          </h2>
          <div className="w-12 h-[3px] bg-gradient-to-r from-[#0055ff] to-[#00aaff] rounded-full mt-3 mx-auto" />
          <p className="text-[#6666aa] text-sm mt-2">
            As melhores marcas do mercado reunidas em um só lugar
          </p>
        </motion.div>
      </div>

      {/* Marquee */}
      <div className="relative overflow-hidden">
        {/* Edge fade left */}
        <div
          className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, #060614 0%, transparent 100%)' }}
        />
        {/* Edge fade right */}
        <div
          className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(-90deg, #060614 0%, transparent 100%)' }}
        />

        {/* Track */}
        <div
          className="flex gap-4"
          style={{
            width: 'max-content',
            animation: 'brandScroll 32s linear infinite',
          }}
          onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
          onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
        >
          {DOUBLED.map((brand, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[160px] h-[72px] flex items-center justify-center rounded-2xl border border-[#12122e] bg-[#080816] cursor-pointer transition-all duration-300 hover:border-[rgba(0,85,255,0.4)] hover:bg-[#0d0d22]"
            >
              <span
                className="text-lg font-black tracking-tight"
                style={{
                  color: brand.color,
                  textShadow: `0 0 24px ${brand.color}55`,
                }}
              >
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes brandScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}

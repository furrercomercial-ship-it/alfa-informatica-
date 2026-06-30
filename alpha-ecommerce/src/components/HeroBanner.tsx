import { motion } from 'framer-motion'
import { ShoppingCart, Zap, ChevronRight, Shield, Truck, Star } from 'lucide-react'

/* ── Animation variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.8, delay },
  }),
}

/* ── Sub-components ─────────────────────────────────── */
function GridBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Radial glow top-center */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,85,255,0.18) 0%, transparent 70%)' }}
      />
      {/* Radial glow right */}
      <div
        className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(0,170,255,0.1) 0%, transparent 70%)' }}
      />
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,85,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,85,255,1) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, #04040e 100%)' }} />
    </div>
  )
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-black text-white tracking-tight">{value}</span>
      <span className="text-xs text-[#6666aa] mt-0.5">{label}</span>
    </div>
  )
}

function SetupVisual() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto">
      {/* Main card */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        className="relative rounded-2xl overflow-hidden border border-[#1a1a40]"
        style={{ background: 'linear-gradient(135deg, #0d0d22 0%, #080816 100%)' }}
      >
        {/* Top neon accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #0055ff, #00aaff, transparent)' }}
        />

        {/* Monitor mock */}
        <div className="p-6">
          <div className="rounded-xl overflow-hidden border border-[#1a1a40] mb-4"
               style={{ background: 'linear-gradient(135deg, #06061a 0%, #0a0a28 100%)', aspectRatio: '16/9', position: 'relative' }}>
            {/* Screen glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full opacity-20"
                   style={{ background: 'radial-gradient(circle, #0055ff, transparent)' }} />
            </div>
            {/* Screen content sim */}
            <div className="absolute inset-0 flex items-end p-4">
              <div className="w-full">
                <div className="flex gap-2 mb-2">
                  {['bg-[#0055ff]','bg-[#00aaff]','bg-[#6633ff]'].map((c,i) => (
                    <motion.div key={i} className={`h-1 rounded-full ${c}`}
                      animate={{ width: ['30%','70%','50%'] }}
                      transition={{ duration: 2, delay: i*0.3, repeat: Infinity, repeatType: 'reverse' }} />
                  ))}
                </div>
                <div className="text-[10px] text-[#00aaff] font-mono opacity-60">ALPHA TITAN PRO — 240 FPS</div>
              </div>
            </div>
            {/* FPS indicator */}
            <div className="absolute top-3 right-3 bg-[#0055ff] text-white text-[10px] font-bold px-2 py-1 rounded-md">
              240 FPS
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'CPU', value: 'Intel i9-14900KF' },
              { label: 'GPU', value: 'RTX 4090 24GB' },
              { label: 'RAM', value: '64GB DDR5 6000' },
              { label: 'SSD', value: '2TB NVMe Gen4' },
            ].map(spec => (
              <div key={spec.label} className="rounded-lg px-3 py-2.5 border border-[#1a1a40]"
                   style={{ background: 'rgba(0,85,255,0.07)' }}>
                <div className="text-[10px] text-[#6666aa] uppercase tracking-wide mb-0.5">{spec.label}</div>
                <div className="text-xs font-bold text-white">{spec.value}</div>
              </div>
            ))}
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#444466] line-through">R$ 28.999,99</div>
              <div className="text-2xl font-black text-white">
                R$ 24.999<span className="text-base">,99</span>
              </div>
              <div className="text-[11px] text-[#00cc66] mt-0.5">12x de R$ 2.083,33 sem juros</div>
            </div>
            <button
              onClick={() => {}}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0055ff, #0077ff)', boxShadow: '0 0 20px rgba(0,85,255,0.4)' }}
            >
              <ShoppingCart size={15} />
              Comprar
            </button>
          </div>
        </div>
      </motion.div>

      {/* Floating badge: Free shipping */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, delay: 0.5 }}
        className="absolute -top-4 -right-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(8,8,22,0.9)', border: '1px solid rgba(0,204,102,0.3)', backdropFilter: 'blur(8px)' }}
      >
        <Truck size={14} className="text-[#00cc66]" />
        <span className="text-white text-xs">Frete Grátis</span>
      </motion.div>

      {/* Floating badge: Rating */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, ease: 'easeInOut', repeat: Infinity, delay: 1 }}
        className="absolute -bottom-4 -left-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
        style={{ background: 'rgba(8,8,22,0.9)', border: '1px solid rgba(251,191,36,0.3)', backdropFilter: 'blur(8px)' }}
      >
        <Star size={13} className="text-yellow-400 fill-yellow-400" />
        <span className="text-white">4.9 — 3.2k avaliações</span>
      </motion.div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────── */
export default function HeroBanner() {
  return (
    <section className="relative min-h-[calc(100vh-70px)] flex items-center overflow-hidden bg-[#04040e]">
      <GridBackground />

      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-6 py-16 lg:py-0 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* ── LEFT: Copy ───────────────────────────── */}
        <div>
          {/* Badge */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
            style={{ background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,85,255,0.3)', color: '#00aaff' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#00aaff] animate-pulse-dot" />
            Melhores preços em hardware gamer
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.1}
            className="text-5xl lg:text-[62px] font-black leading-[1.08] tracking-tight mb-5"
          >
            <span className="text-white">Performance</span>
            <br />
            <span className="text-gradient">Sem Limites</span>
            <br />
            <span className="text-white text-4xl lg:text-5xl font-bold opacity-90">para o seu Setup</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0.2}
            className="text-[#7777aa] text-lg leading-relaxed mb-9 max-w-[480px]"
          >
            Hardware premium, PCs Gamer de alta performance e os melhores periféricos do mercado — tudo com suporte técnico especializado.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.3}
            className="flex flex-wrap gap-3 mb-12"
          >
            <button
              className="flex items-center gap-2.5 px-7 py-4 rounded-xl text-base font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0055ff, #0077ff)', boxShadow: '0 0 28px rgba(0,85,255,0.45), 0 4px 16px rgba(0,85,255,0.3)' }}
            >
              <ShoppingCart size={18} />
              Comprar Agora
            </button>
            <button
              className="flex items-center gap-2 px-7 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:bg-[rgba(0,85,255,0.12)] active:scale-95"
              style={{ color: '#00aaff', border: '1px solid rgba(0,170,255,0.35)' }}
            >
              <Zap size={16} />
              Ver Promoções
              <ChevronRight size={15} />
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.5}
            className="flex items-center gap-6 flex-wrap"
          >
            <StatChip value="50k+" label="Clientes" />
            <div className="w-px h-10 bg-[#12122e]" />
            <StatChip value="15k+" label="Produtos" />
            <div className="w-px h-10 bg-[#12122e]" />
            <StatChip value="4.9★" label="Avaliação" />
            <div className="w-px h-10 bg-[#12122e]" />
            <StatChip value="8 anos" label="no Mercado" />
          </motion.div>

          {/* Trust strip */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.65}
            className="flex flex-wrap gap-5 mt-8"
          >
            {[
              { icon: <Truck size={14} />, text: 'Frete grátis acima de R$ 299' },
              { icon: <Shield size={14} />, text: 'Garantia em todos os produtos' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-xs text-[#6666aa]">
                <span className="text-[#00aaff]">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT: Product visual ─────────────────── */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" custom={0.3}
          className="hidden lg:flex justify-center"
        >
          <SetupVisual />
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 cursor-pointer"
        onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="text-[11px] text-[#6666aa] uppercase tracking-widest">Explorar</span>
        <div className="w-5 h-9 border border-[rgba(0,85,255,0.4)] rounded-full flex justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-1 h-2 bg-[#0055ff] rounded-full"
          />
        </div>
      </motion.div>
    </section>
  )
}

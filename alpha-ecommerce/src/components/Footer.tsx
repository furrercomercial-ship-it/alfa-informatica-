import { Mail, Phone, MapPin, Instagram, Youtube, Facebook, Twitter } from 'lucide-react'

const LINKS: Record<string, string[]> = {
  'Loja':       ['Sobre Nós', 'Blog Técnico', 'Trabalhe Conosco', 'Afiliados', 'Imprensa'],
  'Hardware':   ['Placas de Vídeo', 'Processadores', 'Memórias RAM', 'SSDs e HDs', 'Placas-Mãe'],
  'Periféricos':['Teclados', 'Mouses', 'Headsets', 'Monitores', 'Cadeiras Gamer'],
  'Suporte':    ['Central de Ajuda', 'Política de Trocas', 'Rastrear Pedido', 'Garantia', 'Fale Conosco'],
}

const SOCIALS = [
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Youtube,   href: '#', label: 'YouTube'   },
  { Icon: Facebook,  href: '#', label: 'Facebook'  },
  { Icon: Twitter,   href: '#', label: 'Twitter'   },
]

const PAYMENTS = ['Visa', 'Mastercard', 'Pix', 'Boleto', 'Elo', 'AmEx', 'PayPal']

export default function Footer() {
  return (
    <footer style={{ background: '#060614', borderTop: '1px solid #12122e' }}>

      {/* Main grid */}
      <div className="max-w-[1380px] mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">

          {/* Brand column */}
          <div className="col-span-2">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl text-white font-serif"
                style={{
                  background: 'linear-gradient(135deg, #0055ff, #00aaff)',
                  boxShadow: '0 0 20px rgba(0,85,255,0.4)',
                }}
              >
                α
              </div>
              <div className="leading-none">
                <div className="text-lg font-black text-white">ALPHA</div>
                <div className="text-[9px] font-semibold text-[#00aaff] tracking-[2.5px]">INFORMÁTICA</div>
              </div>
            </div>

            <p className="text-sm text-[#6666aa] leading-relaxed mb-6 max-w-[230px]">
              Sua loja premium de hardware, periféricos e PCs Gamer. Qualidade e performance ao melhor preço.
            </p>

            {/* Socials */}
            <div className="flex gap-2 mb-6">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-[#0d0d22] border border-[#1a1a3a] flex items-center justify-center text-[#6666aa] transition-all duration-200 hover:text-[#00aaff] hover:border-[rgba(0,170,255,0.3)] hover:bg-[#0f0f2a]"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2.5">
              <a href="tel:+5511900000000"
                 className="flex items-center gap-2.5 text-sm text-[#6666aa] hover:text-white transition-colors">
                <Phone size={13} className="text-[#00aaff] flex-shrink-0" />
                (11) 9 0000-0000
              </a>
              <a href="mailto:contato@alphainformatica.com.br"
                 className="flex items-center gap-2.5 text-sm text-[#6666aa] hover:text-white transition-colors">
                <Mail size={13} className="text-[#00aaff] flex-shrink-0" />
                contato@alphainformatica.com.br
              </a>
              <span className="flex items-center gap-2.5 text-sm text-[#6666aa]">
                <MapPin size={13} className="text-[#00aaff] flex-shrink-0" />
                São Paulo, SP — Brasil
              </span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[#6666aa] hover:text-white transition-colors duration-150"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid #12122e' }}>
        <div className="max-w-[1380px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#44446a] text-center sm:text-left">
            © 2025 Alpha Informática. Todos os direitos reservados. CNPJ 00.000.000/0001-00
          </p>

          {/* Payment methods */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {PAYMENTS.map(method => (
              <span
                key={method}
                className="text-[11px] font-bold px-2.5 py-1 rounded-md text-[#6666aa]"
                style={{ background: '#0a0a1e', border: '1px solid #1a1a3a' }}
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

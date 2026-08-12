import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Heart, MessageCircle, Ruler, Scissors, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { buildWhatsAppUrl } from '../../lib/public-utils'
import { formatCurrency } from '../../lib/utils'
import { getPublicProducts } from '../../services/public-products.service'

const benefits = [
  {
    description: 'Selecciona la talla, el color y los detalles que necesitas.',
    icon: Ruler,
    title: 'Confeccion a tu medida',
  },
  {
    description: 'Cada pieza se confecciona despues de confirmar tu solicitud.',
    icon: Scissors,
    title: 'Fabricacion bajo pedido',
  },
  {
    description: 'Te acompanamos desde la eleccion hasta la entrega.',
    icon: Heart,
    title: 'Atencion personalizada',
  },
]

const testimonials = [
  {
    name: 'Dra. Valeria Soto',
    role: 'Medico cirujano',
    text: 'La calidad de las telas y la precision en la talla superaron mis expectativas. Ademas, el trato fue excelente.',
  },
  {
    name: 'Enf. Carlos Mendez',
    role: 'Enfermero jefe',
    text: 'Mis uniformes siempre han sido un dolor de cabeza por mi altura, pero aqui encontre una opcion que por fin se adapta bien.',
  },
  {
    name: 'Dra. Laura Paredes',
    role: 'Pediatra',
    text: 'Me encanta poder elegir colores y detalles. Se nota que cada prenda esta hecha con dedicacion.',
  },
]

const processSteps = [
  { step: 1, title: 'Elige tu modelo', desc: 'Explora el catalogo y selecciona la prenda que mas se ajusta a tu estilo.' },
  { step: 2, title: 'Personaliza', desc: 'Indica talla, color, bordados o cualquier detalle adicional que desees.' },
  { step: 3, title: 'Confirmamos', desc: 'Revisamos tu pedido y te enviamos el total junto con los tiempos de entrega.' },
  { step: 4, title: 'Confeccion y entrega', desc: 'Tu uniforme se fabrica especialmente para ti y coordinamos la entrega.' },
]

function SectionHeading({ badge, title, subtitle }: { badge?: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      {badge ? <p className="text-sm font-bold uppercase tracking-[0.26em] text-atarah-gold-700">{badge}</p> : null}
      <h2 className="mt-4 font-display text-4xl font-bold text-atarah-wine-900 sm:text-5xl">{title}</h2>
      {subtitle ? <p className="mx-auto mt-5 max-w-2xl leading-7 text-atarah-charcoal-600">{subtitle}</p> : null}
    </div>
  )
}

export function HomePage() {
  useDocumentTitle('Atarah Atelier')

  const featuredProductsQuery = useQuery({
    queryFn: () => getPublicProducts({ featuredOnly: true, sort: 'recommended' }),
    queryKey: ['home-featured-products'],
  })

  const featuredProducts = (featuredProductsQuery.data ?? []).slice(0, 4)
  const whatsappUrl = buildWhatsAppUrl('Hola, quisiera informacion sobre los uniformes de Atarah Atelier.')

  return (
    <>
      <section className="relative overflow-hidden border-b border-atarah-gold-300/50 bg-[linear-gradient(180deg,#fffdf9_0%,#f8efe5_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,176,84,0.18),transparent_38%)]" />
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-atarah-gold-300/60 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-atarah-gold-800">
              <Sparkles className="size-4" aria-hidden="true" />
              Atelier 2026
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-tight text-atarah-wine-900 sm:text-6xl">
              Elegancia y comodidad en cada jornada
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-atarah-charcoal-600">
              Descubre uniformes medicos hechos bajo pedido, adaptados a tu talla, estilo y necesidades profesionales.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/catalogo" className="inline-flex items-center justify-center gap-2 rounded-full bg-atarah-wine-900 px-7 py-4 font-semibold text-white transition hover:bg-atarah-wine-700">
                <span className="text-white">Ver catalogo</span> <ArrowRight size={18} className="text-white" />
              </Link>
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-atarah-gold-600 px-7 py-4 font-semibold text-atarah-wine-900 transition hover:bg-white hover:shadow-md">
                  <MessageCircle size={18} /> Hablar por WhatsApp
                </a>
              ) : null}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.12 }} className="rounded-[2rem] border border-atarah-gold-300/80 bg-white/80 p-8 shadow-xl shadow-atarah-gold-200/40 backdrop-blur-sm sm:p-10">
            <div className="rounded-[1.75rem] border border-dashed border-atarah-gold-400/70 bg-atarah-cream-100 p-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-atarah-gold-700">Atelier bajo pedido</p>
              <p className="mt-4 font-display text-4xl font-bold text-atarah-wine-900">Hecho especialmente para ti</p>
              <p className="mt-4 text-sm leading-6 text-atarah-charcoal-600">
                Selecciona tu modelo, talla, color y personalizacion. Nosotros nos encargamos de confeccionarlo.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <SectionHeading badge="Nuestra forma de trabajar" title="Tu uniforme comienza con una eleccion" subtitle="No trabajamos con produccion masiva. Cada pedido se prepara cuidadosamente segun tus preferencias." />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {benefits.map(({ description, icon: Icon, title }) => (
            <motion.article key={title} whileHover={{ y: -8 }} className="rounded-3xl border border-atarah-gold-300/80 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-atarah-wine-900 text-white">
                <Icon size={23} />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold text-atarah-wine-900">{title}</h3>
              <p className="mt-3 leading-7 text-atarah-charcoal-600">{description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-y border-atarah-gold-300/40 bg-atarah-cream-100 py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <SectionHeading badge="Lo mas solicitado" title="Prendas destacadas"/>

          {featuredProductsQuery.isLoading ? (
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[360px] animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : featuredProducts.length ? (
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <motion.article key={product.id} whileHover={{ y: -10 }} className="group rounded-2xl bg-white p-4 shadow-md transition-shadow hover:shadow-xl">
                  <div className="relative overflow-hidden rounded-xl bg-atarah-gold-100/50">
                    {product.main_image ? (
                      <img src={product.main_image} alt={product.name} className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-atarah-cream-100 text-sm text-atarah-charcoal-600">Imagen pendiente</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-atarah-wine-900/85 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {product.category}
                    </span>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-atarah-wine-900">{product.name}</h3>
                      <p className="mt-1 text-sm text-atarah-charcoal-500">Desde {formatCurrency(product.min_price)}</p>
                    </div>
                    <Link to={`/catalogo/${product.slug}`} className="rounded-full border border-atarah-gold-400 p-2 text-atarah-wine-900 transition hover:bg-atarah-gold-100">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-3xl border border-atarah-gold-300/70 bg-white px-6 py-10 text-center text-atarah-charcoal-600">
              Todavia no hay productos marcados como destacados en el panel.
            </div>
          )}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <SectionHeading badge="Como funciona" title="De la eleccion a tu puerta" subtitle="Un proceso sencillo y transparente para que recibas tu uniforme perfecto." />
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map(({ step, title, desc }) => (
            <motion.div key={step} whileHover={{ scale: 1.02 }} className="relative rounded-3xl border border-atarah-gold-300/60 bg-white p-6 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-atarah-wine-900 text-2xl font-bold text-white">{step}</div>
              <h3 className="mt-4 font-display text-xl font-bold text-atarah-wine-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-atarah-charcoal-600">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y border-atarah-gold-300/40 bg-atarah-wine-900 py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-atarah-gold-300">Opiniones</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {testimonials.map(({ name, role, text }) => (
              <motion.blockquote key={name} whileHover={{ y: -5 }} className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
                <div className="flex gap-0.5 text-atarah-gold-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={18} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-4 text-base leading-7 text-white/90">"{text}"</p>
                <footer className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-atarah-gold-300 font-bold text-atarah-wine-900">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <cite className="not-italic font-semibold text-white">{name}</cite>
                    <p className="text-sm text-atarah-gold-300/80">{role}</p>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-5xl px-4 py-24 lg:px-8">
        <div className="rounded-[2rem] border border-atarah-gold-300/60 bg-[linear-gradient(180deg,#fffdfa_0%,#f8efe3_100%)] p-8 text-center shadow-[0_20px_60px_rgba(86,32,41,0.08)] sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-atarah-wine-900 text-white">
            <MessageCircle size={28} aria-hidden="true" />
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.24em] text-atarah-gold-700">Tienes dudas</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-atarah-wine-900">Te asesoramos antes de pedir</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-atarah-charcoal-600">
            Si necesitas ayuda con tallas, colores, tiempos o personalizacion, escribenos por WhatsApp y te orientamos antes de confirmar tu pedido.
          </p>
          {whatsappUrl ? (
            <div className="mt-8">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <Button size="lg" className="px-8">
                  Chatear ahora
                </Button>
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

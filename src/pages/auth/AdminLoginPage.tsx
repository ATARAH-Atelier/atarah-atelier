import { zodResolver } from '@hookform/resolvers/zod'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Scissors,
  Ruler,
  Star,
  Sparkles,
  Heart,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import logo from '../../assets/atarah-logo.png'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { resolvePostLoginPath } from '../../services/auth.service'
import type { LoginCredentials } from '../../types/auth'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria.')
    .min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

interface LocationState {
  from?: string
}

const QUOTES = [
  {
    text: 'Cada puntada cuenta una historia de elegancia y dedicación.',
    icon: Heart,
  },
  {
    text: 'La moda hecha a mano nunca pasa de moda.',
    icon: Scissors,
  },
  {
    text: 'Viste con la confianza de quien sabe que su ropa es única.',
    icon: Sparkles,
  },
]

export function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [currentQuote, setCurrentQuote] = useState(0)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  useDocumentTitle('Acceso | Atarah Atelier')

  // Rotación de frases cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % QUOTES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginCredentials>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginCredentials) {
    try {
      const result = await signIn(values)
      toast.success('Sesión iniciada correctamente.')
      navigate(
        state?.from && state.from.startsWith('/')
          ? state.from
          : resolvePostLoginPath(result.profile),
        { replace: true },
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No fue posible iniciar sesión.',
      )
    }
  }

  const QuoteIcon = QUOTES[currentQuote].icon

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#fcf8f2]">
      {/* Fondo decorativo global */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-atarah-gold-100/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-atarah-wine-100/20 blur-3xl" />
      </div>

      {/* Panel izquierdo (ilustraciones + marca) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-atarah-wine-950 via-atarah-wine-900 to-atarah-wine-800 p-12 text-white lg:flex">
        {/* Textura de patrón de tela */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(212,175,55,0.3) 1px, transparent 1px), radial-gradient(circle at 80% 30%, rgba(212,175,55,0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* SVG decorativo: silueta de maniquí de costura (simplificado) */}
        <svg
          className="absolute bottom-20 left-10 h-72 w-72 opacity-15"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="100" cy="130" rx="40" ry="60" stroke="#D4AF37" strokeWidth="2" fill="none" />
          <ellipse cx="100" cy="70" rx="30" ry="20" stroke="#D4AF37" strokeWidth="2" fill="none" />
          <path d="M70 70 L60 30 M130 70 L140 30" stroke="#D4AF37" strokeWidth="2" />
          <path d="M85 130 L75 190 M115 130 L125 190" stroke="#D4AF37" strokeWidth="2" />
          <circle cx="100" cy="45" r="12" stroke="#D4AF37" strokeWidth="2" fill="none" />
        </svg>

        {/* Iconos flotantes de costura */}
        <Star className="absolute right-16 top-24 h-6 w-6 rotate-45 text-atarah-gold-300/40" />
        <Scissors className="absolute left-24 top-1/3 h-6 w-6 text-atarah-gold-300/30" />
        <Ruler className="absolute right-20 bottom-32 h-6 w-6 -rotate-12 text-atarah-gold-300/30" />

        {/* Contenido del panel */}
        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <img
              src={logo}
              alt="Atarah Atelier"
              className="h-16 w-16 rounded-full object-cover shadow-lg ring-2 ring-atarah-gold-300/40"
            />
          </Link>
          <h1 className="mt-8 font-display text-5xl font-bold leading-tight tracking-tight">
            Atarah Atelier
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-white/80">
            Confección artesanal para quienes buscan piezas únicas y atemporales.
          </p>
        </div>

        {/* Frase inspiradora rotativa */}
        <div className="relative z-10 mt-auto">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all duration-500">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-atarah-gold-300/20 text-atarah-gold-300">
                <QuoteIcon className="h-6 w-6" />
              </div>
              <p className="text-xl font-medium leading-relaxed">
                "{QUOTES[currentQuote].text}"
              </p>
            </div>
            {/* Indicadores de rotación */}
            <div className="mt-6 flex items-center gap-2">
              {QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuote(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentQuote
                      ? 'w-8 bg-atarah-gold-400'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 mt-8 text-sm text-white/50">
          © {new Date().getFullYear()} Atarah Atelier. Todos los derechos reservados.
        </p>
      </div>

      {/* Panel derecho (formulario) */}
      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo móvil */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <img
              src={logo}
              alt="Atarah Atelier"
              className="h-16 w-16 rounded-full object-cover shadow-md"
            />
            <h2 className="mt-4 font-display text-3xl font-bold text-atarah-wine-900">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-sm text-atarah-charcoal-600">
              Accede a tu cuenta para gestionar tus pedidos y más.
            </p>
          </div>

          {/* Tarjeta del formulario con detalle de cinta métrica */}
          <Card className="relative overflow-hidden border-0 bg-white/90 p-8 shadow-2xl shadow-atarah-gold-200/30 ring-1 ring-atarah-gold-200/50 backdrop-blur-md sm:p-10">
            {/* Adorno de cinta métrica en el borde superior */}
            <div className="absolute -top-px left-6 right-6 h-1 bg-gradient-to-r from-atarah-gold-400 via-atarah-gold-300 to-atarah-gold-400 rounded-b-full opacity-70" />
            {/* Decoraciones suaves en esquinas */}
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-atarah-cream-100/60 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-atarah-gold-100/40 blur-xl" />

            <div className="relative">
              <div className="mb-8 hidden lg:block">
                <h2 className="font-display text-4xl font-bold text-atarah-wine-900">
                  Iniciar sesión
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-atarah-charcoal-600">
                  Usa tu cuenta para entrar como cliente, vendedor o administradora.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-[2.85rem] h-5 w-5 text-atarah-charcoal-400" />
                  <Input
                    id="email"
                    type="email"
                    label="Correo electrónico"
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    autoFocus
                    className="pl-12"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-[2.85rem] h-5 w-5 text-atarah-charcoal-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Contraseña"
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    className="pl-12 pr-12"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-4 top-[2.7rem] rounded-full p-1.5 text-atarah-charcoal-500 transition hover:bg-atarah-cream-100 hover:text-atarah-wine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-atarah-gold-300/40"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="w-full bg-atarah-wine-900 shadow-lg shadow-atarah-wine-900/20 transition-all hover:bg-atarah-wine-800 hover:shadow-xl hover:shadow-atarah-wine-900/30 active:scale-[0.98]"
                  size="lg"
                >
                  Iniciar sesión
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-3 text-sm text-atarah-charcoal-600 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/registro"
                  className="font-medium text-atarah-wine-900 transition hover:text-atarah-wine-700"
                >
                  Crear cuenta de cliente
                </Link>
                <Link
                  to="/recuperar-contrasena"
                  className="transition hover:text-atarah-wine-900"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-atarah-gold-200 pt-6 text-sm">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 font-medium text-atarah-charcoal-600 transition hover:text-atarah-wine-900"
                >
                  ← Volver al sitio público
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
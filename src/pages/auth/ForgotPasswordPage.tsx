import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, ArrowLeft, Send, Sparkles, Heart, Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import logo from '../../assets/atarah-logo.png'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { PasswordRecoveryInput } from '../../types/auth'

const schema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
})

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()

  useDocumentTitle('Recuperar contraseña | Atarah Atelier')

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordRecoveryInput>({
    defaultValues: { email: '' },
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: PasswordRecoveryInput) {
    try {
      await requestPasswordReset(values)
      toast.success('Si el correo existe, recibirás un enlace de recuperación.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible iniciar la recuperación.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fcf8f2] px-4 py-10">
      {/* Fondos decorativos globales */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-atarah-gold-100/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-atarah-wine-100/20 blur-3xl" />
      </div>

      {/* Iconos decorativos en el fondo (solo lado claro) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { icon: Star, size: 16, opacity: 0.06 },
          { icon: Heart, size: 14, opacity: 0.05 },
          { icon: Sparkles, size: 18, opacity: 0.04 },
          { icon: Mail, size: 20, opacity: 0.04 },
        ].flatMap((item, itemIndex) =>
          Array.from({ length: 6 }).map((_, i) => {
            const Icon = item.icon
            const left = Math.random() * 100
            const top = Math.random() * 100
            const rotate = Math.random() * 360
            return (
              <Icon
                key={`${itemIndex}-${i}`}
                className="absolute text-atarah-wine-800"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: item.size,
                  height: item.size,
                  opacity: item.opacity,
                  transform: `rotate(${rotate}deg)`,
                }}
              />
            )
          }),
        )}
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Logo y título */}
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="Atarah Atelier"
            className="h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-atarah-gold-300/30"
          />
          <h1 className="mt-5 font-display text-4xl font-bold text-atarah-wine-900">
            Recuperar contraseña
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-atarah-charcoal-600">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {/* Tarjeta del formulario */}
        <Card className="relative overflow-hidden border-0 bg-white/90 p-8 shadow-2xl shadow-atarah-gold-200/30 ring-1 ring-atarah-gold-200/50 backdrop-blur-md sm:p-10">
          {/* Adorno de cinta métrica en borde superior */}
          <div className="absolute -top-px left-6 right-6 h-1 bg-gradient-to-r from-atarah-gold-400 via-atarah-gold-300 to-atarah-gold-400 rounded-b-full opacity-70" />
          {/* Decoraciones suaves en esquinas */}
          <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-atarah-cream-100/60 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-atarah-gold-100/40 blur-xl" />

          <div className="relative">
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

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full bg-atarah-wine-900 shadow-lg shadow-atarah-wine-900/20 transition-all hover:bg-atarah-wine-800 hover:shadow-xl hover:shadow-atarah-wine-900/30 active:scale-[0.98]"
                size="lg"
                leftIcon={<Send className="h-5 w-5" />}
              >
                Enviar enlace de recuperación
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-atarah-gold-200 pt-6 text-sm">
              <Link
                to="/acceso"
                className="flex items-center gap-1.5 font-medium text-atarah-charcoal-600 transition hover:text-atarah-wine-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al acceso
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
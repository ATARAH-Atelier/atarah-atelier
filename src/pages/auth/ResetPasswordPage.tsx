import { zodResolver } from '@hookform/resolvers/zod'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Heart,
  Star,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import logo from '../../assets/atarah-logo.png'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Esquema de contraseña robusta con confirmación
const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'Debe contener al menos un carácter especial')

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  useDocumentTitle('Restablecer contraseña | Atarah Atelier')

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    resolver: zodResolver(schema),
  })

  const passwordValue = watch('password', '')

  // Requisitos visuales de contraseña
  const passwordChecks = useMemo(() => {
    return [
      { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
      { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
      { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
      { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
      { label: 'Un carácter especial (!@#$%^&*)', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
    ]
  }, [])

  const allChecksPassed =
    passwordChecks.every((check) => check.test(passwordValue)) && passwordValue.length >= 8

  async function onSubmit(values: { password: string; confirmPassword: string }) {
    try {
      await updatePassword({ password: values.password })
      toast.success('Tu contraseña fue actualizada.')
      navigate('/acceso', { replace: true })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No fue posible actualizar la contraseña.',
      )
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fcf8f2] px-4 py-10">
      {/* Fondos decorativos globales */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-atarah-gold-100/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-atarah-wine-100/20 blur-3xl" />
      </div>

      {/* Iconos decorativos en el fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { icon: Star, size: 16, opacity: 0.06 },
          { icon: Heart, size: 14, opacity: 0.05 },
          { icon: Sparkles, size: 18, opacity: 0.04 },
          { icon: ShieldCheck, size: 20, opacity: 0.04 },
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
            Restablecer contraseña
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-atarah-charcoal-600">
            Define una nueva contraseña segura para tu cuenta de Atarah Atelier.
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
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {/* Nueva contraseña */}
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-[2.85rem] h-5 w-5 text-atarah-charcoal-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Nueva contraseña"
                  placeholder="Mínimo 8 caracteres"
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

              {/* Confirmar contraseña */}
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-[2.85rem] h-5 w-5 text-atarah-charcoal-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  label="Confirmar contraseña"
                  placeholder="Repite tu nueva contraseña"
                  className="pl-12 pr-12"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-4 top-[2.7rem] rounded-full p-1.5 text-atarah-charcoal-500 transition hover:bg-atarah-cream-100 hover:text-atarah-wine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-atarah-gold-300/40"
                  onClick={() => setShowConfirm((current) => !current)}
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Checklist de políticas de contraseña */}
              <div className="rounded-2xl border border-atarah-gold-200 bg-atarah-cream-50/80 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-atarah-charcoal-800">
                  <ShieldCheck className="size-4 text-atarah-wine-700" />
                  Tu contraseña debe tener:
                </p>
                <ul className="space-y-2">
                  {passwordChecks.map((check) => {
                    const passed = passwordValue ? check.test(passwordValue) : false
                    return (
                      <li
                        key={check.label}
                        className={`flex items-center gap-2 text-sm transition-colors ${
                          passed ? 'text-emerald-700' : 'text-atarah-charcoal-600'
                        }`}
                      >
                        {passed ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <X className="size-4 text-atarah-charcoal-400" />
                        )}
                        {check.label}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!allChecksPassed}
                className="w-full bg-atarah-wine-900 shadow-lg shadow-atarah-wine-900/20 transition-all hover:bg-atarah-wine-800 hover:shadow-xl hover:shadow-atarah-wine-900/30 active:scale-[0.98]"
                size="lg"
              >
                Guardar nueva contraseña
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
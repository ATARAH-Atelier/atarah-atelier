import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import logo from '../../assets/atarah-logo.png'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { RegisterCustomerInput } from '../../types/auth'

// Esquema de contraseña robusta
const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'Debe contener al menos un carácter especial')

// Esquema principal con teléfono validado (prefijo + 7 dígitos)
const registerSchema = z
  .object({
    email: z.string().email('Ingresa un correo válido.'),
    full_name: z.string().min(3, 'Ingresa tu nombre completo.'),
    phone: z
      .string()
      .regex(
        /^0(412|414|416|424|426)\d{7}$/,
        'El teléfono debe tener el formato 0412XXXXXXX (11 dígitos).',
      ),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

const PREFIXES = ['0412', '0414', '0416', '0424', '0426'] as const

export function RegisterPage() {
  const { signUpCustomer } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [phonePrefix, setPhonePrefix] = useState<string>(PREFIXES[0])
  const [phoneNumber, setPhoneNumber] = useState('')

  useDocumentTitle('Crear cuenta | Atarah Atelier')

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
    trigger,
    setValue,
  } = useForm<RegisterCustomerInput & { confirmPassword: string }>({
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      phone: '',
      confirmPassword: '',
    },
    resolver: zodResolver(registerSchema),
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

  // Manejar el teléfono combinando prefijo y número
  const updatePhoneField = (prefix: string, number: string) => {
    const fullPhone = prefix + number
    setValue('phone', fullPhone, { shouldValidate: true })
  }

  const handlePrefixChange = (newPrefix: string) => {
    setPhonePrefix(newPrefix)
    updatePhoneField(newPrefix, phoneNumber)
  }

  const handleNumberChange = (newNumber: string) => {
    // Solo dígitos, máximo 7
    const cleaned = newNumber.replace(/\D/g, '').slice(0, 7)
    setPhoneNumber(cleaned)
    updatePhoneField(phonePrefix, cleaned)
  }

  const goToStep = async (nextStep: number) => {
    if (step === 0) {
      const valid = await trigger(['full_name', 'email', 'phone'])
      if (!valid) return
    }
    setStep(nextStep)
  }

  async function onSubmit(values: RegisterCustomerInput & { confirmPassword: string }) {
    try {
      const { confirmPassword, ...input } = values
      await signUpCustomer(input)
      toast.success('Tu cuenta fue creada. Revisa tu correo si se requiere confirmación.')
      navigate('/acceso', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible crear la cuenta.')
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#fcf8f2_0%,#f5ede3_40%,#fcf8f2_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <Card className="relative w-full max-w-2xl overflow-hidden border-0 bg-white p-8 shadow-xl shadow-atarah-gold-200/30 sm:p-10">
          {/* Decoraciones de fondo */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-atarah-cream-100/60 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-atarah-gold-100/40 blur-2xl" />

          <div className="relative">
            {/* Logo y título */}
            <div className="mb-8 flex flex-col items-center text-center">
              <img
                src={logo}
                alt="Atarah Atelier"
                className="h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-atarah-gold-300/30"
              />
              <h1 className="mt-5 font-display text-4xl font-bold text-atarah-wine-900">
                Crear cuenta
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-atarah-charcoal-600">
                Regístrate para guardar tus datos, agilizar futuros pedidos y vivir la
                experiencia completa de Atarah Atelier.
              </p>
            </div>

            {/* Indicador de paso */}
            <div className="mb-8 flex items-center justify-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  step === 0
                    ? 'bg-atarah-wine-900 text-white shadow-md'
                    : 'bg-atarah-cream-100 text-atarah-charcoal-700'
                }`}
              >
                <UserRound className="size-4" />
                Datos personales
              </div>
              <div className="h-px w-6 bg-atarah-gold-300" />
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  step === 1
                    ? 'bg-atarah-wine-900 text-white shadow-md'
                    : 'bg-atarah-cream-100 text-atarah-charcoal-700'
                }`}
              >
                <LockKeyhole className="size-4" />
                Seguridad
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Paso 1: Datos personales */}
              {step === 0 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-[2.95rem] size-4 text-atarah-charcoal-600" />
                    <Input
                      id="full_name"
                      label="Nombre completo"
                      className="pl-11"
                      error={errors.full_name?.message}
                      {...register('full_name')}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-[2.95rem] size-4 text-atarah-charcoal-600" />
                    <Input
                      id="email"
                      label="Correo electrónico"
                      type="email"
                      className="pl-11"
                      error={errors.email?.message}
                      {...register('email')}
                    />
                  </div>

                  {/* Teléfono con prefijo desplegable y número de 7 dígitos */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-atarah-charcoal-700">
                      Teléfono
                    </label>
                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                      <Select
                        value={phonePrefix}
                        onChange={(e) => handlePrefixChange(e.target.value)}
                        className="w-full"
                        aria-label="Código de operadora"
                      >
                        {PREFIXES.map((prefix) => (
                          <option key={prefix} value={prefix}>
                            {prefix}
                          </option>
                        ))}
                      </Select>
                      <div className="relative min-w-0">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-atarah-charcoal-600" />
                        <Input
                          id="phone_number"
                          type="text"
                          inputMode="numeric"
                          placeholder="0000000"
                          maxLength={7}
                          className="pl-10"
                          value={phoneNumber}
                          onChange={(e) => handleNumberChange(e.target.value)}
                        />
                      </div>
                    </div>
                    <input type="hidden" {...register('phone')} />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-rose-600">{errors.phone.message}</p>
                    )}
                    <p className="mt-1 text-xs text-atarah-charcoal-500">
                      Ejemplo: {phonePrefix}1234567
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      rightIcon={<ArrowRight className="size-4" />}
                      onClick={() => goToStep(1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}

              {/* Paso 2: Seguridad (sin cambios) */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-[2.95rem] size-4 text-atarah-charcoal-600" />
                    <Input
                      id="password"
                      label="Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      className="pl-11 pr-12"
                      error={errors.password?.message}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-[2.8rem] rounded-full p-1 text-atarah-charcoal-600 transition hover:text-atarah-wine-900"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Checklist de políticas */}
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

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-[2.95rem] size-4 text-atarah-charcoal-600" />
                    <Input
                      id="confirmPassword"
                      label="Confirmar contraseña"
                      type={showConfirm ? 'text' : 'password'}
                      className="pl-11 pr-12"
                      error={errors.confirmPassword?.message}
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-[2.8rem] rounded-full p-1 text-atarah-charcoal-600 transition hover:text-atarah-wine-900"
                      onClick={() => setShowConfirm((prev) => !prev)}
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      leftIcon={<ArrowLeft className="size-4" />}
                      onClick={() => setStep(0)}
                    >
                      Volver
                    </Button>
                    <Button
                      type="submit"
                      loading={isSubmitting}
                      rightIcon={<ArrowRight className="size-4" />}
                      disabled={!allChecksPassed}
                    >
                      Crear cuenta
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="relative mt-6 text-center text-sm text-atarah-charcoal-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/acceso"
              className="font-medium text-atarah-wine-900 transition hover:text-atarah-wine-700"
            >
              Inicia sesión
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
import type { AuthError, User } from '@supabase/supabase-js'

import { createBrowserSupabaseClient, supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/public-utils'
import type {
  AppProfile,
  CreateStaffAccountInput,
  PasswordRecoveryInput,
  PasswordUpdateInput,
  RegisterCustomerInput,
  UserRole,
} from '../types/auth'

function translateAuthError(error: AuthError | Error | null) {
  const message = error?.message ?? ''
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('fetch') || lowerMessage.includes('network')) {
    return 'No fue posible conectar con el servidor.'
  }

  if (lowerMessage.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }

  if (lowerMessage.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de ingresar.'
  }

  if (lowerMessage.includes('user already registered')) {
    return 'Ese correo ya está registrado.'
  }

  if (lowerMessage.includes('password should be')) {
    return 'La contraseña no cumple los requisitos mínimos.'
  }

  if (lowerMessage.includes('redirect')) {
    return 'La configuración de redirección de Supabase no permite completar esta acción.'
  }

  if (lowerMessage.includes('email rate limit exceeded')) {
    return 'Se alcanzó el límite de correos. Intenta de nuevo en unos minutos.'
  }

  if (lowerMessage.includes('error sending confirmation email')) {
    return 'Supabase no pudo enviar el correo de confirmación. Revisa la configuración de Auth.'
  }

  if (message.trim() && message.trim() !== '{}') {
    return `No fue posible procesar la autenticación: ${message}`
  }

  return 'Supabase rechazó el registro sin devolver detalle. Revisa el trigger de auth/perfiles o los logs de Auth en Supabase.'
}

function normalizeRole(value: string | null | undefined): UserRole {
  if (value === 'admin' || value === 'seller') {
    return value
  }

  return 'customer'
}

function getAuthRedirectUrl(path: string) {
  const configuredSiteUrl =
    typeof import.meta.env.VITE_SITE_URL === 'string'
      ? import.meta.env.VITE_SITE_URL.trim().replace(/\/+$/, '')
      : ''

  if (configuredSiteUrl) {
    return `${configuredSiteUrl}${path}`
  }

  if (typeof window === 'undefined') {
    return undefined
  }

  return `${window.location.origin}${path}`
}

function getFallbackFullName(user: User) {
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''

  if (metadataName) {
    return metadataName
  }

  const emailName = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ')?.trim()

  if (emailName) {
    return emailName
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  }

  return 'Cliente Atarah'
}

function mapProfileRow(data: { created_at: string | null; email?: string | null; full_name: string; id: string; is_active?: boolean | null; role: string | null | undefined }): AppProfile {
  return {
    created_at: data.created_at,
    email: data.email ?? null,
    full_name: data.full_name,
    id: data.id,
    is_active: data.is_active ?? true,
    role: normalizeRole(data.role),
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new Error(translateAuthError(error))
  }

  return data.session
}

export async function getProfile(userId: string): Promise<AppProfile | null> {
  let { data, error }: { data: any; error: any } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at, is_active, email')
    .eq('id', userId)
    .maybeSingle()

  if (error?.message?.toLowerCase().includes('email') || error?.message?.toLowerCase().includes('is_active')) {
    const fallback = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', userId)
      .maybeSingle()

    data = fallback.data
    error = fallback.error
  }

  if (error) {
    throw new Error(`No fue posible validar el perfil de la cuenta: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return mapProfileRow(data)
}

export async function ensureProfileForUser(user: User): Promise<AppProfile> {
  const currentProfile = await getProfile(user.id)

  if (currentProfile) {
    return currentProfile
  }

  const role = normalizeRole(typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null)
  const fullName = getFallbackFullName(user)

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    role,
  })

  if (error) {
    throw new Error('La cuenta existe, pero no se pudo completar el perfil en Supabase.')
  }

  return {
    created_at: user.created_at ?? null,
    email: user.email ?? null,
    full_name: fullName,
    id: user.id,
    is_active: true,
    role,
  }
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(translateAuthError(error))
  }

  const session = data.session
  const user = data.user

  if (!session || !user) {
    throw new Error('No fue posible iniciar sesión.')
  }

  const profile = await ensureProfileForUser(user)

  if (!profile.is_active) {
    await supabase.auth.signOut()
    throw new Error('Esta cuenta está desactivada. Contacta a la administradora.')
  }

  return { profile, session, user }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error('No fue posible cerrar la sesión.')
  }
}

export async function signUpCustomer(input: RegisterCustomerInput) {
  const { error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.full_name.trim(),
        phone: normalizePhone(input.phone),
        role: 'customer',
      },
    },
  })

  if (error) {
    throw new Error(translateAuthError(error))
  }
}

export async function requestPasswordReset(input: PasswordRecoveryInput) {
  const { error } = await supabase.auth.resetPasswordForEmail(input.email.trim(), {
    redirectTo: getAuthRedirectUrl('/restablecer-contrasena'),
  })

  if (error) {
    throw new Error(translateAuthError(error))
  }
}

export async function updatePassword(input: PasswordUpdateInput) {
  const { error } = await supabase.auth.updateUser({
    password: input.password,
  })

  if (error) {
    throw new Error(translateAuthError(error))
  }
}

export async function createSellerAccount(input: CreateStaffAccountInput) {
  const isolatedClient = createBrowserSupabaseClient(`atarah-admin-create-${Date.now()}`)
  const { data, error } = await isolatedClient.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.full_name.trim(),
        phone: normalizePhone(input.phone),
        role: input.role,
      },
      emailRedirectTo: getAuthRedirectUrl('/admin'),
    },
  })

  if (error) {
    throw new Error(translateAuthError(error))
  }

  if (!data.user) {
    throw new Error('Supabase no devolvió el usuario creado para el vendedor.')
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email: input.email.trim(),
    full_name: input.full_name.trim(),
    phone: normalizePhone(input.phone),
    role: input.role,
  })

  if (profileError) {
    throw new Error('La cuenta fue creada, pero no se pudo completar el perfil del vendedor.')
  }

  await isolatedClient.auth.signOut()
}

export function canAccessAdmin(profile: AppProfile | null) {
  return profile?.role === 'admin' || profile?.role === 'seller'
}

export function isAdmin(profile: AppProfile | null) {
  return profile?.role === 'admin'
}

export function isSeller(profile: AppProfile | null) {
  return profile?.role === 'seller'
}

export function resolvePostLoginPath(profile: AppProfile | null) {
  if (profile?.role === 'admin' || profile?.role === 'seller') {
    return '/admin'
  }

  return '/mi-cuenta'
}


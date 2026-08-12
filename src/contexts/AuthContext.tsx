import type { Session, User } from '@supabase/supabase-js'
import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { AuthContext } from './auth-context'
import { supabase } from '../lib/supabase'
import {
  canAccessAdmin,
  ensureProfileForUser,
  getCurrentSession,
  isAdmin,
  isSeller,
  requestPasswordReset,
  signInUser,
  signOutUser,
  signUpCustomer,
  updatePassword,
} from '../services/auth.service'
import type {
  AppProfile,
  AuthContextValue,
  LoginCredentials,
  PasswordRecoveryInput,
  PasswordUpdateInput,
  RegisterCustomerInput,
} from '../types/auth'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      try {
        const currentSession = await getCurrentSession()

        if (!isMounted) {
          return
        }

        if (!currentSession) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return
        }

        setSession(currentSession)
        setUser(currentSession.user)

        const nextProfile = await ensureProfileForUser(currentSession.user)

        if (!isMounted) {
          return
        }

        if (!nextProfile.is_active) {
          await signOutUser()
          setSession(null)
          setUser(null)
          setProfile(null)
          toast.error('Esta cuenta esta desactivada. Contacta a la administradora.')
          return
        }

        setProfile(nextProfile)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setSession(null)
        setUser(null)
        setProfile(null)

        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible validar tu sesi\u00f3n.'

        toast.error(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (!nextSession?.user) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      void ensureProfileForUser(nextSession.user)
        .then(async (nextProfile) => {
          if (!isMounted) {
            return
          }

          if (!nextProfile.is_active) {
            await signOutUser()
            if (!isMounted) {
              return
            }
            setSession(null)
            setUser(null)
            setProfile(null)
            toast.error('Esta cuenta esta desactivada. Contacta a la administradora.')
            return
          }

          setProfile(nextProfile)
        })
        .catch((error) => {
          if (!isMounted) {
            return
          }

          setProfile(null)
          toast.error(
            error instanceof Error
              ? error.message
              : 'No fue posible validar tu perfil.',
          )
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false)
          }
        })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(credentials: LoginCredentials) {
    setIsLoading(true)

    try {
      const result = await signInUser(credentials.email, credentials.password)
      setSession(result.session)
      setUser(result.user)
      setProfile(result.profile)
      return result
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    await signOutUser()
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  async function refreshProfile() {
    if (!user) {
      setProfile(null)
      return null
    }

    const nextProfile = await ensureProfileForUser(user)

    if (!nextProfile.is_active) {
      await signOutUser()
      setSession(null)
      setUser(null)
      setProfile(null)
      throw new Error('Esta cuenta esta desactivada. Contacta a la administradora.')
    }

    setProfile(nextProfile)
    return nextProfile
  }

  async function handleSignUpCustomer(input: RegisterCustomerInput) {
    await signUpCustomer(input)
  }

  async function handleRequestPasswordReset(input: PasswordRecoveryInput) {
    await requestPasswordReset(input)
  }

  async function handleUpdatePassword(input: PasswordUpdateInput) {
    await updatePassword(input)
  }

  const value: AuthContextValue = {
    isAdmin: isAdmin(profile),
    isAuthenticated: Boolean(session?.user),
    isLoading,
    isSeller: isSeller(profile),
    isStaff: canAccessAdmin(profile),
    profile,
    refreshProfile,
    requestPasswordReset: handleRequestPasswordReset,
    session,
    signIn,
    signOut,
    signUpCustomer: handleSignUpCustomer,
    updatePassword: handleUpdatePassword,
    user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

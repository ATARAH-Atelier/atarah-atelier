import type { Session, User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'seller' | 'customer'

export interface AppProfile {
  created_at: string | null
  email?: string | null
  full_name: string
  id: string
  is_active: boolean
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCustomerInput {
  email: string
  full_name: string
  password: string
  phone: string
}

export interface CreateStaffAccountInput {
  email: string
  full_name: string
  password: string
  phone: string
  role: 'seller'
}

export interface PasswordRecoveryInput {
  email: string
}

export interface PasswordUpdateInput {
  password: string
}

export interface AuthContextValue {
  isAdmin: boolean
  isAuthenticated: boolean
  isLoading: boolean
  isSeller: boolean
  isStaff: boolean
  profile: AppProfile | null
  refreshProfile: () => Promise<AppProfile | null>
  requestPasswordReset: (input: PasswordRecoveryInput) => Promise<void>
  session: Session | null
  signIn: (credentials: LoginCredentials) => Promise<{
    profile: AppProfile
    session: Session
    user: User
  }>
  signOut: () => Promise<void>
  signUpCustomer: (input: RegisterCustomerInput) => Promise<void>
  updatePassword: (input: PasswordUpdateInput) => Promise<void>
  user: User | null
}

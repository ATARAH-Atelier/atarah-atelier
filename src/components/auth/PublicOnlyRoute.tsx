import type { PropsWithChildren } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../common/LoadingScreen'
import { resolvePostLoginPath } from '../../services/auth.service'

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading, profile } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Verificando acceso..." />
  }

  if (isAuthenticated) {
    return <Navigate to={resolvePostLoginPath(profile)} replace />
  }

  return children ?? <Outlet />
}

import type { PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../common/LoadingScreen'
import type { UserRole } from '../../types/auth'

interface ProtectedRouteProps extends PropsWithChildren {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({
  allowedRoles = ['admin', 'seller'],
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/acceso"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    const fallbackRoute = profile?.role === 'customer'
      ? '/mi-cuenta'
      : profile?.role === 'seller'
        ? '/admin/pedidos'
        : profile?.role === 'admin'
          ? '/admin'
          : '/acceso'

    return <Navigate to={fallbackRoute} replace />
  }

  return children ?? <Outlet />
}

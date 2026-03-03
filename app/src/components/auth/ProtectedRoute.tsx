import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
}

export function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const { hasAnyPermission, hasAllPermissions } = usePermissions()
  const toastShown = useRef(false)

  const requiredPerms = permission ? [permission] : permissions ?? []
  const hasAccess =
    requiredPerms.length === 0 ||
    (requireAll ? hasAllPermissions(requiredPerms) : hasAnyPermission(requiredPerms))

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess && !toastShown.current) {
      toastShown.current = true
      toast.error('No tienes permisos para acceder a esta sección')
    }
  }, [isLoading, isAuthenticated, hasAccess])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (!hasAccess) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <>{children}</>
}

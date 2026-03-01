import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const permissions = user?.permissions ?? []

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes('*')) return true
    const [resource] = permission.split(':')
    return permissions.includes(permission) || permissions.includes(`${resource}:*`)
  }

  const hasAnyPermission = (perms: string[]): boolean =>
    perms.some((p) => hasPermission(p))

  const hasAllPermissions = (perms: string[]): boolean =>
    perms.every((p) => hasPermission(p))

  const isAdmin = () => hasPermission('users:assign-permissions')

  return { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin }
}

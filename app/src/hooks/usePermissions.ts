import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const permissions = user?.permissions ?? []

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes('*')) return true
    if (permissions.includes(permission)) return true
    const [resource] = permission.split(':')
    if (permissions.includes(`${resource}:*`)) return true
    // Tree wildcard: "clientes:*" covers "clientes.contactos:read"
    const parts = resource.split('.')
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.')
      if (permissions.includes(`${parent}:*`)) return true
    }
    return false
  }

  const hasAnyPermission = (perms: string[]): boolean =>
    perms.some((p) => hasPermission(p))

  const hasAllPermissions = (perms: string[]): boolean =>
    perms.every((p) => hasPermission(p))

  const isAdmin = () => permissions.includes('*')

  return { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin }
}

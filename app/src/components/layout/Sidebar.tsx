import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  FileText,
  Image,
  Truck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'

interface MenuItem {
  label: string
  icon: React.ElementType
  path?: string
  permission?: string
  children?: { label: string; path: string; permission?: string }[]
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.HOME },
  { label: 'Clientes', icon: Building2, path: ROUTES.CLIENTS, permission: 'clientes:read' },
  { label: 'Proyectos', icon: FolderKanban, path: ROUTES.PROJECTS, permission: 'proyectos:read' },
  { label: 'Media', icon: Image, path: ROUTES.MEDIA },
  { label: 'Proveedores', icon: Truck, path: ROUTES.SUPPLIERS },
  { label: 'Cotizaciones', icon: FileText, path: ROUTES.QUOTES, permission: 'cotizaciones:read' },
  {
    label: 'Administracion',
    icon: Settings,
    permission: 'usuarios:read',
    children: [
      { label: 'Usuarios', path: ROUTES.ADMIN_USERS, permission: 'usuarios:read' },
      { label: 'Roles', path: ROUTES.ADMIN_ROLES, permission: 'roles:read' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { hasPermission } = usePermissions()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Administracion'])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const toggleExpand = (label: string) => {
    if (collapsed) return
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  const canAccess = (permission?: string) => !permission || hasPermission(permission)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground',
        'transition-all duration-300 ease-in-out shadow-xl shadow-black/50',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
      style={{ borderRight: '1px solid rgba(212, 175, 55, 0.1)' }}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border px-4">
          <img
            src="/logo.png"
            alt="Distrito MKT"
            className={cn(
              'transition-all duration-300',
              collapsed ? 'h-8 w-8 object-contain' : 'h-10 w-auto'
            )}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {menuItems.map((item) => {
            if (!canAccess(item.permission)) return null

            const Icon = item.icon

            if (item.children) {
              const visibleChildren = item.children.filter((child) => canAccess(child.permission))
              if (visibleChildren.length === 0) return null

              const isExpanded = expandedItems.includes(item.label) && !collapsed
              const isChildActive = visibleChildren.some(
                (child) => location.pathname === child.path
              )

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                      'sidebar-item w-full cursor-pointer',
                      collapsed ? 'justify-center px-0' : 'justify-between',
                      isChildActive && 'bg-sidebar-active'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </span>
                    {!collapsed && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    )}
                  </button>

                  {/* Submenu */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200',
                      isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                      {visibleChildren.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            cn('sidebar-item text-sm', isActive && 'active')
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path!}
                className={({ isActive }) =>
                  cn('sidebar-item', collapsed && 'justify-center px-0', isActive && 'active')
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
          <button
            onClick={onToggle}
            className={cn(
              'sidebar-item w-full cursor-pointer',
              collapsed ? 'justify-center px-0' : ''
            )}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={cn(
              'sidebar-item w-full cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-300',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar sesion</AlertDialogTitle>
            <AlertDialogDescription>
              Estas seguro que deseas cerrar tu sesion?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                logout()
                navigate(ROUTES.LOGIN)
              }}
            >
              Cerrar Sesion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

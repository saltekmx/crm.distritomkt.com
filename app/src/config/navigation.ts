import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path?: string
  icon: LucideIcon
  permission?: string
  children?: Omit<NavItem, 'icon' | 'children'>[]
}

export const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Clientes',
    path: '/clientes',
    icon: Users,
    permission: 'clients:read',
  },
  {
    label: 'Proyectos',
    path: '/proyectos',
    icon: FolderKanban,
    permission: 'projects:read',
  },
  {
    label: 'Cotizaciones',
    path: '/cotizaciones',
    icon: FileText,
    permission: 'quotes:read',
  },
  {
    label: 'Administración',
    icon: Settings,
    children: [
      {
        label: 'Usuarios',
        path: '/admin/usuarios',
        permission: 'users:read',
      },
    ],
  },
]

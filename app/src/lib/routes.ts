export const ROUTES = {
  LOGIN: '/iniciar-sesion',
  AUTH_CALLBACK: '/auth/callback',
  HOME: '/',
  CLIENTS: '/clientes',
  CLIENTS_NEW: '/clientes/nuevo',
  CLIENTS_EDIT: (id: string) => `/clientes/${id}`,
  PROJECTS: '/proyectos',
  QUOTES: '/cotizaciones',
  ADMIN_USERS: '/admin/usuarios',
  ADMIN_USERS_NEW: '/admin/usuarios/nuevo',
  ADMIN_USERS_EDIT: (id: string) => `/admin/usuarios/${id}`,
  PROFILE: '/perfil',
} as const

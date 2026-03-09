import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { getApiErrorMessage, shouldShowToast } from '@/lib/api-error'

// VITE_API_URL     → Axios base (goes through Vite proxy in dev)
// VITE_API_PUBLIC_URL → Direct URL for OAuth redirects (browser navigates)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`
const API_PUBLIC = import.meta.env.VITE_API_PUBLIC_URL
  ? `${import.meta.env.VITE_API_PUBLIC_URL}/api/v1`
  : API_BASE

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track if we're already refreshing to avoid multiple simultaneous refreshes
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

// Request interceptor — add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// Response interceptor — handle errors globally with auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 401 → try to refresh token before giving up
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        // No refresh token — force logout
        forceLogout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token: newRefreshToken } = res.data

        // Update stored tokens
        localStorage.setItem('token', access_token)
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken)
        }

        // Update zustand store (if available)
        try {
          const stored = localStorage.getItem('auth-storage')
          if (stored) {
            const parsed = JSON.parse(stored)
            parsed.state.token = access_token
            parsed.state.refreshToken = newRefreshToken || refreshToken
            localStorage.setItem('auth-storage', JSON.stringify(parsed))
          }
        } catch {
          // ignore store sync errors
        }

        isRefreshing = false
        onRefreshed(access_token)

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch {
        isRefreshing = false
        refreshSubscribers = []
        forceLogout()
        return Promise.reject(error)
      }
    }

    // 4xx/5xx → show toast only if backend says so
    if (status && status >= 400 && shouldShowToast(error)) {
      toast.error(getApiErrorMessage(error))
    }

    return Promise.reject(error)
  }
)

function forceLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_refresh_token')
  localStorage.removeItem('auth-storage')
  window.location.href = '/iniciar-sesion'
}

// Auth endpoints — matches /api/v1/auth/*
export const authApi = {
  /** Returns the full URL for Google OAuth redirect (browser navigates directly) */
  getGoogleAuthUrl: () => {
    const redirect = encodeURIComponent(window.location.origin)
    return `${API_PUBLIC}/auth/google?redirect_uri=${redirect}`
  },
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
}

// Users endpoints — matches /api/v1/usuarios/*
export interface UserCreateData {
  email: string
  nombre: string
  telefono?: string
  codigo_telefono?: string
  permisos: string[]
}

export interface UserUpdateData {
  nombre?: string
  telefono?: string
  puesto?: string
  permisos?: string[]
  [key: string]: unknown
}

export const usersApi = {
  list: () => api.get('/usuarios'),
  create: (data: UserCreateData) =>
    api.post('/usuarios', data),
  update: (id: number, data: UserUpdateData) =>
    api.patch(`/usuarios/${id}`, data),
  impersonate: (id: number) =>
    api.post(`/usuarios/${id}/impersonate`),
}

// Clients endpoints — matches /api/v1/clientes/*
export interface ClientsListParams {
  buscar?: string
  offset?: number
  limit?: number
}

export interface ClientCreateData {
  nombre: string
  razon_social?: string
  rfc?: string
  regimen_fiscal?: string
  industria?: string
  notas?: string
  // Address
  calle?: string
  numero_exterior?: string
  numero_interior?: string
  colonia?: string
  codigo_postal?: string
  ciudad?: string
  estado?: string
  // Billing
  dias_pago?: number
  portal_facturas?: string
  requiere_oc?: boolean
  notas_facturacion?: string
}

export interface ClientUpdateData extends Partial<ClientCreateData> {
  [key: string]: unknown
}

export const clientsApi = {
  list: (params?: ClientsListParams) =>
    api.get('/clientes', { params }),
  get: (id: number | string) =>
    api.get(`/clientes/${id}`),
  create: (data: ClientCreateData) =>
    api.post('/clientes', data),
  update: (id: number | string, data: ClientUpdateData) =>
    api.patch(`/clientes/${id}`, data),
  delete: (id: number | string) =>
    api.delete(`/clientes/${id}`),
}

// Contacts endpoints — matches /api/v1/clientes/:id/contactos/*
export interface ContactCreateData {
  nombre: string
  email?: string
  telefono?: string
  cargo?: string
  fecha_cumpleanos?: string
}

export interface ContactUpdateData extends Partial<ContactCreateData> {
  [key: string]: unknown
}

export const contactsApi = {
  list: (clientId: number | string) =>
    api.get(`/clientes/${clientId}/contactos`),
  create: (clientId: number | string, data: ContactCreateData) =>
    api.post(`/clientes/${clientId}/contactos`, data),
  update: (clientId: number | string, contactId: number | string, data: ContactUpdateData) =>
    api.patch(`/clientes/${clientId}/contactos/${contactId}`, data),
  delete: (clientId: number | string, contactId: number | string) =>
    api.delete(`/clientes/${clientId}/contactos/${contactId}`),
}

// Projects endpoints — matches /api/v1/proyectos/*
export interface ProjectsListParams {
  buscar?: string
  offset?: number
  limit?: number
  tipo?: string
  status_operativo?: string
  status_administrativo?: string
  cliente_id?: number
  responsable_id?: number
  urgencia?: string
}

export interface ProjectCreateData {
  cliente_id: number
  nombre: string
  tipo: string
  urgencia?: string
  fecha_inicio?: string
  fecha_entrega?: string
  responsable_id?: number
  notas?: string
}

export interface ProjectUpdateData extends Partial<ProjectCreateData> {
  [key: string]: unknown
}

export const projectsApi = {
  list: (params?: ProjectsListParams) =>
    api.get('/proyectos', { params }),
  get: (id: number | string) =>
    api.get(`/proyectos/${id}`),
  create: (data: ProjectCreateData) =>
    api.post('/proyectos', data),
  update: (id: number | string, data: ProjectUpdateData) =>
    api.patch(`/proyectos/${id}`, data),
  delete: (id: number | string) =>
    api.delete(`/proyectos/${id}`),
  tipos: () =>
    api.get('/proyectos/tipos'),
  changeStatus: (id: number | string, nuevoEstado: string) =>
    api.patch(`/proyectos/${id}/estado`, { nuevo_estado: nuevoEstado }),
  changeAdminStatus: (id: number | string, nuevoEstado: string) =>
    api.patch(`/proyectos/${id}/estado-admin`, { nuevo_estado: nuevoEstado }),
  timeline: (id: number | string, params?: { offset?: number; limit?: number }) =>
    api.get(`/proyectos/${id}/historial`, { params }),
}

// AI endpoints — matches /api/v1/ai/*
export interface AiConversation {
  id: number
  titulo: string
  modelo: string
  archivada: boolean
  creado_en: string
  actualizado_en: string
}

export interface AiMessageFile {
  nombre: string
  tipo: 'image' | 'pdf' | 'file'
  mime: string
  tamano: number
  key: string
  url: string
}

export interface AiMessage {
  id: number
  rol: string
  contenido: string
  acciones?: Array<{
    label: string
    type: string
    payload: Record<string, unknown>
    variant: string
    icon?: string
  }>
  archivos?: AiMessageFile[]
  creado_en: string
}

export interface AiConversationWithMessages extends AiConversation {
  mensajes: AiMessage[]
}

export interface AiAvailableModel {
  id: string
  nombre: string
  descripcion: string
  precio_input: string
  precio_output: string
}

export interface AiFileInfo {
  id: string
  nombre: string
  tipo: 'image' | 'pdf' | 'file'
  mime: string
  tamano: number
  key: string
  url: string  // presigned URL
}

export const aiApi = {
  models: () =>
    api.get<AiAvailableModel[]>('/ai/models'),
  listConversations: (includeArchived = false) =>
    api.get<AiConversation[]>('/ai/conversations', { params: { include_archived: includeArchived } }),
  createConversation: (data: { titulo?: string; modelo?: string }) =>
    api.post<AiConversation>('/ai/conversations', data),
  getConversation: (id: number) =>
    api.get<AiConversationWithMessages>(`/ai/conversations/${id}`),
  updateConversation: (id: number, data: { titulo?: string; modelo?: string; archivada?: boolean }) =>
    api.patch<AiConversation>(`/ai/conversations/${id}`, data),
  deleteConversation: (id: number) =>
    api.delete(`/ai/conversations/${id}`),
  uploadFiles: (files: File[]) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return api.post<AiFileInfo[]>('/ai/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  /** Send a chat message — returns an SSE stream (use fetch, not axios) */
  chatStreamUrl: `${API_BASE}/ai/chat`,
}

// RBAC endpoints — matches /api/v1/roles/* and /api/v1/permisos/*
export interface RbacPermission {
  id: number
  slug: string
  modulo: string
  accion: string
  etiqueta: string
  descripcion: string
}

export interface RbacRole {
  id: number
  nombre: string
  slug: string
  descripcion: string
  es_sistema: boolean
  permisos: RbacPermission[]
  creado_en: string
}

export const rbacApi = {
  // Permissions
  listPermissions: () => api.get<RbacPermission[]>('/roles/permisos'),

  // Roles
  listRoles: () => api.get<RbacRole[]>('/roles'),
  getRole: (id: number) => api.get<RbacRole>(`/roles/${id}`),
  createRole: (data: { nombre: string; descripcion?: string; permisos?: number[] }) =>
    api.post<RbacRole>('/roles', data),
  updateRole: (id: number, data: { nombre?: string; descripcion?: string; permisos?: number[] }) =>
    api.patch<RbacRole>(`/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/roles/${id}`),

  // User roles
  getUserRoles: (userId: number) => api.get<RbacRole[]>(`/roles/usuario/${userId}`),
  setUserRoles: (userId: number, roleIds: number[]) =>
    api.put<RbacRole[]>(`/roles/usuario/${userId}`, { role_ids: roleIds }),
}

export default api

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

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    // 401 → session expired, redirect to login
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('admin_token')
      localStorage.removeItem('auth-storage')
      window.location.href = '/iniciar-sesion'
      return Promise.reject(error)
    }

    // 4xx/5xx → show toast only if backend says so
    if (status && status >= 400 && shouldShowToast(error)) {
      toast.error(getApiErrorMessage(error))
    }

    return Promise.reject(error)
  }
)

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
  update: (id: string, data: UserUpdateData) =>
    api.patch(`/usuarios/${id}`, data),
  impersonate: (id: string) =>
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
  direccion_fiscal?: string
  industria?: string
  notas?: string
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
  get: (id: string) =>
    api.get(`/clientes/${id}`),
  create: (data: ClientCreateData) =>
    api.post('/clientes', data),
  update: (id: string, data: ClientUpdateData) =>
    api.patch(`/clientes/${id}`, data),
  delete: (id: string) =>
    api.delete(`/clientes/${id}`),
}

// Contacts endpoints — matches /api/v1/clientes/:id/contactos/*
export interface ContactCreateData {
  nombre: string
  email?: string
  telefono?: string
  cargo?: string
}

export interface ContactUpdateData extends Partial<ContactCreateData> {
  [key: string]: unknown
}

export const contactsApi = {
  list: (clientId: string) =>
    api.get(`/clientes/${clientId}/contactos`),
  create: (clientId: string, data: ContactCreateData) =>
    api.post(`/clientes/${clientId}/contactos`, data),
  update: (clientId: string, contactId: string, data: ContactUpdateData) =>
    api.patch(`/clientes/${clientId}/contactos/${contactId}`, data),
  delete: (clientId: string, contactId: string) =>
    api.delete(`/clientes/${clientId}/contactos/${contactId}`),
}

export default api

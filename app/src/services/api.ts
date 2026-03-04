import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

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

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/iniciar-sesion'
    }
    return Promise.reject(error)
  }
)

// Auth endpoints
export const authApi = {
  getGoogleAuthUrl: () => {
    const redirect = encodeURIComponent(window.location.origin)
    return `${API_PUBLIC}/auth/google?redirect_uri=${redirect}`
  },
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// Users endpoints
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: { email: string; name: string; role?: string }) =>
    api.post('/users', data),
  changeRole: (id: string, role: string) =>
    api.patch(`/users/${id}/role`, { role }),
}

export default api

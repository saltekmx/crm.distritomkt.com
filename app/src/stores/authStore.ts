import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/services/api'

export interface AuthUser {
  id: number
  email: string
  name: string
  avatar: string | null
  position: string | null
  timezone: string
  isActive: boolean
  permissions: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  setToken: (token: string, refreshToken?: string) => void
  fetchUser: () => Promise<void>
  logout: () => void
  clearError: () => void
  startImpersonation: (newToken: string, newRefreshToken?: string) => Promise<void>
  stopImpersonation: () => Promise<void>
  isImpersonating: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setToken: (token: string, refreshToken?: string) => {
        localStorage.setItem('token', token)
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken)
        }
        set({ token, refreshToken: refreshToken ?? get().refreshToken, isAuthenticated: true })
      },

      fetchUser: async () => {
        const { token } = get()
        if (!token) {
          set({ isAuthenticated: false, user: null, isLoading: false })
          return
        }

        set({ isLoading: true, error: null })
        try {
          const response = await authApi.me()
          const data = response.data

          set({
            user: {
              id: data.id,
              email: data.email,
              name: data.nombre,
              avatar: data.avatar_url,
              position: data.puesto,
              timezone: data.zona_horaria ?? 'America/Mexico_City',
              isActive: data.activo,
              permissions: data.permisos ?? [],
            },
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired',
          })
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_refresh_token')
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),

      startImpersonation: async (newToken: string, newRefreshToken?: string) => {
        const { token, refreshToken } = get()
        if (token) {
          localStorage.setItem('admin_token', token)
        }
        if (refreshToken) {
          localStorage.setItem('admin_refresh_token', refreshToken)
        }
        localStorage.setItem('token', newToken)
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken)
        }
        set({ token: newToken, refreshToken: newRefreshToken ?? null, isAuthenticated: true, isLoading: true })
        try {
          const response = await authApi.me()
          const data = response.data
          set({
            user: {
              id: data.id,
              email: data.email,
              name: data.nombre,
              avatar: data.avatar_url,
              position: data.puesto,
              timezone: data.zona_horaria ?? 'America/Mexico_City',
              isActive: data.activo,
              permissions: data.permisos ?? [],
            },
            isLoading: false,
          })
        } catch {
          const adminToken = localStorage.getItem('admin_token')
          const adminRefreshToken = localStorage.getItem('admin_refresh_token')
          if (adminToken) {
            localStorage.setItem('token', adminToken)
            localStorage.removeItem('admin_token')
            if (adminRefreshToken) {
              localStorage.setItem('refresh_token', adminRefreshToken)
              localStorage.removeItem('admin_refresh_token')
            }
            set({ token: adminToken, refreshToken: adminRefreshToken })
          }
          set({ isLoading: false })
        }
      },

      stopImpersonation: async () => {
        const adminToken = localStorage.getItem('admin_token')
        const adminRefreshToken = localStorage.getItem('admin_refresh_token')
        if (!adminToken) return
        localStorage.setItem('token', adminToken)
        localStorage.removeItem('admin_token')
        if (adminRefreshToken) {
          localStorage.setItem('refresh_token', adminRefreshToken)
          localStorage.removeItem('admin_refresh_token')
        }
        set({ token: adminToken, refreshToken: adminRefreshToken, isAuthenticated: true, isLoading: true })
        try {
          const response = await authApi.me()
          const data = response.data
          set({
            user: {
              id: data.id,
              email: data.email,
              name: data.nombre,
              avatar: data.avatar_url,
              position: data.puesto,
              timezone: data.zona_horaria ?? 'America/Mexico_City',
              isActive: data.activo,
              permissions: data.permisos ?? [],
            },
            isLoading: false,
          })
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_refresh_token')
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false })
        }
      },

      isImpersonating: () => Boolean(localStorage.getItem('admin_token')),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.token && !state.user) {
          state.isLoading = true
        } else if (state && !state.token) {
          state.isLoading = false
        }
      },
    }
  )
)

export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)

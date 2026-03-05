import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/services/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar: string | null
  position: string | null
  isActive: boolean
  permissions: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  setToken: (token: string) => void
  fetchUser: () => Promise<void>
  logout: () => void
  clearError: () => void
  startImpersonation: (newToken: string) => Promise<void>
  stopImpersonation: () => Promise<void>
  isImpersonating: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setToken: (token: string) => {
        localStorage.setItem('token', token)
        set({ token, isAuthenticated: true })
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
              isActive: data.activo,
              permissions: data.permisos ?? [],
            },
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          localStorage.removeItem('token')
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired',
          })
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('admin_token')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),

      startImpersonation: async (newToken: string) => {
        const { token } = get()
        if (token) {
          localStorage.setItem('admin_token', token)
        }
        localStorage.setItem('token', newToken)
        set({ token: newToken, isAuthenticated: true, isLoading: true })
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
              isActive: data.activo,
              permissions: data.permisos ?? [],
            },
            isLoading: false,
          })
        } catch {
          const adminToken = localStorage.getItem('admin_token')
          if (adminToken) {
            localStorage.setItem('token', adminToken)
            localStorage.removeItem('admin_token')
            set({ token: adminToken })
          }
          set({ isLoading: false })
        }
      },

      stopImpersonation: async () => {
        const adminToken = localStorage.getItem('admin_token')
        if (!adminToken) return
        localStorage.setItem('token', adminToken)
        localStorage.removeItem('admin_token')
        set({ token: adminToken, isAuthenticated: true, isLoading: true })
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
              isActive: data.activo,
              permissions: data.permisos ?? [],
            },
            isLoading: false,
          })
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('admin_token')
          set({ user: null, token: null, isAuthenticated: false, isLoading: false })
        }
      },

      isImpersonating: () => Boolean(localStorage.getItem('admin_token')),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
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

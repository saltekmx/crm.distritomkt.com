import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/services/api'

export interface AuthUser {
  id: number
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
              name: data.name,
              avatar: data.avatar,
              position: data.position,
              isActive: true,
              permissions: data.permissions,
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
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),
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

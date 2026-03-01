import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/services/api'

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    setToken,
    fetchUser,
    logout,
    clearError,
  } = useAuthStore()

  useEffect(() => {
    if (token && !user) {
      fetchUser()
    } else if (!token && isLoading) {
      useAuthStore.setState({ isLoading: false })
    }
  }, [token, user, isLoading, fetchUser])

  const loginWithGoogle = useCallback(() => {
    window.location.href = authApi.getGoogleAuthUrl()
  }, [])

  const handleAuthCallback = useCallback(
    async (callbackToken: string) => {
      setToken(callbackToken)
      await fetchUser()
    },
    [setToken, fetchUser]
  )

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    loginWithGoogle,
    handleAuthCallback,
    logout,
    clearError,
  }
}

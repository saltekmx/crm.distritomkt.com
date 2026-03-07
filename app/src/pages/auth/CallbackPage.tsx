import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/routes'

export default function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleAuthCallback } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    const refreshToken = searchParams.get('refresh_token')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      navigate(`${ROUTES.LOGIN}?error=${encodeURIComponent(errorParam)}`, { replace: true })
      return
    }

    if (!token) {
      navigate(`${ROUTES.LOGIN}?error=auth_failed`, { replace: true })
      return
    }

    handleAuthCallback(token, refreshToken ?? undefined)
      .then(() => {
        navigate(ROUTES.HOME, { replace: true })
      })
      .catch(() => {
        navigate(`${ROUTES.LOGIN}?error=auth_failed`, { replace: true })
      })
  }, [searchParams, handleAuthCallback, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">
        Procesando autenticación...
      </div>
    </div>
  )
}

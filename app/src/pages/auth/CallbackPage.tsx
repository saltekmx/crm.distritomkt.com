import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/routes'

export default function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleAuthCallback } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      return
    }

    if (!token) {
      setError('No se recibió token de autenticación')
      return
    }

    handleAuthCallback(token)
      .then(() => {
        navigate(ROUTES.HOME, { replace: true })
      })
      .catch(() => {
        setError('Error al procesar la autenticación')
      })
  }, [searchParams, handleAuthCallback, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <p className="font-medium text-destructive">Error de autenticación</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
            className="text-sm text-primary hover:underline"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">
        Procesando autenticación...
      </div>
    </div>
  )
}

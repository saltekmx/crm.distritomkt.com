import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'
import { api } from '@/services/api'

const DEV_MODE = import.meta.env.DEV

const TEST_USERS = [
  { id: 1, email: 'roberto.salas@distritomkt.com', name: 'Roberto Salas' },
  { id: 2, email: 'carlos.martinez@distritomkt.com', name: 'Carlos Martínez' },
  { id: 3, email: 'ana.garcia@distritomkt.com', name: 'Ana García' },
  { id: 4, email: 'pedro.lopez@distritomkt.com', name: 'Pedro López' },
  { id: 5, email: 'maria.rodriguez@distritomkt.com', name: 'María Rodríguez' },
  { id: 6, email: 'jorge.hernandez@distritomkt.com', name: 'Jorge Hernández' },
  { id: 7, email: 'laura.sanchez@distritomkt.com', name: 'Laura Sánchez' },
  { id: 8, email: 'diego.torres@distritomkt.com', name: 'Diego Torres' },
  { id: 9, email: 'sofia.ramirez@distritomkt.com', name: 'Sofía Ramírez' },
  { id: 10, email: 'fernando.diaz@distritomkt.com', name: 'Fernando Díaz' },
  { id: 11, email: 'valentina.moreno@distritomkt.com', name: 'Valentina Moreno' },
]

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Error de autenticación. Intenta de nuevo.',
  invalid_domain: 'Solo se permiten cuentas @distritomkt.com',
  unauthorized_domain: 'Solo se permiten cuentas @distritomkt.com',
  account_disabled: 'Tu cuenta está deshabilitada. Contacta al administrador.',
  default: 'Ocurrió un error. Intenta de nuevo.',
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated, loginWithGoogle, handleAuthCallback } = useAuth()
  const [devLoading, setDevLoading] = useState<string | null>(null)

  const errorCode = searchParams.get('error')
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default
    : null

  const handleDevLogin = async (email: string) => {
    try {
      setDevLoading(email)
      const { data } = await api.get(`/auth/test-token?email=${encodeURIComponent(email)}`)
      await handleAuthCallback(data.token)
    } catch {
      console.error('Dev login error')
      setDevLoading(null)
    }
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Decorative gold pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(212, 175, 55, 0.1) 0%, transparent 50%)`,
        }}
      />

      <Card className="relative w-full max-w-md border border-border bg-card shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto">
            <img
              src="/logo.png"
              alt="Distrito MKT"
              className="h-20 w-auto mx-auto"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={loginWithGoogle}
              variant="outline"
              className="w-full h-12 gap-3 cursor-pointer border! border-primary/30! bg-card text-foreground hover:bg-muted hover:text-foreground hover:border-primary/50!"
            >
              <GoogleIcon />
              Continuar con Google
            </Button>
          </div>

          {/* Dev login buttons */}
          {DEV_MODE && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">
                🔧 Desarrollo - Login rápido
              </p>
              <div className="grid grid-cols-2 gap-1">
                {TEST_USERS.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleDevLogin(user.email)}
                    disabled={devLoading !== null}
                  >
                    {devLoading === user.email ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <span className="truncate">{user.name}</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground pt-2">
            &copy; {new Date().getFullYear()} Distrito MKT
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

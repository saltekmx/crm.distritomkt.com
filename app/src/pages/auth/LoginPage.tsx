import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROUTES } from '@/lib/routes'

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
  const { isAuthenticated, loginWithGoogle } = useAuth()

  const errorCode = searchParams.get('error')
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default
    : null

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

          <p className="text-center text-xs text-muted-foreground pt-2">
            &copy; {new Date().getFullYear()} Distrito MKT
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-primary">404</p>
        <p className="text-lg text-foreground">Página no encontrada</p>
        <p className="text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <Button
          onClick={() => navigate(ROUTES.HOME)}
          className="cursor-pointer"
        >
          Ir al inicio
        </Button>
      </div>
    </div>
  )
}

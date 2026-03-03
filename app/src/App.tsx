import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LoginPage from '@/pages/auth/LoginPage'
import CallbackPage from '@/pages/auth/CallbackPage'
import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/iniciar-sesion" element={<LoginPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="mt-2 text-muted-foreground">Bienvenido a DistritoMKT CRM</p>
              </div>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute permission="clients:read">
                <div>
                  <h1 className="text-2xl font-bold">Clientes</h1>
                  <p className="mt-2 text-muted-foreground">Directorio de clientes</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos"
            element={
              <ProtectedRoute permission="projects:read">
                <div>
                  <h1 className="text-2xl font-bold">Proyectos</h1>
                  <p className="mt-2 text-muted-foreground">Registro de proyectos</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones"
            element={
              <ProtectedRoute permission="quotes:read">
                <div>
                  <h1 className="text-2xl font-bold">Cotizaciones</h1>
                  <p className="mt-2 text-muted-foreground">Gestión de cotizaciones</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute permission="users:read">
                <div>
                  <h1 className="text-2xl font-bold">Usuarios</h1>
                  <p className="mt-2 text-muted-foreground">Administración de usuarios</p>
                </div>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  )
}

export default App

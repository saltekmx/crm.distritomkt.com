import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LoginPage from '@/pages/auth/LoginPage'
import CallbackPage from '@/pages/auth/CallbackPage'
import NotFoundPage from '@/pages/NotFoundPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/admin/UsersPage'
import UserFormPage from '@/pages/admin/UserFormPage'
import ClientsPage from '@/pages/clients/ClientsPage'
import ClientFormPage from '@/pages/clients/ClientFormPage'
import ClientDetailPage from '@/pages/clients/ClientDetailPage'
import ProjectsPage from '@/pages/projects/ProjectsPage'
import ProjectFormPage from '@/pages/projects/ProjectFormPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'
import MediaPage from '@/pages/MediaPage'
import ProfilePage from '@/pages/ProfilePage'
import RolesPage from '@/pages/admin/RolesPage'
import RoleFormPage from '@/pages/admin/RoleFormPage'
import { lazy, Suspense } from 'react'

const StudioPage = lazy(() => import('@/pages/studio/StudioPage'))

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
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute permission="clientes:read">
                <ClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/nuevo"
            element={
              <ProtectedRoute permission="clientes:write">
                <ClientFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes/:id"
            element={
              <ProtectedRoute permission="clientes:read">
                <ClientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos"
            element={
              <ProtectedRoute permission="proyectos:read">
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos/nuevo"
            element={
              <ProtectedRoute permission="proyectos:write">
                <ProjectFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos/:id"
            element={
              <ProtectedRoute permission="proyectos:read">
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos/:id/editar"
            element={
              <ProtectedRoute permission="proyectos:write">
                <ProjectFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/media" element={<MediaPage />} />
          <Route
            path="/cotizaciones"
            element={
              <ProtectedRoute permission="cotizaciones:read">
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
              <ProtectedRoute permission="usuarios:read">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios/nuevo"
            element={
              <ProtectedRoute permission="usuarios:read">
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios/:id"
            element={
              <ProtectedRoute permission="usuarios:read">
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute permission="roles:read">
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles/nuevo"
            element={
              <ProtectedRoute permission="roles:write">
                <RoleFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles/:id"
            element={
              <ProtectedRoute permission="roles:write">
                <RoleFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>

        {/* Studio — standalone full-screen (outside MainLayout) */}
        <Route
          path="/proyectos/:id/estudio"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="h-screen flex items-center justify-center bg-zinc-950"><div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>}>
                <StudioPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="bottom-right" richColors closeButton />
    </BrowserRouter>
  )
}

export default App

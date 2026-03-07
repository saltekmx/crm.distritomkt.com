import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Plus, MoreHorizontal, Pencil, Trash2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { rbacApi, type RbacRole } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function RolesPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await rbacApi.listRoles()
      setRoles(res.data)
    } catch {
      toast.error('Error al cargar roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const handleDelete = async (id: number) => {
    try {
      await rbacApi.deleteRole(id)
      setConfirmDeleteId(null)
      fetchRoles()
      toast.success('Rol eliminado')
    } catch {
      // toast handled by interceptor
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'Admin' }, { label: 'Roles' }]}
        title="Roles y Permisos"
        subtitle={loading ? undefined : `${roles.length} rol${roles.length !== 1 ? 'es' : ''}`}
        icon={<Shield className="h-5 w-5" />}
        actions={
          <Button className="gap-2" onClick={() => navigate(ROUTES.ADMIN_ROLES_NEW)}>
            <Plus className="h-4 w-4" />
            Nuevo Rol
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-modern p-5 space-y-3">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                <div className="flex gap-1.5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                  ))}
                </div>
              </div>
            ))
          : roles.map((role) => (
              <div
                key={role.id}
                className="card-modern p-5 space-y-3 hover:border-primary/20 transition-colors cursor-pointer"
                onClick={() => navigate(ROUTES.ADMIN_ROLES_EDIT(role.id), { state: role })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">{role.nombre}</h3>
                    {role.es_sistema && (
                      <Lock className="h-3 w-3 text-muted-foreground" title="Rol del sistema" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(ROUTES.ADMIN_ROLES_EDIT(role.id), { state: role })
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {!role.es_sistema && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteId(role.id)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {role.descripcion && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{role.descripcion}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {role.permisos.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sin permisos</span>
                  ) : (
                    <>
                      {/* Group by module */}
                      {[...new Set(role.permisos.map((p) => p.modulo))].map((mod) => {
                        const count = role.permisos.filter((p) => p.modulo === mod).length
                        const total = role.permisos.length
                        return (
                          <span
                            key={mod}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary"
                          >
                            {mod}
                            {count < total && (
                              <span className="ml-1 opacity-60">{count}</span>
                            )}
                          </span>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Eliminar rol</h3>
            <p className="text-sm text-muted-foreground">
              Los usuarios con este rol perderan los permisos asociados. Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

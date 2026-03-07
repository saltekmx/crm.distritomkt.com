import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Shield, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { rbacApi, type RbacPermission, type RbacRole } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export default function RoleFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const roleFromState = location.state as RbacRole | null

  const [allPermissions, setAllPermissions] = useState<RbacPermission[]>([])
  const [nombre, setNombre] = useState(roleFromState?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(roleFromState?.descripcion ?? '')
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(
    new Set(roleFromState?.permisos?.map((p) => p.id) ?? [])
  )
  const [isSystem, setIsSystem] = useState(roleFromState?.es_sistema ?? false)
  const [loading, setLoading] = useState(!roleFromState && isEdit)
  const [submitting, setSubmitting] = useState(false)

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await rbacApi.listPermissions()
      setAllPermissions(res.data)
    } catch {
      toast.error('Error al cargar permisos')
    }
  }, [])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  useEffect(() => {
    if (!isEdit || roleFromState) return
    setLoading(true)
    rbacApi.getRole(Number(id))
      .then((res) => {
        const role = res.data
        setNombre(role.nombre)
        setDescripcion(role.descripcion)
        setSelectedPermIds(new Set(role.permisos.map((p) => p.id)))
        setIsSystem(role.es_sistema)
      })
      .catch(() => {
        toast.error('Rol no encontrado')
        navigate(ROUTES.ADMIN_ROLES)
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, roleFromState, navigate])

  // Group permissions by module
  const modules = allPermissions.reduce<Record<string, RbacPermission[]>>((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = []
    acc[p.modulo].push(p)
    return acc
  }, {})

  const togglePermission = (permId: number) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  const toggleModule = (moduleName: string) => {
    const modulePerms = modules[moduleName] ?? []
    const allSelected = modulePerms.every((p) => selectedPermIds.has(p.id))
    setSelectedPermIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p.id))
      } else {
        modulePerms.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedPermIds(new Set(allPermissions.map((p) => p.id)))
  }

  const clearAll = () => {
    setSelectedPermIds(new Set())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSubmitting(true)
    try {
      const permIds = [...selectedPermIds]
      if (isEdit && id) {
        await rbacApi.updateRole(Number(id), {
          nombre,
          descripcion,
          permisos: permIds,
        })
        toast.success('Rol actualizado')
      } else {
        await rbacApi.createRole({ nombre, descripcion, permisos: permIds })
        toast.success('Rol creado')
      }
      navigate(ROUTES.ADMIN_ROLES)
    } catch {
      // toast handled by interceptor
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const MODULE_LABELS: Record<string, string> = {
    usuarios: 'Usuarios',
    clientes: 'Clientes',
    proyectos: 'Proyectos',
    cotizaciones: 'Cotizaciones',
    media: 'Media',
    ai: 'AI Chat',
    roles: 'Roles',
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Roles', href: ROUTES.ADMIN_ROLES },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
        title={isEdit ? `Editar Rol${isSystem ? ' (Sistema)' : ''}` : 'Nuevo Rol'}
        icon={<Shield className="h-5 w-5" />}
      />

      <form onSubmit={handleSubmit}>
        <div className="card-modern">
          {/* Basic fields */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del rol</Label>
              <Input
                id="nombre"
                placeholder="Ej. Editor de contenido"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus={!isEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Input
                id="descripcion"
                placeholder="Breve descripcion del rol..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>

          {/* Permissions matrix */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold">Permisos</h3>
                <span className="text-xs text-muted-foreground">
                  ({selectedPermIds.size} de {allPermissions.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Todos
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:underline cursor-pointer"
                >
                  Ninguno
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(modules).map(([moduleName, perms]) => {
                const allSelected = perms.every((p) => selectedPermIds.has(p.id))
                const someSelected = perms.some((p) => selectedPermIds.has(p.id))

                return (
                  <div key={moduleName} className="rounded-lg border border-border/50 overflow-hidden">
                    {/* Module header */}
                    <label className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border/30 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={() => toggleModule(moduleName)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-sm font-medium">
                        {MODULE_LABELS[moduleName] ?? moduleName}
                      </span>
                      {allSelected && (
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Todos
                        </span>
                      )}
                    </label>

                    {/* Individual permissions */}
                    <div className="p-3 space-y-1.5">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-3 cursor-pointer py-1 hover:bg-muted/20 rounded px-1 -mx-1 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermIds.has(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm text-foreground/80">{perm.etiqueta}</span>
                            <code className="text-[10px] text-muted-foreground font-mono truncate">{perm.slug}</code>
                          </div>
                          <span className={cn(
                            'ml-auto text-[10px] font-medium uppercase tracking-wider shrink-0',
                            perm.accion === 'read' ? 'text-blue-500' :
                            perm.accion === 'write' ? 'text-amber-500' :
                            'text-red-500'
                          )}>
                            {perm.accion}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border/30 p-5 px-6">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(ROUTES.ADMIN_ROLES)}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

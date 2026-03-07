import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, UserPen, Loader2, ArrowLeft, Shield, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { usersApi, rbacApi, type RbacRole } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { getInitials, cn } from '@/lib/utils'

const COUNTRY_CODES = [
  { code: '+52', country: 'MX', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: '+1', country: 'US', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: '+57', country: 'CO', flag: '\u{1F1E8}\u{1F1F4}' },
  { code: '+56', country: 'CL', flag: '\u{1F1E8}\u{1F1F1}' },
  { code: '+54', country: 'AR', flag: '\u{1F1E6}\u{1F1F7}' },
  { code: '+51', country: 'PE', flag: '\u{1F1F5}\u{1F1EA}' },
  { code: '+34', country: 'ES', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: '+55', country: 'BR', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: '+593', country: 'EC', flag: '\u{1F1EA}\u{1F1E8}' },
  { code: '+58', country: 'VE', flag: '\u{1F1FB}\u{1F1EA}' },
  { code: '+502', country: 'GT', flag: '\u{1F1EC}\u{1F1F9}' },
  { code: '+503', country: 'SV', flag: '\u{1F1F8}\u{1F1FB}' },
  { code: '+504', country: 'HN', flag: '\u{1F1ED}\u{1F1F3}' },
  { code: '+506', country: 'CR', flag: '\u{1F1E8}\u{1F1F7}' },
  { code: '+507', country: 'PA', flag: '\u{1F1F5}\u{1F1E6}' },
]

const userSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email invalido'),
  puesto: z.string().optional(),
  telefono: z.string().optional(),
  codigo_telefono: z.string().optional(),
  limite_almacenamiento_mb: z.coerce.number().min(1, 'Minimo 1 MB'),
  activo: z.boolean(),
})

type UserFormData = z.infer<typeof userSchema>

interface UserState {
  id: number
  email: string
  nombre: string
  avatar_url: string | null
  puesto: string | null
  telefono: string | null
  codigo_telefono: string | null
  limite_almacenamiento_mb: number
  activo: boolean
  permisos: string[]
  creado_en: string
}

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const userFromState = location.state as UserState | null

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userData, setUserData] = useState<UserState | null>(userFromState)

  // Roles
  const [allRoles, setAllRoles] = useState<RbacRole[]>([])
  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<number>>(new Set())
  const [showRolePicker, setShowRolePicker] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: userFromState?.nombre ?? '',
      email: userFromState?.email ?? '',
      puesto: userFromState?.puesto ?? '',
      telefono: userFromState?.telefono ?? '',
      codigo_telefono: userFromState?.codigo_telefono ?? '+52',
      limite_almacenamiento_mb: userFromState?.limite_almacenamiento_mb ?? 500,
      activo: userFromState?.activo ?? true,
    },
  })

  const activo = watch('activo')

  // Load all roles
  useEffect(() => {
    rbacApi.listRoles().then((res) => setAllRoles(res.data)).catch(() => {})
  }, [])

  // Load user's current roles
  useEffect(() => {
    if (!isEdit || !id) return
    rbacApi.getUserRoles(Number(id))
      .then((res) => setAssignedRoleIds(new Set(res.data.map((r) => r.id))))
      .catch(() => {})
  }, [isEdit, id])

  useEffect(() => {
    if (!isEdit || userFromState) return
    setLoading(true)
    usersApi
      .list()
      .then((res) => {
        const user = res.data.find((u: UserState) => u.id === Number(id))
        if (user) {
          setUserData(user)
          setValue('nombre', user.nombre)
          setValue('email', user.email)
          setValue('puesto', user.puesto ?? '')
          setValue('telefono', user.telefono ?? '')
          setValue('codigo_telefono', user.codigo_telefono ?? '+52')
          setValue('limite_almacenamiento_mb', user.limite_almacenamiento_mb ?? 500)
          setValue('activo', user.activo)
        } else {
          toast.error('Usuario no encontrado')
          navigate(ROUTES.ADMIN_USERS)
        }
      })
      .catch(() => navigate(ROUTES.ADMIN_USERS))
      .finally(() => setLoading(false))
  }, [id, isEdit, userFromState, setValue, navigate])

  const assignedRoles = allRoles.filter((r) => assignedRoleIds.has(r.id))
  const availableRoles = allRoles.filter((r) => !assignedRoleIds.has(r.id))

  const addRole = (roleId: number) => {
    setAssignedRoleIds((prev) => new Set([...prev, roleId]))
    setShowRolePicker(false)
  }

  const removeRole = (roleId: number) => {
    setAssignedRoleIds((prev) => {
      const next = new Set(prev)
      next.delete(roleId)
      return next
    })
  }

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await usersApi.update(Number(id), {
          nombre: data.nombre,
          email: data.email,
          puesto: data.puesto || undefined,
          telefono: data.telefono || undefined,
          codigo_telefono: data.codigo_telefono || undefined,
          limite_almacenamiento_mb: data.limite_almacenamiento_mb,
          activo: data.activo,
        })
        // Save roles
        await rbacApi.setUserRoles(Number(id), [...assignedRoleIds])
        toast.success('Usuario actualizado')
      } else {
        const res = await usersApi.create({
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono || undefined,
          codigo_telefono: data.codigo_telefono || undefined,
          permisos: [],
        })
        // Assign roles to new user
        if (assignedRoleIds.size > 0) {
          await rbacApi.setUserRoles(res.data.id, [...assignedRoleIds])
        }
        toast.success('Usuario creado')
      }
      navigate(ROUTES.ADMIN_USERS)
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

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Usuarios', href: ROUTES.ADMIN_USERS },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
        title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
        icon={isEdit ? <UserPen className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
      />

      <div className="card-modern">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Avatar header (edit mode) */}
          {isEdit && userData && (
            <div className="flex items-center gap-4 p-6 border-b border-border/30">
              <Avatar className="h-14 w-14 text-base">
                <AvatarImage src={userData.avatar_url ?? undefined} alt={userData.nombre} />
                <AvatarFallback className="text-base">{getInitials(userData.nombre)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{userData.nombre}</p>
                <p className="text-sm text-muted-foreground truncate">{userData.email}</p>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Switch
                  checked={activo}
                  onCheckedChange={(checked) => setValue('activo', checked, { shouldDirty: true })}
                />
                <span className={`text-sm font-medium ${activo ? 'text-green-600' : 'text-destructive'}`}>
                  {activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          )}

          {/* Basic fields */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ej. Juan Perez"
                autoFocus={!isEdit}
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@distritomkt.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="puesto">Puesto</Label>
              <Input
                id="puesto"
                placeholder="Ej. Director de Marketing"
                {...register('puesto')}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefono</Label>
              <div className="flex gap-2">
                <select
                  {...register('codigo_telefono')}
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0 w-[90px] [&>option]:bg-card [&>option]:text-foreground"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="55 1234 5678"
                  {...register('telefono')}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limite_almacenamiento_mb">Almacenamiento (MB)</Label>
              <Input
                id="limite_almacenamiento_mb"
                type="number"
                min={1}
                placeholder="500"
                {...register('limite_almacenamiento_mb')}
              />
              {errors.limite_almacenamiento_mb && (
                <p className="text-xs text-destructive">{errors.limite_almacenamiento_mb.message}</p>
              )}
            </div>
          </div>

          {/* Roles section */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Roles</h3>
              <span className="text-xs text-muted-foreground">
                ({assignedRoles.length} asignado{assignedRoles.length !== 1 ? 's' : ''})
              </span>
            </div>

            {/* Assigned roles as chips */}
            <div className="flex flex-wrap gap-2">
              {assignedRoles.map((role) => (
                <div
                  key={role.id}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-sm"
                >
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{role.nombre}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {role.permisos.length} permiso{role.permisos.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRole(role.id)}
                    className="ml-1 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add role button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRolePicker(!showRolePicker)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer',
                    showRolePicker && 'border-primary/30 text-foreground'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar rol
                </button>

                {/* Role picker dropdown */}
                {showRolePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowRolePicker(false)} />
                    <div className="absolute left-0 top-full z-50 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[220px] max-h-60 overflow-y-auto">
                      {availableRoles.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No hay roles disponibles</p>
                      ) : (
                        availableRoles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => addRole(role.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{role.nombre}</p>
                              {role.descripcion && (
                                <p className="text-xs text-muted-foreground truncate">{role.descripcion}</p>
                              )}
                            </div>
                            <span className="ml-auto text-xs text-muted-foreground shrink-0">
                              {role.permisos.length}p
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Effective permissions summary */}
            {assignedRoles.length > 0 && (
              <div className="rounded-lg border border-border/50 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Permisos efectivos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(assignedRoles.flatMap((r) => r.permisos.map((p) => p.modulo)))].map((mod) => {
                    const perms = [...new Set(
                      assignedRoles
                        .flatMap((r) => r.permisos)
                        .filter((p) => p.modulo === mod)
                        .map((p) => p.accion)
                    )]
                    return (
                      <span
                        key={mod}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">{mod}</span>
                        {perms.map((a) => (
                          <span
                            key={a}
                            className={cn(
                              'font-medium',
                              a === 'read' ? 'text-blue-500' :
                              a === 'write' ? 'text-amber-500' :
                              'text-red-500'
                            )}
                          >
                            {a[0].toUpperCase()}
                          </span>
                        ))}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border/30 p-5 px-6">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(ROUTES.ADMIN_USERS)}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

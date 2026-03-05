import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, UserPen, Loader2, ArrowLeft, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { usersApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { getInitials } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERMISSION_MODULES = [
  {
    module: 'usuarios',
    label: 'Usuarios',
    permissions: [
      { value: 'usuarios:read', label: 'Ver usuarios' },
      { value: 'usuarios:write', label: 'Crear/editar usuarios' },
      { value: 'usuarios:delete', label: 'Eliminar usuarios' },
      { value: 'usuarios.impersonate:write', label: 'Impersonar usuarios' },
    ],
  },
  {
    module: 'clientes',
    label: 'Clientes',
    permissions: [
      { value: 'clientes:read', label: 'Ver clientes' },
      { value: 'clientes:write', label: 'Crear/editar clientes' },
      { value: 'clientes:delete', label: 'Eliminar clientes' },
      { value: 'clientes.contactos:read', label: 'Ver contactos' },
      { value: 'clientes.contactos:write', label: 'Crear/editar contactos' },
      { value: 'clientes.contactos:delete', label: 'Eliminar contactos' },
    ],
  },
  {
    module: 'proyectos',
    label: 'Proyectos',
    permissions: [
      { value: 'proyectos:read', label: 'Ver proyectos' },
      { value: 'proyectos:write', label: 'Crear/editar proyectos' },
      { value: 'proyectos:delete', label: 'Eliminar proyectos' },
      { value: 'proyectos.estado:write', label: 'Cambiar estado operativo' },
      { value: 'proyectos.estado-admin:write', label: 'Cambiar estado administrativo' },
      { value: 'proyectos.mover:write', label: 'Mover en tablero' },
      { value: 'proyectos.checklist:read', label: 'Ver checklist' },
      { value: 'proyectos.checklist:write', label: 'Editar checklist' },
      { value: 'proyectos.historial:read', label: 'Ver historial' },
    ],
  },
  {
    module: 'cotizaciones',
    label: 'Cotizaciones',
    permissions: [
      { value: 'cotizaciones:read', label: 'Ver cotizaciones' },
      { value: 'cotizaciones:write', label: 'Crear/editar cotizaciones' },
      { value: 'cotizaciones:delete', label: 'Eliminar cotizaciones' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const COUNTRY_CODES = [
  { code: '+52', country: 'MX', flag: '🇲🇽' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+57', country: 'CO', flag: '🇨🇴' },
  { code: '+56', country: 'CL', flag: '🇨🇱' },
  { code: '+54', country: 'AR', flag: '🇦🇷' },
  { code: '+51', country: 'PE', flag: '🇵🇪' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+593', country: 'EC', flag: '🇪🇨' },
  { code: '+58', country: 'VE', flag: '🇻🇪' },
  { code: '+502', country: 'GT', flag: '🇬🇹' },
  { code: '+503', country: 'SV', flag: '🇸🇻' },
  { code: '+504', country: 'HN', flag: '🇭🇳' },
  { code: '+506', country: 'CR', flag: '🇨🇷' },
  { code: '+507', country: 'PA', flag: '🇵🇦' },
]

const userSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email invalido'),
  puesto: z.string().optional(),
  telefono: z.string().optional(),
  codigo_telefono: z.string().optional(),
  permisos: z.array(z.string()),
  activo: z.boolean(),
})

type UserFormData = z.infer<typeof userSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserState {
  id: string
  email: string
  nombre: string
  avatar_url: string | null
  puesto: string | null
  telefono: string | null
  codigo_telefono: string | null
  activo: boolean
  permisos: string[]
  creado_en: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if the user has superadmin wildcard */
function isSuperAdmin(permisos: string[]): boolean {
  return permisos.includes('*')
}

/** Check if the user has a module wildcard like "usuarios:*" */
function hasModuleWildcard(permisos: string[], mod: string): boolean {
  return permisos.includes(`${mod}:*`)
}

/** Check if a specific permission is granted (directly or via wildcard) */
function hasPermission(permisos: string[], perm: string): boolean {
  if (isSuperAdmin(permisos)) return true
  if (permisos.includes(perm)) return true
  // Check resource:* wildcard (e.g. "clientes.contactos:*" covers "clientes.contactos:read")
  const [resource] = perm.split(':')
  if (permisos.includes(`${resource}:*`)) return true
  // Check parent tree wildcard (e.g. "clientes:*" covers "clientes.contactos:read")
  const parts = resource.split('.')
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join('.')
    if (permisos.includes(`${parent}:*`)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const userFromState = location.state as UserState | null

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userData, setUserData] = useState<UserState | null>(userFromState)

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
      permisos: userFromState?.permisos ?? [],
      activo: userFromState?.activo ?? true,
    },
  })

  const permisos = watch('permisos')
  const activo = watch('activo')

  useEffect(() => {
    if (!isEdit || userFromState) return
    setLoading(true)
    usersApi
      .list()
      .then((res) => {
        const user = res.data.find((u: UserState) => u.id === id)
        if (user) {
          setUserData(user)
          setValue('nombre', user.nombre)
          setValue('email', user.email)
          setValue('puesto', user.puesto ?? '')
          setValue('telefono', user.telefono ?? '')
          setValue('codigo_telefono', user.codigo_telefono ?? '+52')
          setValue('permisos', user.permisos ?? [])
          setValue('activo', user.activo)
        } else {
          toast.error('Usuario no encontrado')
          navigate(ROUTES.ADMIN_USERS)
        }
      })
      .catch(() => {
        navigate(ROUTES.ADMIN_USERS)
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, userFromState, setValue, navigate])

  // ---- Permission toggle helpers ----

  const toggleSuperAdmin = () => {
    if (isSuperAdmin(permisos)) {
      setValue('permisos', [], { shouldValidate: true })
    } else {
      setValue('permisos', ['*'], { shouldValidate: true })
    }
  }

  const toggleModuleWildcard = (mod: string) => {
    if (isSuperAdmin(permisos)) return
    const wildcard = `${mod}:*`
    const modulePermValues = PERMISSION_MODULES
      .find((m) => m.module === mod)
      ?.permissions.map((p) => p.value) ?? []

    if (hasModuleWildcard(permisos, mod)) {
      // Remove wildcard and all module permissions
      setValue(
        'permisos',
        permisos.filter((p) => p !== wildcard && !modulePermValues.includes(p)),
        { shouldValidate: true },
      )
    } else {
      // Add wildcard and remove individual module perms (wildcard covers them)
      const cleaned = permisos.filter((p) => !modulePermValues.includes(p))
      setValue('permisos', [...cleaned, wildcard], { shouldValidate: true })
    }
  }

  const togglePermission = (perm: string) => {
    if (isSuperAdmin(permisos)) return
    // Check if any parent wildcard covers this permission
    const [resource] = perm.split(':')
    const parts = resource.split('.')
    for (let i = 1; i <= parts.length; i++) {
      const ancestor = parts.slice(0, i).join('.')
      if (permisos.includes(`${ancestor}:*`)) return
    }

    if (permisos.includes(perm)) {
      setValue('permisos', permisos.filter((p) => p !== perm), { shouldValidate: true })
    } else {
      setValue('permisos', [...permisos, perm], { shouldValidate: true })
    }
  }

  // ---- Submit ----

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await usersApi.update(id, {
          nombre: data.nombre,
          email: data.email,
          puesto: data.puesto || undefined,
          telefono: data.telefono || undefined,
          codigo_telefono: data.codigo_telefono || undefined,
          permisos: data.permisos,
          activo: data.activo,
        })
        toast.success('Usuario actualizado')
      } else {
        await usersApi.create({
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono || undefined,
          codigo_telefono: data.codigo_telefono || undefined,
          permisos: data.permisos,
        })
        toast.success('Usuario creado')
      }
      navigate(ROUTES.ADMIN_USERS)
    } catch {
      // toast is handled by the global interceptor
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

            {/* Phone with country code dropdown */}
            <div className="space-y-2">
              <Label>Telefono</Label>
              <div className="flex gap-2">
                <select
                  {...register('codigo_telefono')}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0 w-[90px]"
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
          </div>

          {/* Permissions section */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Permisos</h3>
            </div>

            {/* Super admin toggle */}
            <label className="flex items-center gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={isSuperAdmin(permisos)}
                onChange={toggleSuperAdmin}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Todos los permisos</p>
                <p className="text-xs text-muted-foreground">Acceso total al sistema (superadmin)</p>
              </div>
            </label>

            {/* Module-based permissions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERMISSION_MODULES.map((mod) => {
                const isModWildcard = hasModuleWildcard(permisos, mod.module)
                const isSuper = isSuperAdmin(permisos)

                return (
                  <div key={mod.module} className="rounded-lg border border-border/50 overflow-hidden">
                    {/* Module header with wildcard checkbox */}
                    <label className="flex items-center gap-3 px-4 py-3 bg-muted/20 border-b border-border/30 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={isSuper || isModWildcard}
                        disabled={isSuper}
                        onChange={() => toggleModuleWildcard(mod.module)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary disabled:opacity-50"
                      />
                      <span className="text-sm font-medium">{mod.label}</span>
                      {(isSuper || isModWildcard) && (
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Todos
                        </span>
                      )}
                    </label>

                    {/* Individual permissions */}
                    <div className="p-3 space-y-2">
                      {mod.permissions.map((perm) => (
                        <label
                          key={perm.value}
                          className="flex items-center gap-3 cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={hasPermission(permisos, perm.value)}
                            disabled={isSuper || isModWildcard}
                            onChange={() => togglePermission(perm.value)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary disabled:opacity-50"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground/80">{perm.label}</span>
                            <code className="text-[10px] text-muted-foreground font-mono">{perm.value}</code>
                          </div>
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

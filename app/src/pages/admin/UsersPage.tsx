import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users, Plus, MoreHorizontal, Pencil, LogIn,
  Search, X, ChevronLeft, ChevronRight, Shield,
} from 'lucide-react'
import { usersApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'

interface User {
  id: string
  email: string
  nombre: string
  avatar_url: string | null
  puesto: string | null
  telefono: string | null
  permisos: string[]
  activo: boolean
  creado_en: string
}

const PAGE_SIZES = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

function getPermissionsLabel(permisos: string[]): string {
  if (permisos.includes('*')) return 'Todos los permisos'
  if (permisos.length === 0) return 'Sin permisos'
  return `${permisos.length} permiso${permisos.length !== 1 ? 's' : ''}`
}

export default function UsersPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = currentUser?.permissions?.includes('*') ?? false
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('buscar') ?? ''
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1)
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get('limite')))
    ? Number(searchParams.get('limite'))
    : DEFAULT_PAGE_SIZE

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(search)

  const fetchUsers = useCallback(() => {
    setLoading(true)
    usersApi
      .list()
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Sync search input when URL changes (e.g. browser back)
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  // Debounce search — update URL params 300ms after user stops typing
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams({ buscar: searchInput || null, pagina: null })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Client-side filter + paginate
  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.telefono && u.telefono.toLowerCase().includes(q))
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === '') next.delete(key)
        else next.set(key, val)
      }
      return next
    })
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Usuarios' },
        ]}
        title="Usuarios"
        subtitle={loading ? undefined : `${filtered.length} usuario${filtered.length !== 1 ? 's' : ''}${search ? ` encontrado${filtered.length !== 1 ? 's' : ''}` : ''}`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button
            className="gap-2"
            onClick={() => navigate(ROUTES.ADMIN_USERS_NEW)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, correo o telefono..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-9 border-border-hover"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="card-modern overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Correo</th>
              <th className="px-6 py-4 font-medium">Puesto</th>
              <th className="px-6 py-4 font-medium">Permisos</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-5"><div className="h-3.5 w-36 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-24 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-6 w-20 rounded-full bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-6 w-16 rounded-full bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-8 w-8 rounded bg-muted animate-pulse" /></td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {search ? 'No se encontraron resultados' : 'No hay usuarios registrados'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {search ? 'Intenta con otro termino de busqueda' : 'Crea un nuevo usuario para comenzar'}
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-muted/20 cursor-pointer group"
                  onClick={() => navigate(ROUTES.ADMIN_USERS_EDIT(user.id), { state: user })}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        <AvatarImage src={user.avatar_url ?? undefined} alt={user.nombre} />
                        <AvatarFallback>{getInitials(user.nombre)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{user.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="truncate text-sm text-muted-foreground">{user.puesto || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      {getPermissionsLabel(user.permisos ?? [])}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${user.activo ? 'status-badge-success' : 'status-badge-destructive'}`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN_USERS_EDIT(user.id), { state: user })}>
                          <Pencil className="h-4 w-4" />
                          Editar usuario
                        </DropdownMenuItem>
                        {isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const res = await usersApi.impersonate(user.id)
                                  await useAuthStore.getState().startImpersonation(res.data.access_token)
                                  navigate('/')
                                } catch {
                                  // toast is handled by the global interceptor
                                }
                              }}
                            >
                              <LogIn className="h-4 w-4" />
                              Login as
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && (
          <div className="flex items-center justify-between border-t border-border/50 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => updateParams({
                  limite: Number(e.target.value) === DEFAULT_PAGE_SIZE ? null : e.target.value,
                  pagina: null,
                })}
                className="h-8 rounded-md border border-border-hover bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                &middot; Pagina {safePage} de {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={safePage <= 1}
                onClick={() => updateParams({ pagina: String(safePage - 1) })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === safePage ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => updateParams({ pagina: p === 1 ? null : String(p) })}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages}
                onClick={() => updateParams({ pagina: String(safePage + 1) })}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

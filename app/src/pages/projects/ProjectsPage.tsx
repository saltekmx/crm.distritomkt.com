import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FolderKanban, Plus, MoreHorizontal, Pencil, Trash2,
  Search, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { projectsApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import {
  PROJECT_TYPES, OPERATIVE_STATUSES,
  getOperativeStatus, getAdminStatus, getProjectTypeLabel,
} from '@/lib/projects'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Project {
  id: number
  codigo: string
  nombre: string
  tipo: string
  subcategoria: string | null
  status_operativo: string
  status_administrativo: string
  fecha_inicio: string | null
  fecha_entrega: string | null
  cliente_nombre: string | null
  responsable_nombre: string | null
  creado_en: string
}

interface ProjectsResponse {
  elementos: Project[]
  total: number
  offset: number
  limit: number
  hay_mas: boolean
}

const PAGE_SIZES = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

const STATUS_COLOR_MAP: Record<string, string> = {
  gray: 'status-badge-secondary',
  blue: 'status-badge-info',
  yellow: 'status-badge-warning',
  orange: 'status-badge-warning',
  purple: 'status-badge-purple',
  emerald: 'status-badge-success',
  slate: 'status-badge-secondary',
}

function StatusBadge({ label, color }: { label: string; color?: string }) {
  const cls = STATUS_COLOR_MAP[color ?? 'gray'] ?? 'status-badge-secondary'
  return <span className={`status-badge ${cls}`}>{label}</span>
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('buscar') ?? ''
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1)
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get('limite')))
    ? Number(searchParams.get('limite'))
    : DEFAULT_PAGE_SIZE
  const filterTipo = searchParams.get('tipo') ?? ''
  const filterStatus = searchParams.get('status') ?? ''

  const [projects, setProjects] = useState<Project[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(search)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const offset = (page - 1) * pageSize

  const fetchProjects = useCallback(() => {
    setLoading(true)
    projectsApi
      .list({
        buscar: search || undefined,
        offset,
        limit: pageSize,
        tipo: filterTipo || undefined,
        status_operativo: filterStatus || undefined,
      })
      .then((res) => {
        const data = res.data as ProjectsResponse
        setProjects(data.elementos)
        setTotal(data.total)
      })
      .catch(() => {
        setProjects([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [search, offset, pageSize, filterTipo, filterStatus])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams({ buscar: searchInput || null, pagina: null })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await projectsApi.delete(deleteTarget.id)
      toast.success('Proyecto eliminado')
      fetchProjects()
    } catch {
      // toast handled by global interceptor
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const start = Math.max(1, safePage - 2)
    const end = Math.min(totalPages, start + 4)
    const adjusted = Math.max(1, end - 4)
    return Array.from({ length: end - adjusted + 1 }, (_, i) => adjusted + i)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Proyectos' },
        ]}
        title="Proyectos"
        subtitle={loading ? undefined : `${total} proyecto${total !== 1 ? 's' : ''}${search ? ` encontrado${total !== 1 ? 's' : ''}` : ''}`}
        icon={<FolderKanban className="h-5 w-5" />}
        actions={
          <Button
            className="gap-2"
            onClick={() => navigate(ROUTES.PROJECTS_NEW)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Proyecto
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cliente..."
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
        <Select
          value={filterTipo}
          onValueChange={(val) => updateParams({ tipo: val === 'all' ? null : val, pagina: null })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {PROJECT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(val) => updateParams({ status: val === 'all' ? null : val, pagina: null })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {OPERATIVE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-modern overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4 font-medium">Código</th>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Tipo</th>
              <th className="px-6 py-4 font-medium">Estado Op.</th>
              <th className="px-6 py-4 font-medium">Estado Admin.</th>
              <th className="px-6 py-4 font-medium">Entrega</th>
              <th className="px-6 py-4 font-medium w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-5"><div className="h-3.5 w-20 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-32 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-24 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-6 w-20 rounded-full bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-6 w-20 rounded-full bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-6 w-20 rounded-full bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-20 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-8 w-8 rounded bg-muted animate-pulse" /></td>
                </tr>
              ))
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center">
                  <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {search || filterTipo || filterStatus ? 'No se encontraron resultados' : 'No hay proyectos registrados'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {search || filterTipo || filterStatus ? 'Intenta con otros filtros' : 'Crea un nuevo proyecto para comenzar'}
                  </p>
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const opStatus = getOperativeStatus(project.status_operativo)
                const admStatus = getAdminStatus(project.status_administrativo)
                const tipoLabel = getProjectTypeLabel(project.tipo, project.subcategoria)
                return (
                  <tr
                    key={project.id}
                    className="transition-colors hover:bg-muted/20 group cursor-pointer"
                    onClick={() => navigate(ROUTES.PROJECTS_DETAIL(project.id))}
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-muted-foreground">{project.codigo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium">{project.nombre}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">{project.cliente_nombre || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">{tipoLabel}</span>
                    </td>
                    <td className="px-6 py-4">
                      {opStatus ? (
                        <StatusBadge label={opStatus.label} color={opStatus.color} />
                      ) : (
                        <span className="text-xs text-muted-foreground">{project.status_operativo}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {admStatus ? (
                        <StatusBadge label={admStatus.label} color={admStatus.color} />
                      ) : (
                        <span className="text-xs text-muted-foreground">{project.status_administrativo}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">{formatDate(project.fecha_entrega)}</span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => navigate(ROUTES.PROJECTS_DETAIL(project.id))}>
                            <Pencil className="h-4 w-4" />
                            Editar proyecto
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(project)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
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
                className="h-8 rounded-md border border-border-hover bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring [&>option]:bg-card [&>option]:text-foreground"
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
              {getPageNumbers().map((p) => (
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  ¿Estas seguro de eliminar <strong>{deleteTarget.nombre}</strong>?
                  Esta accion se puede revertir.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

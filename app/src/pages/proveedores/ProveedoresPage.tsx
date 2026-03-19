import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Truck, Plus, MoreHorizontal, Pencil, Trash2,
  Search, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { proveedoresApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface Supplier {
  id: number
  nombre: string
  contacto: string | null
  email: string | null
  telefono: string | null
  whatsapp: string | null
  creado_en: string
}

interface SuppliersResponse {
  elementos: Supplier[]
  total: number
  offset: number
  limit: number
  hay_mas: boolean
}

const PAGE_SIZES = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

export default function ProveedoresPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('buscar') ?? ''
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1)
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get('limite')))
    ? Number(searchParams.get('limite'))
    : DEFAULT_PAGE_SIZE

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(search)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const offset = (page - 1) * pageSize

  const fetchSuppliers = useCallback(() => {
    setLoading(true)
    proveedoresApi
      .list({ buscar: search || undefined, offset, limit: pageSize })
      .then((res) => {
        const data = res.data as SuppliersResponse
        setSuppliers(data.elementos)
        setTotal(data.total)
      })
      .catch(() => {
        setSuppliers([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [search, offset, pageSize])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

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
      await proveedoresApi.delete(deleteTarget.id)
      toast.success('Proveedor eliminado')
      fetchSuppliers()
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

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[{ label: 'Proveedores' }]}
        title="Proveedores"
        subtitle={loading ? undefined : `${total} proveedor${total !== 1 ? 'es' : ''}${search ? ` encontrado${total !== 1 ? 's' : ''}` : ''}`}
        icon={<Truck className="h-5 w-5" />}
        actions={
          <Button className="gap-2" onClick={() => navigate(ROUTES.SUPPLIERS_NEW)}>
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o contacto..."
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
              <th className="px-6 py-4 font-medium">Contacto</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Telefono</th>
              <th className="px-6 py-4 font-medium">WhatsApp</th>
              <th className="px-6 py-4 font-medium w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-5"><div className="h-3.5 w-32 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-24 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-28 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-20 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-20 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-8 w-8 rounded bg-muted animate-pulse" /></td>
                </tr>
              ))
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <Truck className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {search ? 'No se encontraron resultados' : 'No hay proveedores registrados'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {search ? 'Intenta con otro termino de busqueda' : 'Crea un nuevo proveedor para comenzar'}
                  </p>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="transition-colors hover:bg-muted/20 group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium">{supplier.nombre}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{supplier.contacto || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{supplier.email || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{supplier.telefono || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{supplier.whatsapp || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => navigate(ROUTES.SUPPLIERS_EDIT(supplier.id), { state: supplier })}>
                          <Pencil className="h-4 w-4" />
                          Editar proveedor
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => updateParams({ pagina: String(safePage - 1) })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPageNumbers().map((p) => (
                <Button key={p} variant={p === safePage ? 'default' : 'ghost'} size="icon" className="h-8 w-8 text-xs" onClick={() => updateParams({ pagina: p === 1 ? null : String(p) })}>
                  {p}
                </Button>
              ))}
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => updateParams({ pagina: String(safePage + 1) })}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  ¿Estas seguro de eliminar a <strong>{deleteTarget.nombre}</strong>?
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

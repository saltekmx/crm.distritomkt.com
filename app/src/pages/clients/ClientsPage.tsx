import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2, Plus, MoreHorizontal, Pencil, Trash2,
  Search, X, ChevronLeft, ChevronRight, ChevronDown,
  Users, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi, contactsApi } from '@/services/api'
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

interface Client {
  id: number
  nombre: string
  rfc: string | null
  industria: string | null
  dias_pago: number
  creado_en: string
}

interface ClientsResponse {
  elementos: Client[]
  total: number
  offset: number
  limit: number
  hay_mas: boolean
}

interface Contact {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
  cargo: string | null
}

interface ExpandedState {
  contacts: Contact[]
  loading: boolean
}

const PAGE_SIZES = [10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

export default function ClientsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('buscar') ?? ''
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1)
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get('limite')))
    ? Number(searchParams.get('limite'))
    : DEFAULT_PAGE_SIZE

  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(search)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, ExpandedState>>({})

  const offset = (page - 1) * pageSize

  const fetchClients = useCallback(() => {
    setLoading(true)
    clientsApi
      .list({ buscar: search || undefined, offset, limit: pageSize })
      .then((res) => {
        const data = res.data as ClientsResponse
        setClients(data.elementos)
        setTotal(data.total)
      })
      .catch(() => {
        setClients([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [search, offset, pageSize])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

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
      await clientsApi.delete(deleteTarget.id)
      toast.success('Cliente eliminado')
      fetchClients()
    } catch {
      // toast handled by global interceptor
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const toggleExpand = (clientId: string) => {
    if (expanded[clientId]) {
      setExpanded((prev) => {
        const next = { ...prev }
        delete next[clientId]
        return next
      })
      return
    }
    setExpanded((prev) => ({ ...prev, [clientId]: { contacts: [], loading: true } }))
    contactsApi
      .list(clientId)
      .then((res) => {
        const data = res.data
        const contacts = Array.isArray(data) ? data : data.elementos ?? []
        setExpanded((prev) => ({ ...prev, [clientId]: { contacts, loading: false } }))
      })
      .catch(() => {
        setExpanded((prev) => ({ ...prev, [clientId]: { contacts: [], loading: false } }))
      })
  }

  // Generate page numbers to show (max 5 visible)
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
        breadcrumbs={[
          { label: 'Clientes' },
        ]}
        title="Clientes"
        subtitle={loading ? undefined : `${total} cliente${total !== 1 ? 's' : ''}${search ? ` encontrado${total !== 1 ? 's' : ''}` : ''}`}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <Button
            className="gap-2"
            onClick={() => navigate(ROUTES.CLIENTS_NEW)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, RFC o industria..."
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
              <th className="pl-3 pr-0 py-4 font-medium w-10"></th>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">RFC</th>
              <th className="px-6 py-4 font-medium">Industria</th>
              <th className="px-6 py-4 font-medium w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="pl-3 pr-0 py-5"><div className="h-3.5 w-6 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-32 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-24 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-3.5 w-28 rounded bg-muted animate-pulse" /></td>
                  <td className="px-6 py-5"><div className="h-8 w-8 rounded bg-muted animate-pulse" /></td>
                </tr>
              ))
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    {search ? 'No se encontraron resultados' : 'No hay clientes registrados'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {search ? 'Intenta con otro termino de busqueda' : 'Crea un nuevo cliente para comenzar'}
                  </p>
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const isExpanded = !!expanded[client.id]
                const expandState = expanded[client.id]
                return (
                  <React.Fragment key={client.id}>
                    <tr
                      className="transition-colors hover:bg-muted/20 group"
                    >
                      <td className="pl-3 pr-0 py-4" onClick={(e) => { e.stopPropagation(); toggleExpand(client.id) }}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        </Button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">{client.nombre}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground font-mono">{client.rfc || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{client.industria || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => navigate(ROUTES.CLIENTS_EDIT(client.id), { state: client })}>
                              <Pencil className="h-4 w-4" />
                              Editar cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {isExpanded && (
                      expandState.loading ? (
                        <tr className="bg-muted/10">
                          <td colSpan={5} className="px-12 py-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Cargando contactos...
                            </div>
                          </td>
                        </tr>
                      ) : expandState.contacts.length === 0 ? (
                        <tr className="bg-muted/10">
                          <td colSpan={5} className="px-12 py-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              Sin contactos registrados
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          <tr className="bg-muted/10 border-t border-border/20">
                            <td className="pl-3 pr-0 py-1.5"></td>
                            <td className="px-6 py-1.5 pl-10">
                              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70">Nombre</span>
                            </td>
                            <td className="px-6 py-1.5">
                              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70">Email</span>
                            </td>
                            <td className="px-6 py-1.5">
                              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70">Telefono</span>
                            </td>
                            <td className="px-6 py-1.5"></td>
                          </tr>
                          {expandState.contacts.map((contact) => (
                            <tr key={contact.id} className="bg-muted/10 border-t border-border/20">
                              <td className="pl-3 pr-0 py-2.5"></td>
                              <td className="px-6 py-2.5">
                                <div className="flex items-center gap-2 pl-4">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
                                  <span className="text-sm">{contact.nombre}</span>
                                  {contact.cargo && (
                                    <span className="text-xs text-muted-foreground">· {contact.cargo}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-2.5">
                                <span className="text-xs text-muted-foreground">{contact.email || '—'}</span>
                              </td>
                              <td className="px-6 py-2.5">
                                <span className="text-xs text-muted-foreground">{contact.telefono || '—'}</span>
                              </td>
                              <td className="px-6 py-2.5"></td>
                            </tr>
                          ))}
                        </>
                      )
                    )}
                  </React.Fragment>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
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

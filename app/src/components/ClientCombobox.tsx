import { useCallback, useEffect, useRef, useState } from 'react'
import { Building2, ChevronsUpDown, Loader2, Search, X } from 'lucide-react'
import { clientsApi } from '@/services/api'

interface ClientOption {
  id: number
  nombre: string
}

interface ClientComboboxProps {
  value: number | ''
  onChange: (id: number | '') => void
  error?: string
}

const PAGE_SIZE = 20

export function ClientCombobox({ value, onChange, error }: ClientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const offsetRef = useRef(0)

  // Fetch clients from API
  const fetchClients = useCallback((query: string, offset: number, append: boolean) => {
    setLoading(true)
    clientsApi
      .list({ buscar: query || undefined, offset, limit: PAGE_SIZE })
      .then((res) => {
        const data = res.data
        const items = (Array.isArray(data) ? data : data.elementos ?? []).map(
          (c: { id: number; nombre: string }) => ({ id: c.id, nombre: c.nombre })
        )
        const total = data.total ?? items.length
        setClients((prev) => (append ? [...prev, ...items] : items))
        setHasMore(offset + PAGE_SIZE < total)
        offsetRef.current = offset + PAGE_SIZE
      })
      .catch(() => {
        if (!append) setClients([])
        setHasMore(false)
      })
      .finally(() => setLoading(false))
  }, [])

  // Load initial page on open
  useEffect(() => {
    if (open) {
      offsetRef.current = 0
      fetchClients('', 0, false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, fetchClients])

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0
      fetchClients(search, 0, false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, open, fetchClients])

  // Resolve selected label from value
  useEffect(() => {
    if (!value) {
      setSelectedLabel('')
      return
    }
    const found = clients.find((c) => c.id === value)
    if (found) {
      setSelectedLabel(found.nombre)
      return
    }
    // Fetch single client to get name
    clientsApi.get(value).then((res) => {
      setSelectedLabel(res.data.nombre ?? '')
    }).catch(() => setSelectedLabel(''))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Scroll pagination
  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      fetchClients(search, offsetRef.current, true)
    }
  }

  const handleSelect = (client: ClientOption) => {
    onChange(client.id)
    setSelectedLabel(client.nombre)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSelectedLabel('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-colors
          ${error ? 'border-destructive' : 'border-input'}
          ${open ? 'ring-1 ring-ring' : ''}
          focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel || 'Seleccionar cliente...'}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && !loading && (
              <button
                type="button"
                onClick={() => { setSearch(''); inputRef.current?.focus() }}
                className="text-muted-foreground hover:text-foreground shrink-0 ml-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 ml-2" />}
          </div>

          {/* List */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-[200px] overflow-y-auto p-1"
          >
            {clients.length === 0 && !loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {search ? 'Sin resultados' : 'No hay clientes'}
              </div>
            ) : (
              clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors
                    ${client.id === value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {client.nombre}
                </button>
              ))
            )}
            {loading && clients.length > 0 && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

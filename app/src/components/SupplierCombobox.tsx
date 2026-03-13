import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search, Truck, X } from 'lucide-react'
import { proveedoresApi } from '@/services/api'

interface SupplierComboboxProps {
  /** Current string value (supplier name or free text) */
  value: string
  onChange: (name: string) => void
  /** Compact mode for inline table usage */
  compact?: boolean
  placeholder?: string
}

const PAGE_SIZE = 20

export function SupplierCombobox({
  value,
  onChange,
  compact = false,
  placeholder = 'Proveedor...',
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const offsetRef = useRef(0)

  const fetchSuppliers = useCallback((query: string, offset: number, append: boolean) => {
    setLoading(true)
    proveedoresApi
      .list({ buscar: query || undefined, offset, limit: PAGE_SIZE })
      .then((res) => {
        const data = res.data as { elementos: Array<{ nombre: string }>; total: number }
        const names = data.elementos.map((s) => s.nombre)
        setSuppliers((prev) => (append ? [...prev, ...names] : names))
        setHasMore(offset + PAGE_SIZE < data.total)
        offsetRef.current = offset + PAGE_SIZE
      })
      .catch(() => {
        if (!append) setSuppliers([])
        setHasMore(false)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (open) {
      offsetRef.current = 0
      fetchSuppliers('', 0, false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, fetchSuppliers])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0
      fetchSuppliers(search, 0, false)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, open, fetchSuppliers])

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

  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      fetchSuppliers(search, offsetRef.current, true)
    }
  }

  const handleSelect = (name: string) => {
    onChange(name)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  // Check if current search text is a custom value (not in the list)
  const hasCustomSearch = search.trim() && !suppliers.includes(search.trim())

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between bg-transparent text-left transition-colors
          ${compact
            ? 'text-xs py-0 px-0 min-h-[24px] gap-1'
            : 'h-9 rounded-md border border-input px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'
          }
          ${open && !compact ? 'ring-1 ring-ring' : ''}`}
      >
        <span className={`truncate ${value ? 'text-foreground' : 'text-muted-foreground/60'}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-muted-foreground/40 hover:text-foreground cursor-pointer"
            >
              <X className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            </span>
          )}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-56 rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ left: compact ? 0 : undefined }}
        >
          {/* Search input */}
          <div className="flex items-center border-b px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1.5" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  handleSelect(search.trim())
                }
              }}
              placeholder="Buscar proveedor..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            {search && !loading && (
              <button
                type="button"
                onClick={() => { setSearch(''); inputRef.current?.focus() }}
                className="text-muted-foreground hover:text-foreground shrink-0 ml-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0 ml-1" />}
          </div>

          {/* List */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-[180px] overflow-y-auto p-0.5"
          >
            {/* Custom value option */}
            {hasCustomSearch && (
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground text-primary"
              >
                <span className="font-medium">Usar:</span> &ldquo;{search.trim()}&rdquo;
              </button>
            )}
            {suppliers.length === 0 && !loading && !hasCustomSearch ? (
              <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                {search ? 'Sin resultados' : 'No hay proveedores'}
              </div>
            ) : (
              suppliers.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className={`w-full flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors
                    ${name === value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <Truck className="h-3 w-3 text-muted-foreground shrink-0" />
                  {name}
                </button>
              ))
            )}
            {loading && suppliers.length > 0 && (
              <div className="flex items-center justify-center py-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { Search, Video, FolderOpen, GripVertical, ImageIcon, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectsApi, pipelineApi, clientsApi } from '@/services/api'
import { toast } from 'sonner'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'

/** Paginated list response from the backend */
interface PaginatedResponse<T> {
  elementos: T[]
  total: number
  pagina: number
  por_pagina: number
}

interface ProjectListElement {
  id: number
  nombre: string
  tipo?: string
  cliente_nombre?: string
  status_operativo?: string
}

interface ClientListElement {
  id: number
  nombre: string
}

interface ProjectItem {
  id: number
  nombre: string
  tipo: string
  cliente_nombre?: string
  status_operativo?: string
  pipelineStatus?: string | null
}

export function VideoModePanel() {
  const selectedVideoProjectId = useStudioAiStore((s) => s.selectedVideoProjectId)
  const setSelectedVideoProjectId = useStudioAiStore((s) => s.setSelectedVideoProjectId)
  const generations = useStudioStore((s) => s.generations)
  const studioImages = generations.filter((g) => g.estado === 'complete' && g.url_salida)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('servicios')
  const [clients, setClients] = useState<Array<{ id: number; nombre: string }>>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [clientsError, setClientsError] = useState(false)

  // Load projects on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await projectsApi.list({ limit: 50 })
        const paginated = data as PaginatedResponse<ProjectListElement>
        const items: ProjectItem[] = (paginated.elementos ?? []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo || '',
          cliente_nombre: p.cliente_nombre,
          status_operativo: p.status_operativo,
          pipelineStatus: null,
        }))
        if (!cancelled) setProjects(items)
      } catch {
        toast.error('Error al cargar proyectos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load clients when create form opens (retries on error)
  useEffect(() => {
    if (!showCreate || (clients.length > 0 && !clientsError)) return
    setClientsError(false)
    clientsApi.list({ limit: 50 }).then(({ data }) => {
      const paginated = data as PaginatedResponse<ClientListElement>
      const items = (paginated.elementos ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))
      setClients(items)
      if (items.length > 0 && !selectedClientId) setSelectedClientId(items[0].id)
    }).catch(() => {
      setClientsError(true)
      toast.error('Error al cargar clientes')
    })
  }, [showCreate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!newName.trim() || !selectedClientId) return
    setCreating(true)
    try {
      const { data } = await projectsApi.create({
        cliente_id: selectedClientId,
        nombre: newName.trim(),
        tipo: newType,
      })
      const created = data as ProjectListElement
      setProjects((prev) => [{ id: created.id, nombre: created.nombre, tipo: created.tipo || newType, cliente_nombre: '', pipelineStatus: null }, ...prev])
      setSelectedVideoProjectId(created.id)
      setShowCreate(false)
      setNewName('')
      toast.success('Proyecto creado')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      const detail = axiosErr?.response?.data?.detail || 'Error al crear proyecto'
      toast.error(detail)
    } finally {
      setCreating(false)
    }
  }

  // Filter projects by search
  const filtered = search
    ? projects.filter((p) => p.nombre.toLowerCase().includes(search.toLowerCase()))
    : projects

  const handleDragStart = useCallback((e: React.DragEvent, imageUrl: string) => {
    e.dataTransfer.setData('text/plain', imageUrl)
    e.dataTransfer.setData('application/x-studio-image', imageUrl)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Projects section */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="px-3 py-2.5 border-b border-zinc-800/60 shrink-0 flex items-center gap-2">
          <Video className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Proyectos
          </span>
          <span className="text-[10px] text-zinc-600 ml-auto">{filtered.length}</span>
        </div>

        {/* Create project */}
        {showCreate ? (
          <div className="px-3 py-2 border-b border-zinc-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-300">Nuevo proyecto</span>
              <button type="button" onClick={() => setShowCreate(false)} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del proyecto"
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/40"
            >
              <option value="servicios">Servicios</option>
              <option value="experiencias">Experiencias</option>
              <option value="materiales">Materiales</option>
              <option value="pago_terceros">Pago Terceros</option>
            </select>
            {clients.length > 0 && (
              <select
                value={selectedClientId ?? ''}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/40"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !selectedClientId}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                newName.trim() && selectedClientId && !creating
                  ? 'bg-violet-600 text-white hover:bg-violet-500'
                  : 'bg-zinc-800/40 text-zinc-600 cursor-not-allowed',
              )}
            >
              {creating ? <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="h-3 w-3" />}
              Crear
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors border border-dashed border-zinc-700/40 hover:border-zinc-600"
            >
              <Plus className="h-3 w-3" />
              Crear Proyecto
            </button>
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proyecto..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40"
            />
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6">
              <FolderOpen className="h-5 w-5 text-zinc-700 mx-auto mb-1" />
              <p className="text-[10px] text-zinc-600">
                {search ? 'Sin resultados' : 'Sin proyectos'}
              </p>
            </div>
          ) : (
            filtered.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedVideoProjectId(project.id)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2.5 transition-all border',
                  selectedVideoProjectId === project.id
                    ? 'bg-violet-500/10 border-violet-500/30 ring-1 ring-violet-500/10'
                    : 'bg-zinc-800/20 border-transparent hover:bg-zinc-800/40 hover:border-zinc-700/30',
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      selectedVideoProjectId === project.id ? 'bg-violet-400' : 'bg-zinc-600',
                    )}
                  />
                  <span className="text-xs font-medium text-zinc-200 truncate flex-1">
                    {project.nombre}
                  </span>
                </div>
                {(project.tipo || project.cliente_nombre) && (
                  <p className="text-[10px] text-zinc-500 ml-3.5 mt-0.5 truncate">
                    {[project.tipo, project.cliente_nombre].filter(Boolean).join(' · ')}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Gallery section (draggable images) */}
      <div className="border-t border-zinc-800/60 shrink-0">
        <div className="px-3 py-2 flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Galeria
          </span>
          <span className="text-[10px] text-zinc-600 ml-auto">{studioImages.length}</span>
        </div>

        {studioImages.length === 0 ? (
          <div className="px-3 pb-3">
            <div className="rounded-lg border border-dashed border-zinc-700/40 bg-zinc-900/30 p-3 text-center">
              <p className="text-[10px] text-zinc-600">
                Genera imagenes en modo Imagen para usarlas como referencia
              </p>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-3">
            <p className="text-[9px] text-zinc-600 mb-1.5 italic">
              Arrastra imagenes al pipeline como referencia
            </p>
            <div className="grid grid-cols-4 gap-1 max-h-[140px] overflow-y-auto scrollbar-thin">
              {studioImages.slice(0, 20).map((gen) => (
                <div
                  key={gen.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, gen.url_salida!)}
                  className="group relative rounded-md overflow-hidden aspect-square border border-zinc-700/30 hover:border-violet-500/40 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <img
                    src={gen.url_salida!}
                    alt={gen.prompt}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-3 w-3 text-white drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

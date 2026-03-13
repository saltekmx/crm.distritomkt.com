import { useState, useCallback } from 'react'
import { Search, Heart, ImageIcon, CheckSquare, Download, Trash2, X, ArrowUpDown, GitBranch, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioCanvasStore } from '@/stores/studioCanvasStore'
import { studioApi } from '@/services/api'
import type { StudioGeneration } from '@/services/api'
import { toast } from 'sonner'

type GalleryFilter = 'all' | 'favorites' | 'exported'
type GroupMode = 'flat' | 'version'

export function GalleryTab() {
  const isGenerating = useStudioAiStore((s) => s.isGenerating)
  const generations = useStudioStore((s) => s.generations)
  const versionMap = useStudioStore((s) => s.versionMap)
  const selectedImageId = useStudioAiStore((s) => s.selectedImageId)
  const setSelectedImageId = useStudioAiStore((s) => s.setSelectedImageId)
  const selectedImageIds = useStudioAiStore((s) => s.selectedImageIds)
  const toggleImageSelection = useStudioAiStore((s) => s.toggleImageSelection)
  const clearSelection = useStudioAiStore((s) => s.clearSelection)
  const selectAll = useStudioAiStore((s) => s.selectAll)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<GalleryFilter>('all')
  const [isDownloading, setIsDownloading] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'favorites'>('recent')
  const [groupMode, setGroupMode] = useState<GroupMode>('flat')

  const addToBoard = useStudioCanvasStore((s) => s.addToBoard)

  const bulkMode = selectedImageIds.size > 0

  const filtered = generations.filter((g) => {
    if (g.estado !== 'complete') return false
    if (search) {
      const q = search.toLowerCase()
      const matchPrompt = g.prompt.toLowerCase().includes(q)
      const matchTags = g.tags?.some((t) => t.includes(q)) ?? false
      if (!matchPrompt && !matchTags) return false
    }
    if (filter === 'favorites' && !g.is_favorito) return false
    if (filter === 'exported' && !g.media_id_salida) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime()
      case 'favorites':
        if (a.is_favorito && !b.is_favorito) return -1
        if (!a.is_favorito && b.is_favorito) return 1
        return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
      case 'recent':
      default:
        return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
    }
  })

  // Version grouping: roots first, children indented under parents
  const groupedByVersion = useCallback(() => {
    if (groupMode !== 'version') return null

    // Build children map
    const childrenOf = new Map<number, number[]>()
    for (const [childStr, parent] of Object.entries(versionMap)) {
      const child = Number(childStr)
      const list = childrenOf.get(parent) ?? []
      list.push(child)
      childrenOf.set(parent, list)
    }

    // Find roots (items not in versionMap as children)
    const childIds = new Set(Object.keys(versionMap).map(Number))
    const roots = sorted.filter((g) => !childIds.has(g.id))
    const result: Array<{ gen: StudioGeneration; depth: number }> = []

    const walk = (id: number, depth: number) => {
      const gen = sorted.find((g) => g.id === id)
      if (gen) result.push({ gen, depth })
      const children = childrenOf.get(id) ?? []
      for (const childId of children) {
        walk(childId, depth + 1)
      }
    }

    for (const root of roots) {
      walk(root.id, 0)
    }

    return result
  }, [groupMode, sorted, versionMap])

  const handleToggleFavorite = async (e: React.MouseEvent, gen: StudioGeneration) => {
    e.stopPropagation()
    try {
      const { data } = await studioApi.toggleFavorite(gen.id)
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === gen.id ? { ...g, is_favorito: data.is_favorite } : g
        ),
      }))
    } catch {
      toast.error('Error al cambiar favorito')
    }
  }

  const handleClick = (gen: StudioGeneration, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      toggleImageSelection(gen.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })
    } else {
      addToBoard(gen.id)
      setSelectedImageId(gen.id)
    }
  }

  const handleBulkDownload = async () => {
    if (selectedImageIds.size === 0) return
    setIsDownloading(true)
    try {
      const { data } = await studioApi.bulkDownload(Array.from(selectedImageIds))
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `studio_assets_${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${selectedImageIds.size} imagenes descargadas`)
    } catch {
      toast.error('Error al descargar')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedImageIds.size === 0) return
    try {
      await Promise.all(Array.from(selectedImageIds).map((id) => studioApi.deleteGeneration(id)))
      useStudioStore.setState((s) => ({
        generations: s.generations.filter((g) => !selectedImageIds.has(g.id)),
      }))
      toast.success(`${selectedImageIds.size} imagenes eliminadas`)
      clearSelection()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const filters: { key: GalleryFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'favorites', label: 'Favoritos' },
    { key: 'exported', label: 'Exportados' },
  ]

  const versionGroups = groupedByVersion()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <span className="text-sm font-medium text-zinc-200">Galeria</span>
        <span className="text-xs text-zinc-600 ml-2">({filtered.length})</span>
        <div className="flex-1" />
        {bulkMode ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-violet-400 mr-1">{selectedImageIds.size} sel.</span>
            <button
              onClick={selectAll}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
            >
              Todas
            </button>
            <button
              onClick={handleBulkDownload}
              disabled={selectedImageIds.size === 0 || isDownloading}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40"
              title="Descargar seleccion"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedImageIds.size === 0}
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-40"
              title="Eliminar seleccion"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={clearSelection}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Limpiar seleccion"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => toggleImageSelection(filtered[0]?.id ?? 0, { ctrl: true, shift: false })}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
          >
            Seleccionar
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por prompt..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          />
        </div>
      </div>

      {/* Filter + Sort row */}
      <div className="flex items-center gap-1 px-3 pb-2 shrink-0">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
              filter === f.key
                ? 'bg-violet-500/15 text-violet-300'
                : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        {/* Group by version toggle */}
        <button
          onClick={() => setGroupMode(groupMode === 'flat' ? 'version' : 'flat')}
          className={cn(
            'p-1 rounded transition-colors',
            groupMode === 'version'
              ? 'text-violet-400 bg-violet-500/15'
              : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'
          )}
          title="Agrupar por version"
        >
          <GitBranch className="h-3.5 w-3.5" />
        </button>
        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'favorites')}
            className="appearance-none bg-zinc-800 border border-zinc-700 rounded-md text-[11px] text-zinc-400 pl-6 pr-2 py-1 focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            <option value="recent">Reciente</option>
            <option value="oldest">Antiguo</option>
            <option value="favorites">Favoritos</option>
          </select>
          <ArrowUpDown className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        {/* Generating skeleton — shown at top while a generation is in flight */}
        {isGenerating && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded-lg overflow-hidden bg-zinc-800 border border-violet-500/30 animate-pulse">
              <div className="aspect-square bg-zinc-700/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
                <span className="text-[10px] text-violet-400 font-medium">Generando...</span>
              </div>
              <div className="p-2 space-y-1.5">
                <div className="h-2 bg-zinc-700/60 rounded w-full" />
                <div className="h-2 bg-zinc-700/60 rounded w-2/3" />
              </div>
            </div>
          </div>
        )}

        {sorted.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ImageIcon className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-600">
              {search ? 'Sin resultados' : filter === 'favorites' ? 'Sin favoritos' : 'Sin imagenes'}
            </p>
          </div>
        ) : versionGroups ? (
          /* Version-grouped view */
          <div className="space-y-0.5">
            {versionGroups.map(({ gen, depth }) => (
              <div
                key={gen.id}
                style={{ paddingLeft: depth * 16 }}
              >
                <GalleryCard
                  generation={gen}
                  isSelected={selectedImageIds.has(gen.id)}
                  isActive={selectedImageId === gen.id}
                  onClick={(e) => handleClick(gen, e)}
                  onToggleFavorite={(e) => handleToggleFavorite(e, gen)}
                  compact
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sorted.map((gen) => (
              <GalleryCard
                key={gen.id}
                generation={gen}
                isSelected={selectedImageIds.has(gen.id)}
                isActive={selectedImageId === gen.id}
                onClick={(e) => handleClick(gen, e)}
                onToggleFavorite={(e) => handleToggleFavorite(e, gen)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Gallery Card ----

function GalleryCard({
  generation,
  isSelected,
  isActive,
  onClick,
  onToggleFavorite,
  compact,
}: {
  generation: StudioGeneration
  isSelected: boolean
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'group relative flex items-center gap-2 w-full rounded-lg overflow-hidden bg-zinc-800/40 border transition-all text-left p-1.5',
          isSelected
            ? 'border-violet-500 ring-1 ring-violet-500/30 bg-violet-500/5'
            : isActive
              ? 'border-violet-500/30 bg-violet-500/5'
              : 'border-zinc-700/50 hover:border-zinc-600'
        )}
      >
        <div className="w-8 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
          {generation.url_salida ? (
            <img src={generation.url_salida} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-3 w-3 text-zinc-700" />
            </div>
          )}
        </div>
        <p className="text-[10px] text-zinc-400 truncate flex-1">{generation.prompt}</p>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        )}
        {isSelected && (
          <CheckSquare className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative rounded-lg overflow-hidden bg-zinc-800 border transition-all text-left',
        isSelected
          ? 'border-violet-500 ring-1 ring-violet-500/30'
          : isActive
            ? 'border-violet-500/40'
            : 'border-zinc-700 hover:border-zinc-600'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-square">
        {generation.url_salida ? (
          <img
            src={generation.url_salida}
            alt={generation.prompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-zinc-700" />
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected ? (
        <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-violet-500/20 text-violet-400 z-10">
          <CheckSquare className="h-3.5 w-3.5" />
        </div>
      ) : (
        generation.estilo && (
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[9px] font-medium text-violet-300 bg-black/50 px-1.5 py-0.5 rounded">
              {generation.estilo}
            </span>
          </div>
        )
      )}

      {/* Active indicator (dot) */}
      {isActive && !isSelected && (
        <div className="absolute top-1.5 right-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 block" />
        </div>
      )}

      {/* Favorite heart */}
      <div
        onClick={onToggleFavorite}
        className={cn(
          'absolute top-1.5 right-1.5 p-1 rounded-md transition-all',
          generation.is_favorito
            ? 'text-red-400 bg-black/40'
            : 'text-zinc-500 bg-black/40 opacity-0 group-hover:opacity-100'
        )}
      >
        <Heart
          className="h-3.5 w-3.5"
          fill={generation.is_favorito ? 'currentColor' : 'none'}
        />
      </div>

      {/* Bottom info */}
      <div className="p-2">
        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">{generation.prompt}</p>
        {generation.tags && generation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {generation.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[8px] bg-zinc-700/60 text-zinc-400 px-1 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {generation.tags.length > 3 && (
              <span className="text-[8px] text-zinc-600">+{generation.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

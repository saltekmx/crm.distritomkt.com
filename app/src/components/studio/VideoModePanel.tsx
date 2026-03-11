import { useEffect, useCallback, useState, useRef } from 'react'
import { Film, Plus, GripVertical, ImageIcon, Loader2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/stores/pipelineStore'
import { useStudioStore } from '@/stores/studioStore'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500',
  analyzing: 'bg-amber-400',
  planned: 'bg-blue-400',
  generating: 'bg-violet-400 animate-pulse',
  review: 'bg-orange-400',
  approved: 'bg-emerald-400',
  exporting: 'bg-cyan-400 animate-pulse',
  exported: 'bg-emerald-500',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

interface VideoModePanelProps {
  projectId: number
}

export function VideoModePanel({ projectId }: VideoModePanelProps) {
  const pipelineVersions = usePipelineStore((s) => s.pipelineVersions)
  const selectedPipelineId = usePipelineStore((s) => s.selectedPipelineId)
  const isLoadingVersions = usePipelineStore((s) => s.isLoadingVersions)
  const loadPipelineVersions = usePipelineStore((s) => s.loadPipelineVersions)
  const selectPipeline = usePipelineStore((s) => s.selectPipeline)
  const createNewPipeline = usePipelineStore((s) => s.createNewPipeline)
  const renamePipeline = usePipelineStore((s) => s.renamePipeline)

  const generations = useStudioStore((s) => s.generations)
  const studioImages = generations.filter((g) => g.estado === 'complete' && g.url_salida)

  const [versionsExpanded, setVersionsExpanded] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (projectId) loadPipelineVersions(projectId)
  }, [projectId, loadPipelineVersions])

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleDragStart = useCallback((e: React.DragEvent, imageUrl: string) => {
    e.dataTransfer.setData('text/plain', imageUrl)
    e.dataTransfer.setData('application/x-studio-image', imageUrl)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const startEditing = (versionId: number, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(versionId)
    setEditValue(currentLabel)
  }

  const confirmRename = () => {
    if (editingId !== null && editValue.trim()) {
      renamePipeline(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline versions section */}
      <div className="flex flex-col min-h-0 flex-1">
        <button
          type="button"
          onClick={() => setVersionsExpanded((v) => !v)}
          className="px-3 py-2.5 border-b border-zinc-800/60 shrink-0 flex items-center gap-2 hover:bg-zinc-800/20 transition-colors w-full text-left"
        >
          <Film className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Versiones
          </span>
          <span className="text-[10px] text-zinc-600 ml-auto mr-1">{pipelineVersions.length}</span>
          {versionsExpanded ? (
            <ChevronUp className="h-3 w-3 text-zinc-600" />
          ) : (
            <ChevronDown className="h-3 w-3 text-zinc-600" />
          )}
        </button>

        {versionsExpanded && (
          <>
            {/* New version button */}
            <div className="px-3 py-1.5 shrink-0">
              <button
                type="button"
                onClick={createNewPipeline}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors border border-dashed border-zinc-700/40 hover:border-zinc-600"
              >
                <Plus className="h-3 w-3" />
                Nueva version
              </button>
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-1">
              {isLoadingVersions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : pipelineVersions.length === 0 ? (
                <div className="text-center py-6">
                  <Film className="h-5 w-5 text-zinc-700 mx-auto mb-1" />
                  <p className="text-[10px] text-zinc-600">
                    Sin pipelines aun
                  </p>
                </div>
              ) : (
                pipelineVersions.map((version, idx) => {
                  const versionNumber = pipelineVersions.length - idx
                  const label = version.brief_snapshot
                    ? version.brief_snapshot.slice(0, 30) + (version.brief_snapshot.length > 30 ? '...' : '')
                    : `v${versionNumber}`
                  const isEditing = editingId === version.id
                  const isSelected = selectedPipelineId === version.id

                  return (
                    <div
                      key={version.id}
                      className={cn(
                        'group w-full text-left rounded-lg px-3 py-2.5 transition-all border',
                        isSelected
                          ? 'bg-violet-500/10 border-violet-500/30 ring-1 ring-violet-500/10'
                          : 'bg-zinc-800/20 border-transparent hover:bg-zinc-800/40 hover:border-zinc-700/30',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectPipeline(version.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              STATUS_COLORS[version.estado] || 'bg-zinc-600',
                            )}
                          />
                          {isEditing ? (
                            <div
                              className="flex items-center gap-1 flex-1 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                ref={editInputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmRename()
                                  if (e.key === 'Escape') cancelEditing()
                                }}
                                className="flex-1 min-w-0 bg-zinc-800 border border-violet-500/40 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
                              />
                              <button type="button" onClick={confirmRename} className="p-0.5 text-emerald-400 hover:text-emerald-300">
                                <Check className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={cancelEditing} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-zinc-200 truncate flex-1">
                                {label}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => startEditing(version.id, version.brief_snapshot || `v${versionNumber}`, e)}
                                className="p-0.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition-all shrink-0"
                                title="Renombrar"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3.5 mt-1">
                          <span className="text-[9px] text-zinc-500">
                            {timeAgo(version.actualizado_en)}
                          </span>
                          <span className="text-[9px] text-zinc-600 ml-auto">
                            {version.escenas_completas}/{version.total_escenas}
                          </span>
                        </div>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
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

import { useState, useRef } from 'react'
import { Download, Upload, Trash2, Loader2, ImageIcon, Check, Heart, Copy, MessageSquare, ArrowUpRight, Sparkles, Eraser, CheckSquare, Link, ChevronDown, X, Plus, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { studioApi, type StudioGeneration } from '@/services/api'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { toast } from 'sonner'

interface GalleryImageCardProps {
  generation: StudioGeneration
  onExport: () => void
  onDownload: () => void
  onDelete: () => void
}

export function GalleryImageCard({ generation, onExport, onDownload, onDelete }: GalleryImageCardProps) {
  const { selectedImageId } = useStudioAiStore()
  const setSelectedImageId = useStudioAiStore((s) => s.setSelectedImageId)
  const selectedImageIds = useStudioAiStore((s) => s.selectedImageIds)
  const toggleImageSelection = useStudioAiStore((s) => s.toggleImageSelection)
  const chatContextImageId = useStudioAiStore((s) => s.chatContextImageId)
  const setChatContextImageId = useStudioAiStore((s) => s.setChatContextImageId)
  const upscaleImage = useStudioAiStore((s) => s.upscaleImage)
  const autoEnhanceImage = useStudioAiStore((s) => s.autoEnhanceImage)
  const isUpscaling = useStudioAiStore((s) => s.isUpscaling)
  const isEnhancingImage = useStudioAiStore((s) => s.isEnhancingImage)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showUpscaleMenu, setShowUpscaleMenu] = useState(false)
  const [showTagEditor, setShowTagEditor] = useState(false)
  const isChatContext = chatContextImageId === generation.id
  const isSelected = selectedImageId === generation.id
  const isMultiSelected = selectedImageIds.has(generation.id)
  const isComplete = generation.estado === 'complete'
  const isFailed = generation.estado === 'failed'
  const isGenerating = generation.estado === 'generating' || generation.estado === 'pending'

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { data } = await studioApi.toggleFavorite(generation.id)
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === generation.id ? { ...g, is_favorito: data.is_favorite } : g
        ),
      }))
    } catch {
      toast.error('Error al cambiar favorito')
    }
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    useStudioAiStore.getState().loadFromGeneration(generation)
    useStudioAiStore.getState().setActiveTab('generate')
    toast.success('Prompt cargado — edita y genera')
  }

  const handlePinToChat = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isChatContext) {
      setChatContextImageId(null)
      toast.success('Contexto de chat liberado')
    } else {
      setChatContextImageId(generation.id)
      toast.success('Imagen fijada como contexto del chat')
    }
  }

  const handleUpscale = (e: React.MouseEvent, scale: number) => {
    e.stopPropagation()
    setShowUpscaleMenu(false)
    upscaleImage(generation.id, scale)
  }

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (generation.url_salida) {
      navigator.clipboard.writeText(generation.url_salida)
      toast.success('URL copiada al portapapeles')
    }
  }

  const handleEnhance = (e: React.MouseEvent) => {
    e.stopPropagation()
    autoEnhanceImage(generation.id)
  }

  const handleRemoveBg = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { data } = await studioApi.removeBackground(generation.id)
      useStudioStore.setState((s) => ({
        generations: [data, ...s.generations],
      }))
      useStudioAiStore.getState().setSelectedImageId(data.id)
      toast.success('Fondo removido')
    } catch {
      toast.error('Error al remover fondo')
    }
  }

  return (
    <div
      className={cn(
        'shrink-0 w-[140px] group cursor-pointer transition-all',
        isSelected && 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900 rounded-lg',
        isMultiSelected && !isSelected && 'ring-2 ring-violet-400/50 ring-offset-2 ring-offset-zinc-900 rounded-lg',
      )}
      onClick={(e) => {
        if (!isComplete) return
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          toggleImageSelection(generation.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })
        } else {
          setSelectedImageId(generation.id)
        }
      }}
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 relative">
        {isComplete && generation.url_salida ? (
          <img
            src={generation.url_salida}
            alt={generation.prompt}
            className="w-full h-full object-cover"
          />
        ) : isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : isFailed ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-red-500/60" />
          </div>
        ) : null}

        {/* Favorite heart (top-left, completed only) */}
        {isComplete && (
          <button
            onClick={handleToggleFavorite}
            className={cn(
              'absolute top-1 left-1 p-1 rounded-md transition-all z-[1]',
              generation.is_favorito
                ? 'text-red-400 bg-black/40'
                : 'text-zinc-400 bg-black/40 opacity-0 group-hover:opacity-100'
            )}
            aria-label={generation.is_favorito ? 'Quitar favorito' : 'Marcar favorito'}
            title={generation.is_favorito ? 'Quitar favorito' : 'Marcar favorito'}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={generation.is_favorito ? 'currentColor' : 'none'}
            />
          </button>
        )}

        {/* Chat context indicator */}
        {isChatContext && (
          <div className="absolute top-1 right-1 z-[2]">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300 border border-violet-400/30">
              <MessageSquare className="h-2.5 w-2.5" />
              <span className="text-[9px] font-medium">Chat</span>
            </span>
          </div>
        )}

        {/* Hover actions overlay */}
        {isComplete && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
            {/* Top row: main actions */}
            <div className="flex items-center gap-1.5">
              {!generation.media_id_salida ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onExport() }}
                  className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
                  aria-label="Exportar a Media"
                  title="Exportar a Media"
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400" title="Exportado">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <button
                onClick={handleDuplicate}
                className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
                aria-label="Duplicar"
                title="Duplicar"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCopyUrl}
                className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
                aria-label="Copiar URL"
                title="Copiar URL"
              >
                <Link className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handlePinToChat}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isChatContext
                    ? 'bg-violet-500/30 text-violet-300'
                    : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
                )}
                aria-label={isChatContext ? 'Desvincular del chat' : 'Fijar como contexto del chat'}
                title={isChatContext ? 'Desvincular del chat' : 'Fijar como contexto del chat'}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDownload() }}
                className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
                aria-label="Descargar"
                title="Descargar"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  confirmDelete
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-800/80 text-red-400 hover:text-red-300'
                )}
                aria-label={confirmDelete ? 'Confirmar eliminar' : 'Eliminar'}
                title={confirmDelete ? 'Click para confirmar' : 'Eliminar'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Bottom row: AI quick actions */}
            <div className="flex items-center gap-1">
              {/* Upscale dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUpscaleMenu(!showUpscaleMenu) }}
                  disabled={isUpscaling}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                  title="Escalar imagen"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Escalar</span>
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
                {showUpscaleMenu && (
                  <div className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 min-w-[70px]">
                    <button
                      onClick={(e) => handleUpscale(e, 2)}
                      className="w-full px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-left rounded-t-lg"
                    >
                      2x
                    </button>
                    <button
                      onClick={(e) => handleUpscale(e, 4)}
                      className="w-full px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-left rounded-b-lg"
                    >
                      4x
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleEnhance}
                disabled={isEnhancingImage}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                title="Mejorar"
              >
                <Sparkles className="h-3 w-3" />
                <span>Mejorar</span>
              </button>
              <button
                onClick={handleRemoveBg}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-300 hover:text-white transition-colors"
                title="Remover fondo"
              >
                <Eraser className="h-3 w-3" />
                <span>Fondo</span>
              </button>
            </div>
          </div>
        )}

        {/* Status badge */}
        {isFailed && (
          <div className="absolute top-1 left-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
              Error
            </span>
          </div>
        )}
        {isGenerating && (
          <div className="absolute top-1 left-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
              Generando
            </span>
          </div>
        )}
        {generation.media_id_salida && (
          <div className="absolute top-1 right-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
              CRM
            </span>
          </div>
        )}

        {/* Multi-selection checkmark */}
        {isMultiSelected && (
          <div className="absolute bottom-1 right-1 z-[2]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white">
              <CheckSquare className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>

      {/* Tags display + editor */}
      {isComplete && (
        <div className="mt-0.5 px-0.5">
          <div className="flex items-center gap-0.5 flex-wrap">
            {generation.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] bg-violet-500/10 text-violet-400 border border-violet-500/20"
              >
                {tag}
                {showTagEditor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const updated = (generation.tags ?? []).filter((t) => t !== tag)
                      studioApi.updateTags(generation.id, updated).then(({ data }) => {
                        useStudioStore.setState((s) => ({
                          generations: s.generations.map((g) =>
                            g.id === generation.id ? { ...g, tags: data.tags } : g
                          ),
                        }))
                        toast.success('Tag eliminado')
                      }).catch(() => toast.error('Error al eliminar tag'))
                    }}
                    className="text-violet-400 hover:text-red-400 transition-colors"
                    aria-label={`Quitar tag ${tag}`}
                  >
                    <X className="h-2 w-2" />
                  </button>
                )}
              </span>
            ))}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTagEditor(!showTagEditor)
              }}
              className="p-0.5 rounded text-zinc-600 hover:text-violet-400 transition-colors"
              title="Editar tags"
            >
              <Tag className="h-2.5 w-2.5" />
            </button>
          </div>
          {showTagEditor && (
            <TagEditorInline
              generationId={generation.id}
              currentTags={generation.tags ?? []}
            />
          )}
        </div>
      )}

      {/* Prompt label */}
      <p className="text-[10px] text-zinc-500 mt-1 truncate px-0.5">{generation.prompt}</p>
    </div>
  )
}

// ---- Inline Tag Editor ----

function TagEditorInline({ generationId, currentTags }: { generationId: number; currentTags: string[] }) {
  const [newTag, setNewTag] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAddTag = async () => {
    const trimmed = newTag.trim().toLowerCase()
    if (!trimmed) return
    if (currentTags.includes(trimmed)) {
      toast.error('Tag ya existe')
      return
    }
    setIsSaving(true)
    try {
      const updated = [...currentTags, trimmed]
      const { data } = await studioApi.updateTags(generationId, updated)
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === generationId ? { ...g, tags: data.tags } : g
        ),
      }))
      setNewTag('')
      inputRef.current?.focus()
    } catch {
      toast.error('Error al agregar tag')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="mt-1 flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleAddTag()
          }
        }}
        placeholder="nuevo tag..."
        className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[9px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
      />
      <button
        onClick={handleAddTag}
        disabled={!newTag.trim() || isSaving}
        className="p-0.5 rounded text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Agregar tag"
      >
        {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
      </button>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import {
  X,
  Heart,
  Download,
  Share2,
  Trash2,
  Copy,
  Check,
  Loader2,
  ImageIcon,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioCanvasStore } from '@/stores/studioCanvasStore'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { studioApi } from '@/services/api'

interface ImageDetailModalProps {
  generationId: number
  onClose: () => void
}

export function ImageDetailModal({ generationId, onClose }: ImageDetailModalProps) {
  const generations = useStudioStore((s) => s.generations)
  const deleteGeneration = useStudioStore((s) => s.deleteGeneration)
  const removeFromBoard = useStudioCanvasStore((s) => s.removeFromBoard)
  const setSelectedImageId = useStudioAiStore((s) => s.setSelectedImageId)
  const selectedImageId = useStudioAiStore((s) => s.selectedImageId)

  const gen = generations.find((g) => g.id === generationId) ?? null

  const [isFavLoading, setIsFavLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose])

  const handleToggleFavorite = async () => {
    if (!gen || isFavLoading) return
    setIsFavLoading(true)
    try {
      const { data } = await studioApi.toggleFavorite(gen.id)
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === gen.id ? { ...g, is_favorito: data.is_favorite } : g
        ),
      }))
    } catch {
      toast.error('Error al cambiar favorito')
    } finally {
      setIsFavLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!gen?.url_salida || isDownloading) return
    setIsDownloading(true)
    try {
      const response = await fetch(gen.url_salida)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `imagen_${gen.id}.${gen.output_format ?? 'png'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Imagen descargada')
    } catch {
      // Fallback: open in new tab
      window.open(gen.url_salida, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleExport = async () => {
    if (!gen || isExporting) return
    setIsExporting(true)
    try {
      const { data } = await studioApi.exportGeneration(gen.id)
      toast.success(data.mensaje || 'Asset exportado al CRM')
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === gen.id ? { ...g, media_id_salida: data.media_id } : g
        ),
      }))
    } catch {
      toast.error('Error al exportar al CRM')
    } finally {
      setIsExporting(false)
    }
  }

  const handleRemoveFromBoard = () => {
    removeFromBoard(generationId)
    if (selectedImageId === generationId) setSelectedImageId(null)
    handleClose()
    toast.success('Imagen quitada del tablero')
  }

  const handleDelete = async () => {
    if (!gen || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteGeneration(gen.id)
      removeFromBoard(gen.id)
      if (selectedImageId === gen.id) setSelectedImageId(null)
      handleClose()
    } catch {
      toast.error('Error al eliminar')
      setIsDeleting(false)
    }
  }

  const handleCopyPrompt = () => {
    if (!gen?.prompt) return
    navigator.clipboard.writeText(gen.prompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  if (!gen) return null

  const statusColors: Record<string, string> = {
    complete: 'text-emerald-400',
    failed: 'text-red-400',
    pending: 'text-amber-400',
    generating: 'text-violet-400',
  }

  const statusLabels: Record<string, string> = {
    complete: 'Completado',
    failed: 'Error',
    pending: 'Pendiente',
    generating: 'Generando',
  }

  const createdDate = new Date(gen.creado_en).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 flex w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: image */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center min-h-[400px] relative">
          {gen.url_salida ? (
            <img
              src={gen.url_salida}
              alt={gen.prompt}
              className="max-w-full max-h-[90vh] object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-zinc-600">
              <ImageIcon className="h-12 w-12" />
              <span className="text-sm">Sin imagen</span>
            </div>
          )}

          {/* Download overlay button on image */}
          {gen.url_salida && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-zinc-300 hover:text-white hover:bg-black/80 transition-all"
              title="Descargar imagen"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Descargar
            </button>
          )}
        </div>

        {/* Right: metadata + actions */}
        <div className="w-80 shrink-0 flex flex-col border-l border-zinc-800">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
            <span className="text-sm font-semibold text-zinc-200">Detalles</span>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Prompt
                </span>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {promptCopied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {promptCopied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/50 rounded-lg p-3">
                {gen.prompt}
              </p>
            </div>

            {/* Metadata grid */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 block">
                Metadata
              </span>
              <MetaRow label="Modelo" value={gen.modelo ?? '—'} />
              <MetaRow label="Ratio" value={gen.aspect_ratio} />
              <MetaRow label="Estilo" value={gen.estilo ?? '—'} />
              <MetaRow label="Formato" value={gen.output_format?.toUpperCase() ?? '—'} />
              <MetaRow
                label="Seed"
                value={gen.seed != null ? String(gen.seed) : '—'}
                mono
              />
              <MetaRow
                label="Estado"
                value={statusLabels[gen.estado] ?? gen.estado}
                valueClass={statusColors[gen.estado]}
              />
              {gen.media_id_salida && (
                <MetaRow label="CRM ID" value={String(gen.media_id_salida)} mono />
              )}
              <MetaRow label="Creado" value={createdDate} />
            </div>
          </div>

          {/* Actions footer */}
          <div className="px-5 py-4 border-t border-zinc-800 space-y-2 shrink-0">
            {/* Primary actions row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleToggleFavorite}
                disabled={isFavLoading}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                  gen.is_favorito
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                )}
              >
                {isFavLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Heart
                    className="h-3.5 w-3.5"
                    fill={gen.is_favorito ? 'currentColor' : 'none'}
                  />
                )}
                {gen.is_favorito ? 'Favorito' : 'Favorito'}
              </button>

              <button
                onClick={handleDownload}
                disabled={!gen.url_salida || isDownloading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Descargar
              </button>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || !!gen.media_id_salida}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                gen.media_id_salida
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500/60 cursor-default'
                  : 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              {gen.media_id_salida ? 'Ya exportado al CRM' : 'Exportar al CRM'}
            </button>

            <div className="border-t border-zinc-800/60 pt-2 space-y-1.5">
              <button
                onClick={handleRemoveFromBoard}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Quitar del tablero
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Eliminar imagen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaRow({
  label,
  value,
  mono,
  valueClass,
}: {
  label: string
  value: string
  mono?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <span
        className={cn(
          'text-[11px] text-right truncate max-w-[160px]',
          mono ? 'font-mono text-zinc-400' : 'text-zinc-300',
          valueClass,
        )}
      >
        {value}
      </span>
    </div>
  )
}

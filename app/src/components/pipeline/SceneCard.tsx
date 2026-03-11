import { useState, useEffect, useRef } from 'react'
import { Check, Loader2, AlertCircle, RefreshCw, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getVideoSrc, type PipelineScene } from '@/services/api'

interface Props {
  scene: PipelineScene
  onSelect: (sceneId: number) => void
  onRetry?: (sceneId: number) => void
}

// Collaboration-style status badges with updated labels and colors
const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Borrador', color: 'text-zinc-400', bg: 'bg-zinc-500/10', dot: 'bg-zinc-500' },
  generating: { label: 'Generando', color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  complete: { label: 'En revision', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  failed: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-500' },
  approved: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-500' },
}

export function SceneCard({ scene, onSelect, onRetry }: Props) {
  const status = statusConfig[scene.estado] || statusConfig.pending
  const isClickable = scene.estado === 'complete' || scene.estado === 'approved'
  const prevEstado = useRef(scene.estado)
  const [showCompleteFlash, setShowCompleteFlash] = useState(false)

  useEffect(() => {
    // Detect transition from generating to complete — trigger green flash
    if (prevEstado.current === 'generating' && scene.estado === 'complete') {
      setShowCompleteFlash(true)
      const timer = setTimeout(() => setShowCompleteFlash(false), 800)
      return () => clearTimeout(timer)
    }
    prevEstado.current = scene.estado
  }, [scene.estado])

  return (
    <div
      className={cn(
        'card-modern group overflow-hidden transition-all border-2',
        isClickable && 'cursor-pointer hover:border-primary/50',
        scene.estado === 'generating' && 'animate-generating-pulse',
        showCompleteFlash && 'animate-complete-flash',
        scene.estado !== 'generating' && !showCompleteFlash && 'border-transparent'
      )}
      onClick={() => (isClickable ? onSelect(scene.id) : undefined)}
    >
      {/* Thumbnail / Status Visual */}
      <div className="relative aspect-video w-full bg-muted">
        {/* Show video thumbnail if video_url exists regardless of state */}
        {scene.video_url && (scene.estado === 'complete' || scene.estado === 'approved') ? (
          <>
            <video
              src={getVideoSrc(scene.video_url)}
              className="h-full w-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-10 w-10 text-white" />
            </div>
            {scene.estado === 'approved' && (
              <div className="absolute right-2 top-2 rounded-full bg-green-500 p-1">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </>
        ) : scene.video_url && scene.estado !== 'generating' ? (
          /* Fallback: video_url exists but not in complete/approved — still show thumbnail */
          <video
            src={getVideoSrc(scene.video_url)}
            className="h-full w-full object-cover rounded"
            muted
            preload="metadata"
          />
        ) : scene.estado === 'generating' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <span className="text-xs text-muted-foreground">
              {scene.elapsed_sec ? `${scene.elapsed_sec}s` : 'Generando...'}
            </span>
          </div>
        ) : scene.estado === 'failed' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onRetry?.(scene.id)
              }}
              className="gap-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" /> Reintentar
            </Button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Escena {scene.orden}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium">Escena {scene.orden}</span>
          <div className="flex items-center gap-2">
            {/* Regenerate button for completed/failed scenes */}
            {(scene.estado === 'complete' || scene.estado === 'failed') && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry(scene.id)
                }}
                className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" /> Regenerar
              </Button>
            )}
            {/* Status badge with dot indicator */}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs',
                status.bg,
                status.color
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
          </div>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{scene.descripcion}</p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import {
  Play,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Check,
  Clock,
  Ratio,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/stores/pipelineStore'
import { MAX_SCENES, STATUS_CONFIG } from '@/constants/pipeline'
import { getVideoSrc, type PipelineScene } from '@/services/api'

export function ScenesTab() {
  const {
    pipeline,
    activeSceneId,
    setActiveScene,
    addScene,
    deleteScene,
    duplicateScene,
  } = usePipelineStore()

  const scenes = pipeline?.escenas ?? []
  const canAddScene = scenes.length < MAX_SCENES

  const handleAddScene = () => {
    if (!pipeline) return
    addScene(pipeline.id, {
      description: '',
      veo_prompt: '',
      duration_sec: 6,
      aspect_ratio: '16:9',
    })
  }

  if (!pipeline) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-zinc-600 text-center">
          Inicia un pipeline desde el centro para ver escenas aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-zinc-400">
            {scenes.length} escena{scenes.length !== 1 ? 's' : ''}
          </p>
          {canAddScene && (
            <button
              type="button"
              onClick={handleAddScene}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Agregar escena"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {scenes.map((scene) => (
          <SceneItem
            key={scene.id}
            scene={scene}
            isActive={activeSceneId === scene.id}
            onSelect={() => setActiveScene(scene.id)}
            onDuplicate={() => duplicateScene(scene.id)}
            onDelete={() => deleteScene(scene.id)}
          />
        ))}
      </div>
    </div>
  )
}

function SceneItem({
  scene,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  scene: PipelineScene
  isActive: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const status = STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirm) {
      onDelete()
      setDeleteConfirm(false)
    } else {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 3000)
    }
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group rounded-lg border p-2 cursor-pointer transition-all',
        isActive
          ? 'bg-violet-500/5 border-violet-500/30'
          : 'bg-zinc-800/20 border-zinc-700/20 hover:border-zinc-600/50',
      )}
    >
      <div className="flex items-center gap-2">
        {/* Thumbnail or status indicator */}
        <div className={cn(
          'w-10 h-10 rounded shrink-0 flex items-center justify-center overflow-hidden',
          scene.thumbnail_url || scene.video_url ? '' : 'bg-zinc-800/60',
        )}>
          {scene.thumbnail_url || scene.video_url ? (
            <video
              src={getVideoSrc(scene.video_url)}
              poster={scene.thumbnail_url ?? undefined}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : scene.estado === 'generating' ? (
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
          ) : scene.estado === 'failed' ? (
            <AlertTriangle className="h-4 w-4 text-red-400" />
          ) : scene.estado === 'approved' ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Play className="h-4 w-4 text-zinc-600" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-300">
              Escena {scene.orden}
            </span>
            <span className={cn('flex items-center gap-0.5 text-[10px]', status.color)}>
              {scene.estado === 'generating' ? (
                <Loader2 className="h-2 w-2 animate-spin" />
              ) : (
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              )}
              {status.label}
            </span>
          </div>
          {scene.descripcion && (
            <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
              {scene.descripcion}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-0.5 text-[9px] text-zinc-600">
              <Clock className="h-2 w-2" />
              {scene.duracion_seg}s
            </span>
            <span className="inline-flex items-center gap-0.5 text-[9px] text-zinc-600">
              <Ratio className="h-2 w-2" />
              {scene.aspect_ratio}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
            title="Duplicar"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'p-0.5 rounded transition-colors',
              deleteConfirm
                ? 'text-red-400 bg-red-500/10'
                : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10',
            )}
            title={deleteConfirm ? 'Confirmar' : 'Eliminar'}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback, useRef } from 'react'
import {
  Play,
  Loader2,
  Palette,
  Music,
  Gauge,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { usePipelineStore } from '@/stores/pipelineStore'
import type { PipelineScene } from '@/services/api'

const MAX_SCENES = 8

const DURATION_OPTIONS = [
  { value: '4', label: '4s' },
  { value: '6', label: '6s' },
  { value: '8', label: '8s' },
]

const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
]

const QUALITY_OPTIONS = [
  { value: 'vidu/q3',          label: 'Vidu Q3'           },
  { value: 'vidu/q3-turbo',    label: 'Vidu Q3 Turbo'     },
  { value: 'wan/2.6',          label: 'Wan 2.6'            },
  { value: 'seedance/1.5-pro', label: 'Seedance 1.5 Pro'  },
  { value: 'pixverse/5.5',     label: 'PixVerse v5.5'      },
  { value: 'pixverse/5.6',     label: 'PixVerse v5.6'      },
  { value: 'runway/gen-4.5',   label: 'Runway Gen-4.5'     },
]

interface Props {
  onReanalyze?: () => void
}

export function ScenePlanView({ onReanalyze }: Props) {
  const {
    pipeline,
    generateScenes,
    isLoading,
    updateScene,
    updateSceneRemote,
    addScene,
    deleteScene,
    duplicateScene,
    reorderScenes,
  } = usePipelineStore()

  const [quality, setQuality] = useState('vidu/q3')

  if (!pipeline) return null

  const styleGuide = pipeline.guia_estilo
  const scenes = pipeline.escenas
  const sceneCount = scenes.length
  const canAddScene = sceneCount < MAX_SCENES

  const handleGenerateAll = () => {
    generateScenes(undefined, quality)
  }

  const handleAddScene = () => {
    if (!canAddScene) return
    addScene(pipeline.id, {
      description: '',
      veo_prompt: '',
      duration_sec: 6,
      aspect_ratio: '16:9',
    })
  }

  const handleMoveScene = (sceneId: number, direction: 'up' | 'down') => {
    const idx = scenes.findIndex((s) => s.id === sceneId)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === scenes.length - 1) return

    const newScenes = [...scenes]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newScenes[idx], newScenes[swapIdx]] = [newScenes[swapIdx], newScenes[idx]]
    reorderScenes(newScenes.map((s) => s.id))
  }

  return (
    <div className="space-y-6">
      {/* Style Guide */}
      {styleGuide && (
        <div className="card-modern p-6">
          <h3 className="mb-4 text-lg font-semibold">Guia de Estilo</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm">
              <Palette className="h-4 w-4 text-primary" />
              <span className="font-medium">{styleGuide.mood}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm">
              <Music className="h-4 w-4 text-primary" />
              <span>{styleGuide.palette}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm">
              <Gauge className="h-4 w-4 text-primary" />
              <span>{styleGuide.pacing}</span>
            </div>
          </div>
          {styleGuide.visual_references && styleGuide.visual_references.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">
                Referencias: {styleGuide.visual_references.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scene Count + Re-analyze */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sceneCount} de {MAX_SCENES} escenas
        </p>
        {onReanalyze && (
          <Button variant="ghost" size="sm" onClick={onReanalyze} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Re-analizar Brief
          </Button>
        )}
      </div>

      {/* Scene Cards — Editable */}
      <div className="space-y-4">
        {scenes.map((scene, idx) => (
          <EditableSceneCard
            key={scene.id}
            scene={scene}
            isFirst={idx === 0}
            isLast={idx === scenes.length - 1}
            canDuplicate={canAddScene}
            onUpdate={(field, value) => {
              updateScene(scene.id, { [field]: value })
            }}
            onSave={(field, value) => {
              const apiField =
                field === 'descripcion'
                  ? 'description'
                  : field === 'veo_prompt'
                    ? 'veo_prompt'
                    : field === 'duracion_seg'
                      ? 'duration_sec'
                      : 'aspect_ratio'
              updateSceneRemote(scene.id, { [apiField]: value })
            }}
            onDelete={() => deleteScene(scene.id)}
            onDuplicate={() => duplicateScene(scene.id)}
            onMoveUp={() => handleMoveScene(scene.id, 'up')}
            onMoveDown={() => handleMoveScene(scene.id, 'down')}
          />
        ))}
      </div>

      {/* Add Scene Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={handleAddScene}
          disabled={!canAddScene}
          className="gap-2 border-dashed"
        >
          <Plus className="h-4 w-4" />
          Agregar Escena
          {!canAddScene && (
            <span className="text-xs text-muted-foreground">(max {MAX_SCENES})</span>
          )}
        </Button>
      </div>

      {/* Generation Controls */}
      <div className="card-modern space-y-4 p-6">
        <h3 className="text-sm font-semibold">Configuracion de generacion</h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Modelo de video
            </label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          onClick={handleGenerateAll}
          disabled={isLoading || scenes.length === 0}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          Generar Todos los Videos
        </Button>
      </div>
    </div>
  )
}

/* ───────────── Editable Scene Card ───────────── */

interface EditableSceneCardProps {
  scene: PipelineScene
  isFirst: boolean
  isLast: boolean
  canDuplicate: boolean
  onUpdate: (field: string, value: string | number) => void
  onSave: (field: string, value: string | number) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function EditableSceneCard({
  scene,
  isFirst,
  isLast,
  canDuplicate,
  onUpdate,
  onSave,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: EditableSceneCardProps) {
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleFieldChange = useCallback(
    (field: string, value: string | number) => {
      onUpdate(field, value)
      // Debounce the API save
      if (debounceRef.current[field]) {
        clearTimeout(debounceRef.current[field])
      }
      debounceRef.current[field] = setTimeout(() => {
        onSave(field, value)
      }, 800)
    },
    [onUpdate, onSave]
  )

  const handleSelectChange = useCallback(
    (field: string, value: string) => {
      const numericValue = field === 'duracion_seg' ? Number(value) : value
      onUpdate(field, numericValue)
      onSave(field, numericValue)
    },
    [onUpdate, onSave]
  )

  const promptLength = scene.veo_prompt?.length ?? 0

  return (
    <div className="card-modern overflow-hidden border border-zinc-700/50 transition-all hover:border-zinc-600/50">
      {/* Scene Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {scene.orden}
          </div>
          <span className="text-sm font-medium">Escena {scene.orden}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-zinc-800 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            title="Mover arriba"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-zinc-800 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            title="Mover abajo"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-zinc-700" />

          <button
            type="button"
            onClick={onDuplicate}
            disabled={!canDuplicate}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-zinc-800 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            title="Duplicar escena"
          >
            <Copy className="h-4 w-4" />
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Eliminar escena"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar Escena {scene.orden}</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta accion eliminara permanentemente esta escena y su configuracion.
                  No se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Scene Body */}
      <div className="space-y-4 p-5">
        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Descripcion
          </label>
          <Textarea
            value={scene.descripcion ?? ''}
            onChange={(e) => handleFieldChange('descripcion', e.target.value)}
            placeholder="Describe la escena..."
            className="min-h-[60px] resize-none bg-zinc-800/50"
            rows={2}
          />
        </div>

        {/* Veo Prompt */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Prompt de Veo</label>
            <span className="text-xs text-muted-foreground/60">{promptLength} caracteres</span>
          </div>
          <Textarea
            value={scene.veo_prompt ?? ''}
            onChange={(e) => handleFieldChange('veo_prompt', e.target.value)}
            placeholder="Prompt para la generacion del video..."
            className="min-h-[100px] resize-none bg-zinc-800/50 font-mono text-xs leading-relaxed"
            rows={4}
          />
        </div>

        {/* Duration + Aspect Ratio */}
        <div className="flex items-center gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Duracion
            </label>
            <Select
              value={String(scene.duracion_seg)}
              onValueChange={(v) => handleSelectChange('duracion_seg', v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Aspect Ratio
            </label>
            <Select
              value={scene.aspect_ratio}
              onValueChange={(v) => handleSelectChange('aspect_ratio', v)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { usePipelineStore } from '@/stores/pipelineStore'
import { SceneCard } from './SceneCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const QUALITY_OPTIONS = [
  { value: 'vidu/q3',       label: 'Vidu Q3'          },
  { value: 'vidu/q3-turbo', label: 'Vidu Q3 Turbo'    },
  { value: 'wan/2.6',       label: 'Wan 2.6'           },
  { value: 'seedance/1.5-pro', label: 'Seedance 1.5 Pro' },
  { value: 'pixverse/5.5',  label: 'PixVerse v5.5'     },
  { value: 'pixverse/5.6',  label: 'PixVerse v5.6'     },
  { value: 'runway/gen-4.5',label: 'Runway Gen-4.5'    },
]

export function GenerationGrid() {
  const { pipeline, setActiveScene, generateSingleScene } = usePipelineStore()
  const [regenQuality, setRegenQuality] = useState('vidu/q3')

  if (!pipeline) return null

  const scenes = pipeline.escenas
  const complete = scenes.filter(
    (s) => s.estado === 'complete' || s.estado === 'approved'
  ).length
  const generating = scenes.filter((s) => s.estado === 'generating').length
  const pct = scenes.length > 0 ? (complete / scenes.length) * 100 : 0

  // Estimated remaining time based on average elapsed per completed scene
  const estimatedRemaining = useMemo(() => {
    const completedScenes = scenes.filter(
      (s) => (s.estado === 'complete' || s.estado === 'approved') && s.elapsed_sec
    )
    if (completedScenes.length === 0 || generating === 0) return null
    const avgTime =
      completedScenes.reduce((acc, s) => acc + (s.elapsed_sec ?? 0), 0) /
      completedScenes.length
    const remaining = scenes.length - complete
    const secs = Math.round(avgTime * remaining)
    if (secs < 60) return `~${secs}s`
    return `~${Math.round(secs / 60)}min`
  }, [scenes, complete, generating])

  const handleRetry = (sceneId: number) => {
    generateSingleScene(sceneId, regenQuality)
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="card-modern p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {complete} de {scenes.length} escenas completadas
          </span>
          <div className="flex items-center gap-3">
            {estimatedRemaining && generating > 0 && (
              <span className="text-xs text-muted-foreground">
                Restante: {estimatedRemaining}
              </span>
            )}
            <span className="font-medium">{Math.round(pct)}%</span>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Quality selector */}
      <div className="card-modern flex items-center justify-between p-4">
        <span className="text-sm text-muted-foreground">Progreso de generacion</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Calidad para regenerar:</label>
            <Select value={regenQuality} onValueChange={setRegenQuality}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
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
          <span className="text-sm font-medium">
            {complete} de {scenes.length} escenas completas
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            onSelect={setActiveScene}
            onRetry={handleRetry}
          />
        ))}
      </div>
    </div>
  )
}

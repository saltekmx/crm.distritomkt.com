import { useEffect, useState } from 'react'
import {
  Clapperboard,
  Loader2,
  Sparkles,
  Play,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  Ratio,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore, type UIStage } from '@/stores/pipelineStore'
import { usePipelineWebSocket } from '@/hooks/usePipelineWebSocket'
import type { PipelineScene } from '@/services/api'

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_SCENES = 8

const DURATION_OPTIONS = [
  { value: 4, label: '4s' },
  { value: 6, label: '6s' },
  { value: 8, label: '8s' },
]

const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
]

const QUALITY_OPTIONS = [
  { value: 'veo-3.1-fast', label: 'Veo 3.1 Fast' },
  { value: 'veo-3.1', label: 'Veo 3.1 HQ' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pendiente', color: 'text-zinc-400', dot: 'bg-zinc-500' },
  generating: { label: 'Generando', color: 'text-amber-400', dot: 'bg-amber-500' },
  complete: { label: 'Completo', color: 'text-blue-400', dot: 'bg-blue-500' },
  failed: { label: 'Error', color: 'text-red-400', dot: 'bg-red-500' },
  approved: { label: 'Aprobado', color: 'text-green-400', dot: 'bg-green-500' },
}

// ── Props ────────────────────────────────────────────────────────────────────

interface VideoTabProps {
  projectId: number
}

// ── Main Component ───────────────────────────────────────────────────────────

export function VideoTab({ projectId }: VideoTabProps) {
  const {
    pipeline,
    currentStage,
    activeSceneId,
    isLoading,
    exportProgress,
    exportedMediaIds,
    initPipeline,
    startPipeline,
    generateScenes,
    approveScene,
    exportPipeline,
    setActiveScene,
    updateScene,
    updateSceneRemote,
    addScene,
    deleteScene,
    generateSingleScene,
  } = usePipelineStore()

  const [briefText, setBriefText] = useState('')
  const [quality, setQuality] = useState('veo-3.1-fast')
  const [exportFormat, setExportFormat] = useState('mp4')

  // Init pipeline on mount
  useEffect(() => {
    initPipeline(projectId)
  }, [projectId, initPipeline])

  // Pre-fill brief when pipeline loads
  useEffect(() => {
    if (pipeline?.brief_snapshot && !briefText) {
      setBriefText(pipeline.brief_snapshot)
    }
  }, [pipeline?.brief_snapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket for live updates
  usePipelineWebSocket(pipeline?.id ?? null)

  const handleStartPipeline = () => {
    const override = briefText.trim() || undefined
    startPipeline(projectId, override)
  }

  const handleReanalyze = () => {
    const override = briefText.trim() || undefined
    startPipeline(projectId, override)
  }

  const handleGenerateAll = () => {
    generateScenes(undefined, quality)
  }

  const handleAddScene = () => {
    if (!pipeline) return
    addScene(pipeline.id, {
      description: '',
      veo_prompt: '',
      duration_sec: 6,
      aspect_ratio: '16:9',
    })
  }

  const handleExport = () => {
    exportPipeline(exportFormat)
  }

  // Derive stage label for header
  const stageLabel = getStageLabel(currentStage)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Video Pipeline</h2>
        </div>
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded',
          currentStage === 'idle' && 'text-zinc-500 bg-zinc-800',
          currentStage === 'brief' && 'text-amber-400 bg-amber-500/10',
          currentStage === 'planned' && 'text-violet-400 bg-violet-500/10',
          currentStage === 'generating' && 'text-amber-400 bg-amber-500/10',
          currentStage === 'review' && 'text-blue-400 bg-blue-500/10',
          currentStage === 'export' && 'text-green-400 bg-green-500/10',
        )}>
          {stageLabel}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* IDLE: No pipeline — show brief editor */}
        {currentStage === 'idle' && (
          <IdleStage
            briefText={briefText}
            setBriefText={setBriefText}
            isLoading={isLoading}
            onAnalyze={handleStartPipeline}
          />
        )}

        {/* BRIEF: Analyzing with AI */}
        {currentStage === 'brief' && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-4">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            <p className="text-xs text-zinc-400 text-center">
              Analizando brief con IA...
            </p>
            <p className="text-[10px] text-zinc-600 text-center">
              El agente Director esta creando el plan de escenas
            </p>
          </div>
        )}

        {/* PLANNED: Scene list with edit + generate */}
        {currentStage === 'planned' && pipeline && (
          <PlannedStage
            pipeline={pipeline}
            activeSceneId={activeSceneId}
            quality={quality}
            setQuality={setQuality}
            isLoading={isLoading}
            onSetActiveScene={setActiveScene}
            onUpdateScene={updateScene}
            onUpdateSceneRemote={updateSceneRemote}
            onDeleteScene={deleteScene}
            onAddScene={handleAddScene}
            onGenerateAll={handleGenerateAll}
            onReanalyze={handleReanalyze}
          />
        )}

        {/* GENERATING: Scene list with progress */}
        {currentStage === 'generating' && pipeline && (
          <GeneratingStage
            pipeline={pipeline}
            activeSceneId={activeSceneId}
            quality={quality}
            onSetActiveScene={setActiveScene}
            onRetry={(sceneId) => generateSingleScene(sceneId, quality)}
          />
        )}

        {/* REVIEW: Scene list with approve/revise */}
        {currentStage === 'review' && pipeline && (
          <ReviewStage
            pipeline={pipeline}
            activeSceneId={activeSceneId}
            onSetActiveScene={setActiveScene}
            onApprove={approveScene}
            onRetry={(sceneId) => generateSingleScene(sceneId, quality)}
          />
        )}

        {/* EXPORT: Export controls */}
        {currentStage === 'export' && pipeline && (
          <ExportStage
            pipeline={pipeline}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            isLoading={isLoading}
            exportProgress={exportProgress}
            exportedMediaIds={exportedMediaIds}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  )
}

// ── Stage Components ─────────────────────────────────────────────────────────

function IdleStage({
  briefText,
  setBriefText,
  isLoading,
  onAnalyze,
}: {
  briefText: string
  setBriefText: (v: string) => void
  isLoading: boolean
  onAnalyze: () => void
}) {
  return (
    <div className="p-3 space-y-3">
      <div>
        <label className="text-[11px] font-medium text-zinc-400 mb-1.5 block">
          Brief del proyecto
        </label>
        <textarea
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          placeholder="Describe el proyecto, objetivos, publico objetivo, tono deseado..."
          className="w-full min-h-[120px] resize-none rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          rows={6}
        />
        <p className="mt-1 text-[10px] text-zinc-600">
          La IA analizara el brief para crear un plan de escenas de video.
        </p>
      </div>
      <button
        type="button"
        onClick={onAnalyze}
        disabled={isLoading || !briefText.trim()}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          briefText.trim() && !isLoading
            ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25'
            : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isLoading ? 'Analizando...' : 'Analizar Brief con IA'}
      </button>
    </div>
  )
}

// ── Planned Stage ────────────────────────────────────────────────────────────

function PlannedStage({
  pipeline,
  activeSceneId,
  quality,
  setQuality,
  isLoading,
  onSetActiveScene,
  onUpdateScene,
  onUpdateSceneRemote,
  onDeleteScene,
  onAddScene,
  onGenerateAll,
  onReanalyze,
}: {
  pipeline: NonNullable<ReturnType<typeof usePipelineStore.getState>['pipeline']>
  activeSceneId: number | null
  quality: string
  setQuality: (v: string) => void
  isLoading: boolean
  onSetActiveScene: (id: number) => void
  onUpdateScene: (id: number, updates: Partial<PipelineScene>) => void
  onUpdateSceneRemote: (id: number, data: Partial<{ description: string; veo_prompt: string; duration_sec: number; aspect_ratio: string }>) => Promise<void>
  onDeleteScene: (id: number) => Promise<void>
  onAddScene: () => void
  onGenerateAll: () => void
  onReanalyze: () => void
}) {
  const scenes = pipeline.escenas
  const styleGuide = pipeline.guia_estilo
  const canAddScene = scenes.length < MAX_SCENES

  return (
    <div className="p-3 space-y-3">
      {/* Style Guide (compact) */}
      {styleGuide && (
        <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Guia de Estilo
          </p>
          <div className="flex flex-wrap gap-1.5">
            {styleGuide.mood && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
                {styleGuide.mood}
              </span>
            )}
            {styleGuide.palette && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
                {styleGuide.palette}
              </span>
            )}
            {styleGuide.pacing && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
                {styleGuide.pacing}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scene count */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-zinc-500">{scenes.length} de {MAX_SCENES} escenas</p>
      </div>

      {/* Scene cards */}
      <div className="space-y-2">
        {scenes.map((scene, idx) => (
          <CompactSceneCard
            key={scene.id}
            scene={scene}
            index={idx}
            total={scenes.length}
            isActive={activeSceneId === scene.id}
            mode="planned"
            onSelect={() => onSetActiveScene(scene.id)}
            onUpdateLocal={(updates) => onUpdateScene(scene.id, updates)}
            onSaveRemote={(data) => onUpdateSceneRemote(scene.id, data)}
            onDelete={() => onDeleteScene(scene.id)}
          />
        ))}
      </div>

      {/* Add scene */}
      {canAddScene && (
        <button
          type="button"
          onClick={onAddScene}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-zinc-700/50 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar Escena
        </button>
      )}

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Quality selector */}
      <div>
        <label className="text-[10px] font-medium text-zinc-500 mb-1 block">Modelo</label>
        <div className="flex gap-1.5">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setQuality(opt.value)}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                quality === opt.value
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                  : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate all */}
      <button
        type="button"
        onClick={onGenerateAll}
        disabled={isLoading || scenes.length === 0}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          !isLoading && scenes.length > 0
            ? 'bg-violet-600 text-white hover:bg-violet-500'
            : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Generar Todos los Videos
      </button>

      {/* Re-analyze */}
      <button
        type="button"
        onClick={onReanalyze}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Re-analizar Brief
      </button>
    </div>
  )
}

// ── Generating Stage ─────────────────────────────────────────────────────────

function GeneratingStage({
  pipeline,
  activeSceneId,
  quality,
  onSetActiveScene,
  onRetry,
}: {
  pipeline: NonNullable<ReturnType<typeof usePipelineStore.getState>['pipeline']>
  activeSceneId: number | null
  quality: string
  onSetActiveScene: (id: number) => void
  onRetry: (sceneId: number) => void
}) {
  const scenes = pipeline.escenas
  const complete = scenes.filter((s) => s.estado === 'complete' || s.estado === 'approved').length
  const pct = scenes.length > 0 ? (complete / scenes.length) * 100 : 0

  return (
    <div className="p-3 space-y-3">
      {/* Progress bar */}
      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            {complete} de {scenes.length} escenas completas
          </span>
          <span className="text-[11px] font-medium text-zinc-300">{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700/50">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Scene cards with status */}
      <div className="space-y-2">
        {scenes.map((scene, idx) => (
          <CompactSceneCard
            key={scene.id}
            scene={scene}
            index={idx}
            total={scenes.length}
            isActive={activeSceneId === scene.id}
            mode="generating"
            onSelect={() => onSetActiveScene(scene.id)}
            onRetry={() => onRetry(scene.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Review Stage ─────────────────────────────────────────────────────────────

function ReviewStage({
  pipeline,
  activeSceneId,
  onSetActiveScene,
  onApprove,
  onRetry,
}: {
  pipeline: NonNullable<ReturnType<typeof usePipelineStore.getState>['pipeline']>
  activeSceneId: number | null
  onSetActiveScene: (id: number) => void
  onApprove: (sceneId: number) => Promise<void>
  onRetry: (sceneId: number) => void
}) {
  const scenes = pipeline.escenas
  const approved = scenes.filter((s) => s.aprobado).length
  const allApproved = approved === scenes.length && scenes.length > 0

  return (
    <div className="p-3 space-y-3">
      {/* Approval progress */}
      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            {approved} de {scenes.length} aprobadas
          </span>
          {allApproved && (
            <span className="text-[10px] font-medium text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Listo para exportar
            </span>
          )}
        </div>
      </div>

      {/* Scene cards with approve/revise actions */}
      <div className="space-y-2">
        {scenes.map((scene, idx) => (
          <CompactSceneCard
            key={scene.id}
            scene={scene}
            index={idx}
            total={scenes.length}
            isActive={activeSceneId === scene.id}
            mode="review"
            onSelect={() => onSetActiveScene(scene.id)}
            onApprove={() => onApprove(scene.id)}
            onRetry={() => onRetry(scene.id)}
          />
        ))}
      </div>

      {/* Transition to export */}
      {allApproved && (
        <button
          type="button"
          onClick={() => usePipelineStore.getState().setStage('export')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-all"
        >
          <Download className="h-4 w-4" />
          Continuar a Exportar
        </button>
      )}
    </div>
  )
}

// ── Export Stage ──────────────────────────────────────────────────────────────

function ExportStage({
  pipeline,
  exportFormat,
  setExportFormat,
  isLoading,
  exportProgress,
  exportedMediaIds,
  onExport,
}: {
  pipeline: NonNullable<ReturnType<typeof usePipelineStore.getState>['pipeline']>
  exportFormat: string
  setExportFormat: (f: string) => void
  isLoading: boolean
  exportProgress: { step: number; total: number } | null
  exportedMediaIds: number[]
  onExport: () => void
}) {
  const approved = pipeline.escenas.filter((s) => s.aprobado)
  const totalDuration = approved.reduce((acc, s) => acc + (s.duracion_seg ?? 0), 0)
  const isExported = pipeline.estado === 'exported'
  const isExporting = isLoading && pipeline.estado === 'exporting'

  return (
    <div className="p-3 space-y-3">
      {/* Summary */}
      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-2.5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Resumen
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-200">{approved.length}</p>
            <p className="text-[10px] text-zinc-500">Escenas</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-200">{totalDuration}s</p>
            <p className="text-[10px] text-zinc-500">Duracion</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-200">{exportFormat.toUpperCase()}</p>
            <p className="text-[10px] text-zinc-500">Formato</p>
          </div>
        </div>
      </div>

      {/* Format selector */}
      {!isExported && (
        <div>
          <label className="text-[10px] font-medium text-zinc-500 mb-1 block">Formato</label>
          <div className="flex gap-1.5">
            {['mp4', 'webm'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                disabled={isExporting}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
                  exportFormat === fmt
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                    : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300',
                  isExporting && 'opacity-50 cursor-not-allowed',
                )}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Export progress */}
      {isExporting && exportProgress && (
        <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Exportando {exportProgress.step} de {exportProgress.total}...
            </span>
            <span className="text-[11px] font-medium text-zinc-300">
              {Math.round((exportProgress.step / exportProgress.total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700/50">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${(exportProgress.step / exportProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Export button or success state */}
      {isExported ? (
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-green-400 text-xs font-medium">
            <Check className="h-3.5 w-3.5" />
            Videos exportados al CRM
          </div>
          <p className="text-[10px] text-zinc-600">
            Disponibles en la biblioteca de medios del proyecto
          </p>
          {/* Download buttons for each scene */}
          <div className="space-y-1">
            {approved.filter((s) => s.video_url).map((scene) => (
              <button
                key={scene.id}
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = scene.video_url!
                  a.download = `escena-${scene.orden}.${exportFormat}`
                  a.click()
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
              >
                <span>Escena {scene.orden}</span>
                <Download className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onExport}
          disabled={isLoading || approved.length === 0}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            !isLoading && approved.length > 0
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting ? 'Exportando...' : 'Exportar al CRM'}
        </button>
      )}
    </div>
  )
}

// ── Compact Scene Card ───────────────────────────────────────────────────────

interface CompactSceneCardProps {
  scene: PipelineScene
  index: number
  total: number
  isActive: boolean
  mode: 'planned' | 'generating' | 'review'
  onSelect: () => void
  onUpdateLocal?: (updates: Partial<PipelineScene>) => void
  onSaveRemote?: (data: Partial<{ description: string; veo_prompt: string; duration_sec: number; aspect_ratio: string }>) => Promise<void>
  onDelete?: () => void
  onApprove?: () => void
  onRetry?: () => void
}

function CompactSceneCard({
  scene,
  index,
  total,
  isActive,
  mode,
  onSelect,
  onUpdateLocal,
  onSaveRemote,
  onDelete,
  onApprove,
  onRetry,
}: CompactSceneCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editDesc, setEditDesc] = useState(scene.descripcion ?? '')
  const [editPrompt, setEditPrompt] = useState(scene.veo_prompt ?? '')
  const [editDuration, setEditDuration] = useState(scene.duracion_seg)
  const [editAspect, setEditAspect] = useState(scene.aspect_ratio)

  const status = STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditDesc(scene.descripcion ?? '')
    setEditPrompt(scene.veo_prompt ?? '')
    setEditDuration(scene.duracion_seg)
    setEditAspect(scene.aspect_ratio)
    setIsEditing(true)
  }

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onUpdateLocal && onSaveRemote) {
      onUpdateLocal({
        descripcion: editDesc,
        veo_prompt: editPrompt,
        duracion_seg: editDuration,
        aspect_ratio: editAspect,
      })
      onSaveRemote({
        description: editDesc,
        veo_prompt: editPrompt,
        duration_sec: editDuration,
        aspect_ratio: editAspect,
      })
    }
    setIsEditing(false)
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirm) {
      onDelete?.()
      setDeleteConfirm(false)
    } else {
      setDeleteConfirm(true)
      // Auto-cancel after 3s
      setTimeout(() => setDeleteConfirm(false), 3000)
    }
  }

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onApprove?.()
  }

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRetry?.()
  }

  // Edit mode: expanded form
  if (isEditing) {
    return (
      <div
        className="rounded-lg bg-zinc-800/60 border border-violet-500/30 p-2.5 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-300">
            Escena {scene.orden} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="p-1 rounded text-green-400 hover:bg-green-500/10 transition-colors"
              title="Guardar"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1 rounded text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-0.5 block">Descripcion</label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="w-full min-h-[48px] resize-none rounded bg-zinc-900/60 border border-zinc-700/50 px-2 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
            rows={2}
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-0.5 block">Prompt de Veo</label>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="w-full min-h-[64px] resize-none rounded bg-zinc-900/60 border border-zinc-700/50 px-2 py-1.5 text-[11px] text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
            rows={3}
          />
        </div>

        {/* Duration + Aspect */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 mb-0.5 block">Duracion</label>
            <select
              value={editDuration}
              onChange={(e) => setEditDuration(Number(e.target.value))}
              className="w-full rounded bg-zinc-900/60 border border-zinc-700/50 px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/50"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 mb-0.5 block">Aspecto</label>
            <select
              value={editAspect}
              onChange={(e) => setEditAspect(e.target.value)}
              className="w-full rounded bg-zinc-900/60 border border-zinc-700/50 px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/50"
            >
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }

  // Collapsed card
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group rounded-lg border p-2.5 cursor-pointer transition-all',
        isActive
          ? 'bg-violet-500/5 border-violet-500/30'
          : 'bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600/50',
      )}
    >
      {/* Top row: scene number, status, actions */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-300">
            Escena {scene.orden}
          </span>
          {/* Status badge */}
          <span className={cn('flex items-center gap-1 text-[10px]', status.color)}>
            {scene.estado === 'generating' ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            )}
            {status.label}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {mode === 'planned' && (
            <>
              <button
                type="button"
                onClick={handleStartEdit}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Editar"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className={cn(
                  'p-1 rounded transition-colors',
                  deleteConfirm
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10',
                )}
                title={deleteConfirm ? 'Confirmar eliminar' : 'Eliminar'}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}

          {mode === 'generating' && scene.estado === 'failed' && (
            <button
              type="button"
              onClick={handleRetry}
              className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Reintentar"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}

          {mode === 'review' && (
            <>
              {(scene.estado === 'complete' || scene.estado === 'failed') && !scene.aprobado && (
                <button
                  type="button"
                  onClick={handleApprove}
                  className="p-1 rounded text-green-400 hover:bg-green-500/10 transition-colors"
                  title="Aprobar"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
              {scene.estado === 'failed' && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Reintentar"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {scene.descripcion && (
        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-1.5 leading-relaxed">
          {scene.descripcion}
        </p>
      )}

      {/* Metadata row: duration + aspect + approved badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock className="h-2.5 w-2.5" />
          {scene.duracion_seg}s
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
          <Ratio className="h-2.5 w-2.5" />
          {scene.aspect_ratio}
        </span>
        {scene.aprobado && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400">
            <Check className="h-2.5 w-2.5" />
            Aprobado
          </span>
        )}
        {scene.estado === 'generating' && scene.elapsed_sec != null && (
          <span className="text-[10px] text-amber-400">
            {scene.elapsed_sec}s
          </span>
        )}
      </div>

      {/* Prompt (collapsible) */}
      {scene.veo_prompt && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPromptExpanded(!promptExpanded)
            }}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {promptExpanded ? (
              <ChevronUp className="h-2.5 w-2.5" />
            ) : (
              <ChevronDown className="h-2.5 w-2.5" />
            )}
            {promptExpanded ? 'ocultar prompt' : 'ver prompt'}
          </button>
          {promptExpanded && (
            <p className="mt-1 text-[10px] text-zinc-500 font-mono leading-relaxed bg-zinc-900/40 rounded p-1.5 border border-zinc-800/50">
              {scene.veo_prompt}
            </p>
          )}
        </div>
      )}

      {/* Video thumbnail (compact) for completed scenes */}
      {scene.video_url && (scene.estado === 'complete' || scene.estado === 'approved') && (
        <div className="mt-2 relative rounded overflow-hidden h-16">
          <video
            src={scene.video_url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
            <Play className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStageLabel(stage: UIStage): string {
  const labels: Record<UIStage, string> = {
    idle: 'Sin iniciar',
    brief: 'Analizando',
    planned: 'Planificado',
    generating: 'Generando',
    review: 'Revision',
    export: 'Exportar',
  }
  return labels[stage] ?? stage
}

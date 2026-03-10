import { useEffect, useState, useCallback } from 'react'
import {
  Clapperboard,
  Loader2,
  Sparkles,
  Play,
  Pause,
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
  Video,
  AlertTriangle,
  Maximize,
  Repeat,
  CheckCircle2,
  StopCircle,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore, type UIStage } from '@/stores/pipelineStore'
import { useStudioStore } from '@/stores/studioStore'
import { usePipelineWebSocket } from '@/hooks/usePipelineWebSocket'
import { pipelineApi, getVideoSrc, type PipelineScene } from '@/services/api'
import { MAX_SCENES, STATUS_CONFIG } from '@/constants/pipeline'
import { useRef } from 'react'
import { toast } from 'sonner'

// ── Constants ────────────────────────────────────────────────────────────────

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

const STAGE_LABELS: Record<UIStage, string> = {
  idle: 'Sin iniciar',
  brief: 'Analizando',
  planned: 'Planificado',
  generating: 'Generando',
  review: 'Revision',
  export: 'Exportar',
}

// ── Props ────────────────────────────────────────────────────────────────────

interface StudioVideoPipelineProps {
  projectId: number | null
}

// ── Main Component ───────────────────────────────────────────────────────────

export function StudioVideoPipeline({ projectId }: StudioVideoPipelineProps) {
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
    cancelGeneration,
    setSceneReferenceAsset,
  } = usePipelineStore()

  const [briefText, setBriefText] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [quality, setQuality] = useState('veo-3.1-fast')
  const [exportFormat, setExportFormat] = useState('mp4')

  const { reset: resetPipeline } = usePipelineStore()

  // Init pipeline on mount or project change
  useEffect(() => {
    if (projectId) {
      resetPipeline()
      setBriefText('')
      setSelectedImages([])
      initPipeline(projectId)
    } else {
      resetPipeline()
    }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill brief when pipeline loads
  useEffect(() => {
    if (pipeline?.brief_snapshot && !briefText) {
      setBriefText(pipeline.brief_snapshot)
    }
  }, [pipeline?.brief_snapshot]) // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket for live updates
  const { connectionLost } = usePipelineWebSocket(pipeline?.id ?? null)

  const handleStartPipeline = () => {
    if (!projectId) return
    const override = briefText.trim() || undefined
    startPipeline(projectId, override, selectedImages.length ? selectedImages : undefined)
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

  const handleCancel = () => {
    if (!pipeline) return
    cancelGeneration(pipeline.id)
  }

  const handleDropReferenceOnScene = async (sceneId: number, imageUrl: string) => {
    if (!pipeline) return
    try {
      const { data: asset } = await pipelineApi.importAssetUrl(pipeline.id, imageUrl, 'drag-reference.png')
      await setSceneReferenceAsset(sceneId, asset.id)
      toast.success('Referencia asignada')
    } catch {
      toast.error('Error al asignar referencia')
    }
  }

  // No project selected — show welcome screen
  if (projectId === null) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
              <Clapperboard className="h-10 w-10 text-violet-400/60" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-300">Video Pipeline</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Selecciona un proyecto del panel izquierdo para ver su pipeline de video, o inicia uno nuevo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Connection lost banner */}
      {connectionLost && pipeline && (
        <div className="relative z-20 px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-[11px] text-red-300">
            Conexion perdida. Las actualizaciones en tiempo real no estan disponibles.
          </p>
        </div>
      )}

      {/* Pipeline Stepper */}
      <PipelineStepper currentStage={currentStage} onStageClick={(stage) => {
        usePipelineStore.getState().setStage(stage)
      }} />

      {/* Center content — changes per stage */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        {currentStage === 'idle' && (
          <IdleStage
            briefText={briefText}
            setBriefText={setBriefText}
            isLoading={isLoading}
            onAnalyze={handleStartPipeline}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
          />
        )}

        {currentStage === 'brief' && <BriefStage />}

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
            onReanalyze={handleStartPipeline}
            onDropReferenceOnScene={handleDropReferenceOnScene}
          />
        )}

        {currentStage === 'generating' && pipeline && (
          <GeneratingStage
            pipeline={pipeline}
            activeSceneId={activeSceneId}
            quality={quality}
            onSetActiveScene={setActiveScene}
            onRetry={(sceneId) => generateSingleScene(sceneId, quality)}
            onCancel={handleCancel}
          />
        )}

        {currentStage === 'review' && pipeline && (
          <ReviewStage
            pipeline={pipeline}
            activeSceneId={activeSceneId}
            onSetActiveScene={setActiveScene}
            onApprove={approveScene}
            onRetry={(sceneId) => generateSingleScene(sceneId, quality)}
          />
        )}

        {currentStage === 'export' && pipeline && (
          <ExportStage
            pipeline={pipeline}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            isLoading={isLoading}
            exportProgress={exportProgress}
            exportedMediaIds={exportedMediaIds}
            onExport={handleExport}
            onNewPipeline={() => {
              resetPipeline()
              setBriefText('')
              setSelectedImages([])
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── Pipeline Stepper ─────────────────────────────────────────────────────────

const STAGES: UIStage[] = ['idle', 'brief', 'planned', 'generating', 'review', 'export']

function PipelineStepper({ currentStage, onStageClick }: { currentStage: UIStage; onStageClick: (stage: UIStage) => void }) {
  const currentIdx = STAGES.indexOf(currentStage)

  return (
    <div className="relative z-10 px-6 py-3 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1">
        {STAGES.map((stage, idx) => {
          const isActive = idx === currentIdx
          const isDone = idx < currentIdx
          return (
            <div key={stage} className="flex items-center">
              {idx > 0 && (
                <div className={cn(
                  'w-8 h-px mx-1',
                  isDone ? 'bg-violet-500/50' : 'bg-zinc-800',
                )} />
              )}
              <button
                type="button"
                onClick={() => {
                  if (isDone || isActive) onStageClick(stage)
                }}
                disabled={!isDone && !isActive}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                  isActive && 'bg-violet-500/15 text-violet-300 border border-violet-500/30',
                  isDone && 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300 cursor-pointer',
                  !isActive && !isDone && 'text-zinc-600 cursor-default',
                )}
              >
                {STAGE_LABELS[stage]}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Studio Gallery Picker ────────────────────────────────────────────────────

function StudioGalleryPicker({
  selectedImages,
  onSelect,
}: {
  selectedImages: string[]
  onSelect: (url: string) => void
}) {
  const generations = useStudioStore((s) => s.generations)
  const studioImages = generations.filter((g) => g.estado === 'complete' && g.url_salida)

  if (studioImages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700/40 bg-zinc-900/30 p-4 text-center">
        <ImageIcon className="h-5 w-5 text-zinc-600 mx-auto mb-1.5" />
        <p className="text-[11px] text-zinc-600">
          Genera imagenes en el modo Imagen para usarlas como referencia
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/30 p-3">
      <p className="text-[10px] font-medium text-zinc-500 mb-2">Desde el Estudio</p>
      <div className="grid grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto scrollbar-thin">
        {studioImages.map((gen) => {
          const isSelected = selectedImages.includes(gen.url_salida!)
          return (
            <button
              key={gen.id}
              type="button"
              onClick={() => onSelect(gen.url_salida!)}
              className={cn(
                'relative rounded-md overflow-hidden aspect-square border-2 transition-all',
                isSelected
                  ? 'border-violet-500 ring-1 ring-violet-500/30'
                  : 'border-zinc-700/30 hover:border-zinc-600',
              )}
            >
              <img
                src={gen.url_salida!}
                alt={gen.prompt}
                className="w-full h-full object-cover"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white drop-shadow-md" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Idle Stage ───────────────────────────────────────────────────────────────

function IdleStage({
  briefText,
  setBriefText,
  isLoading,
  onAnalyze,
  selectedImages,
  setSelectedImages,
}: {
  briefText: string
  setBriefText: (v: string) => void
  isLoading: boolean
  onAnalyze: () => void
  selectedImages: string[]
  setSelectedImages: (v: string[]) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  const addImage = (url: string) => {
    if (url && url.startsWith('http') && !selectedImages.includes(url)) {
      setSelectedImages([...selectedImages, url])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounter.current = 0
    const imageUrl = e.dataTransfer.getData('application/x-studio-image') || e.dataTransfer.getData('text/plain')
    addImage(imageUrl)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      setIsDragOver(false)
      dragCounter.current = 0
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  return (
    <div
      className="max-w-2xl mx-auto px-6 py-12 space-y-6 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Full-stage drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-violet-500/60 bg-violet-500/5 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <ImageIcon className="h-10 w-10 text-violet-400 mx-auto" />
            <p className="text-sm font-medium text-violet-300">Soltar imagen como referencia</p>
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto">
          <Clapperboard className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-200">Video Pipeline</h2>
        <p className="text-sm text-zinc-500">
          Describe tu proyecto y la IA creara un plan de escenas cinematicas.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-400 mb-2 block">
          Brief del proyecto
        </label>
        <textarea
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          placeholder="Describe el proyecto, objetivos, publico objetivo, tono deseado..."
          className="w-full min-h-[160px] resize-none rounded-xl bg-zinc-800/40 border border-zinc-700/50 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          rows={8}
        />
      </div>

      {/* Reference Images */}
      <div>
        <label className="text-xs font-medium text-zinc-400 mb-2 block">
          Imagenes de referencia (opcional)
        </label>
        <p className="text-[11px] text-zinc-600 mb-3">
          Agrega imagenes para dar contexto visual al Director de IA. Arrastra desde la galeria del panel izquierdo.
        </p>

        {/* Selected images */}
        {selectedImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {selectedImages.map((url, i) => (
              <div key={i} className="group relative rounded-lg overflow-hidden aspect-square border border-zinc-700/40">
                <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setSelectedImages(selectedImages.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Studio gallery picker */}
        <StudioGalleryPicker
          selectedImages={selectedImages}
          onSelect={(url) => addImage(url)}
        />
      </div>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={isLoading || !briefText.trim()}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
          briefText.trim() && !isLoading
            ? 'bg-violet-600 text-white hover:bg-violet-500'
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

// ── Brief Stage (analyzing) ──────────────────────────────────────────────────

function BriefStage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500/60" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm text-zinc-300 font-medium">Analizando brief con IA...</p>
        <p className="text-xs text-zinc-500">
          El agente Director esta creando el plan de escenas
        </p>
      </div>
      <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-violet-500/50 rounded-full animate-pulse" />
      </div>
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
  onDropReferenceOnScene,
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
  onDropReferenceOnScene: (sceneId: number, imageUrl: string) => void
}) {
  const scenes = pipeline.escenas
  const styleGuide = pipeline.guia_estilo
  const canAddScene = scenes.length < MAX_SCENES

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Style Guide */}
      {styleGuide && (
        <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Guia de Estilo
          </p>
          <div className="flex flex-wrap gap-2">
            {styleGuide.mood && (
              <span className="text-[11px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {styleGuide.mood}
              </span>
            )}
            {styleGuide.palette && (
              <span className="text-[11px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {styleGuide.palette}
              </span>
            )}
            {styleGuide.pacing && (
              <span className="text-[11px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {styleGuide.pacing}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scene cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {scenes.map((scene, idx) => (
          <EditableSceneCard
            key={scene.id}
            scene={scene}
            index={idx}
            total={scenes.length}
            isActive={activeSceneId === scene.id}
            onSelect={() => onSetActiveScene(scene.id)}
            onUpdateLocal={(updates) => onUpdateScene(scene.id, updates)}
            onSaveRemote={(data) => onUpdateSceneRemote(scene.id, data)}
            onDelete={() => onDeleteScene(scene.id)}
            onSetReference={(imageUrl) => onDropReferenceOnScene(scene.id, imageUrl)}
          />
        ))}
      </div>

      {/* Add scene */}
      {canAddScene && (
        <button
          type="button"
          onClick={onAddScene}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-700/50 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar Escena
        </button>
      )}

      {/* Bottom controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-zinc-800/40">
        {/* Quality selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500">Modelo:</label>
          <div className="flex gap-1.5">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border',
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

        <div className="flex-1" />

        {/* Re-analyze */}
        <button
          type="button"
          onClick={onReanalyze}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Re-analizar
        </button>

        {/* Generate all */}
        <button
          type="button"
          onClick={onGenerateAll}
          disabled={isLoading || scenes.length === 0}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
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
          Generar Todos
        </button>
      </div>
    </div>
  )
}

// ── Editable Scene Card ──────────────────────────────────────────────────────

function EditableSceneCard({
  scene,
  index,
  total,
  isActive,
  onSelect,
  onUpdateLocal,
  onSaveRemote,
  onDelete,
  onSetReference,
}: {
  scene: PipelineScene
  index: number
  total: number
  isActive: boolean
  onSelect: () => void
  onUpdateLocal: (updates: Partial<PipelineScene>) => void
  onSaveRemote: (data: Partial<{ description: string; veo_prompt: string; duration_sec: number; aspect_ratio: string }>) => Promise<void>
  onDelete: () => void
  onSetReference?: (imageUrl: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editDesc, setEditDesc] = useState(scene.descripcion ?? '')
  const [editPrompt, setEditPrompt] = useState(scene.veo_prompt ?? '')
  const [editDuration, setEditDuration] = useState(scene.duracion_seg)
  const [editAspect, setEditAspect] = useState(scene.aspect_ratio)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isCardDragOver, setIsCardDragOver] = useState(false)

  const status = STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditDesc(scene.descripcion ?? '')
    setEditPrompt(scene.veo_prompt ?? '')
    setEditDuration(scene.duracion_seg)
    setEditAspect(scene.aspect_ratio)
    setIsEditing(true)
  }

  const handleSaveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const prevDesc = scene.descripcion ?? ''
    const prevPrompt = scene.veo_prompt ?? ''
    const prevDuration = scene.duracion_seg
    const prevAspect = scene.aspect_ratio
    onUpdateLocal({
      descripcion: editDesc,
      veo_prompt: editPrompt,
      duracion_seg: editDuration,
      aspect_ratio: editAspect,
    })
    setIsEditing(false)
    try {
      await onSaveRemote({
        description: editDesc,
        veo_prompt: editPrompt,
        duration_sec: editDuration,
        aspect_ratio: editAspect,
      })
    } catch {
      // Revert local changes on remote failure
      onUpdateLocal({
        descripcion: prevDesc,
        veo_prompt: prevPrompt,
        duracion_seg: prevDuration,
        aspect_ratio: prevAspect,
      })
      toast.error('Error al guardar cambios — se revirtieron las ediciones')
    }
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
  }

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

  if (isEditing) {
    return (
      <div
        className="rounded-xl bg-zinc-800/40 border border-violet-500/30 p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            Escena {scene.orden} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleSaveEdit} className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleCancelEdit} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">Descripcion</label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="w-full min-h-[60px] resize-none rounded-lg bg-zinc-900/60 border border-zinc-700/50 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
            rows={2}
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">Prompt de Veo</label>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="w-full min-h-[80px] resize-none rounded-lg bg-zinc-900/60 border border-zinc-700/50 px-3 py-2 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 mb-1 block">Duracion</label>
            <select
              value={editDuration}
              onChange={(e) => setEditDuration(Number(e.target.value))}
              className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/50 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-zinc-500 mb-1 block">Aspecto</label>
            <select
              value={editAspect}
              onChange={(e) => setEditAspect(e.target.value)}
              className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/50 px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
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

  return (
    <div
      onClick={onSelect}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsCardDragOver(false)
        const imageUrl = e.dataTransfer.getData('application/x-studio-image') || e.dataTransfer.getData('text/plain')
        if (imageUrl && imageUrl.startsWith('http') && onSetReference) {
          onSetReference(imageUrl)
        }
      }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy' }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsCardDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsCardDragOver(false) }}
      className={cn(
        'group rounded-xl border p-4 cursor-pointer transition-all relative',
        isCardDragOver
          ? 'bg-violet-500/10 border-violet-500/50 ring-2 ring-violet-500/20'
          : isActive
            ? 'bg-violet-500/5 border-violet-500/30'
            : 'bg-zinc-800/20 border-zinc-700/30 hover:border-zinc-600/50',
      )}
    >
      {isCardDragOver && (
        <div className="absolute inset-0 z-10 rounded-xl flex items-center justify-center bg-violet-500/5 pointer-events-none">
          <p className="text-xs font-medium text-violet-400">Asignar como referencia</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">Escena {scene.orden}</span>
          <span className={cn('flex items-center gap-1 text-[10px]', status.color)}>
            {scene.estado === 'generating' ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            )}
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={handleStartEdit} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={cn(
              'p-1.5 rounded transition-colors',
              deleteConfirm ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {scene.descripcion && (
        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
          {scene.descripcion}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock className="h-3 w-3" />
          {scene.duracion_seg}s
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
          <Ratio className="h-3 w-3" />
          {scene.aspect_ratio}
        </span>
        {scene.aprobado && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400">
            <Check className="h-3 w-3" />
            Aprobado
          </span>
        )}
      </div>

      {scene.veo_prompt && (
        <p className="mt-2 text-[10px] text-zinc-600 font-mono leading-relaxed line-clamp-2 bg-zinc-900/30 rounded-lg p-2 border border-zinc-800/30">
          {scene.veo_prompt}
        </p>
      )}
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
  onCancel,
}: {
  pipeline: NonNullable<ReturnType<typeof usePipelineStore.getState>['pipeline']>
  activeSceneId: number | null
  quality: string
  onSetActiveScene: (id: number) => void
  onRetry: (sceneId: number) => void
  onCancel: () => void
}) {
  const scenes = pipeline.escenas
  const complete = scenes.filter((s) => s.estado === 'complete' || s.estado === 'approved').length
  const pct = scenes.length > 0 ? (complete / scenes.length) * 100 : 0
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Progress */}
      <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">
            {complete} de {scenes.length} escenas completas
          </span>
          <span className="text-sm font-medium text-zinc-200">{Math.round(pct)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700/50">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Active scene video player (if has video) */}
      {activeScene && (activeScene.estado === 'complete' || activeScene.estado === 'approved') && activeScene.video_url && (
        <VideoPlayer scene={activeScene} />
      )}

      {/* Active scene generating indicator */}
      {activeScene && activeScene.estado === 'generating' && (
        <div className="rounded-xl bg-zinc-800/30 border border-amber-500/20 p-8 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-500/60 animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm text-zinc-300 font-medium">Generando Escena {activeScene.orden}...</p>
            {activeScene.descripcion && (
              <p className="text-xs text-zinc-500 max-w-md">{activeScene.descripcion}</p>
            )}
            {activeScene.elapsed_sec != null && activeScene.elapsed_sec > 0 && (
              <p className="text-[11px] text-zinc-600 font-mono">
                {Math.floor(activeScene.elapsed_sec / 60)}:{(Math.floor(activeScene.elapsed_sec) % 60).toString().padStart(2, '0')} transcurrido
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scene status list */}
      <div className="grid gap-3 md:grid-cols-2">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            onClick={() => onSetActiveScene(scene.id)}
            className={cn(
              'rounded-xl border p-3 cursor-pointer transition-all flex items-center gap-3',
              activeSceneId === scene.id
                ? 'bg-violet-500/5 border-violet-500/30'
                : 'bg-zinc-800/20 border-zinc-700/20 hover:border-zinc-600/50',
            )}
          >
            {/* Status indicator */}
            <div className={cn(
              'w-10 h-10 rounded-lg shrink-0 flex items-center justify-center',
              scene.estado === 'generating' && 'bg-amber-500/10',
              scene.estado === 'complete' && 'bg-blue-500/10',
              scene.estado === 'approved' && 'bg-green-500/10',
              scene.estado === 'failed' && 'bg-red-500/10',
              scene.estado === 'pending' && 'bg-zinc-800/60',
            )}>
              {scene.estado === 'generating' ? (
                <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
              ) : scene.estado === 'complete' || scene.estado === 'approved' ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : scene.estado === 'failed' ? (
                <AlertTriangle className="h-5 w-5 text-red-400" />
              ) : (
                <Clock className="h-5 w-5 text-zinc-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-300">Escena {scene.orden}</span>
                <span className={cn('text-[10px]', (STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending).color)}>
                  {(STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending).label}
                </span>
              </div>
              {scene.descripcion && (
                <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{scene.descripcion}</p>
              )}
            </div>

            {scene.estado === 'failed' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRetry(scene.id) }}
                className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Cancel button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
        >
          <StopCircle className="h-4 w-4" />
          Cancelar Generacion
        </button>
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
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Approval progress */}
      <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-4 flex items-center justify-between">
        <span className="text-sm text-zinc-300">
          {approved} de {scenes.length} escenas aprobadas
        </span>
        {allApproved && (
          <span className="text-xs font-medium text-green-400 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            Listo para exportar
          </span>
        )}
      </div>

      {/* Active scene video player */}
      {activeScene && activeScene.video_url && (activeScene.estado === 'complete' || activeScene.estado === 'approved') && (
        <div className="space-y-3">
          <VideoPlayer scene={activeScene} />
          {/* Approve/reject buttons */}
          {activeScene.estado === 'complete' && !activeScene.aprobado && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => onApprove(activeScene.id)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprobar Escena {activeScene.orden}
              </button>
              <button
                type="button"
                onClick={() => onRetry(activeScene.id)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors border border-zinc-700"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scene list */}
      <div className="grid gap-3 md:grid-cols-2">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            onClick={() => onSetActiveScene(scene.id)}
            className={cn(
              'group rounded-xl border p-3 cursor-pointer transition-all',
              activeSceneId === scene.id
                ? 'bg-violet-500/5 border-violet-500/30'
                : 'bg-zinc-800/20 border-zinc-700/20 hover:border-zinc-600/50',
            )}
          >
            <div className="flex items-center gap-3">
              {/* Thumbnail */}
              {scene.video_url ? (
                <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0 relative">
                  <video src={getVideoSrc(scene.video_url)} className="w-full h-full object-cover" muted preload="metadata" />
                  {scene.aprobado && (
                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-16 h-10 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0">
                  <Video className="h-4 w-4 text-zinc-600" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-300">Escena {scene.orden}</span>
                  <span className={cn('text-[10px]', (STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending).color)}>
                    {(STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending).label}
                  </span>
                  {scene.aprobado && (
                    <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" /> Aprobado
                    </span>
                  )}
                </div>
                {scene.descripcion && (
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{scene.descripcion}</p>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {scene.estado === 'complete' && !scene.aprobado && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onApprove(scene.id) }}
                    className="p-1.5 rounded text-green-400 hover:bg-green-500/10"
                    title="Aprobar"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                {scene.estado === 'failed' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRetry(scene.id) }}
                    className="p-1.5 rounded text-amber-400 hover:bg-amber-500/10"
                    title="Reintentar"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Go to export */}
      {allApproved && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => usePipelineStore.getState().setStage('export')}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-all"
          >
            <Download className="h-4 w-4" />
            Continuar a Exportar
          </button>
        </div>
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
  onNewPipeline,
}: {
  pipeline: NonNullable<ReturnType<typeof usePipelineStore.getState>['pipeline']>
  exportFormat: string
  setExportFormat: (f: string) => void
  isLoading: boolean
  exportProgress: { step: number; total: number } | null
  exportedMediaIds: number[]
  onExport: () => void
  onNewPipeline: () => void
}) {
  const approved = pipeline.escenas.filter((s) => s.aprobado)
  const totalDuration = approved.reduce((acc, s) => acc + (s.duracion_seg ?? 0), 0)
  const isExported = pipeline.estado === 'exported'
  const isExporting = isLoading && pipeline.estado === 'exporting'

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      {/* Summary */}
      <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Resumen del Pipeline
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-200">{approved.length}</p>
            <p className="text-[11px] text-zinc-500">Escenas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-200">{totalDuration}s</p>
            <p className="text-[11px] text-zinc-500">Duracion</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-200">{exportFormat.toUpperCase()}</p>
            <p className="text-[11px] text-zinc-500">Formato</p>
          </div>
        </div>
      </div>

      {/* Format selector */}
      {!isExported && (
        <div>
          <label className="text-xs font-medium text-zinc-400 mb-2 block">Formato de exportacion</label>
          <div className="flex gap-2">
            {['mp4', 'webm'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                disabled={isExporting}
                className={cn(
                  'flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
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
        <div className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              Exportando {exportProgress.step} de {exportProgress.total}...
            </span>
            <span className="text-sm font-medium text-zinc-300">
              {Math.round((exportProgress.step / exportProgress.total) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700/50">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${(exportProgress.step / exportProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Export status */}
      {isExported && (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 px-5 py-3 text-green-400 text-sm font-medium">
            <Check className="h-4 w-4" />
            Videos exportados al CRM
          </div>
          <p className="text-xs text-zinc-600">
            Disponibles en la biblioteca de medios del proyecto
          </p>
          <div className="space-y-2">
            {approved.filter((s) => s.video_url).map((scene) => (
              <button
                key={scene.id}
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = getVideoSrc(scene.video_url) || ''
                  a.download = `escena-${scene.orden}.${exportFormat}`
                  a.click()
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
              >
                <span>Escena {scene.orden}</span>
                <Download className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        {!isExported && !isExporting && (
          <button
            type="button"
            onClick={onExport}
            disabled={isLoading || approved.length === 0}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              !isLoading && approved.length > 0
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar al CRM
          </button>
        )}
        <button
          type="button"
          onClick={onNewPipeline}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors border border-zinc-700/30"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pipeline
        </button>
      </div>
    </div>
  )
}

// ── Video Player ─────────────────────────────────────────────────────────────

function VideoPlayer({ scene }: { scene: PipelineScene }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoaded = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoaded)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoaded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [scene.video_url])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [scene.id, scene.video_url])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const bar = progressRef.current
    if (!video || !bar) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    video.currentTime = ratio * video.duration
  }, [])

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div ref={containerRef} className="rounded-xl overflow-hidden bg-black/50 border border-zinc-800/50">
      {/* Video */}
      <div className="relative aspect-video flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={getVideoSrc(scene.video_url)}
          className="w-full h-full object-contain"
          preload="metadata"
          playsInline
          loop={isLooping}
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <Play className="h-6 w-6 text-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-zinc-900/90">
        <div
          ref={progressRef}
          className="h-1.5 bg-zinc-800 cursor-pointer group hover:h-2.5 transition-all"
          onClick={handleSeek}
        >
          <div className="h-full bg-violet-500 rounded-r-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <button onClick={togglePlay} className="p-1 text-zinc-300 hover:text-white">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-[11px] text-zinc-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            {[0.5, 1, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => { if (videoRef.current) { videoRef.current.playbackRate = rate; setPlaybackRate(rate) } }}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                  playbackRate === rate ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {rate}x
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (videoRef.current) { videoRef.current.loop = !isLooping; setIsLooping(!isLooping) } }}
            className={cn('p-1 rounded', isLooping ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300')}
          >
            <Repeat className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => containerRef.current?.requestFullscreen()}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

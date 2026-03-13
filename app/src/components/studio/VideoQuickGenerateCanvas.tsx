import { useEffect, useRef, useState } from 'react'
import {
  Type,
  ImagePlay,
  RefreshCw,
  Wind,
  Camera,
  Download,
  Heart,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  AlertCircle,
  Play,
  type LucideProps,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVideoGenerationStore } from '@/stores/videoGenerationStore'
import { videoGenApi, type StudioVideoGeneration } from '@/services/api'
import { VIDEO_FEATURES, type FeatureConfig } from './tabs/VideoGeneratePanel'
import { toast } from 'sonner'

// ── Model catalogue ────────────────────────────────────────────────────────────

interface VideoModelOption {
  value: string
  label: string
  hint: string
  group: string
  supports_i2v?: boolean
  supports_v2v?: boolean
}

const ALL_MODELS: VideoModelOption[] = [
  { value: 'vidu/q3',           label: 'Vidu Q3',          hint: '~$0.10/5s',    group: 'Vidu',       supports_i2v: true },
  { value: 'vidu/q3-turbo',     label: 'Vidu Q3 Turbo',    hint: '~$0.26/5s',    group: 'Vidu',       supports_i2v: true },
  { value: 'wan/2.6',           label: 'Wan 2.6',           hint: '~$0.10',       group: 'Alibaba',    supports_i2v: true },
  { value: 'wan/2.6-flash',     label: 'Wan 2.6 Flash',     hint: '~$0.025',      group: 'Alibaba',    supports_i2v: true },
  { value: 'ltx/2.3',           label: 'LTX 2.3',           hint: '~$0.06/s',     group: 'Lightricks', supports_i2v: true },
  { value: 'ltx/2.3-fast',      label: 'LTX 2.3 Fast',      hint: '~$0.04/s',     group: 'Lightricks', supports_i2v: true },
  { value: 'ltx/retake',        label: 'LTX Retake',         hint: '~$0.05/s',     group: 'Lightricks', supports_v2v: true },
  { value: 'seedance/1.5-pro',  label: 'Seedance 1.5 Pro',  hint: '~$0.06',       group: 'ByteDance',  supports_i2v: true },
  { value: 'pixverse/5.5',      label: 'PixVerse v5.5',      hint: '~$0.20',       group: 'PixVerse',   supports_i2v: true },
  { value: 'pixverse/5.6',      label: 'PixVerse v5.6',      hint: '~$0.24',       group: 'PixVerse',   supports_i2v: true },
  { value: 'runway/gen-4.5',    label: 'Runway Gen-4.5',     hint: '~$0.60',       group: 'Runway',     supports_i2v: true },
  { value: 'kling/video-3-standard', label: 'Kling v3 Standard', hint: '~$0.14', group: 'Kling' },
  { value: 'kling/video-3-pro', label: 'Kling v3 Pro',       hint: '~$0.28',       group: 'Kling',      supports_i2v: true },
  { value: 'hailuo/2.3',        label: 'Hailuo 2.3',         hint: '~$0.20',       group: 'Hailuo',     supports_i2v: true },
  { value: 'p-video',           label: 'P-Video',            hint: '~$0.15',       group: 'Other',      supports_v2v: true },
]

const MODEL_MAP = new Map(ALL_MODELS.map((m) => [m.value, m]))

const DURATION_OPTIONS = [4, 5, 6, 8, 10]

const ASPECT_OPTIONS = [
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '1:1',  label: '1:1 Square' },
  { value: '4:5',  label: '4:5 Story' },
]

// ── Feature icon helper ────────────────────────────────────────────────────────

type IconName = 'Type' | 'ImagePlay' | 'RefreshCw' | 'Wind' | 'Camera'

const ICON_MAP: Record<IconName, React.FC<LucideProps>> = {
  Type,
  ImagePlay,
  RefreshCw,
  Wind,
  Camera,
}

function FeatureIcon({ name, size = 16 }: { name: IconName; size?: number }) {
  const Icon = ICON_MAP[name]
  return <Icon size={size} />
}

// ── Active feature config ─────────────────────────────────────────────────────

function getFeatureConfig(feature: string): FeatureConfig {
  return (
    (VIDEO_FEATURES as readonly FeatureConfig[]).find((f) => f.id === feature) ??
    VIDEO_FEATURES[0]
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ estado }: { estado: StudioVideoGeneration['estado'] }) {
  const styles: Record<StudioVideoGeneration['estado'], string> = {
    pending: 'bg-zinc-700 text-zinc-400',
    generating: 'bg-amber-500/20 text-amber-400',
    complete: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  }
  const labels: Record<StudioVideoGeneration['estado'], string> = {
    pending: 'Pendiente',
    generating: 'Generando',
    complete: 'Listo',
    failed: 'Error',
  }
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', styles[estado])}>
      {labels[estado]}
    </span>
  )
}

// ── Model selector ────────────────────────────────────────────────────────────

function ModelSelector({
  featureConfig,
  value,
  onChange,
}: {
  featureConfig: FeatureConfig
  value: string
  onChange: (v: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const bestModels = ALL_MODELS.filter((m) =>
    (featureConfig.bestModels as readonly string[]).includes(m.value)
  )
  const otherModels = ALL_MODELS.filter(
    (m) => !(featureConfig.bestModels as readonly string[]).includes(m.value)
  )

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">Modelo</label>
      <div className="flex flex-col gap-1">
        {bestModels.map((m) => (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all',
              value === m.value
                ? 'border-violet-500 ring-1 ring-violet-500/20 bg-violet-500/5'
                : 'border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600'
            )}
          >
            <span className="text-xs text-zinc-200">{m.label}</span>
            <span className="text-[10px] text-zinc-500">{m.hint}</span>
          </button>
        ))}

        {/* Expand other models */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp size={10} /> Menos modelos
            </>
          ) : (
            <>
              <ChevronDown size={10} /> Otros modelos ({otherModels.length})
            </>
          )}
        </button>

        {expanded &&
          otherModels.map((m) => (
            <button
              key={m.value}
              onClick={() => onChange(m.value)}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all',
                value === m.value
                  ? 'border-violet-500 ring-1 ring-violet-500/20 bg-violet-500/5'
                  : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'
              )}
            >
              <span className="text-xs text-zinc-300">{m.label}</span>
              <span className="text-[10px] text-zinc-500">{m.hint}</span>
            </button>
          ))}
      </div>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({
  label,
  accept,
  value,
  onUrlSet,
}: {
  label: string
  accept: string
  value: string | null
  onUrlSet: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file)
    onUrlSet(objectUrl)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden',
        value
          ? 'border-zinc-600 bg-zinc-800/40'
          : 'border-zinc-700 bg-zinc-800/20 hover:border-zinc-600 hover:bg-zinc-800/40'
      )}
      style={{ minHeight: 80 }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {value ? (
        <div className="flex items-center gap-2 p-3">
          <div className="w-12 h-8 rounded bg-zinc-700 overflow-hidden shrink-0">
            {accept.includes('image') ? (
              <img src={value} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play size={12} className="text-zinc-400" />
              </div>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 flex-1 truncate">{label} cargado</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUrlSet(null)
            }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-0.5"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 p-4">
          <UploadCloud size={18} className="text-zinc-600" />
          <span className="text-[11px] text-zinc-500">{label}</span>
          <span className="text-[10px] text-zinc-700">Arrastra o haz clic</span>
        </div>
      )}
    </div>
  )
}

// ── Video result area ─────────────────────────────────────────────────────────

function VideoResult({
  gen,
  isGenerating,
  onRetry,
}: {
  gen: StudioVideoGeneration | null
  isGenerating: boolean
  onRetry: () => void
}) {
  const { toggleFavorite, deleteGeneration } = useVideoGenerationStore()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000)
    return () => clearInterval(interval)
  }, [isGenerating])

  const handleDownload = () => {
    if (!gen?.url_video) return
    const a = document.createElement('a')
    a.href = gen.url_video
    a.download = `video-${gen.id}.mp4`
    a.click()
  }

  const handleDelete = async () => {
    if (!gen) return
    try {
      await deleteGeneration(gen.id)
      toast.success('Generacion eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleFavorite = async () => {
    if (!gen) return
    try {
      await toggleFavorite(gen.id)
    } catch {
      toast.error('Error al actualizar favorito')
    }
  }

  // No generation yet
  if (!gen && !isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
          <Camera size={28} className="text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-500">Configura el formulario y haz clic en Generar</p>
      </div>
    )
  }

  // Generating spinner
  if (isGenerating || gen?.estado === 'generating' || gen?.estado === 'pending') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
        <Loader2 size={32} className="animate-spin text-violet-400" />
        <p className="text-sm text-zinc-300">Generando video...</p>
        {elapsed > 0 && (
          <p className="text-xs text-zinc-600">{elapsed}s transcurridos</p>
        )}
      </div>
    )
  }

  // Failed
  if (gen?.estado === 'failed') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-900/50 rounded-xl border border-red-900/30">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-zinc-300">Error al generar</p>
        {gen.mensaje_error && (
          <p className="text-xs text-zinc-600 max-w-sm text-center px-4">{gen.mensaje_error}</p>
        )}
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Complete — show video player
  if (gen?.estado === 'complete' && gen.url_video) {
    return (
      <div className="flex-1 flex flex-col gap-2">
        {/* Player */}
        <div className="flex-1 rounded-xl overflow-hidden bg-black relative" style={{ minHeight: 200 }}>
          <video
            src={gen.url_video}
            controls
            className="w-full h-full object-contain"
            style={{ maxHeight: '100%' }}
          />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 px-1">
          <StatusBadge estado={gen.estado} />
          <div className="flex-1" />
          <button
            onClick={handleFavorite}
            title={gen.is_favorito ? 'Quitar favorito' : 'Favorito'}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              gen.is_favorito
                ? 'border-rose-500/50 text-rose-400 bg-rose-500/10'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
            )}
          >
            <Heart size={14} />
          </button>
          <button
            onClick={handleDownload}
            title="Descargar"
            className="p-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Download size={14} />
          </button>
          <button
            onClick={handleDelete}
            title="Eliminar"
            className="p-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:border-red-700 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ── Gallery card ──────────────────────────────────────────────────────────────

function GalleryCard({
  gen,
  isActive,
  onClick,
}: {
  gen: StudioVideoGeneration
  isActive: boolean
  onClick: () => void
}) {
  const { deleteGeneration, toggleFavorite } = useVideoGenerationStore()

  const featureCfg = getFeatureConfig(gen.feature)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteGeneration(gen.id)
      toast.success('Eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleFav = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleFavorite(gen.id)
    } catch {
      toast.error('Error')
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative shrink-0 w-32 rounded-xl overflow-hidden border cursor-pointer transition-all',
        isActive ? 'border-violet-500 ring-1 ring-violet-500/30' : 'border-zinc-700/50 hover:border-zinc-600'
      )}
      style={{ aspectRatio: '16/9', minHeight: 72 }}
    >
      {/* Thumbnail */}
      {gen.url_thumbnail ? (
        <img src={gen.url_thumbnail} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
          <Camera size={16} className="text-zinc-600" />
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
        <div className="flex justify-end gap-1">
          <button
            onClick={handleFav}
            className={cn(
              'p-0.5 rounded transition-colors',
              gen.is_favorito ? 'text-rose-400' : 'text-zinc-300 hover:text-rose-400'
            )}
          >
            <Heart size={11} />
          </button>
          <button
            onClick={handleDelete}
            className="p-0.5 rounded text-zinc-300 hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
        <div>
          <p className="text-[9px] font-medium text-zinc-200">{featureCfg.label}</p>
        </div>
      </div>

      {/* Status indicator */}
      {gen.estado !== 'complete' && (
        <div className="absolute bottom-1 right-1">
          <StatusBadge estado={gen.estado} />
        </div>
      )}

      {/* Generating pulse */}
      {(gen.estado === 'generating' || gen.estado === 'pending') && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60">
          <Loader2 size={16} className="animate-spin text-violet-400" />
        </div>
      )}
    </div>
  )
}

// ── Main canvas ───────────────────────────────────────────────────────────────

interface VideoQuickGenerateCanvasProps {
  projectId: number
}

export function VideoQuickGenerateCanvas({ projectId }: VideoQuickGenerateCanvasProps) {
  const {
    feature,
    prompt,
    model,
    durationSec,
    aspectRatio,
    sourceImageUrl,
    sourceVideoUrl,
    isGenerating,
    generations,
    activeGenId,
    setPrompt,
    setModel,
    setDurationSec,
    setAspectRatio,
    setSourceImageUrl,
    setSourceVideoUrl,
    generate,
    setActiveGen,
    handleWsMessage,
    loadGenerations,
  } = useVideoGenerationStore()

  const wsRef = useRef<WebSocket | null>(null)

  const featureConfig = getFeatureConfig(feature)
  const activeGen = generations.find((g) => g.id === activeGenId) ?? null

  // Load generations on mount
  useEffect(() => {
    loadGenerations(projectId)
  }, [projectId, loadGenerations])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const url = videoGenApi.wsUrl(projectId)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as Record<string, unknown>
        handleWsMessage(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // silently ignore — WS is enhancement only
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [projectId, handleWsMessage])

  const handleGenerate = async () => {
    if (!prompt.trim() && !featureConfig.needsImage && !featureConfig.needsVideo) {
      toast.error('Escribe un prompt para continuar')
      return
    }
    try {
      await generate(projectId)
      toast.success('Video en generacion')
    } catch {
      toast.error('Error al iniciar la generacion')
    }
  }

  const handleRetry = () => {
    handleGenerate()
  }

  const selectedModel = MODEL_MAP.get(model) ?? ALL_MODELS[0]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-300">
          <FeatureIcon name={featureConfig.icon as Parameters<typeof FeatureIcon>[0]['name']} size={16} />
          <span className="text-sm font-medium">{featureConfig.label}</span>
        </div>
        <span className="text-zinc-700 text-xs">·</span>
        <span className="text-xs text-zinc-500">{featureConfig.description}</span>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
          {selectedModel?.label ?? model}
        </span>
      </div>

      {/* Body: inputs + result */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: inputs form */}
        <div className="w-80 shrink-0 flex flex-col gap-4 p-5 border-r border-zinc-800/60 overflow-y-auto scrollbar-thin">
          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Prompt de video</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                featureConfig.needsImage
                  ? 'Describe el movimiento deseado...'
                  : 'Describe el video que quieres generar...'
              }
              rows={4}
              className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
          </div>

          {/* Image drop zone (if needed) */}
          {featureConfig.needsImage && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Imagen de referencia</label>
              <DropZone
                label="Imagen de referencia"
                accept="image/*"
                value={sourceImageUrl}
                onUrlSet={setSourceImageUrl}
              />
            </div>
          )}

          {/* Video drop zone (if needed) */}
          {featureConfig.needsVideo && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Video de referencia</label>
              <DropZone
                label="Video de referencia"
                accept="video/*"
                value={sourceVideoUrl}
                onUrlSet={setSourceVideoUrl}
              />
            </div>
          )}

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Duracion</label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationSec(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs transition-all',
                    durationSec === d
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Relacion de aspecto</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ASPECT_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAspectRatio(a.value)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg border text-xs transition-all text-left',
                    aspectRatio === a.value
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          <ModelSelector
            featureConfig={featureConfig}
            value={model}
            onChange={setModel}
          />

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all',
              isGenerating
                ? 'bg-violet-500/30 text-violet-400/60 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 active:scale-[0.98]'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FeatureIcon name={featureConfig.icon as Parameters<typeof FeatureIcon>[0]['name']} size={16} />
                Generar Video
              </>
            )}
          </button>
        </div>

        {/* Right: video result */}
        <div className="flex-1 flex flex-col gap-3 p-5 overflow-hidden">
          <VideoResult
            gen={activeGen}
            isGenerating={isGenerating}
            onRetry={handleRetry}
          />
        </div>
      </div>

      {/* Bottom gallery */}
      {generations.length > 0 && (
        <div className="shrink-0 border-t border-zinc-800/60 px-5 py-3">
          <p className="text-[10px] text-zinc-600 mb-2">
            Generaciones recientes ({generations.length})
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
            {generations.map((g) => (
              <GalleryCard
                key={g.id}
                gen={g}
                isActive={g.id === activeGenId}
                onClick={() => setActiveGen(g.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

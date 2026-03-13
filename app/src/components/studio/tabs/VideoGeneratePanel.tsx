import { useEffect } from 'react'
import {
  Type,
  ImagePlay,
  RefreshCw,
  Wind,
  Camera,
  type LucideProps,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVideoGenerationStore, type VideoFeature } from '@/stores/videoGenerationStore'
import type { StudioVideoGeneration } from '@/services/api'

// ── Feature config ─────────────────────────────────────────────────────────────

export const VIDEO_FEATURES = [
  {
    id: 'text2video' as const,
    label: 'Texto a Video',
    icon: 'Type' as const,
    description: 'Genera video desde un prompt de texto',
    needsImage: false,
    needsVideo: false,
    bestModels: ['vidu/q3', 'kling/video-3-standard', 'hailuo/2.3', 'wan/2.6'],
  },
  {
    id: 'image2video' as const,
    label: 'Imagen a Video',
    icon: 'ImagePlay' as const,
    description: 'Anima una imagen de referencia',
    needsImage: true,
    needsVideo: false,
    bestModels: ['vidu/q3', 'ltx/2.3', 'seedance/1.5-pro', 'pixverse/5.6'],
  },
  {
    id: 'video2video' as const,
    label: 'Video a Video',
    icon: 'RefreshCw' as const,
    description: 'Transforma un video existente',
    needsImage: false,
    needsVideo: true,
    bestModels: ['ltx/retake', 'p-video', 'hailuo/2.3'],
  },
  {
    id: 'motion' as const,
    label: 'Movimiento',
    icon: 'Wind' as const,
    description: 'Maximo realismo de movimiento',
    needsImage: true,
    needsVideo: false,
    bestModels: ['ltx/2.3', 'pixverse/5.6', 'wan/2.6'],
  },
  {
    id: 'realism' as const,
    label: 'Realismo',
    icon: 'Camera' as const,
    description: 'Maxima calidad fotorrealista',
    needsImage: false,
    needsVideo: false,
    bestModels: ['runway/gen-4.5', 'kling/video-3-pro', 'pixverse/5.6'],
  },
] as const

export type FeatureConfig = (typeof VIDEO_FEATURES)[number]

// ── Feature icon helper ────────────────────────────────────────────────────────

type IconName = 'Type' | 'ImagePlay' | 'RefreshCw' | 'Wind' | 'Camera'

const ICON_MAP: Record<IconName, React.FC<LucideProps>> = {
  Type,
  ImagePlay,
  RefreshCw,
  Wind,
  Camera,
}

function FeatureIcon({ name, size = 14 }: { name: IconName; size?: number }) {
  const Icon = ICON_MAP[name]
  return <Icon size={size} />
}

// ── Status badge helper ────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StudioVideoGeneration['estado'], string> = {
  pending: 'Pendiente',
  generating: 'Generando',
  complete: 'Listo',
  failed: 'Error',
}

const STATUS_COLOR: Record<StudioVideoGeneration['estado'], string> = {
  pending: 'text-zinc-500',
  generating: 'text-amber-400 animate-pulse',
  complete: 'text-green-400',
  failed: 'text-red-400',
}

const FEATURE_LABEL: Record<VideoFeature, string> = {
  text2video: 'T2V',
  image2video: 'I2V',
  video2video: 'V2V',
  motion: 'Motion',
  realism: 'Realism',
}

// ── Recent video card ──────────────────────────────────────────────────────────

function RecentVideoCard({ gen }: { gen: StudioVideoGeneration }) {
  const { setActiveGen } = useVideoGenerationStore()

  return (
    <button
      onClick={() => setActiveGen(gen.id)}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/70 transition-all text-left"
    >
      {/* Thumbnail or placeholder */}
      <div className="w-12 h-8 rounded bg-zinc-700/60 shrink-0 overflow-hidden flex items-center justify-center">
        {gen.url_thumbnail ? (
          <img
            src={gen.url_thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera size={12} className="text-zinc-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-zinc-400 truncate">
          {FEATURE_LABEL[gen.feature]}
          {gen.prompt ? ` · ${gen.prompt.slice(0, 28)}` : ''}
        </p>
        <p className={cn('text-[10px]', STATUS_COLOR[gen.estado])}>
          {STATUS_LABEL[gen.estado]}
        </p>
      </div>
    </button>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

interface VideoGeneratePanelProps {
  projectId: number
}

export function VideoGeneratePanel({ projectId }: VideoGeneratePanelProps) {
  const { feature, setFeature, generations, loadGenerations, isLoading } =
    useVideoGenerationStore()

  useEffect(() => {
    loadGenerations(projectId)
  }, [projectId, loadGenerations])

  const recentCompleted = generations
    .filter((g) => g.estado === 'complete')
    .slice(0, 3)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <span className="text-sm font-medium text-zinc-200">Generacion Rapida</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin">
        {/* Feature selector cards */}
        <p className="text-[10px] text-zinc-600 px-1 pb-1">Modo</p>

        {VIDEO_FEATURES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFeature(f.id)}
            className={cn(
              'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all',
              feature === f.id
                ? 'border-violet-500 ring-1 ring-violet-500/30 bg-violet-500/5'
                : 'border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/70'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'mt-0.5 shrink-0',
                feature === f.id ? 'text-violet-400' : 'text-zinc-500'
              )}
            >
              <FeatureIcon name={f.icon} size={14} />
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-[11px] font-medium',
                  feature === f.id ? 'text-zinc-100' : 'text-zinc-300'
                )}
              >
                {f.label}
              </p>
              <p className="text-[10px] text-zinc-600 leading-tight mt-0.5">
                {f.description}
              </p>
            </div>

            {feature === f.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 mt-1" />
            )}
          </button>
        ))}

        {/* Recent quick generations (compact) */}
        {!isLoading && recentCompleted.length > 0 && (
          <>
            <p className="text-[10px] text-zinc-600 px-1 pt-3 pb-1">Recientes</p>
            {recentCompleted.map((g) => (
              <RecentVideoCard key={g.id} gen={g} />
            ))}
          </>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-12 text-zinc-600 text-xs">
            Cargando...
          </div>
        )}
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import {
  ImageIcon,
  Video,
  Music,
  ArrowRight,
  BarChart3,
  Shirt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useStudioAiStore,
} from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { UnifiedChat } from './tabs/UnifiedChat'

// ── Props ────────────────────────────────────────────────────────────────────

interface StudioHomeProps {
  projectId: number
  projectName: string
}

// ── Main Component ───────────────────────────────────────────────────────────

export function StudioHome({ projectId, projectName }: StudioHomeProps) {
  const {
    executeQuickAction,
    isHubLoading,
    setStudioMode,
  } = useStudioAiStore()

  const { generations } = useStudioStore()

  // ── Asset stats ──────────────────────────────────────────────────────────

  const imageStats = useMemo(() => {
    const images = generations.filter((g) => g.tipo === 'image')
    return {
      total: images.length,
      completed: images.filter((g) => g.estado === 'complete').length,
      approved: images.filter((g) => g.is_favorito).length,
    }
  }, [generations])

  const videoStats = useMemo(() => {
    const videos = generations.filter((g) => g.tipo === 'video')
    return {
      total: videos.length,
      completed: videos.filter((g) => g.estado === 'complete').length,
    }
  }, [generations])

  // Recent completed assets for the thumbnail strip
  const recentAssets = useMemo(() => {
    return generations
      .filter((g) => g.estado === 'complete' && g.url_salida)
      .slice(0, 12)
  }, [generations])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleQuickAction = (actionKey: string) => {
    if (isHubLoading) return
    executeQuickAction(actionKey, projectId)
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Dashboard Cards (compact top section) ──────────────────── */}
      <div className="shrink-0 max-w-4xl w-full mx-auto px-6 pt-5 pb-3 space-y-4 relative z-10">
        {/* Asset Status Bar */}
        <div className="flex items-center gap-3">
          <StatusCard
            icon={ImageIcon}
            label="Imagenes"
            completed={imageStats.completed}
            total={imageStats.total}
            approved={imageStats.approved}
            color="violet"
            onClick={() => setStudioMode('image')}
          />
          <StatusCard
            icon={Video}
            label="Videos"
            completed={videoStats.completed}
            total={videoStats.total}
            color="blue"
            onClick={() => setStudioMode('video')}
          />
          <StatusCard
            icon={Music}
            label="Audio"
            completed={0}
            total={0}
            color="emerald"
            comingSoon
          />
        </div>

        {/* Recent Assets Strip */}
        {recentAssets.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Recientes
            </h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {recentAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => {
                    useStudioAiStore.setState({
                      studioMode: 'image',
                      selectedImageId: asset.id,
                    })
                  }}
                  className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 hover:border-violet-500/50 transition-all hover:scale-105 group relative"
                  title={asset.prompt?.slice(0, 60)}
                >
                  {asset.url_salida ? (
                    <img
                      src={asset.url_salida}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/10 transition-colors" />
                </button>
              ))}
              <button
                onClick={() => setStudioMode('image')}
                className="shrink-0 w-14 h-14 rounded-lg bg-zinc-800/50 border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-colors"
                title="Ver todas"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Action Cards */}
        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Que quieres hacer?
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <QuickActionCard
              icon={ImageIcon}
              title="Generar Imagenes"
              description="Crea imagenes con IA"
              color="violet"
              onClick={() => handleQuickAction('Generar Imagenes')}
            />
            <QuickActionCard
              icon={Video}
              title="Crear Videos"
              description="Videos cinematicos con IA"
              color="blue"
              onClick={() => handleQuickAction('Crear Videos')}
            />
            <QuickActionCard
              icon={Shirt}
              title="Probador Virtual"
              description="Prueba ropa con IA"
              color="emerald"
              onClick={() => setStudioMode('try-on')}
            />
            <QuickActionCard
              icon={BarChart3}
              title="Estado"
              description="Progreso del proyecto"
              color="amber"
              onClick={() => handleQuickAction('Estado del Proyecto')}
            />
          </div>
        </div>
      </div>

      {/* ── Chat flow (fills remaining space, no container) ─────────── */}
      <div className="flex-1 min-h-0 max-w-4xl w-full mx-auto relative z-10">
        <UnifiedChat projectId={projectId} projectName={projectName} embedded />
      </div>
    </div>
  )
}

// ── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({
  icon: Icon,
  label,
  completed,
  total,
  approved,
  color,
  comingSoon,
  onClick,
}: {
  icon: typeof ImageIcon
  label: string
  completed: number
  total: number
  approved?: number
  color: 'violet' | 'blue' | 'emerald'
  comingSoon?: boolean
  onClick?: () => void
}) {
  const colorMap = {
    violet: {
      icon: 'text-violet-400',
      bg: 'bg-violet-500/10',
      bar: 'bg-violet-500',
      border: 'border-violet-500/20',
    },
    blue: {
      icon: 'text-blue-400',
      bg: 'bg-blue-500/10',
      bar: 'bg-blue-500',
      border: 'border-blue-500/20',
    },
    emerald: {
      icon: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      bar: 'bg-emerald-500',
      border: 'border-emerald-500/20',
    },
  }

  const c = colorMap[color]
  const progress = total > 0 ? (completed / total) * 100 : 0

  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      className={cn(
        'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm transition-all',
        'bg-zinc-900/60 hover:bg-zinc-800/60',
        c.border,
        comingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]',
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
        <Icon className={cn('h-4.5 w-4.5', c.icon)} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">{label}</span>
          {comingSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              Pronto
            </span>
          )}
        </div>
        {!comingSoon && (
          <>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-semibold text-zinc-100">{completed}</span>
              <span className="text-[10px] text-zinc-500">/ {total}</span>
              {approved != null && approved > 0 && (
                <span className="text-[10px] text-emerald-400 ml-1">
                  {approved} aprobadas
                </span>
              )}
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', c.bar)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>
    </button>
  )
}

// ── Quick Action Card ────────────────────────────────────────────────────────

function QuickActionCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: typeof ImageIcon
  title: string
  description: string
  color: 'violet' | 'blue' | 'emerald' | 'amber'
  onClick: () => void
}) {
  const colorMap = {
    violet: {
      icon: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'hover:border-violet-500/30',
      glow: 'group-hover:shadow-violet-500/5',
    },
    blue: {
      icon: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'hover:border-blue-500/30',
      glow: 'group-hover:shadow-blue-500/5',
    },
    emerald: {
      icon: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'hover:border-emerald-500/30',
      glow: 'group-hover:shadow-emerald-500/5',
    },
    amber: {
      icon: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'hover:border-amber-500/30',
      glow: 'group-hover:shadow-amber-500/5',
    },
  }

  const c = colorMap[color]

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm transition-all hover:bg-zinc-800/60 shadow-lg shadow-transparent',
        c.border,
        c.glow,
      )}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
        <Icon className={cn('h-5 w-5', c.icon)} />
      </div>
      <div className="text-left">
        <h4 className="text-sm font-medium text-zinc-200 mb-0.5">{title}</h4>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </button>
  )
}

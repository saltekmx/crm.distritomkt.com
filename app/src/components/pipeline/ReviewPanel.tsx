import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Check,
  Edit3,
  Pause,
  Play,
  Maximize,
  Repeat,
  Save,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
  Link2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/stores/pipelineStore'
import { RevisionChat } from './RevisionChat'
import { PromptHistoryViewer } from './PromptHistoryViewer'
import { getVideoSrc, type PipelineScene } from '@/services/api'

// ── Status badge config ─────────────────────────────────────────────────────

const statusBadgeConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Borrador', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  generating: { label: 'Generando', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  complete: { label: 'En revision', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  approved: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-500/10' },
  failed: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10' },
}

// ── Playback speed options ──────────────────────────────────────────────────

const SPEED_OPTIONS = [0.25, 0.5, 1, 2] as const

// ── Time formatting ─────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

// ── Enhanced Video Player ───────────────────────────────────────────────────

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLooping, setIsLooping] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowControls(true)
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
    } else {
      v.pause()
    }
  }

  const handleSpeedChange = (speed: number) => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = speed
    setPlaybackRate(speed)
  }

  const toggleLoop = () => {
    const v = videoRef.current
    if (!v) return
    v.loop = !v.loop
    setIsLooping(v.loop)
  }

  const handleFullscreen = () => {
    const v = videoRef.current
    if (!v) return
    if (v.requestFullscreen) {
      v.requestFullscreen()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    if (!v || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * duration
  }

  return (
    <div
      className="group relative overflow-hidden rounded-xl bg-black"
      onMouseMove={scheduleHide}
      onMouseEnter={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        key={src}
        src={src}
        className="aspect-video w-full"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false)
          setShowControls(true)
        }}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
      />

      {/* Custom controls overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Progress bar */}
        <div
          className="mb-3 h-1.5 cursor-pointer rounded-full bg-white/20"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-100"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            {/* Time display */}
            <span className="font-mono text-xs text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed controls */}
            <div className="flex items-center gap-1">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleSpeedChange(speed)}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                    playbackRate === speed
                      ? 'bg-violet-500 text-white'
                      : 'text-white/60 hover:text-white'
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Loop toggle */}
            <button
              type="button"
              onClick={toggleLoop}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded transition-colors',
                isLooping ? 'text-violet-400' : 'text-white/60 hover:text-white'
              )}
              title="Repetir"
            >
              <Repeat className="h-3.5 w-3.5" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={handleFullscreen}
              className="flex h-7 w-7 items-center justify-center rounded text-white/60 transition-colors hover:text-white"
              title="Pantalla completa"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Center play button when paused */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/80 text-white transition-transform hover:scale-110">
            <Play className="h-7 w-7 pl-0.5" />
          </div>
        </button>
      )}
    </div>
  )
}

// ── Scene Metadata Panel ────────────────────────────────────────────────────

function SceneMetadata({ scene }: { scene: PipelineScene }) {
  const [isOpen, setIsOpen] = useState(false)
  const badge = statusBadgeConfig[scene.estado] ?? statusBadgeConfig.pending

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span>Metadatos de la escena</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="grid grid-cols-2 gap-3 border-t border-border px-4 py-3">
          <div>
            <span className="text-xs text-muted-foreground">Modelo</span>
            <p className="text-sm font-medium">Veo 3.1 Fast</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Duracion</span>
            <p className="text-sm font-medium">{scene.duracion_seg}s</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Aspect Ratio</span>
            <p className="text-sm font-medium">{scene.aspect_ratio || '16:9'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Estado</span>
            <p className={cn('text-sm font-medium', badge.color)}>{badge.label}</p>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">Actualizado</span>
            <p className="text-sm font-medium">{formatTimestamp(scene.actualizado_en)}</p>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">Prompt</span>
            <p className="mt-1 rounded-lg bg-muted/50 p-2.5 font-mono text-xs leading-relaxed">
              {scene.video_prompt || 'Sin prompt'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Direct Prompt Editor ────────────────────────────────────────────────────

function DirectPromptEditor({
  scene,
  onClose,
}: {
  scene: PipelineScene
  onClose: () => void
}) {
  const [promptText, setPromptText] = useState(scene.video_prompt ?? '')
  const [saving, setSaving] = useState(false)
  const { updateSceneRemote, updateSceneLocally, generateSingleScene, pipeline } =
    usePipelineStore()

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSceneRemote(scene.id, { video_prompt: promptText })
      updateSceneLocally(scene.id, { video_prompt: promptText })
      toast.success('Prompt actualizado')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndRegenerate = async () => {
    setSaving(true)
    try {
      await updateSceneRemote(scene.id, { video_prompt: promptText })
      updateSceneLocally(scene.id, { video_prompt: promptText, estado: 'generating' })
      if (pipeline) {
        await generateSingleScene(scene.id)
      }
      toast.success('Prompt actualizado — regenerando video')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Pencil className="h-4 w-4 text-violet-400" />
          Editar prompt directamente
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        rows={5}
        className="w-full resize-none rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        placeholder="Escribe el prompt de Veo..."
      />

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || promptText === scene.video_prompt}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Guardar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveAndRegenerate}
          disabled={saving || !promptText.trim()}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Guardar y Regenerar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ── Main ReviewPanel ────────────────────────────────────────────────────────

export function ReviewPanel() {
  const { pipeline, activeSceneId, setActiveScene, approveScene } = usePipelineStore()
  const [editingPrompt, setEditingPrompt] = useState(false)

  if (!pipeline) return null

  const reviewableScenes = pipeline.escenas.filter(
    (s) => s.estado === 'complete' || s.estado === 'approved'
  )

  const activeScene = activeSceneId
    ? pipeline.escenas.find((s) => s.id === activeSceneId)
    : reviewableScenes[0]

  if (!activeScene) {
    return (
      <div className="card-modern flex items-center justify-center p-12">
        <p className="text-muted-foreground">No hay escenas listas para revision</p>
      </div>
    )
  }

  const badge = statusBadgeConfig[activeScene.estado] ?? statusBadgeConfig.pending

  return (
    <div className="space-y-6">
      {/* Scene Tabs with status badges */}
      <div className="flex gap-2 overflow-x-auto">
        {pipeline.escenas.map((scene) => {
          const sceneBadge = statusBadgeConfig[scene.estado] ?? statusBadgeConfig.pending
          return (
            <button
              key={scene.id}
              onClick={() => {
                setActiveScene(scene.id)
                setEditingPrompt(false)
              }}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                scene.id === activeScene.id
                  ? 'bg-primary text-primary-foreground'
                  : scene.aprobado
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {scene.aprobado && <Check className="h-3 w-3" />}
              Escena {scene.orden}
              {scene.id !== activeScene.id && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px]',
                    sceneBadge.bg,
                    sceneBadge.color
                  )}
                >
                  {sceneBadge.label}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Video + Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enhanced Video Player */}
        <div className="space-y-3">
          {activeScene.video_url ? (
            <VideoPlayer src={getVideoSrc(activeScene.video_url) || ''} />
          ) : (
            <div className="card-modern flex aspect-video items-center justify-center bg-muted">
              <p className="text-sm text-muted-foreground">Video no disponible</p>
            </div>
          )}

          {/* Scene Metadata (collapsible) */}
          <SceneMetadata scene={activeScene} />
        </div>

        {/* Scene Details + Actions */}
        <div className="space-y-4">
          {/* Scene header with status badge */}
          <div className="card-modern p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Escena {activeScene.orden}</h3>
              <span
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium',
                  badge.bg,
                  badge.color
                )}
              >
                {badge.label}
              </span>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{activeScene.descripcion}</p>

            {/* Current prompt (non-edit mode) */}
            {!editingPrompt && (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Prompt actual
                  </label>
                  {!activeScene.aprobado && (
                    <button
                      type="button"
                      onClick={() => setEditingPrompt(true)}
                      className="flex items-center gap-1 text-xs text-violet-400 transition-colors hover:text-violet-300"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar Prompt
                    </button>
                  )}
                </div>
                <p className="rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {activeScene.video_prompt}
                </p>
              </>
            )}

            {/* Direct prompt editor */}
            {editingPrompt && (
              <DirectPromptEditor
                scene={activeScene}
                onClose={() => setEditingPrompt(false)}
              />
            )}
          </div>

          {/* Prompt History */}
          <PromptHistoryViewer scene={activeScene} />

          {/* Actions */}
          {!activeScene.aprobado && (
            <div className="flex gap-3">
              <Button
                onClick={() => approveScene(activeScene.id)}
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" /> Aprobar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const chatEl = document.getElementById('revision-chat')
                  chatEl?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex-1 gap-2"
              >
                <Edit3 className="h-4 w-4" /> Solicitar Cambios
              </Button>
            </div>
          )}

          {activeScene.aprobado && (
            <div className="rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-400">
              Escena aprobada
            </div>
          )}

          {/* Mock collaboration badges */}
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground opacity-60"
              onClick={() => toast.info('Proximamente')}
            >
              <UserPlus className="h-4 w-4" />
              Asignar revision
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
                Proximamente
              </span>
            </button>
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground opacity-60"
              onClick={() => toast.info('Proximamente')}
            >
              <Link2 className="h-4 w-4" />
              Enlace de revision para cliente
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">
                Proximamente
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Revision Chat */}
      {!activeScene.aprobado && (
        <div id="revision-chat" className="card-modern p-6">
          <RevisionChat pipelineId={pipeline.id} sceneId={activeScene.id} />
        </div>
      )}

      {/* Check if all approved */}
      {pipeline.escenas.every((s) => s.aprobado) && (
        <div className="card-modern p-6 text-center">
          <p className="mb-2 text-lg font-semibold text-primary">
            Todas las escenas aprobadas
          </p>
          <p className="text-sm text-muted-foreground">
            Puedes proceder a exportar el video final
          </p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import {
  Plus,
  X,
  Star,
  GripVertical,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PipelineScene } from '@/services/api'
import { STATUS_CONFIG } from '@/constants/pipeline'

// ── Props ────────────────────────────────────────────────────────────────────

export interface PipelineLeftPanelProps {
  // Scenes
  scenes: PipelineScene[]
  activeSceneId: number | null
  onSelectScene: (id: number) => void
  onAddScene: () => void
  onDeleteScene?: (id: number) => void
  canAddScene: boolean
  // References
  referenceImages: string[]
  onRemoveReference?: (url: string) => void
  onSetPrimaryReference?: (url: string) => void
  onImportReferences?: () => void
  // Quick settings
  quality: string
  onQualityChange: (v: string) => void
  duration: number
  onDurationChange: (v: number) => void
  aspectRatio: string
  onAspectRatioChange: (v: string) => void
  audioEnabled: boolean
  onAudioToggle: (v: boolean) => void
  draftMode: boolean
  onDraftModeToggle: (v: boolean) => void
  // Cost
  estimatedCost: number
  costBreakdown: string
}

// ── Status dot component ─────────────────────────────────────────────────────

function StatusDot({ estado }: { estado: PipelineScene['estado'] }) {
  const cfg = STATUS_CONFIG[estado] ?? STATUS_CONFIG.pending

  if (estado === 'approved') {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500">
        <Check className="h-2 w-2 text-white" />
      </span>
    )
  }

  if (estado === 'generating') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', cfg.dot)} />
      </span>
    )
  }

  return <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
}

// ── Segmented control ────────────────────────────────────────────────────────

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-lg border border-zinc-700/30 bg-zinc-900/60 p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all',
            value === opt.value
              ? 'bg-violet-500/20 text-violet-300'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors',
        checked ? 'bg-violet-500' : 'bg-zinc-700',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-3 w-3 translate-y-0.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  collapsible,
  collapsed,
  onToggle,
}: {
  title: string
  count?: number
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2',
        collapsible && 'cursor-pointer hover:bg-zinc-800/30',
      )}
      onClick={collapsible ? onToggle : undefined}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-zinc-600">{count}</span>
      )}
      <span className="flex-1" />
      {collapsible &&
        (collapsed ? (
          <ChevronDown className="h-3 w-3 text-zinc-600" />
        ) : (
          <ChevronUp className="h-3 w-3 text-zinc-600" />
        ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function PipelineLeftPanel({
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  canAddScene,
  referenceImages,
  onRemoveReference,
  onSetPrimaryReference,
  onImportReferences,
  quality,
  onQualityChange,
  duration,
  onDurationChange,
  aspectRatio,
  onAspectRatioChange,
  audioEnabled,
  onAudioToggle,
  draftMode,
  onDraftModeToggle,
  estimatedCost,
  costBreakdown,
}: PipelineLeftPanelProps) {
  const [settingsCollapsed, setSettingsCollapsed] = useState(true)

  // Sort scenes by order
  const sortedScenes = [...scenes].sort((a, b) => a.orden - b.orden)

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-zinc-800/40 bg-zinc-950">
      {/* ── ESCENAS ──────────────────────────────────────────────────── */}
      <SectionHeader title="Escenas" count={scenes.length} />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 pb-2">
        <div className="space-y-1">
          {sortedScenes.map((scene) => {
            const isActive = scene.id === activeSceneId
            const isGenerating = scene.estado === 'generating'

            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelectScene(scene.id)}
                className={cn(
                  'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all',
                  isActive
                    ? 'border-l-2 border-violet-500 bg-[#1a1a2e]'
                    : 'border-l-2 border-transparent hover:bg-zinc-800/40',
                  isGenerating && !isActive && 'bg-zinc-900/60',
                )}
              >
                {/* Drag handle — visible on hover */}
                <span className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-3 w-3 text-zinc-600" />
                </span>

                {/* Scene number badge */}
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                    isActive
                      ? 'bg-violet-500 text-white'
                      : 'bg-zinc-800 text-zinc-400',
                  )}
                >
                  S{scene.orden}
                </span>

                {/* Scene title */}
                <span className="flex-1 truncate text-xs text-zinc-300">
                  {scene.descripcion || `Escena ${scene.orden}`}
                </span>

                {/* Status dot */}
                <StatusDot estado={scene.estado} />

                {/* Delete on hover (only when not generating) */}
                {onDeleteScene && !isGenerating && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-700/50 hover:text-red-400 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteScene(scene.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        onDeleteScene(scene.id)
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Add scene button */}
        <button
          type="button"
          onClick={onAddScene}
          disabled={!canAddScene}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-[10px] font-medium transition-colors',
            canAddScene
              ? 'border-zinc-700/40 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-300'
              : 'cursor-not-allowed border-zinc-800/30 text-zinc-700',
          )}
        >
          <Plus className="h-3 w-3" />
          Agregar escena
        </button>
      </div>

      {/* ── REFERENCIAS ──────────────────────────────────────────────── */}
      <div className="border-t border-zinc-800/40">
        <SectionHeader title="Referencias" count={referenceImages.length} />

        <div className="px-2 pb-2">
          {referenceImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {referenceImages.map((url) => (
                <div
                  key={url}
                  className="group relative aspect-square overflow-hidden rounded-md border border-zinc-700/30"
                >
                  <img
                    src={url}
                    alt="Referencia"
                    className="h-14 w-14 object-cover"
                  />
                  {/* Overlay actions on hover */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    {onSetPrimaryReference && (
                      <button
                        type="button"
                        onClick={() => onSetPrimaryReference(url)}
                        className="rounded p-1 text-zinc-300 hover:bg-violet-500/30 hover:text-violet-300"
                        title="Establecer como principal"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    {onRemoveReference && (
                      <button
                        type="button"
                        onClick={() => onRemoveReference(url)}
                        className="rounded p-1 text-zinc-300 hover:bg-red-500/30 hover:text-red-300"
                        title="Eliminar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-700/40 bg-zinc-900/30 px-3 py-3 text-center">
              <p className="text-[10px] text-zinc-600">Sin referencias</p>
            </div>
          )}

          {/* Import button */}
          {onImportReferences && (
            <button
              type="button"
              onClick={onImportReferences}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700/40 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition-colors hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-300"
            >
              <Plus className="h-3 w-3" />
              Importar
            </button>
          )}
        </div>
      </div>

      {/* ── AJUSTES RAPIDOS ──────────────────────────────────────────── */}
      <div className="border-t border-zinc-800/40">
        <SectionHeader
          title="Ajustes rapidos"
          collapsible
          collapsed={settingsCollapsed}
          onToggle={() => setSettingsCollapsed((v) => !v)}
        />

        {!settingsCollapsed && (
          <div className="space-y-3 px-3 pb-3">
            {/* Modelo */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">
                Modelo
              </label>
              <select
                value={quality}
                onChange={(e) => onQualityChange(e.target.value)}
                className="w-full rounded-lg border border-zinc-700/30 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] text-zinc-200 focus:border-violet-500/40 focus:outline-none"
              >
                <optgroup label="Google Veo">
                  <option value="veo-3.1-fast">Veo 3.1 Fast</option>
                  <option value="veo-3.1">Veo 3.1 HQ</option>
                </optgroup>
                <optgroup label="Kling">
                  <option value="kling/v1.5">Kling v1.5</option>
                  <option value="kling/v1.6">Kling v1.6</option>
                  <option value="kling/v2.1-master">Kling v2.1 Master</option>
                  <option value="kling/v2.5">Kling v2.5 Turbo</option>
                  <option value="kling/v2.6">Kling v2.6</option>
                  <option value="kling/v3">Kling v3</option>
                </optgroup>
              </select>
            </div>

            {/* Duracion */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">
                Duracion
              </label>
              <SegmentedControl
                options={[
                  { label: '4s', value: 4 },
                  { label: '6s', value: 6 },
                  { label: '8s', value: 8 },
                ]}
                value={duration}
                onChange={onDurationChange}
              />
            </div>

            {/* Ratio */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-zinc-500">
                Ratio
              </label>
              <SegmentedControl
                options={[
                  { label: '16:9', value: '16:9' },
                  { label: '9:16', value: '9:16' },
                  { label: '1:1', value: '1:1' },
                  { label: '4:5', value: '4:5' },
                ]}
                value={aspectRatio}
                onChange={onAspectRatioChange}
              />
            </div>

            {/* Audio toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-500">
                Audio
              </span>
              <Toggle checked={audioEnabled} onChange={onAudioToggle} />
            </div>

            {/* Draft mode toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-500">
                Draft mode
              </span>
              <Toggle checked={draftMode} onChange={onDraftModeToggle} />
            </div>
          </div>
        )}
      </div>

      {/* ── COSTO ESTIMADO (pinned bottom) ───────────────────────────── */}
      <div className="mt-auto border-t border-zinc-800/40 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3 w-3 text-zinc-600" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Costo estimado
          </span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-600">{costBreakdown}</p>
        <p className="mt-0.5 text-xs font-medium text-zinc-300">
          ~${estimatedCost.toFixed(2)}
        </p>
      </div>
    </aside>
  )
}

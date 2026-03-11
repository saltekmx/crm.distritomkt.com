import {
  Check,
  Clock,
  Loader2,
  RefreshCw,
  X,
  ArrowRight,
  Download,
  Link,
  FileJson,
  RotateCcw,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from '@/constants/pipeline'
import { type UIStage } from '@/stores/pipelineStore'
import { type PipelineScene } from '@/services/api'

// ── Types ────────────────────────────────────────────────────────────────────

interface StyleGuide {
  mood?: string
  palette?: string
  pacing?: string
  visual_references?: string[]
}

interface PipelineRightPanelProps {
  stage: UIStage
  scenes: PipelineScene[]
  activeSceneId: number | null
  styleGuide?: StyleGuide | null
  // Brief stage
  brandKit?: { colors: string[]; fonts: string[]; restrictions: number } | null
  previousCampaigns?: string[]
  onUseCampaignAsReference?: (name: string) => void
  // Planned stage
  onReanalyze?: () => void
  // Generating stage
  costGenerated?: number
  costPending?: number
  onRetryFailed?: () => void
  onCancelAll?: () => void
  // Review stage
  onApproveAll?: () => void
  onGoToExport?: () => void
  onViewPromptHistory?: (sceneId: number) => void
  // Export stage
  exportDestination?: 'library' | 'download' | 'shareable'
  onExportDestinationChange?: (v: 'library' | 'download' | 'shareable') => void
  includeMetadataJson?: boolean
  onIncludeMetadataJsonChange?: (v: boolean) => void
  totalCost?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h3>
  )
}

function Divider() {
  return <div className="border-t border-zinc-800/40" />
}

function ActionButton({
  children,
  variant = 'default',
  onClick,
  disabled,
}: {
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'success'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'default' &&
          'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20',
        variant === 'danger' &&
          'bg-red-500/10 text-red-400 hover:bg-red-500/20',
        variant === 'success' &&
          'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
      )}
    >
      {children}
    </button>
  )
}

// ── Stage: Brief / Idle ──────────────────────────────────────────────────────

function BriefStageContent({
  brandKit,
  previousCampaigns,
  onUseCampaignAsReference,
}: Pick<
  PipelineRightPanelProps,
  'brandKit' | 'previousCampaigns' | 'onUseCampaignAsReference'
>) {
  const kit = brandKit ?? {
    colors: ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444'],
    fonts: ['Inter', 'Playfair Display'],
    restrictions: 3,
  }

  const campaigns = previousCampaigns?.length
    ? previousCampaigns
    : ['Verano 2025', 'Black Friday 2024', 'Lanzamiento Q1']

  return (
    <div className="space-y-5">
      {/* Brand Kit */}
      <div className="space-y-3">
        <SectionHeader>Brand Kit</SectionHeader>

        <div className="space-y-2.5">
          {/* Colors */}
          <div>
            <span className="text-[10px] text-zinc-500">Colores</span>
            <div className="mt-1 flex gap-2">
              {kit.colors.map((color, i) => (
                <div
                  key={i}
                  className="h-5 w-5 rounded-full border border-zinc-700/30"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div>
            <span className="text-[10px] text-zinc-500">Fuentes</span>
            <div className="mt-0.5 space-y-0.5">
              {kit.fonts.map((font) => (
                <p key={font} className="text-[11px] text-zinc-300">
                  {font}
                </p>
              ))}
            </div>
          </div>

          {/* Restrictions */}
          <div>
            <span className="text-[10px] text-zinc-500">Restricciones</span>
            <p className="text-[11px] text-zinc-300">
              {kit.restrictions} regla{kit.restrictions !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-[11px] font-medium text-violet-400 transition-colors hover:text-violet-300"
        >
          Ver Brand Kit completo
        </button>
      </div>

      <Divider />

      {/* Previous Campaigns */}
      <div className="space-y-3">
        <SectionHeader>Campanas anteriores</SectionHeader>

        <div className="space-y-1.5">
          {campaigns.map((name) => (
            <div
              key={name}
              className="group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-800/40"
            >
              <span className="text-[11px] text-zinc-300">{name}</span>
              <button
                type="button"
                onClick={() => onUseCampaignAsReference?.(name)}
                className="hidden text-[10px] font-medium text-violet-400 transition-colors hover:text-violet-300 group-hover:block"
              >
                Usar
              </button>
            </div>
          ))}
        </div>

        <ActionButton onClick={() => onUseCampaignAsReference?.(campaigns[0])}>
          Usar como referencia
        </ActionButton>
      </div>
    </div>
  )
}

// ── Stage: Planned ───────────────────────────────────────────────────────────

function PlannedStageContent({
  styleGuide,
  onReanalyze,
}: Pick<PipelineRightPanelProps, 'styleGuide' | 'onReanalyze'>) {
  const guide = styleGuide ?? {
    mood: 'Energetico',
    palette: 'Calidos + acentos neon',
    pacing: 'Rapido, cortes cada 2-3s',
    visual_references: [
      'Nike "Just Do It" 2024',
      'Apple WWDC intro',
      'Spotify Wrapped transitions',
    ],
  }

  return (
    <div className="space-y-5">
      {/* Style Guide */}
      <div className="space-y-3">
        <SectionHeader>Guia de estilo</SectionHeader>

        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-zinc-500">Mood</span>
            <p className="text-xs text-zinc-300">{guide.mood ?? 'Sin definir'}</p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500">Paleta</span>
            <p className="text-xs text-zinc-300">
              {guide.palette ?? 'Sin definir'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500">Ritmo</span>
            <p className="text-xs text-zinc-300">
              {guide.pacing ?? 'Sin definir'}
            </p>
          </div>
        </div>
      </div>

      <Divider />

      {/* Visual References */}
      {guide.visual_references && guide.visual_references.length > 0 && (
        <>
          <div className="space-y-3">
            <SectionHeader>Referencias visuales</SectionHeader>
            <div className="space-y-1.5">
              {guide.visual_references.map((ref, i) => (
                <p key={i} className="text-[11px] text-zinc-400">
                  <span className="mr-1.5 text-violet-400">&rsaquo;</span>
                  {ref}
                </p>
              ))}
            </div>
          </div>

          <Divider />
        </>
      )}

      {/* Re-analyze */}
      <div className="space-y-3">
        <SectionHeader>Re-analizar</SectionHeader>
        <ActionButton onClick={onReanalyze}>
          <span className="flex items-center justify-center gap-1.5">
            <RotateCcw className="h-3 w-3" />
            Regenerar plan
          </span>
        </ActionButton>
      </div>
    </div>
  )
}

// ── Stage: Generating ────────────────────────────────────────────────────────

function GeneratingStageContent({
  scenes,
  costGenerated = 0,
  costPending = 0,
  onRetryFailed,
  onCancelAll,
}: Pick<
  PipelineRightPanelProps,
  'scenes' | 'costGenerated' | 'costPending' | 'onRetryFailed' | 'onCancelAll'
>) {
  const totalCost = costGenerated + costPending

  return (
    <div className="space-y-5">
      {/* Real-time status */}
      <div className="space-y-3">
        <SectionHeader>Estado en tiempo real</SectionHeader>

        <div className="space-y-1.5">
          {scenes.map((scene) => {
            const cfg = STATUS_CONFIG[scene.estado] ?? STATUS_CONFIG.pending
            const isGenerating = scene.estado === 'generating'
            const isComplete =
              scene.estado === 'complete' || scene.estado === 'approved'
            const isFailed = scene.estado === 'failed'

            return (
              <div
                key={scene.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
              >
                {/* Scene label */}
                <span className="w-5 shrink-0 font-mono text-zinc-400">
                  S{scene.orden}
                </span>

                {/* Status icon */}
                <span className="shrink-0">
                  {isComplete && (
                    <Check className="h-3 w-3 text-emerald-400" />
                  )}
                  {isGenerating && (
                    <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                  )}
                  {isFailed && <X className="h-3 w-3 text-red-400" />}
                  {!isComplete && !isGenerating && !isFailed && (
                    <span className="flex h-3 w-3 items-center justify-center text-zinc-500">
                      ○
                    </span>
                  )}
                </span>

                {/* Status text */}
                <span className={cn('flex-1', cfg.color)}>
                  {isComplete && 'Completa'}
                  {isGenerating && 'Generando...'}
                  {isFailed && 'Error'}
                  {!isComplete && !isGenerating && !isFailed && 'En cola'}
                </span>

                {/* Duration / timing */}
                <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                  {isComplete && `${scene.duracion_seg}s`}
                  {isGenerating &&
                    `${scene.elapsed_sec ?? 0}s / ~${scene.duracion_seg * 10}s`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Divider />

      {/* Cost */}
      <div className="space-y-3">
        <SectionHeader>Costo actual</SectionHeader>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Generadas</span>
            <span className="font-mono text-zinc-300">
              ${costGenerated.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Pendiente</span>
            <span className="font-mono text-zinc-400">
              ~${costPending.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-zinc-800/40 pt-1 text-xs">
            <span className="font-medium text-zinc-400">Total</span>
            <span className="font-mono font-medium text-zinc-200">
              ~${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <Divider />

      {/* Actions */}
      <div className="space-y-3">
        <SectionHeader>Acciones</SectionHeader>

        <div className="space-y-2">
          <ActionButton
            onClick={onRetryFailed}
            disabled={!scenes.some((s) => s.estado === 'failed')}
          >
            <span className="flex items-center justify-center gap-1.5">
              <RefreshCw className="h-3 w-3" />
              Regenerar fallidas
            </span>
          </ActionButton>

          <ActionButton variant="danger" onClick={onCancelAll}>
            <span className="flex items-center justify-center gap-1.5">
              <X className="h-3 w-3" />
              Cancelar todas
            </span>
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

// ── Stage: Review ────────────────────────────────────────────────────────────

function ReviewStageContent({
  scenes,
  activeSceneId,
  onApproveAll,
  onGoToExport,
  onViewPromptHistory,
}: Pick<
  PipelineRightPanelProps,
  'scenes' | 'activeSceneId' | 'onApproveAll' | 'onGoToExport' | 'onViewPromptHistory'
>) {
  const allApproved = scenes.length > 0 && scenes.every((s) => s.aprobado)
  const activeScene = scenes.find((s) => s.id === activeSceneId)

  // Get last 2-3 prompt history entries for the active scene
  const promptHistory = activeScene?.historial_prompts?.slice(-3) ?? []

  return (
    <div className="space-y-5">
      {/* Approvals */}
      <div className="space-y-3">
        <SectionHeader>Aprobaciones</SectionHeader>

        <div className="space-y-1.5">
          {scenes.map((scene) => {
            const isApproved = scene.aprobado
            const isComplete = scene.estado === 'complete'
            const isPending = !isApproved && !isComplete

            return (
              <div
                key={scene.id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]',
                  scene.id === activeSceneId && 'bg-zinc-800/30'
                )}
              >
                <span className="w-5 shrink-0 font-mono text-zinc-400">
                  S{scene.orden}
                </span>

                <span className="shrink-0">
                  {isApproved && (
                    <Check className="h-3 w-3 text-emerald-400" />
                  )}
                  {isComplete && !isApproved && (
                    <Clock className="h-3 w-3 text-amber-400" />
                  )}
                  {isPending && (
                    <span className="flex h-3 w-3 items-center justify-center text-zinc-500">
                      ○
                    </span>
                  )}
                </span>

                <span
                  className={cn(
                    'flex-1',
                    isApproved && 'text-emerald-400',
                    isComplete && !isApproved && 'text-amber-400',
                    isPending && 'text-zinc-500'
                  )}
                >
                  {isApproved && 'Aprobada'}
                  {isComplete && !isApproved && 'En revision'}
                  {isPending && 'Pendiente'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Divider />

      {/* Prompt history for active scene */}
      {activeScene && (
        <div className="space-y-3">
          <SectionHeader>Historial de prompts</SectionHeader>

          {promptHistory.length > 0 ? (
            <div className="space-y-2">
              {promptHistory.map((entry, i) => {
                const prompt =
                  typeof entry === 'string'
                    ? entry
                    : (entry as Record<string, unknown>).prompt ??
                      (entry as Record<string, unknown>).veo_prompt ??
                      JSON.stringify(entry)

                return (
                  <div
                    key={i}
                    className="rounded-md bg-zinc-900/60 px-2.5 py-2"
                  >
                    <p className="line-clamp-2 text-[10px] leading-relaxed text-zinc-400">
                      {String(prompt)}
                    </p>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={() =>
                  activeScene && onViewPromptHistory?.(activeScene.id)
                }
                className="text-[11px] font-medium text-violet-400 transition-colors hover:text-violet-300"
              >
                Ver todos
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600">Sin historial</p>
          )}
        </div>
      )}

      <Divider />

      {/* Actions */}
      <div className="space-y-2">
        <ActionButton variant="success" onClick={onApproveAll}>
          <span className="flex items-center justify-center gap-1.5">
            <Check className="h-3 w-3" />
            Aprobar todas
          </span>
        </ActionButton>

        {allApproved && (
          <ActionButton onClick={onGoToExport}>
            <span className="flex items-center justify-center gap-1.5">
              <ArrowRight className="h-3 w-3" />
              Ir a Exportar
            </span>
          </ActionButton>
        )}
      </div>
    </div>
  )
}

// ── Stage: Export ─────────────────────────────────────────────────────────────

function ExportStageContent({
  scenes,
  exportDestination = 'library',
  onExportDestinationChange,
  includeMetadataJson = false,
  onIncludeMetadataJsonChange,
  costGenerated = 0,
  totalCost = 0,
}: Pick<
  PipelineRightPanelProps,
  | 'scenes'
  | 'exportDestination'
  | 'onExportDestinationChange'
  | 'includeMetadataJson'
  | 'onIncludeMetadataJsonChange'
  | 'costGenerated'
  | 'totalCost'
>) {
  const destinations: {
    value: 'library' | 'download' | 'shareable'
    label: string
    icon: React.ElementType
  }[] = [
    { value: 'library', label: 'Biblioteca del Proyecto', icon: Eye },
    { value: 'download', label: 'Descarga directa', icon: Download },
    { value: 'shareable', label: 'Link compartible', icon: Link },
  ]

  const revisionCost = totalCost > costGenerated ? totalCost - costGenerated : 0

  return (
    <div className="space-y-5">
      {/* Destination */}
      <div className="space-y-3">
        <SectionHeader>Destino</SectionHeader>

        <div className="space-y-1.5">
          {destinations.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-zinc-800/30"
            >
              {/* Custom radio */}
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                  exportDestination === value
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-zinc-600 bg-transparent'
                )}
              >
                {exportDestination === value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>

              <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

              <span className="text-[11px] text-zinc-300">{label}</span>

              <input
                type="radio"
                name="export-destination"
                value={value}
                checked={exportDestination === value}
                onChange={() => onExportDestinationChange?.(value)}
                className="sr-only"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Shareable link options */}
      {exportDestination === 'shareable' && (
        <>
          <Divider />

          <div className="space-y-3">
            <SectionHeader>Link compartible</SectionHeader>

            <div className="space-y-2.5">
              {/* Expiration */}
              <div>
                <span className="text-[10px] text-zinc-500">Expiracion</span>
                <select className="mt-1 w-full rounded-md border border-zinc-700/30 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-violet-500">
                  <option value="7">7 dias</option>
                  <option value="14">14 dias</option>
                  <option value="30">30 dias</option>
                  <option value="0">Sin expiracion</option>
                </select>
              </div>

              {/* Protection toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Proteccion con contrasena
                </span>
                <button
                  type="button"
                  className="h-5 w-9 rounded-full bg-zinc-700 transition-colors"
                  aria-label="Activar proteccion"
                >
                  <span className="ml-0.5 block h-4 w-4 rounded-full bg-zinc-400 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Divider />

      {/* Cost summary */}
      <div className="space-y-3">
        <SectionHeader>Resumen de costos</SectionHeader>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Generacion</span>
            <span className="font-mono text-zinc-300">
              ${costGenerated.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Revisiones</span>
            <span className="font-mono text-zinc-300">
              ${revisionCost.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-zinc-800/40 pt-1 text-xs">
            <span className="font-medium text-zinc-400">Total</span>
            <span className="font-mono font-medium text-zinc-200">
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <Divider />

      {/* Metadata JSON */}
      <div className="space-y-3">
        <SectionHeader>Metadatos JSON</SectionHeader>

        <label className="flex cursor-pointer items-center gap-2.5">
          {/* Custom checkbox */}
          <span
            className={cn(
              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border',
              includeMetadataJson
                ? 'border-violet-500 bg-violet-500'
                : 'border-zinc-600 bg-transparent'
            )}
          >
            {includeMetadataJson && (
              <Check className="h-2.5 w-2.5 text-white" />
            )}
          </span>

          <span className="text-[11px] text-zinc-300">
            Incluir con exportacion
          </span>

          <input
            type="checkbox"
            checked={includeMetadataJson}
            onChange={(e) => onIncludeMetadataJsonChange?.(e.target.checked)}
            className="sr-only"
          />
        </label>

        <p className="text-[10px] leading-relaxed text-zinc-600">
          Exporta un archivo JSON con prompts, configuracion de escenas,
          timestamps y metadatos del pipeline para integraciones externas.
        </p>
      </div>
    </div>
  )
}

// ── Stage Title Mapping ──────────────────────────────────────────────────────

const stageTitles: Record<UIStage, string> = {
  idle: 'Brief',
  brief: 'Brief',
  planned: 'Plan',
  generating: 'Generacion',
  review: 'Revision',
  export: 'Exportar',
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PipelineRightPanel(props: PipelineRightPanelProps) {
  const { stage } = props

  return (
    <div className="w-[320px] shrink-0 border-l border-zinc-800/40 bg-zinc-950/60 overflow-y-auto scrollbar-thin">
      {/* Panel header */}
      <div className="sticky top-0 z-10 border-b border-zinc-800/40 bg-zinc-950/80 px-4 py-3 backdrop-blur-sm">
        <h2 className="text-xs font-semibold text-zinc-300">
          {stageTitles[stage]}
        </h2>
      </div>

      {/* Content */}
      <div className="p-4">
        {(stage === 'idle' || stage === 'brief') && (
          <BriefStageContent
            brandKit={props.brandKit}
            previousCampaigns={props.previousCampaigns}
            onUseCampaignAsReference={props.onUseCampaignAsReference}
          />
        )}

        {stage === 'planned' && (
          <PlannedStageContent
            styleGuide={props.styleGuide}
            onReanalyze={props.onReanalyze}
          />
        )}

        {stage === 'generating' && (
          <GeneratingStageContent
            scenes={props.scenes}
            costGenerated={props.costGenerated}
            costPending={props.costPending}
            onRetryFailed={props.onRetryFailed}
            onCancelAll={props.onCancelAll}
          />
        )}

        {stage === 'review' && (
          <ReviewStageContent
            scenes={props.scenes}
            activeSceneId={props.activeSceneId}
            onApproveAll={props.onApproveAll}
            onGoToExport={props.onGoToExport}
            onViewPromptHistory={props.onViewPromptHistory}
          />
        )}

        {stage === 'export' && (
          <ExportStageContent
            scenes={props.scenes}
            exportDestination={props.exportDestination}
            onExportDestinationChange={props.onExportDestinationChange}
            includeMetadataJson={props.includeMetadataJson}
            onIncludeMetadataJsonChange={props.onIncludeMetadataJsonChange}
            costGenerated={props.costGenerated}
            totalCost={props.totalCost}
          />
        )}
      </div>
    </div>
  )
}

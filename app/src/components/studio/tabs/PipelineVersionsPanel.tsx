import { Film, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineVersionItem } from '@/services/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineVersionsPanelProps {
  versions: PipelineVersionItem[]
  selectedPipelineId: number | null
  isLoading: boolean
  onSelect: (id: number) => void
  onCreateNew: () => void
}

// ── Status maps ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  draft:      'text-zinc-500',
  analyzing:  'text-amber-400',
  planned:    'text-blue-400',
  generating: 'text-amber-400 animate-pulse',
  review:     'text-violet-400',
  approved:   'text-green-400',
  exporting:  'text-teal-400',
  exported:   'text-green-400',
}

const STATUS_LABEL: Record<string, string> = {
  draft:      'Borrador',
  analyzing:  'Analizando',
  planned:    'Planificado',
  generating: 'Generando',
  review:     'Revisión',
  approved:   'Aprobado',
  exporting:  'Exportando',
  exported:   'Exportado',
}

// ── Pipeline Version Card ─────────────────────────────────────────────────────

function PipelineVersionCard({
  version,
  isActive,
  onSelect,
}: {
  version: PipelineVersionItem
  isActive: boolean
  onSelect: (id: number) => void
}) {
  const label = version.brief_snapshot
    ? version.brief_snapshot.split(/[,.\n]/)[0]?.trim().slice(0, 50) || `Pipeline #${version.id}`
    : `Pipeline #${version.id}`

  const dateStr = new Date(version.creado_en).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  })

  const progress =
    version.total_escenas > 0
      ? Math.round((version.escenas_completas / version.total_escenas) * 100)
      : 0

  return (
    <button
      onClick={() => onSelect(version.id)}
      className={cn(
        'group relative flex flex-col gap-1.5 w-full rounded-lg p-2.5 text-left transition-all border',
        isActive
          ? 'border-violet-500 ring-1 ring-violet-500/30 bg-violet-500/5'
          : 'border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/70',
      )}
    >
      {/* Top row: label + active dot */}
      <div className="flex items-start gap-1.5">
        <p className="flex-1 text-[11px] text-zinc-300 leading-tight line-clamp-2">{label}</p>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Bottom row: status + scenes + date */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-[10px] font-medium',
            STATUS_COLOR[version.estado] ?? 'text-zinc-500',
          )}
        >
          {STATUS_LABEL[version.estado] ?? version.estado}
        </span>
        <span className="text-[10px] text-zinc-600">·</span>
        <span className="text-[10px] text-zinc-500">
          {version.escenas_completas}/{version.total_escenas} escenas
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600">{dateStr}</span>
      </div>

      {/* Progress bar — only when there is some completion */}
      {version.total_escenas > 0 && version.escenas_completas > 0 && (
        <div className="w-full h-0.5 bg-zinc-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500/60 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function PipelineVersionsPanel({
  versions,
  selectedPipelineId,
  isLoading,
  onSelect,
  onCreateNew,
}: PipelineVersionsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0">
        <span className="text-sm font-medium text-zinc-200">Pipelines</span>
        <span className="text-xs text-zinc-600 ml-2">({versions.length})</span>
        <div className="flex-1" />
        <button
          onClick={onCreateNew}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Nueva versión"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-zinc-600 text-xs">
            Cargando...
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Film className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-600">Sin pipelines</p>
            <button
              onClick={onCreateNew}
              className="mt-3 text-xs text-violet-400 hover:text-violet-300"
            >
              + Crear pipeline
            </button>
          </div>
        ) : (
          versions.map((v) => (
            <PipelineVersionCard
              key={v.id}
              version={v}
              isActive={v.id === selectedPipelineId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

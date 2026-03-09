import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, RotateCcw, User, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePipelineStore } from '@/stores/pipelineStore'
import { cn } from '@/lib/utils'
import type { PipelineScene } from '@/services/api'

interface Props {
  scene: PipelineScene
}

export function PromptHistoryViewer({ scene }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const { revertPrompt } = usePipelineStore()

  const history = scene.historial_prompts ?? []

  if (history.length === 0) {
    return null
  }

  // Most recent first
  const sortedHistory = [...history].reverse()

  function formatTimestamp(ts: string): string {
    try {
      const d = new Date(ts)
      return d.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Historial de prompts</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {history.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          <div className="max-h-96 space-y-0 overflow-y-auto">
            {sortedHistory.map((entry, idx) => {
              const isExpanded = expandedIdx === idx
              const isCurrentPrompt = entry.prompt === scene.veo_prompt
              const isTruncated = entry.prompt.length > 120

              return (
                <div
                  key={`${entry.timestamp}-${idx}`}
                  className={cn(
                    'border-b border-border/50 px-4 py-3 last:border-b-0',
                    isCurrentPrompt && 'bg-violet-500/5'
                  )}
                >
                  {/* Header row */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTimestamp(entry.timestamp)}</span>
                      <span className="text-border">|</span>
                      <span className="flex items-center gap-1">
                        {entry.revised_by === 'editor' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        {entry.revised_by === 'editor' ? 'Editor' : 'Agente IA'}
                      </span>
                      {isCurrentPrompt && (
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                          Actual
                        </span>
                      )}
                    </div>

                    {!isCurrentPrompt && !scene.aprobado && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revertPrompt(scene.id, entry.prompt)}
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-violet-400"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar
                      </Button>
                    )}
                  </div>

                  {/* Prompt text */}
                  <div
                    className={cn(
                      'rounded-lg bg-muted/50 p-2.5 font-mono text-xs leading-relaxed',
                      !isExpanded && isTruncated && 'line-clamp-2'
                    )}
                  >
                    {entry.prompt}
                  </div>
                  {isTruncated && (
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="mt-1 text-xs text-violet-400 hover:text-violet-300"
                    >
                      {isExpanded ? 'Colapsar' : 'Ver prompt completo'}
                    </button>
                  )}

                  {/* Rationale */}
                  {entry.rationale && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      {entry.rationale}
                    </p>
                  )}

                  {/* Editor feedback that triggered this */}
                  {entry.editor_feedback && (
                    <div className="mt-2 flex items-start gap-2">
                      <User className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
                      <p className="text-xs text-blue-400/80">
                        &quot;{entry.editor_feedback}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

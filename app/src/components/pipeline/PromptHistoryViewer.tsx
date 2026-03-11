import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, RotateCcw, User, Bot, Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { usePipelineStore } from '@/stores/pipelineStore'
import { cn } from '@/lib/utils'
import type { PipelineScene } from '@/services/api'

interface Props {
  scene: PipelineScene
}

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

// ── Prompt History Entry (shared between inline and modal) ──────────────────

function PromptHistoryEntry({
  entry,
  idx,
  totalCount,
  isCurrentPrompt,
  isApproved,
  sceneId,
}: {
  entry: Record<string, unknown>
  idx: number
  totalCount: number
  isCurrentPrompt: boolean
  isApproved: boolean
  sceneId: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { revertPrompt } = usePipelineStore()

  const prompt = (entry.prompt as string) ?? ''
  const timestamp = (entry.timestamp as string) ?? ''
  const revisedBy = (entry.revised_by as string) ?? ''
  const rationale = (entry.rationale as string) ?? ''
  const editorFeedback = (entry.editor_feedback as string) ?? ''
  const isTruncated = prompt.length > 120
  const versionNumber = totalCount - idx

  return (
    <div
      className={cn(
        'border-b border-border/50 px-4 py-3 last:border-b-0',
        isCurrentPrompt && 'bg-violet-500/5'
      )}
    >
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
            v{versionNumber}
          </span>
          <span>{formatTimestamp(timestamp)}</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            {revisedBy === 'editor' ? (
              <User className="h-3 w-3" />
            ) : (
              <Bot className="h-3 w-3" />
            )}
            {revisedBy === 'editor' ? 'Editor' : 'Agente IA'}
          </span>
          {isCurrentPrompt && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
              Actual
            </span>
          )}
        </div>

        {!isCurrentPrompt && !isApproved && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => revertPrompt(sceneId, prompt)}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-violet-400"
          >
            <RotateCcw className="h-3 w-3" />
            Revertir
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
        {prompt}
      </div>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-xs text-violet-400 hover:text-violet-300"
        >
          {isExpanded ? 'Colapsar' : 'Ver prompt completo'}
        </button>
      )}

      {/* Rationale */}
      {rationale && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          {rationale}
        </p>
      )}

      {/* Editor feedback that triggered this */}
      {editorFeedback && (
        <div className="mt-2 flex items-start gap-2">
          <User className="mt-0.5 h-3 w-3 shrink-0 text-blue-400" />
          <p className="text-xs text-blue-400/80">
            &quot;{editorFeedback}&quot;
          </p>
        </div>
      )}
    </div>
  )
}

// ── Prompt History Modal ────────────────────────────────────────────────────

function PromptHistoryModal({
  scene,
  open,
  onOpenChange,
}: {
  scene: PipelineScene
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const history = scene.historial_prompts ?? []
  const sortedHistory = [...history].reverse()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Historial de prompts - Escena {scene.orden}</DialogTitle>
          <DialogDescription>
            {history.length} {history.length === 1 ? 'version' : 'versiones'} del prompt
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-0 scrollbar-thin">
          {sortedHistory.map((entry, idx) => {
            const prompt = (entry.prompt as string) ?? ''
            const isCurrentPrompt = prompt === scene.veo_prompt

            return (
              <PromptHistoryEntry
                key={`${(entry.timestamp as string) ?? ''}-${idx}`}
                entry={entry}
                idx={idx}
                totalCount={sortedHistory.length}
                isCurrentPrompt={isCurrentPrompt}
                isApproved={scene.aprobado}
                sceneId={scene.id}
              />
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main PromptHistoryViewer ────────────────────────────────────────────────

export function PromptHistoryViewer({ scene }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const history = scene.historial_prompts ?? []

  if (history.length === 0) {
    return null
  }

  // Most recent first
  const sortedHistory = [...history].reverse()
  // Show up to 3 in inline view
  const inlineEntries = sortedHistory.slice(0, 3)
  const hasMore = sortedHistory.length > 3

  return (
    <>
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
          <div className="flex items-center gap-2">
            {history.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setModalOpen(true)
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-violet-400 transition-colors hover:bg-violet-500/10 hover:text-violet-300"
              >
                <Expand className="h-3 w-3" />
                Ver todo
              </button>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-border">
            <div className="max-h-96 space-y-0 overflow-y-auto">
              {inlineEntries.map((entry, idx) => {
                const prompt = (entry.prompt as string) ?? ''
                const isCurrentPrompt = prompt === scene.veo_prompt

                return (
                  <PromptHistoryEntry
                    key={`${(entry.timestamp as string) ?? ''}-${idx}`}
                    entry={entry}
                    idx={idx}
                    totalCount={sortedHistory.length}
                    isCurrentPrompt={isCurrentPrompt}
                    isApproved={scene.aprobado}
                    sceneId={scene.id}
                  />
                )
              })}
              {hasMore && (
                <div className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="text-xs text-violet-400 transition-colors hover:text-violet-300"
                  >
                    Ver {sortedHistory.length - 3} versiones anteriores...
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <PromptHistoryModal
        scene={scene}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}

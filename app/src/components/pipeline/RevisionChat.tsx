import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Bot, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pipelineApi, type PipelineComment } from '@/services/api'
import { usePipelineStore } from '@/stores/pipelineStore'

interface Props {
  pipelineId: number
  sceneId: number
}

// ── Prompt code block with expand/collapse ──────────────────────────────────

function PromptBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isTruncatable = text.length > 150

  return (
    <div className="mt-2">
      <div
        className={cn(
          'rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5 font-mono text-xs leading-relaxed',
          !expanded && isTruncatable && 'line-clamp-3'
        )}
      >
        {text}
      </div>
      {isTruncatable && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
        >
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
          />
          {expanded ? 'Colapsar' : 'Ver prompt completo'}
        </button>
      )}
    </div>
  )
}

// ── Agent message content with structured display ───────────────────────────

function AgentMessageContent({ comment }: { comment: PipelineComment }) {
  const meta = comment.metadatos
  const revisedPrompt = meta?.revised_prompt ? String(meta.revised_prompt) : null
  const rationale = meta?.rationale ? String(meta.rationale) : null
  const changesApplied = Array.isArray(meta?.changes_applied)
    ? (meta.changes_applied as string[])
    : null

  return (
    <div className="space-y-2">
      <p className="text-sm">{comment.contenido}</p>

      {/* Rationale */}
      {rationale && (
        <p className="text-xs italic text-muted-foreground/80">{rationale}</p>
      )}

      {/* Changes applied */}
      {changesApplied && changesApplied.length > 0 && (
        <div className="mt-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Cambios aplicados
          </span>
          <ul className="mt-1 space-y-0.5">
            {changesApplied.map((change, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Revised prompt */}
      {revisedPrompt && <PromptBlock text={revisedPrompt} />}
    </div>
  )
}

// ── Time formatter ──────────────────────────────────────────────────────────

function formatChatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// ── Main Component ──────────────────────────────────────────────────────────

export function RevisionChat({ pipelineId, sceneId }: Props) {
  const [comments, setComments] = useState<PipelineComment[]>([])
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const { submitRevision } = usePipelineStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    pipelineApi.getComments(pipelineId, sceneId).then(({ data }) => setComments(data))
  }, [pipelineId, sceneId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  const handleSend = async () => {
    if (!feedback.trim()) return
    setSending(true)
    try {
      await submitRevision(sceneId, feedback)
      setComments((prev) => [
        ...prev,
        {
          id: Date.now(),
          tipo_autor: 'editor',
          contenido: feedback,
          metadatos: null,
          creado_en: new Date().toISOString(),
        },
      ])
      setFeedback('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Historial de revisiones</h4>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-96 space-y-4 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin revisiones aun. Describe los cambios que necesitas.
          </p>
        )}

        {comments.map((c) => {
          const isEditor = c.tipo_autor === 'editor'

          return (
            <div
              key={c.id}
              className={cn('flex gap-3', isEditor ? 'justify-end' : 'justify-start')}
            >
              {/* Agent avatar */}
              {!isEditor && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                  <Bot className="h-4 w-4 text-violet-400" />
                </div>
              )}

              {/* Message bubble */}
              <div className="max-w-[80%] space-y-1">
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3',
                    isEditor
                      ? 'rounded-br-md bg-blue-600 text-white'
                      : 'rounded-bl-md bg-zinc-800 text-zinc-100'
                  )}
                >
                  {isEditor ? (
                    <p className="text-sm">{c.contenido}</p>
                  ) : (
                    <AgentMessageContent comment={c} />
                  )}
                </div>
                <p
                  className={cn(
                    'text-[10px] text-muted-foreground',
                    isEditor ? 'text-right' : 'text-left'
                  )}
                >
                  {formatChatTime(c.creado_en)}
                </p>
              </div>

              {/* Editor avatar */}
              {isEditor && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/10">
                  <User className="h-4 w-4 text-blue-400" />
                </div>
              )}
            </div>
          )
        })}

        {/* Sending indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
              <Bot className="h-4 w-4 text-violet-400" />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analizando feedback...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Describe los cambios que necesitas..."
          className="flex-1 resize-none rounded-xl border border-border bg-zinc-900 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!feedback.trim() || sending}
          className="h-auto"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

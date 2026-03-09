import { useState } from 'react'
import { FileText, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { usePipelineStore } from '@/stores/pipelineStore'

interface Props {
  projectId: number
  /** Pre-filled brief text from the CRM project */
  initialBrief?: string
  /** Project name for display */
  projectName?: string
  /** Client name for display */
  clientName?: string
  /** Whether analysis has already been done (re-analyze mode) */
  isReanalyze?: boolean
}

export function BriefEditor({
  projectId,
  initialBrief = '',
  projectName,
  clientName,
  isReanalyze = false,
}: Props) {
  const [briefText, setBriefText] = useState(initialBrief)
  const { startPipeline, isLoading } = usePipelineStore()

  const handleAnalyze = () => {
    const override = briefText.trim() !== initialBrief.trim() ? briefText.trim() : undefined
    startPipeline(projectId, override)
  }

  return (
    <div className="card-modern p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {isReanalyze ? 'Re-analizar Brief' : 'Brief del Proyecto'}
          </h3>
          {(projectName || clientName) && (
            <p className="text-sm text-muted-foreground">
              {projectName}
              {clientName && <span className="text-muted-foreground/60"> — {clientName}</span>}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Descripcion del proyecto (editable)
          </label>
          <Textarea
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            placeholder="Describe el proyecto, objetivos, publico objetivo, tono deseado..."
            className="min-h-[120px] resize-none bg-zinc-800/50 font-normal"
            rows={5}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            El agente Director analizara este brief para crear un plan de escenas de video.
            Puedes editar el texto para ajustar el enfoque.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          {briefText.trim() !== initialBrief.trim() && initialBrief && (
            <button
              type="button"
              onClick={() => setBriefText(initialBrief)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar original
            </button>
          )}
          <div className="ml-auto">
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={isLoading || !briefText.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {isLoading
                ? 'Analizando brief con IA...'
                : isReanalyze
                  ? 'Re-analizar Brief'
                  : 'Analizar Brief con IA'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

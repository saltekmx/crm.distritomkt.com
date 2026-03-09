import { Upload, FileText, Layout, Play, Eye, Download, Check } from 'lucide-react'
import { usePipelineStore, type UIStage } from '@/stores/pipelineStore'

const steps: { key: UIStage; label: string; icon: React.ElementType }[] = [
  { key: 'idle', label: 'Assets', icon: Upload },
  { key: 'brief', label: 'Brief', icon: FileText },
  { key: 'planned', label: 'Plan', icon: Layout },
  { key: 'generating', label: 'Generar', icon: Play },
  { key: 'review', label: 'Revisión', icon: Eye },
  { key: 'export', label: 'Exportar', icon: Download },
]

const stageOrder: UIStage[] = ['idle', 'brief', 'planned', 'generating', 'review', 'export']

interface Props {
  currentStage: UIStage
}

export function PipelineStepper({ currentStage }: Props) {
  const currentIdx = stageOrder.indexOf(currentStage)
  const { setStage, canGoToStage } = usePipelineStore()

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-4">
      {steps.map((step, idx) => {
        const isComplete = idx < currentIdx
        const isCurrent = idx === currentIdx
        const canClick = canGoToStage(step.key) && !isCurrent
        const Icon = step.icon

        return (
          <div key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={() => canClick && setStage(step.key)}
              disabled={!canClick}
              className={`flex flex-col items-center gap-1 ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  isComplete
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground'
                } ${canClick ? 'hover:ring-2 hover:ring-primary/30' : ''}`}
              >
                {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`text-xs font-medium ${
                  isCurrent ? 'text-primary' : isComplete ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 ${
                  idx < currentIdx ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

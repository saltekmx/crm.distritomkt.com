import { Upload, FileText, Layout, Play, Eye, Download, Check } from 'lucide-react'
import { usePipelineStore, type UIStage } from '@/stores/pipelineStore'

// 5 visual steps matching spec: Brief → Escenas → Generar → Revisar → Exportar
// idle + brief map to "Brief" visual step
const visualSteps: { label: string; icon: React.ElementType; stages: UIStage[] }[] = [
  { label: 'Brief', icon: FileText, stages: ['idle', 'brief'] },
  { label: 'Escenas', icon: Layout, stages: ['planned'] },
  { label: 'Generar', icon: Play, stages: ['generating'] },
  { label: 'Revisar', icon: Eye, stages: ['review'] },
  { label: 'Exportar', icon: Download, stages: ['export'] },
]

const allStages: UIStage[] = ['idle', 'brief', 'planned', 'generating', 'review', 'export']

interface Props {
  currentStage: UIStage
}

export function PipelineStepper({ currentStage }: Props) {
  const { setStage, canGoToStage } = usePipelineStore()

  const currentVisualIdx = visualSteps.findIndex((step) => step.stages.includes(currentStage))

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-4">
      {visualSteps.map((step, idx) => {
        const isComplete = idx < currentVisualIdx
        const isCurrent = idx === currentVisualIdx
        const targetStage = step.stages[0]
        const canClick = canGoToStage(targetStage) && !isCurrent
        const Icon = step.icon

        return (
          <div key={step.label} className="flex items-center">
            <button
              type="button"
              onClick={() => canClick && setStage(targetStage)}
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
            {idx < visualSteps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 ${
                  idx < currentVisualIdx ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

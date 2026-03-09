import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Video } from 'lucide-react'
import { usePipelineStore } from '@/stores/pipelineStore'
import { usePipelineWebSocket } from '@/hooks/usePipelineWebSocket'
import { PipelineStepper } from '@/components/pipeline/PipelineStepper'
import { AssetUploader } from '@/components/pipeline/AssetUploader'
import { BriefEditor } from '@/components/pipeline/BriefEditor'
import { ScenePlanView } from '@/components/pipeline/ScenePlanView'
import { GenerationGrid } from '@/components/pipeline/GenerationGrid'
import { ReviewPanel } from '@/components/pipeline/ReviewPanel'
import { ExportPanel } from '@/components/pipeline/ExportPanel'
import { ROUTES } from '@/lib/routes'

export default function PipelinePage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const { pipeline, currentStage, isLoading, initPipeline, reset, setStage } = usePipelineStore()
  const [showReanalyze, setShowReanalyze] = useState(false)

  usePipelineWebSocket(pipeline?.id ?? null)

  useEffect(() => {
    initPipeline(projectId)
    return () => reset()
  }, [projectId, initPipeline, reset])

  const handleReanalyze = () => {
    setShowReanalyze(true)
    setStage('idle')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={ROUTES.PROJECTS_DETAIL(projectId)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="icon-badge bg-primary/10 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pipeline de Video</h1>
            <p className="text-sm text-muted-foreground">
              Generacion de video con IA para proyecto #{projectId}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <PipelineStepper currentStage={currentStage} />

      {/* Stage Content */}
      {currentStage === 'idle' && (
        <div className="space-y-6">
          <AssetUploader projectId={projectId} pipelineId={pipeline?.id} />
          {showReanalyze && (
            <BriefEditor
              projectId={projectId}
              initialBrief={pipeline?.brief_snapshot ?? ''}
              isReanalyze
            />
          )}
        </div>
      )}

      {currentStage === 'brief' && (
        <div className="card-modern flex flex-col items-center justify-center gap-4 p-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-medium">Analizando brief con IA...</p>
            <p className="text-sm text-muted-foreground">
              Claude esta creando el plan de escenas para tu video
            </p>
          </div>
        </div>
      )}

      {currentStage === 'planned' && <ScenePlanView onReanalyze={handleReanalyze} />}

      {currentStage === 'generating' && <GenerationGrid />}

      {currentStage === 'review' && <ReviewPanel />}

      {currentStage === 'export' && <ExportPanel />}
    </div>
  )
}

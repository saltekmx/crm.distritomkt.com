import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useVideoGenerationStore } from '@/stores/videoGenerationStore'
import { projectsApi } from '@/services/api'
import { StudioHeader } from './StudioHeader'
import { StudioLeftPanel } from './StudioLeftPanel'
import { ImageBoard } from './ImageBoard'
import { InpaintOverlay } from './InpaintOverlay'
import { OutpaintControls } from './OutpaintControls'
import { QuickControls } from './QuickControls'
import { StudioVideoPipeline } from './StudioVideoPipeline'
import { VideoQuickGenerateCanvas } from './VideoQuickGenerateCanvas'

export function StudioLayout() {
  const { id } = useParams<{ id: string }>()
  const projectId = id ? Number(id) : 0

  const { generations, isLoading, loadGenerations, setProjectId, reset: resetStudio } = useStudioStore()
  const {
    selectedImageId,
    setSelectedImageId,
    leftTab,
    activeImageId,
    showInpaintOverlay,
    showOutpaintControls,
    studioMode,
    reset: resetAi,
  } = useStudioAiStore()

  const { videoLeftTab } = useVideoGenerationStore()

  const [projectName, setProjectName] = useState('')

  // Load project info
  useEffect(() => {
    if (!id) return
    projectsApi.get(projectId).then((res) => {
      setProjectName((res.data as { nombre?: string }).nombre || `Proyecto #${projectId}`)
    }).catch(() => {
      setProjectName(`Proyecto #${projectId}`)
    })
  }, [id, projectId])

  // Load generations
  useEffect(() => {
    if (!id) return
    setProjectId(projectId)
    loadGenerations(projectId)
    return () => {
      resetStudio()
      resetAi()
    }
  }, [id, projectId, setProjectId, loadGenerations, resetStudio, resetAi])

  // Auto-select latest completed image if none selected
  useEffect(() => {
    if (selectedImageId) {
      const exists = generations.some((g) => g.id === selectedImageId)
      if (!exists) {
        const fallback = generations.find((g) => g.estado === 'complete' && g.url_salida)
        setSelectedImageId(fallback?.id ?? null)
      }
      return
    }
    if (leftTab === 'gallery') return
    const latest = generations.find((g) => g.estado === 'complete' && g.url_salida)
    if (latest) setSelectedImageId(latest.id)
  }, [generations, selectedImageId, setSelectedImageId, leftTab])

  // Derive canvas generation from activeImageId (focused) or selectedImageId
  const activeId = activeImageId ?? selectedImageId
  const selectedGeneration = generations.find((g) => g.id === activeId) ?? null

  const handleClose = () => {
    if (window.opener) {
      window.close()
    } else {
      window.location.href = '/'
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <Toaster position="bottom-right" richColors closeButton theme="dark" />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden text-zinc-100">
      <StudioHeader
        projectName={projectName}
        onClose={handleClose}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — image tabs in image mode, pipeline versions list in video mode */}
        <StudioLeftPanel projectId={projectId} mode={studioMode === 'video' ? 'video' : 'image'} />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {studioMode === 'video' ? (
            videoLeftTab === 'generate' ? (
              <VideoQuickGenerateCanvas projectId={projectId} />
            ) : (
              <StudioVideoPipeline projectId={projectId} />
            )
          ) : (
            <>
              {/* Floating controls toolbar — model, style, ratio, format */}
              <div className="shrink-0 px-4 py-2 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
                <QuickControls />
              </div>

              <div className="flex-1 relative overflow-hidden">
                <ImageBoard projectId={projectId} />

                {showInpaintOverlay && selectedGeneration?.url_salida && (
                  <InpaintOverlay
                    generationId={selectedGeneration.id}
                    imageUrl={selectedGeneration.url_salida}
                  />
                )}

                {showOutpaintControls && selectedGeneration && (
                  <OutpaintControls generationId={selectedGeneration.id} />
                )}
              </div>
            </>
          )}
        </div>

      </div>

      <Toaster position="bottom-right" richColors closeButton theme="dark" />
    </div>
  )
}

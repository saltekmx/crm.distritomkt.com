import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { projectsApi } from '@/services/api'
import { StudioHeader } from './StudioHeader'
import { StudioCanvas } from './StudioCanvas'
import { StudioLeftPanel } from './StudioLeftPanel'
import { StudioRightPanel } from './StudioRightPanel'
import { StudioHome } from './StudioHome'
import { StudioDashboard } from './StudioDashboard'

export function StudioLayout() {
  const { id } = useParams<{ id: string }>()
  const projectId = id ? Number(id) : 0

  const { generations, isLoading, isGenerating: storeGenerating, loadGenerations, setProjectId, reset: resetStudio } = useStudioStore()
  const {
    selectedImageId,
    setSelectedImageId,
    isGenerating: aiGenerating,
    reset: resetAi,
    sendMessage,
    studioMode,
    setStudioMode,
    leftTab,
    activeImageId,
  } = useStudioAiStore()

  const isGenerating = storeGenerating || aiGenerating

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
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select latest completed image if none selected (only matters for image/video modes)
  // Skip auto-select when gallery is open — user is browsing, not editing
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

  // When entering video mode, auto-set leftTab to 'video'
  useEffect(() => {
    if (studioMode === 'video') {
      useStudioAiStore.setState({ leftTab: 'video' })
    }
  }, [studioMode])

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

  const handleVariation = (gen: { prompt: string }) => {
    if (isGenerating) return
    sendMessage(gen.prompt, projectId)
  }

  const handleBackToHome = () => {
    setStudioMode('home')
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
        studioMode={studioMode}
        onBackToHome={handleBackToHome}
      />

      {/* Mode-based content + always-visible right panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - only in editor modes */}
        {studioMode !== 'home' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <StudioLeftPanel projectId={projectId} />
          </div>
        )}

        {/* Center content - changes per mode */}
        {studioMode === 'home' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            <StudioHome projectId={projectId} projectName={projectName} />
          </div>
        )}

        {(studioMode === 'image' || studioMode === 'video') && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Image mode: Dashboard (infinite canvas) is primary, StudioCanvas when focused */}
            {studioMode === 'image' && activeImageId !== null ? (
              <div className="flex-1 flex">
                <StudioCanvas
                  generation={selectedGeneration}
                  isGenerating={isGenerating}
                  onVariation={handleVariation}
                />
              </div>
            ) : studioMode === 'image' ? (
              <StudioDashboard />
            ) : (
              /* Video mode */
              <div className="flex-1 flex">
                <StudioCanvas
                  generation={selectedGeneration}
                  isGenerating={isGenerating}
                  onVariation={handleVariation}
                />
              </div>
            )}
          </div>
        )}

        {/* Right panel - only in editor modes */}
        {studioMode !== 'home' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <StudioRightPanel projectId={projectId} projectName={projectName} />
          </div>
        )}
      </div>

      <Toaster position="bottom-right" richColors closeButton theme="dark" />
    </div>
  )
}

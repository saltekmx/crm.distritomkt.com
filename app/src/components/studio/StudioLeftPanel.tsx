import { Zap, FolderOpen, Pencil, Palette, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore, type LeftTab } from '@/stores/studioAiStore'
import { usePipelineStore } from '@/stores/pipelineStore'
import { useVideoGenerationStore, type VideoLeftTab } from '@/stores/videoGenerationStore'
import { GenerateTab } from './tabs/GenerateTab'
import { GalleryTab } from './tabs/GalleryTab'
import { EditTab } from './tabs/EditTab'
import { AdjustTab } from './tabs/AdjustTab'
import { PipelineVersionsPanel } from './tabs/PipelineVersionsPanel'
import { VideoGeneratePanel } from './tabs/VideoGeneratePanel'

const RAIL_WIDTH = 40

const IMAGE_TABS: { key: LeftTab; icon: typeof Palette; label: string }[] = [
  { key: 'generate', icon: Zap,        label: 'Generar' },
  { key: 'gallery',  icon: FolderOpen,  label: 'Galeria'  },
  { key: 'edit',     icon: Pencil,      label: 'Editar'   },
  { key: 'adjust',   icon: Palette,     label: 'Ajustar'  },
]

const VIDEO_TABS: { key: VideoLeftTab; icon: typeof Film; label: string }[] = [
  { key: 'pipelines', icon: Film, label: 'Pipelines' },
  { key: 'generate',  icon: Zap,  label: 'Generar'   },
]

interface StudioLeftPanelProps {
  projectId: number
  mode?: 'image' | 'video'
}

export function StudioLeftPanel({ projectId, mode = 'image' }: StudioLeftPanelProps) {
  const { leftTab, setLeftTab } = useStudioAiStore()

  const {
    pipelineVersions,
    selectedPipelineId,
    isLoadingVersions,
    selectPipeline,
    createNewPipeline,
  } = usePipelineStore()

  const { videoLeftTab, setVideoLeftTab } = useVideoGenerationStore()

  // ── Video mode: two-tab left panel (Pipelines + Generar) ──────────────────
  if (mode === 'video') {
    return (
      <div className="h-full flex shrink-0">
        {/* Icon rail */}
        <div
          className="h-full bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-3 gap-1 shrink-0"
          style={{ width: RAIL_WIDTH }}
        >
          {VIDEO_TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setVideoLeftTab(key)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                videoLeftTab === key
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              )}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Content area — always open in video mode */}
        <div className="h-full w-[300px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
          {videoLeftTab === 'pipelines' && (
            <PipelineVersionsPanel
              versions={pipelineVersions}
              selectedPipelineId={selectedPipelineId}
              isLoading={isLoadingVersions}
              onSelect={(id) => { selectPipeline(id) }}
              onCreateNew={createNewPipeline}
            />
          )}
          {videoLeftTab === 'generate' && (
            <VideoGeneratePanel projectId={projectId} />
          )}
        </div>
      </div>
    )
  }

  // ── Image mode: existing tab rail ─────────────────────────────────────────
  return (
    <div className="h-full flex shrink-0">
      {/* Icon rail */}
      <div
        className="h-full bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-3 gap-1 shrink-0"
        style={{ width: RAIL_WIDTH }}
      >
        {IMAGE_TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setLeftTab(key)}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              leftTab === key
                ? 'text-violet-400 bg-violet-500/10'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Content area */}
      {leftTab !== null && (
        <div className="h-full w-[300px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
          {leftTab === 'generate' && <GenerateTab projectId={projectId} />}
          {leftTab === 'gallery'  && <GalleryTab />}
          {leftTab === 'edit'     && <EditTab />}
          {leftTab === 'adjust'   && <AdjustTab />}
        </div>
      )}
    </div>
  )
}

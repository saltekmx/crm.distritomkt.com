import { Palette, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore, type LeftTab } from '@/stores/studioAiStore'
import { AdjustTab } from './tabs/AdjustTab'
import { GalleryTab } from './tabs/GalleryTab'
import { VideoModePanel } from './VideoModePanel'

const RAIL_WIDTH = 40

const IMAGE_TABS: { key: LeftTab; icon: typeof Palette; label: string }[] = [
  { key: 'adjust', icon: Palette, label: 'Editar' },
  { key: 'gallery', icon: FolderOpen, label: 'Galeria' },
]

interface StudioLeftPanelProps {
  projectId: number
}

export function StudioLeftPanel({ projectId }: StudioLeftPanelProps) {
  const { leftTab, setLeftTab, studioMode } = useStudioAiStore()

  // Video mode: single panel with projects + gallery, no tab rail
  if (studioMode === 'video') {
    return (
      <div className="h-full flex shrink-0">
        <div className="h-full w-[300px] bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <VideoModePanel />
        </div>
      </div>
    )
  }

  // Image mode: tab rail + content
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
          {leftTab === 'adjust' && <AdjustTab />}
          {leftTab === 'gallery' && <GalleryTab />}
        </div>
      )}
    </div>
  )
}

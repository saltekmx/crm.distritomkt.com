import { Palette, FolderOpen, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore, type LeftTab } from '@/stores/studioAiStore'
import { AdjustTab } from './tabs/AdjustTab'
import { GalleryTab } from './tabs/GalleryTab'
import { VideoTab } from './tabs/VideoTab'

const RAIL_WIDTH = 40

const tabs: { key: LeftTab; icon: typeof Palette; label: string }[] = [
  { key: 'adjust', icon: Palette, label: 'Editar' },
  { key: 'gallery', icon: FolderOpen, label: 'Galeria' },
  { key: 'video', icon: Video, label: 'Video' },
]

interface StudioLeftPanelProps {
  projectId: number
}

export function StudioLeftPanel({ projectId }: StudioLeftPanelProps) {
  const { leftTab, setLeftTab } = useStudioAiStore()

  const handleTabClick = (tab: LeftTab) => {
    setLeftTab(tab)
  }

  const contentWidth = leftTab === 'video' ? 'w-[380px]' : 'w-[300px]'

  return (
    <div className="h-full flex shrink-0">
      {/* Icon rail (always visible, left edge) */}
      <div
        className="h-full bg-zinc-900 border-r border-zinc-800 flex flex-col items-center pt-3 gap-1 shrink-0"
        style={{ width: RAIL_WIDTH }}
      >
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleTabClick(key)}
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

      {/* Content area (conditionally rendered) */}
      {leftTab !== null && (
        <div className={cn('h-full bg-zinc-900 border-r border-zinc-800 flex flex-col', contentWidth)}>
          {leftTab === 'adjust' && <AdjustTab />}
          {leftTab === 'gallery' && <GalleryTab />}
          {leftTab === 'video' && <VideoTab projectId={projectId} />}
        </div>
      )}
    </div>
  )
}

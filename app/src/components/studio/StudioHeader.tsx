import { X, ImageIcon, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore, type StudioMode } from '@/stores/studioAiStore'

interface StudioHeaderProps {
  projectName: string
  onClose: () => void
}

const MODES: { mode: StudioMode; label: string; icon: typeof ImageIcon }[] = [
  { mode: 'image', label: 'Imagen', icon: ImageIcon },
  { mode: 'video', label: 'Video',  icon: Video },
]

export function StudioHeader({
  projectName,
  onClose,
}: StudioHeaderProps) {
  const { studioMode, setStudioMode } = useStudioAiStore()

  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 select-none shrink-0 relative">
      {/* Left: mode tabs */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-zinc-500 mr-2 tracking-wide">AI Studio</span>
        {MODES.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => setStudioMode(mode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              studioMode === mode
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Center: project name */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm text-zinc-400 font-medium truncate max-w-[300px]">
        {projectName}
      </div>

      {/* Right: close */}
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
        title="Cerrar estudio"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  )
}

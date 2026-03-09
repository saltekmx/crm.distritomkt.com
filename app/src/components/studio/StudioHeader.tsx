import { ArrowLeft, X, ImageIcon, Video, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioMode } from '@/stores/studioAiStore'

interface StudioHeaderProps {
  projectName: string
  onClose: () => void
  studioMode: StudioMode
  onBackToHome: () => void
}

export function StudioHeader({
  projectName,
  onClose,
  studioMode,
  onBackToHome,
}: StudioHeaderProps) {
  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 select-none shrink-0 relative">
      {/* Left: back button + mode indicator */}
      <div className="flex items-center gap-2">
        {/* Back to home button (shown when not in home mode) */}
        {studioMode !== 'home' && (
          <>
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Volver al inicio"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs">Inicio</span>
            </button>
            <div className="h-5 w-px bg-zinc-700" />
          </>
        )}

        {/* Home mode: show hub indicator */}
        {studioMode === 'home' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-violet-400 bg-violet-500/10">
            <Home className="h-4 w-4" />
            AI Studio
          </div>
        )}

        {/* Image/Video modes: show mode indicator */}
        {studioMode === 'image' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-200 bg-zinc-800">
            <ImageIcon className="h-3.5 w-3.5 text-violet-400" />
            Imagenes
          </div>
        )}
        {studioMode === 'video' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-200 bg-zinc-800">
            <Video className="h-3.5 w-3.5 text-blue-400" />
            Video
          </div>
        )}
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

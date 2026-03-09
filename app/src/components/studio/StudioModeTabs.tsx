import { cn } from '@/lib/utils'
import { ImageIcon, Video, Film, Megaphone } from 'lucide-react'

type StudioMode = 'image-gen' | 'quick-video' | 'image-to-video' | 'campaign'

interface StudioModeTabsProps {
  activeMode: StudioMode
  onModeChange: (mode: StudioMode) => void
}

const modes = [
  { id: 'image-gen' as const, label: 'Imagenes', icon: ImageIcon, enabled: true },
  { id: 'quick-video' as const, label: 'Video Rapido', icon: Video, enabled: false },
  { id: 'image-to-video' as const, label: 'Imagen a Video', icon: Film, enabled: false },
  { id: 'campaign' as const, label: 'Campana', icon: Megaphone, enabled: false },
]

export function StudioModeTabs({ activeMode, onModeChange }: StudioModeTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="flex gap-1">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = activeMode === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => mode.enabled && onModeChange(mode.id)}
              disabled={!mode.enabled}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-foreground'
                  : mode.enabled
                    ? 'border-transparent text-muted-foreground hover:text-foreground cursor-pointer'
                    : 'border-transparent text-muted-foreground/40 cursor-not-allowed'
              )}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
              {!mode.enabled && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                  Proximamente
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

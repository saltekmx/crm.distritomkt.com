import { useCallback, useRef } from 'react'
import { MessageSquare, PanelRightClose } from 'lucide-react'
import { useStudioAiStore, MIN_WIDTH, MAX_WIDTH } from '@/stores/studioAiStore'
import { UnifiedChat } from './tabs/UnifiedChat'
import { cn } from '@/lib/utils'

interface StudioRightPanelProps {
  projectId: number
  projectName?: string
}

export function StudioRightPanel({ projectId, projectName }: StudioRightPanelProps) {
  const { panelWidth, setPanelWidth, isOpen, togglePanel, openPanel } = useStudioAiStore()
  const isResizing = useRef(false)

  // Resize handle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizing.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return
        const newWidth = window.innerWidth - ev.clientX
        setPanelWidth(newWidth)
      }

      const handleMouseUp = () => {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [setPanelWidth]
  )

  // Collapsed state: just show a thin icon rail
  if (!isOpen) {
    return (
      <div className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col items-center pt-3 shrink-0 w-10">
        <button
          onClick={openPanel}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="Abrir chat"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="h-full bg-zinc-900 border-l border-zinc-800 flex flex-col relative shrink-0"
      style={{ width: panelWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH }}
    >
      {/* Resize handle on left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-500/40 active:bg-violet-500/60 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />

      {/* Collapse button */}
      <button
        onClick={togglePanel}
        className="absolute top-2 right-2 z-10 p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        title="Cerrar chat"
      >
        <PanelRightClose className="h-3.5 w-3.5" />
      </button>

      <UnifiedChat projectId={projectId} projectName={projectName} />
    </div>
  )
}

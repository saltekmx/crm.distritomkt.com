import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AiPanel } from './AiPanel'
import { cn } from '@/lib/utils'

const DEFAULT_AI_WIDTH = 400
const AI_PANEL_KEY = 'ai-panel'

function loadAiPanel() {
  try {
    const raw = localStorage.getItem(AI_PANEL_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return { open: !!data.open, width: data.width || DEFAULT_AI_WIDTH }
    }
  } catch { /* ignore */ }
  return { open: false, width: DEFAULT_AI_WIDTH }
}

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const saved = loadAiPanel()
  const [aiPanelOpen, setAiPanelOpen] = useState(saved.open)
  const [aiPanelWidth, setAiPanelWidth] = useState(saved.width)
  const [aiAutoMessage, setAiAutoMessage] = useState<string | null>(null)

  const persistPanel = (open: boolean, width: number) => {
    localStorage.setItem(AI_PANEL_KEY, JSON.stringify({ open, width }))
  }

  // Listen for ai:open events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as string | undefined
      setAiPanelOpen(true)
      persistPanel(true, aiPanelWidth)
      if (msg) setAiAutoMessage(msg)
    }
    window.addEventListener('ai:open', handler)
    return () => window.removeEventListener('ai:open', handler)
  }, [aiPanelWidth])

  const handleToggleAiPanel = () => {
    const next = !aiPanelOpen
    setAiPanelOpen(next)
    persistPanel(next, aiPanelWidth)
  }

  const handleCloseAiPanel = () => {
    setAiPanelOpen(false)
    persistPanel(false, aiPanelWidth)
  }

  const handleWidthChange = (w: number) => {
    setAiPanelWidth(w)
    persistPanel(aiPanelOpen, w)
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-64',
        )}
        style={{ marginRight: aiPanelOpen ? aiPanelWidth : 0 }}
      >
        <Header
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={handleToggleAiPanel}
        />
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      <AiPanel
        open={aiPanelOpen}
        onClose={handleCloseAiPanel}
        width={aiPanelWidth}
        onWidthChange={handleWidthChange}
        autoMessage={aiAutoMessage}
        onAutoMessageConsumed={() => setAiAutoMessage(null)}
      />
    </div>
  )
}

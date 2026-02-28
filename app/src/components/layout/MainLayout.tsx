import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div
        className={cn(
          'md:block',
          mobileOpen ? 'block' : 'hidden'
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
        )}
      >
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

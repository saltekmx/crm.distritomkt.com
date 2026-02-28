import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigationItems, type NavItem } from '@/config/navigation'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const location = useLocation()

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const isGroupActive = (item: NavItem) =>
    item.children?.some((child) => child.path && location.pathname.startsWith(child.path)) ?? false

  const handleNavClick = () => {
    onMobileClose?.()
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border px-4">
        {collapsed ? (
          <span className="text-xl font-bold text-primary">D</span>
        ) : (
          <span className="text-lg font-semibold tracking-tight">
            Distrito<span className="text-primary">MKT</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.label}>
              {item.children ? (
                <CollapsibleGroup
                  item={item}
                  collapsed={collapsed}
                  expanded={expandedGroups[item.label] ?? isGroupActive(item)}
                  onToggle={() => toggleGroup(item.label)}
                  onNavClick={handleNavClick}
                />
              ) : (
                <NavItem item={item} collapsed={collapsed} onNavClick={handleNavClick} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  item,
  collapsed,
  onNavClick,
}: {
  item: NavItem
  collapsed: boolean
  onNavClick: () => void
}) {
  if (!item.path) return null
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center'
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

function CollapsibleGroup({
  item,
  collapsed,
  expanded,
  onToggle,
  onNavClick,
}: {
  item: NavItem
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  onNavClick: () => void
}) {
  const Icon = item.icon
  const location = useLocation()

  if (collapsed) {
    // In collapsed mode, show only the icon — clicking goes to first child
    const firstChild = item.children?.find((c) => c.path)
    if (!firstChild?.path) return null

    return (
      <NavLink
        to={firstChild.path}
        onClick={onNavClick}
        className={({ isActive }) =>
          cn(
            'flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )
        }
        title={item.label}
      >
        <Icon className="h-5 w-5 shrink-0" />
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
          {item.children?.map((child) => {
            if (!child.path) return null
            const isActive = location.pathname.startsWith(child.path)

            return (
              <li key={child.path}>
                <NavLink
                  to={child.path}
                  onClick={onNavClick}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {child.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

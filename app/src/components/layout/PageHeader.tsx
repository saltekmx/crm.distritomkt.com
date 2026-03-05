import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs: Breadcrumb[]
  title: string
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ breadcrumbs, title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              {crumb.href ? (
                <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="icon-badge icon-badge-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

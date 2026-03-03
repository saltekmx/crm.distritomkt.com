import { LayoutDashboard } from 'lucide-react'

const stats = [
  { label: 'Proyectos', value: 0, color: 'primary' },
  { label: 'Completados', value: 0, color: 'success' },
  { label: 'Pendientes', value: 0, color: 'warning' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Resumen general del CRM</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-4">
              <div className={`icon-badge icon-badge-${stat.color}`}>
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

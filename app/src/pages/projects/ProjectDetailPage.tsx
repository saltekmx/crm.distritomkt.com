import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Calendar, Building2, User,
  Activity, FileText, ShoppingCart, FolderOpen, MessageSquare,
  History, Receipt, CreditCard, CheckCircle, Lock, Zap,
  Banknote, Package, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { projectsApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import {
  getOperativeStatus, getAdminStatus, getProjectTypeLabel,
} from '@/lib/projects'
import { useUser } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MediaGallery } from '@/components/media/MediaGallery'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: number
  nombre: string
  tipo: string
  subcategoria: string | null
  cliente_id: number
  cliente_nombre: string | null
  status_operativo: string
  status_administrativo: string
  fecha_inicio: string | null
  fecha_entrega: string | null
  responsable_id: number | null
  responsable_nombre: string | null
  notas: string | null
  creado_en: string
}

interface TimelineEntry {
  id: number
  tipo_evento: string
  descripcion: string
  valor_anterior: string | null
  valor_nuevo: string | null
  nombre_creador: string | null
  creado_en: string
}

// ---------------------------------------------------------------------------
// Status steps
// ---------------------------------------------------------------------------

const operativeSteps = [
  { key: 'solicitud', label: 'Solicitud', icon: FileText },
  { key: 'propuesta', label: 'Propuesta', icon: FileText },
  { key: 'cotizado', label: 'Cotizado', icon: FileText },
  { key: 'aprobado', label: 'Aprobado', icon: CheckCircle },
  { key: 'en_proceso', label: 'En Proceso', icon: Zap },
  { key: 'entregado', label: 'Entregado', icon: Package },
  { key: 'cerrado', label: 'Cerrado', icon: Lock },
]

const financialSteps = [
  { key: 'por_facturar', label: 'Por Facturar', icon: FileText },
  { key: 'facturado', label: 'Facturado', icon: Receipt },
  { key: 'pago_parcial', label: 'Pago Parcial', icon: CreditCard },
  { key: 'cobrado', label: 'Cobrado', icon: Banknote },
  { key: 'cerrado', label: 'Cerrado', icon: Lock },
]

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabType = 'overview' | 'quotes' | 'orders' | 'payments' | 'files' | 'comments' | 'history'

const tabs: Array<{ id: TabType; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Resumen', icon: Activity },
  { id: 'quotes', label: 'Cotizaciones', icon: FileText },
  { id: 'orders', label: 'Órdenes', icon: ShoppingCart },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'files', label: 'Archivos', icon: FolderOpen },
  { id: 'comments', label: 'Comentarios', icon: MessageSquare },
  { id: 'history', label: 'Actividad', icon: History },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PILL_COLORS: Record<string, string> = {
  gray: 'bg-gray-500/10 text-gray-500',
  blue: 'bg-blue-500/10 text-blue-500',
  yellow: 'bg-yellow-500/10 text-yellow-500',
  orange: 'bg-orange-500/10 text-orange-500',
  purple: 'bg-purple-500/10 text-purple-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  slate: 'bg-slate-500/10 text-slate-500',
}

function StatusPill({ label, color }: { label: string; color: string }) {
  const cls = PILL_COLORS[color] ?? PILL_COLORS.gray
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function formatDate(d: string | null | undefined, tz?: string): string {
  if (!d) return '—'
  return new Date(d + 'Z').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: tz || 'America/Mexico_City',
  })
}

function formatDateTime(d: string, tz?: string): string {
  return new Date(d + 'Z').toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: tz || 'America/Mexico_City',
  })
}

// ---------------------------------------------------------------------------
// Progress Timeline Component
// ---------------------------------------------------------------------------

const COLOR_CLASSES = {
  cyan: {
    gradient: 'from-cyan-500/10',
    iconBg: 'bg-cyan-500/20',
    iconText: 'text-cyan-500',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-500',
  },
  yellow: {
    gradient: 'from-yellow-500/10',
    iconBg: 'bg-yellow-500/20',
    iconText: 'text-yellow-500',
    badgeBg: 'bg-yellow-500/10',
    badgeText: 'text-yellow-500',
  },
} as const

function ProgressTimeline({
  steps,
  currentKey,
  color,
  icon: HeaderIcon,
  title,
  subtitle,
}: {
  steps: Array<{ key: string; label: string; icon: typeof FileText }>
  currentKey: string
  color: keyof typeof COLOR_CLASSES
  icon: typeof Package
  title: string
  subtitle: string
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey)
  const currentLabel = steps[currentIndex]?.label ?? currentKey
  const c = COLOR_CLASSES[color]

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className={`p-4 border-b border-border bg-gradient-to-r ${c.gradient} to-transparent`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${c.iconBg}`}>
              <HeaderIcon className={`h-5 w-5 ${c.iconText}`} />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.badgeBg} ${c.badgeText}`}>
            {currentLabel}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="relative flex items-center justify-between">
          {/* Background line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
          {/* Progress line */}
          {currentIndex > 0 && (
            <div
              className="absolute top-4 left-4 h-0.5 bg-emerald-500 transition-all"
              style={{ width: `calc(${currentIndex / (steps.length - 1)} * (100% - 2rem))` }}
            />
          )}
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = idx <= currentIndex
            return (
              <div key={step.key} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 bg-card transition-all',
                    isCompleted
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  'text-[10px] text-center font-medium whitespace-nowrap',
                  isCompleted ? 'text-emerald-500' : 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useUser()
  const tz = user?.timezone || 'America/Mexico_City'

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])

  useEffect(() => {
    setLoading(true)
    projectsApi
      .get(id!)
      .then((res) => setProject(res.data as Project))
      .catch(() => {
        toast.error('Proyecto no encontrado')
        navigate(ROUTES.PROJECTS)
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!id) return
    projectsApi
      .timeline(id, { limit: 20 })
      .then((res) => {
        const data = res.data
        setTimeline(Array.isArray(data) ? data : data.elementos ?? [])
      })
      .catch(() => setTimeline([]))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) return null

  const opStatus = getOperativeStatus(project.status_operativo)
  const admStatus = getAdminStatus(project.status_administrativo)
  const tipoLabel = getProjectTypeLabel(project.tipo, project.subcategoria)

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(ROUTES.PROJECTS)}
            className="mt-1 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              {opStatus && (
                <StatusPill label={opStatus.label} color={opStatus.color} />
              )}
              {admStatus && (
                <StatusPill label={admStatus.label} color={admStatus.color} />
              )}
            </div>
            <h1 className="text-2xl font-bold">{project.nombre}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {project.cliente_nombre && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {project.cliente_nombre}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4" />
                {tipoLabel}
              </span>
              {project.fecha_entrega && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(project.fecha_entrega, tz)}
                </span>
              )}
              {project.responsable_nombre && (
                <>
                  <div className="h-5 w-px bg-muted-foreground/30" />
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {project.responsable_nombre}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <Link to={ROUTES.PROJECTS_EDIT(project.id)}>
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} timeline={timeline} tz={tz} />
      )}
      {activeTab === 'files' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden p-4">
          <MediaGallery
            entityType="project"
            entityId={project.id}
            folder="projects"
          />
        </div>
      )}
      {activeTab === 'history' && (
        <HistoryTab timeline={timeline} tz={tz} />
      )}
      {activeTab !== 'overview' && activeTab !== 'files' && activeTab !== 'history' && (
        <PlaceholderTab tabId={activeTab} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ project, timeline, tz }: { project: Project; timeline: TimelineEntry[]; tz: string }) {
  return (
    <div className="space-y-6">
      {/* Dual Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <ProgressTimeline
          steps={operativeSteps}
          currentKey={project.status_operativo}
          color="cyan"
          icon={Package}
          title="Estado Operativo"
          subtitle="Avance del trabajo"
        />
        <ProgressTimeline
          steps={financialSteps}
          currentKey={project.status_administrativo}
          color="yellow"
          icon={Banknote}
          title="Estado Administrativo"
          subtitle="Facturación y cobranza"
        />
      </div>

      {/* Activity */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Actividad Reciente</h3>
        </div>
        {timeline.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sin actividad registrada
          </div>
        ) : (
          <div className="divide-y divide-border">
            {timeline.slice(0, 5).map((entry) => (
              <div key={entry.id} className="p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{entry.descripcion}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.nombre_creador && `${entry.nombre_creador} · `}
                    {formatDateTime(entry.creado_en, tz)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Acciones Rápidas</h3>
        </div>
        <div className="p-4">
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            <button className="p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group cursor-pointer">
              <FileText className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-sm">Nueva Cotización</p>
            </button>
            <button className="p-3 rounded-lg border border-border hover:border-orange-500 hover:bg-orange-500/5 transition-all text-left group cursor-pointer">
              <ShoppingCart className="h-5 w-5 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-sm">Nueva Orden</p>
            </button>
            <button className="p-3 rounded-lg border border-border hover:border-purple-500 hover:bg-purple-500/5 transition-all text-left group cursor-pointer">
              <Receipt className="h-5 w-5 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-sm">Facturar</p>
            </button>
            <button className="p-3 rounded-lg border border-border hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-left group cursor-pointer">
              <CreditCard className="h-5 w-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-sm">Registrar Pago</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

function HistoryTab({ timeline, tz }: { timeline: TimelineEntry[]; tz: string }) {
  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <History className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Sin historial</h3>
        <p className="text-muted-foreground text-sm">Aún no hay actividad registrada en este proyecto</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="divide-y divide-border">
        {timeline.map((entry) => (
          <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{entry.descripcion}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.nombre_creador && `${entry.nombre_creador} · `}
                {formatDateTime(entry.creado_en, tz)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Placeholder Tab
// ---------------------------------------------------------------------------

function PlaceholderTab({ tabId }: { tabId: TabType }) {
  const tabInfo = tabs.find((t) => t.id === tabId)
  const Icon = tabInfo?.icon ?? FileText

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{tabInfo?.label}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-4">
        Esta sección estará disponible próximamente
      </p>
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        Próximamente
      </span>
    </div>
  )
}

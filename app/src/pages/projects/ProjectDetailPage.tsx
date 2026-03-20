import React, { useState, useEffect, useRef, useCallback, Fragment, memo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Calendar, Building2, User,
  Activity, FileText, ShoppingCart, FolderOpen, MessageSquare,
  History, Receipt, CreditCard, CheckCircle, Lock, Zap,
  Banknote, Package, Loader2, Presentation, Boxes, Sparkles,
  Plus, Trash2, Save, Printer, GripVertical, ChevronDown,
  ChevronRight, Pencil, FolderPlus, X, Send, Mail, Download, Upload, FileSpreadsheet, Percent,
  Image, Check, MoreHorizontal, Copy, Eye, RefreshCw, CheckCircle2, ArrowRight,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove, SortableContext, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { projectsApi, proveedoresApi, cotizacionesApi } from '@/services/api'
import { mediaApi, type MediaFile } from '@/lib/media'
import { ROUTES } from '@/lib/routes'
import {
  getOperativeStatus, getAdminStatus, getProjectTypeLabel,
} from '@/lib/projects'
import { useUser } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SupplierCombobox } from '@/components/SupplierCombobox'
import { MediaGallery } from '@/components/media/MediaGallery'
import { RichTextEditor } from '@/components/RichTextEditor'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  propuesta_texto: string | null
  materiales: Material[] | null
  codigo: string | null
  creado_en: string
}

interface Material {
  categoria: string
  concepto: string
  cantidad: number
  costo_dmkt_unitario: number
  margen_porcentaje: number
  precio_cliente_unitario: number
  proveedor: string
  status: string
}

interface QuotationItem {
  concepto: string
  cantidad: number
  precio_unitario: number
  categoria: string
}

interface Quotation {
  id: number
  codigo: string
  proyecto_id: number
  nombre: string
  estado: 'pendiente' | 'aprobada'
  items: QuotationItem[]
  texto_intro: string | null
  texto_terminos: string | null
  imagenes: CatalogImage[]
  imagen_cols: number
  imagen_rows: number
  vigencia_dias: number
  descuento_porcentaje: number
  iva_porcentaje: number
  notas: string | null
  creado_en: string
  actualizado_en: string
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

// Normalize legacy data: rename 'material' → 'concepto' for backwards compat
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMaterials<T extends Record<string, any>>(items: T[]): T[] {
  return items.map((item) => {
    if ('material' in item && !('concepto' in item)) {
      const { material, ...rest } = item
      return { ...rest, concepto: material } as unknown as T
    }
    return item
  })
}

// ---------------------------------------------------------------------------
// Status steps
// ---------------------------------------------------------------------------

const operativeSteps = [
  { key: 'solicitud', label: 'Solicitud', icon: FileText },
  { key: 'propuesta', label: 'Propuesta', icon: FileText },
  { key: 'costeo', label: 'Costeo', icon: FileText },
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

type TabType = 'overview' | 'proposal' | 'materials' | 'quotes' | 'orders' | 'payments' | 'files' | 'comments' | 'history'

const TAB_SLUG: Record<TabType, string> = {
  overview: 'resumen',
  proposal: 'propuesta',
  materials: 'costeo',
  quotes: 'cotizaciones',
  orders: 'ordenes',
  payments: 'pagos',
  files: 'archivos',
  comments: 'comentarios',
  history: 'actividad',
}
const SLUG_TO_TAB: Record<string, TabType> = Object.fromEntries(
  Object.entries(TAB_SLUG).map(([k, v]) => [v, k as TabType]),
) as Record<string, TabType>

const tabs: Array<{ id: TabType; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Resumen', icon: Activity },
  { id: 'proposal', label: 'Propuesta', icon: Presentation },
  { id: 'materials', label: 'Costeo', icon: Boxes },
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
  completedKeys,
}: {
  steps: Array<{ key: string; label: string; icon: typeof FileText }>
  currentKey: string
  color: keyof typeof COLOR_CLASSES
  icon: typeof Package
  title: string
  subtitle: string
  /** Independent "foquito" indicators — steps light up green when their milestone is met, regardless of current status position */
  completedKeys?: Set<string>
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
            const isAtOrBeforeCurrent = idx <= currentIndex
            const isMilestoneMet = completedKeys?.has(step.key) ?? false
            const isLit = isAtOrBeforeCurrent || isMilestoneMet
            return (
              <div key={step.key} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 bg-card transition-all',
                    isLit
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isLit ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  'text-[10px] text-center font-medium whitespace-nowrap',
                  isLit ? 'text-emerald-500' : 'text-muted-foreground'
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
  const { id, tab: tabSlug, quotationId: quotationIdParam } = useParams<{ id: string; tab?: string; quotationId?: string }>()
  const navigate = useNavigate()
  const user = useUser()
  const tz = user?.timezone || 'America/Mexico_City'

  // If URL has /cotizaciones/:quotationId, force quotes tab
  const activeTab: TabType = quotationIdParam ? 'quotes' : (tabSlug && SLUG_TO_TAB[tabSlug]) || 'overview'
  const setActiveTab = (t: TabType) => {
    const slug = TAB_SLUG[t]
    navigate(t === 'overview' ? `/proyectos/${id}` : `/proyectos/${id}/${slug}`, { replace: true })
  }

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [descExpanded, setDescExpanded] = useState(false)

  // Visual milestone indicators ("foquitos") — light up green when data conditions are met
  const [proposalHasFiles, _setProposalHasFiles] = useState(false)
  void _setProposalHasFiles
  const [quotationGenerated, setQuotationGenerated] = useState(false)
  const [cotizacionesSummary, setCotizacionesSummary] = useState<{ count: number; hasApproved: boolean }>({ count: 0, hasApproved: false })

  // Pending quotation items from costeo → quotes tab (ref so it's available synchronously on mount)

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

  const refreshTimeline = useCallback(() => {
    if (!id) return
    projectsApi
      .timeline(id, { limit: 50 })
      .then((res) => {
        const data = res.data
        setTimeline(Array.isArray(data) ? data : data.elementos ?? [])
      })
      .catch(() => setTimeline([]))
  }, [id])

  useEffect(() => {
    refreshTimeline()
    // Fetch cotizaciones summary for foquitos (needs numeric project.id)
    if (!project) return
    cotizacionesApi.list(project.id).then((res) => {
      const list = (res.data ?? []) as Quotation[]
      setCotizacionesSummary({ count: list.length, hasApproved: list.some((q) => q.estado === 'aprobada') })
    }).catch(() => {})
  }, [project?.id, refreshTimeline])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) return null

  const operativeCompletedKeys = new Set<string>()
  if (project.propuesta_texto || proposalHasFiles) operativeCompletedKeys.add('propuesta')
  if ((project.materiales?.length ?? 0) > 0) operativeCompletedKeys.add('costeo')
  if (quotationGenerated || cotizacionesSummary.count > 0) operativeCompletedKeys.add('cotizado')
  if (cotizacionesSummary.hasApproved) operativeCompletedKeys.add('aprobado')

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
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {project.nombre}
              <span className="text-sm font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{project.codigo}</span>
            </h1>
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
            {/* Project description (truncated) */}
            {project.notas && (
              <div className="mt-3">
                <div
                  className={cn(
                    'text-sm text-muted-foreground prose prose-sm prose-invert max-w-none',
                    !descExpanded && 'line-clamp-2',
                  )}
                  dangerouslySetInnerHTML={{ __html: project.notas }}
                />
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs text-primary hover:underline mt-1 cursor-pointer"
                >
                  {descExpanded ? 'Ver menos' : 'Ver más'}
                </button>
              </div>
            )}
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
        <nav className="flex gap-1 overflow-x-auto scrollbar-styled pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
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

      {/* Stepper — always visible across all tabs */}
      <div className="grid gap-4 md:grid-cols-2">
        <ProgressTimeline
          steps={operativeSteps}
          currentKey={project.status_operativo}
          color="cyan"
          icon={Package}
          title="Estado Operativo"
          subtitle="Avance del trabajo"
          completedKeys={operativeCompletedKeys}
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} timeline={timeline} tz={tz} />
      )}
      {activeTab === 'proposal' && (
        <ProposalTab project={project} onUpdate={(p) => { setProject(p); refreshTimeline() }} />
      )}
      {activeTab === 'materials' && (
        <MaterialsTab
          project={project}
          onUpdate={setProject}
          onQuotationGenerated={() => setQuotationGenerated(true)}
          onSendToQuotation={(quotationId) => {
            navigate(`/proyectos/${id}/cotizaciones/${quotationId}`, { replace: true })
            refreshTimeline()
          }}
        />
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
      {activeTab === 'quotes' && (
        <QuotesTab
          project={project}
          quotationIdParam={quotationIdParam}
          onCotizacionesChange={(list) => { setCotizacionesSummary({ count: list.length, hasApproved: list.some((q) => q.estado === 'aprobada') }); refreshTimeline() }}
        />
      )}
      {activeTab !== 'overview' && activeTab !== 'proposal' && activeTab !== 'materials' && activeTab !== 'quotes' && activeTab !== 'files' && activeTab !== 'history' && (
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
// Proposal Tab
// ---------------------------------------------------------------------------

function ProposalTab({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const [texto, setTexto] = useState(project.propuesta_texto ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleTextChange = (html: string) => {
    setTexto(html)
    setDirty(true)
  }

  const handleSaveText = async () => {
    setSaving(true)
    try {
      await projectsApi.update(project.id, { propuesta_texto: texto || null })
      onUpdate({ ...project, propuesta_texto: texto || null })
      setDirty(false)
      toast.success('Propuesta guardada')
    } catch {
      toast.error('Error al guardar la propuesta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* File upload section — reuses MediaGallery with preview, fullscreen, delete */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Archivos de propuesta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">PDF, presentaciones, documentos e imágenes</p>
        </div>
        <div className="p-4">
          <MediaGallery
            entityType="propuesta"
            entityId={project.id}
            folder="projects"
          />
        </div>
      </div>

      {/* Text section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Texto de propuesta</h3>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            disabled={saving || !dirty}
            onClick={handleSaveText}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
        <div className="p-4">
          <RichTextEditor
            value={texto}
            onChange={handleTextChange}
            placeholder="Escribe los detalles de la propuesta aquí..."
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Materials (Costeo) Tab
// ---------------------------------------------------------------------------

function CurrencyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(String(value))

  const formatted = value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex items-center justify-end gap-0.5">
      <span className="text-muted-foreground text-xs">$</span>
      <input
        type="text"
        inputMode="decimal"
        className="w-24 bg-transparent border-0 outline-none text-right text-foreground text-sm"
        value={focused ? raw : formatted}
        onFocus={() => { setFocused(true); setRaw(String(value)) }}
        onBlur={() => {
          setFocused(false)
          const parsed = parseFloat(raw.replace(/,/g, ''))
          onChange(isNaN(parsed) ? 0 : parsed)
        }}
        onChange={(e) => setRaw(e.target.value)}
      />
    </div>
  )
}

const MATERIAL_STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', bg: '#6b6b6b', text: '#fff' },
  { value: 'cotizado', label: 'Cotizado', bg: '#2b6cb0', text: '#fff' },
  { value: 'aprobado', label: 'Aprobado', bg: '#0e8a57', text: '#fff' },
  { value: 'comprado', label: 'Comprado', bg: '#7c3aed', text: '#fff' },
  { value: 'entregado', label: 'Entregado', bg: '#d97706', text: '#fff' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = Object.fromEntries(
  MATERIAL_STATUS_OPTIONS.map((o) => [o.value, { bg: o.bg, text: o.text }]),
)


/** Group rows by categoria preserving original index and array order */
function groupByCategory(rows: Material[]): Array<{ categoria: string; items: Array<{ row: Material; idx: number }> }> {
  const groups: Array<{ categoria: string; items: Array<{ row: Material; idx: number }> }> = []
  let currentCat = ''
  rows.forEach((row, idx) => {
    const cat = row.categoria || 'General'
    if (cat !== currentCat || groups.length === 0) {
      groups.push({ categoria: cat, items: [] })
      currentCat = cat
    }
    groups[groups.length - 1].items.push({ row, idx })
  })
  return groups
}

const fmtMXN = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

/** Text input that keeps local state while typing — only pushes to parent on blur */
const DeferredTextarea = memo(function DeferredTextarea({ value, onChange, placeholder, className }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)
  const localRef = useRef(local)
  localRef.current = local
  // Sync from parent when external value changes (e.g. reorder, import)
  useEffect(() => { setLocal(value) }, [value])
  return (
    <textarea
      className={className}
      value={local}
      rows={Math.max(1, (local?.split('\n').length ?? 1))}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (localRef.current !== value) onChange(localRef.current) }}
      placeholder={placeholder}
    />
  )
})

/** Number input with local state — propagates on blur */
const DeferredNumberInput = memo(function DeferredNumberInput({ value, onChange, className, min, max }: {
  value: number
  onChange: (v: number) => void
  className?: string
  min?: number
  max?: number
}) {
  const [local, setLocal] = useState(String(value))
  const localRef = useRef(local)
  localRef.current = local
  useEffect(() => { setLocal(String(value)) }, [value])
  return (
    <input
      type="number"
      className={className}
      value={local}
      min={min}
      max={max}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(localRef.current) || 0
        if (n !== value) onChange(n)
      }}
    />
  )
})

/** Currency input with local state — propagates on blur */
const DeferredCurrencyInput = memo(function DeferredCurrencyInput({ value, onChange }: {
  value: number
  onChange: (v: number) => void
}) {
  const [local, setLocal] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const localRef = useRef(local)
  localRef.current = local
  useEffect(() => { if (!focused) setLocal(String(value)) }, [value, focused])
  return (
    <input
      type="text"
      inputMode="decimal"
      className="w-full bg-transparent border-0 outline-none text-right text-foreground text-sm"
      value={focused ? local : fmtMXN(value)}
      onFocus={() => { setFocused(true); setLocal(String(value)) }}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setFocused(false)
        const n = Number(localRef.current.replace(/[^0-9.-]/g, '')) || 0
        if (n !== value) onChange(n)
      }}
    />
  )
})

/** Static row cells — shared by SortableRow and DragOverlay */
const RowCells = React.memo(function RowCells({
  row, idx, onUpdateRow, onRemoveRow, onDuplicateRow, readOnly, dragHandleProps,
  selected, onToggleSelect,
}: {
  row: Material
  idx: number
  onUpdateRow?: (idx: number, field: keyof Material, value: string | number) => void
  onRemoveRow?: (idx: number) => void
  onDuplicateRow?: (idx: number) => void
  readOnly?: boolean
  dragHandleProps?: Record<string, unknown>
  selected?: boolean
  onToggleSelect?: (idx: number) => void
}) {
  return (
    <>
      {!readOnly && onToggleSelect && (
        <td className="px-1 py-1.5 print:hidden w-8">
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onToggleSelect(idx)}
            className="accent-[var(--primary)] cursor-pointer ml-1"
          />
        </td>
      )}
      {!readOnly && (
        <td className="px-1 py-1.5 print:hidden">
          <button {...(dragHandleProps ?? {})} className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
      <td className="px-3 py-1.5">
        {readOnly ? (
          <span className="text-foreground whitespace-pre-wrap">{row.concepto}</span>
        ) : (
          <DeferredTextarea
            className="w-full bg-transparent border-0 outline-none text-foreground text-sm resize-none min-h-[1.75rem]"
            value={row.concepto ?? ''}
            onChange={(v) => onUpdateRow?.(idx, 'concepto', v)}
            placeholder="Descripción del concepto"
          />
        )}
      </td>
      <td className="px-3 py-1.5">
        {readOnly ? (
          <span className="block text-right">{row.cantidad}</span>
        ) : (
          <DeferredNumberInput className="w-full bg-transparent border-0 outline-none text-right text-foreground text-sm" value={row.cantidad} min={0} onChange={(v) => onUpdateRow?.(idx, 'cantidad', v)} />
        )}
      </td>
      <td className="px-3 py-1.5">
        {readOnly ? <span className="block text-right">{fmtMXN(row.costo_dmkt_unitario)}</span> : <DeferredCurrencyInput value={row.costo_dmkt_unitario} onChange={(v) => onUpdateRow?.(idx, 'costo_dmkt_unitario', v)} />}
      </td>
      <td className="px-3 py-1.5 text-right text-muted-foreground print:text-gray-500">{fmtMXN(row.cantidad * row.costo_dmkt_unitario)}</td>
      <td className="px-3 py-1.5">
        {readOnly ? (
          <span className="block text-right">{row.margen_porcentaje ?? 30}%</span>
        ) : (
          <div className="flex items-center justify-end gap-0.5">
            <DeferredNumberInput className="w-14 bg-transparent border-0 outline-none text-right text-foreground text-sm" value={row.margen_porcentaje ?? 30} min={0} onChange={(v) => onUpdateRow?.(idx, 'margen_porcentaje', v)} />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
        )}
      </td>
      <td className="px-3 py-1.5">
        {readOnly ? (
          <span className="block text-right">{fmtMXN(row.precio_cliente_unitario)}</span>
        ) : (
          <DeferredCurrencyInput value={row.precio_cliente_unitario} onChange={(v) => onUpdateRow?.(idx, 'precio_cliente_unitario', v)} />
        )}
      </td>
      <td className="px-3 py-1.5 text-right text-muted-foreground print:text-gray-500">{fmtMXN(row.cantidad * row.precio_cliente_unitario)}</td>
      <td className="px-2 py-1.5">
        {readOnly ? (
          <span className="text-xs text-muted-foreground">{row.proveedor || '—'}</span>
        ) : (
          <SupplierCombobox
            value={row.proveedor ?? ''}
            onChange={(v) => onUpdateRow?.(idx, 'proveedor', v)}
            compact
          />
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {readOnly ? (
          <span
            className="inline-flex px-2.5 py-0.5 rounded text-[11px] font-semibold"
            style={{
              backgroundColor: (STATUS_COLORS[row.status] ?? STATUS_COLORS.pendiente).bg,
              color: (STATUS_COLORS[row.status] ?? STATUS_COLORS.pendiente).text,
            }}
          >
            {MATERIAL_STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
          </span>
        ) : (
          <select
            className="rounded px-2 py-0.5 text-[11px] font-semibold outline-none cursor-pointer border-0 appearance-none text-center min-w-[90px]"
            style={{
              backgroundColor: (STATUS_COLORS[row.status] ?? STATUS_COLORS.pendiente).bg,
              color: (STATUS_COLORS[row.status] ?? STATUS_COLORS.pendiente).text,
            }}
            value={row.status}
            onChange={(e) => onUpdateRow?.(idx, 'status', e.target.value)}
          >
            {MATERIAL_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </td>
      {!readOnly && (
        <td className="px-1 py-1.5 print:hidden">
          <div className="flex items-center gap-0.5">
            <button onClick={() => onDuplicateRow?.(idx)} className="p-1 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer" title="Duplicar">
              <Copy className="h-3 w-3" />
            </button>
            <button onClick={() => onRemoveRow?.(idx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer" title="Eliminar">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </td>
      )}
    </>
  )
})

/** Sortable row — becomes a placeholder when dragging (DragOverlay renders the floating copy) */
const SortableRow = memo(function SortableRow({
  id, row, idx, onUpdateRow, onRemoveRow, onDuplicateRow, readOnly,
  selected, onToggleSelect,
}: {
  id: string
  row: Material
  idx: number
  onUpdateRow?: (idx: number, field: keyof Material, value: string | number) => void
  onRemoveRow?: (idx: number) => void
  onDuplicateRow?: (idx: number) => void
  readOnly?: boolean
  selected?: boolean
  onToggleSelect?: (idx: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  }

  if (isDragging) {
    return (
      <tr ref={setNodeRef} style={style} className="border-b border-primary/30 bg-primary/5 h-10">
        <td colSpan={readOnly ? 9 : 13} />
      </tr>
    )
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <RowCells row={row} idx={idx} onUpdateRow={onUpdateRow} onRemoveRow={onRemoveRow} onDuplicateRow={onDuplicateRow} readOnly={readOnly} dragHandleProps={{ ...attributes, ...listeners }} selected={selected} onToggleSelect={onToggleSelect} />
    </tr>
  )
})

/** Sortable category header with drag handle */
const SortableCategoryHeader = memo(function SortableCategoryHeader({
  id, group, isCollapsed, catPrecio, colCount, readOnly,
  editingCat, editCatValue,
  onToggleCollapse, onStartEditCat, onEditCatValueChange, onCommitEditCat, onCancelEditCat,
  onDeleteCategory,
  catSelected, onToggleCatSelect,
}: {
  id: string
  group: { categoria: string; items: Array<{ row: Material; idx: number }> }
  isCollapsed: boolean
  catPrecio: number
  colCount: number
  readOnly?: boolean
  editingCat: string | null
  editCatValue: string
  onToggleCollapse: (cat: string) => void
  onStartEditCat: (cat: string) => void
  onEditCatValueChange: (v: string) => void
  onCommitEditCat: () => void
  onCancelEditCat: () => void
  onDeleteCategory?: (catName: string) => void
  catSelected?: 'all' | 'some' | 'none'
  onToggleCatSelect?: (cat: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition,
  }

  if (isDragging) {
    return (
      <tr ref={setNodeRef} style={style} className="border-t border-primary/30 bg-primary/5 h-10">
        <td colSpan={colCount} />
      </tr>
    )
  }

  return (
    <tr ref={setNodeRef} style={style} className="bg-primary/5 border-t border-primary/20 print:bg-gray-100 print:border-gray-300">
      <td colSpan={colCount} className="px-3 py-2">
        <div className="flex items-center gap-2">
          {!readOnly && onToggleCatSelect && (
            <input
              type="checkbox"
              checked={catSelected === 'all'}
              ref={(el) => { if (el) el.indeterminate = catSelected === 'some' }}
              onChange={() => onToggleCatSelect(group.categoria)}
              className="accent-[var(--primary)] cursor-pointer print:hidden"
            />
          )}
          {!readOnly && (
            <button {...attributes} {...listeners} className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors print:hidden">
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          {!readOnly && (
            <button
              onClick={() => onToggleCollapse(group.categoria)}
              className="p-0.5 rounded hover:bg-primary/10 transition-colors text-primary cursor-pointer"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <div className="w-1 h-4 rounded-full bg-primary print:bg-black" />
          {editingCat === group.categoria && !readOnly ? (
            <input
              className="bg-transparent border-b border-primary outline-none text-xs font-bold text-primary uppercase tracking-wider w-40"
              value={editCatValue}
              onChange={(e) => onEditCatValueChange(e.target.value.toUpperCase())}
              onBlur={onCommitEditCat}
              onKeyDown={(e) => { if (e.key === 'Enter') onCommitEditCat(); if (e.key === 'Escape') onCancelEditCat() }}
              autoFocus
            />
          ) : (
            <span
              className={cn(
                'text-xs font-bold text-primary print:text-black uppercase tracking-wider',
                !readOnly && 'cursor-pointer hover:underline decoration-primary/40'
              )}
              onClick={() => !readOnly && onStartEditCat(group.categoria)}
            >
              {group.categoria}
            </span>
          )}
          <span className="text-[10px] font-normal text-muted-foreground">
            ({group.items.length}){isCollapsed && <> &middot; {fmtMXN(catPrecio)}</>}
          </span>
          {!readOnly && (
            <button
              onClick={() => onStartEditCat(group.categoria)}
              className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer print:hidden"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {!readOnly && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer ml-auto print:hidden">
                  <Trash2 className="h-3 w-3" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar categoría &ldquo;{group.categoria}&rdquo;</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán los {group.items.length} materiales dentro de esta categoría.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDeleteCategory?.(group.categoria)}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </td>
    </tr>
  )
})

function MaterialsTable({
  rows,
  onUpdateRow,
  onRemoveRow,
  onDuplicateRow,
  onReorder,
  onRenameCategory,
  onDeleteCategory,
  readOnly = false,
  selectedRows,
  onToggleRow,
  onToggleCategory,
  onToggleAll,
}: {
  rows: Material[]
  onUpdateRow?: (idx: number, field: keyof Material, value: string | number) => void
  onRemoveRow?: (idx: number) => void
  onDuplicateRow?: (idx: number) => void
  onReorder?: (newRows: Material[]) => void
  onRenameCategory?: (oldName: string, newName: string) => void
  onDeleteCategory?: (catName: string) => void
  readOnly?: boolean
  selectedRows?: Set<number>
  onToggleRow?: (idx: number) => void
  onToggleCategory?: (cat: string) => void
  onToggleAll?: () => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editCatValue, setEditCatValue] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  // When dragging a category, auto-collapse all to simplify the sortable list
  const [savedCollapsed, setSavedCollapsed] = useState<Set<string> | null>(null)

  const totalCostoDmkt = rows.reduce((s, r) => s + r.cantidad * r.costo_dmkt_unitario, 0)
  const totalPrecioCliente = rows.reduce((s, r) => s + r.cantidad * r.precio_cliente_unitario, 0)
  const margen = totalPrecioCliente - totalCostoDmkt
  const groups = groupByCategory(rows)

  const isDraggingCat = activeId?.startsWith('cat-') ?? false

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const startEditCat = (cat: string) => {
    setEditingCat(cat)
    setEditCatValue(cat)
  }

  const commitEditCat = () => {
    if (editingCat && editCatValue.trim() && editCatValue.trim() !== editingCat) {
      onRenameCategory?.(editingCat, editCatValue.trim().toUpperCase())
    }
    setEditingCat(null)
  }

  // Build mixed flat IDs: cat-{gi} + row-{idx} (rows hidden when collapsed or cat-dragging)
  const effectiveCollapsed = isDraggingCat
    ? new Set(groups.map((g) => g.categoria)) // all collapsed during cat drag
    : collapsed
  const flatIds: string[] = []
  groups.forEach((group, gi) => {
    flatIds.push(`cat-${gi}`)
    if (!effectiveCollapsed.has(group.categoria)) {
      group.items.forEach(({ idx }) => flatIds.push(`row-${idx}`))
    }
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    if (id.startsWith('cat-')) {
      // Save current collapse state and collapse all during drag
      setSavedCollapsed(new Set(collapsed))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)

    // Restore collapse state if we were dragging a category
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed)
      setSavedCollapsed(null)
    }

    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeStr = String(active.id)
    const overStr = String(over.id)

    if (activeStr.startsWith('cat-') && overStr.startsWith('cat-')) {
      // Category reorder
      const fromGi = parseInt(activeStr.split('-')[1])
      const toGi = parseInt(overStr.split('-')[1])
      if (fromGi === toGi) return
      const newGroups = arrayMove([...groups], fromGi, toGi)
      onReorder?.(newGroups.flatMap((g) => g.items.map(({ row }) => row)))
    } else if (activeStr.startsWith('row-') && overStr.startsWith('row-')) {
      // Row reorder
      const oldIndex = parseInt(activeStr.split('-')[1])
      const newIndex = parseInt(overStr.split('-')[1])
      if (oldIndex === -1 || newIndex === -1) return
      const rowIds = rows.map((_, i) => i)
      const oldPos = rowIds.indexOf(oldIndex)
      const newPos = rowIds.indexOf(newIndex)
      onReorder?.(arrayMove([...rows], oldPos, newPos))
    }
  }

  // Determine what's being dragged for overlay
  const activeCatIdx = activeId?.startsWith('cat-') ? parseInt(activeId.split('-')[1]) : -1
  const activeCat = activeCatIdx >= 0 ? groups[activeCatIdx] : null
  const activeRowIdx = activeId?.startsWith('row-') ? parseInt(activeId.split('-')[1]) : -1
  const activeRow = activeRowIdx >= 0 ? rows[activeRowIdx] : null

  const hasSelection = !readOnly && !!selectedRows
  const colCount = readOnly ? 9 : (hasSelection ? 13 : 12)

  // Compute "select all" state
  const allSelected = hasSelection && rows.length > 0 && rows.every((_, i) => selectedRows!.has(i))
  const someSelected = hasSelection && rows.some((_, i) => selectedRows!.has(i)) && !allSelected

  // Compute per-category selection state
  const getCatSelected = (group: { items: Array<{ idx: number }> }): 'all' | 'some' | 'none' => {
    if (!hasSelection) return 'none'
    const sel = group.items.filter(({ idx }) => selectedRows!.has(idx)).length
    if (sel === 0) return 'none'
    if (sel === group.items.length) return 'all'
    return 'some'
  }

  const tableContent = (
    <table className="w-full text-sm min-w-[1100px]">
      <thead>
        <tr className="border-b border-border bg-muted/30 print:bg-gray-100">
          {hasSelection && (
            <th className="w-8 print:hidden px-1">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected }}
                onChange={() => onToggleAll?.()}
                className="accent-[var(--primary)] cursor-pointer ml-1"
              />
            </th>
          )}
          {!readOnly && <th className="w-8 print:hidden" />}
          <th className="text-left px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600 min-w-[240px]">Concepto</th>
          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600 w-[5%]">Cant.</th>
          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600">Costo DMKT Unit.</th>
          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600">Costo DMKT Total</th>
          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600 w-[5%]">Margen %</th>
          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600">Precio Cliente Unit.</th>
          <th className="text-right px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600">Precio Cliente Total</th>
          <th className="text-left px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600">Proveedor</th>
          <th className="text-center px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600">Estado</th>
          {!readOnly && <th className="w-10 print:hidden" />}
        </tr>
      </thead>
      <tbody>
        {groups.map((group, gi) => {
          const isCollapsed = effectiveCollapsed.has(group.categoria)
          const catCosto = group.items.reduce((s, { row: r }) => s + r.cantidad * r.costo_dmkt_unitario, 0)
          const catPrecio = group.items.reduce((s, { row: r }) => s + r.cantidad * r.precio_cliente_unitario, 0)
          return (
            <Fragment key={`cat-${gi}-${group.categoria}`}>
              <SortableCategoryHeader
                id={`cat-${gi}`}
                group={group}
                isCollapsed={isCollapsed}
                catPrecio={catPrecio}
                colCount={colCount}
                readOnly={readOnly}
                editingCat={editingCat}
                editCatValue={editCatValue}
                onToggleCollapse={toggleCollapse}
                onStartEditCat={startEditCat}
                onEditCatValueChange={setEditCatValue}
                onCommitEditCat={commitEditCat}
                onCancelEditCat={() => setEditingCat(null)}
                onDeleteCategory={onDeleteCategory}
                catSelected={getCatSelected(group)}
                onToggleCatSelect={onToggleCategory}
              />
              {/* Items (hidden if collapsed) */}
              {!isCollapsed && group.items.map(({ row, idx }) => (
                <SortableRow key={`row-${idx}`} id={`row-${idx}`} row={row} idx={idx} onUpdateRow={onUpdateRow} onRemoveRow={onRemoveRow} onDuplicateRow={onDuplicateRow} readOnly={readOnly} selected={selectedRows?.has(idx)} onToggleSelect={onToggleRow} />
              ))}
              {/* Subtotal */}
              {!isCollapsed && (
                <tr className="bg-muted/20 print:bg-gray-50">
                  <td colSpan={readOnly ? 3 : (hasSelection ? 5 : 4)} className="px-3 py-1.5 text-right text-[11px] text-muted-foreground font-medium">
                    Subtotal {group.categoria}
                  </td>
                  <td className="px-3 py-1.5 text-right text-[11px] text-muted-foreground font-semibold">{fmtMXN(catCosto)}</td>
                  <td className="px-3 py-1.5 text-right text-[11px] text-muted-foreground font-semibold">{catCosto > 0 ? `${((catPrecio - catCosto) / catCosto * 100).toFixed(1)}%` : ''}</td>
                  <td />
                  <td className="px-3 py-1.5 text-right text-[11px] text-muted-foreground font-semibold">{fmtMXN(catPrecio)}</td>
                  <td />
                  <td />
                  {!readOnly && <td className="print:hidden" />}
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-border bg-muted/20 print:bg-gray-100 font-medium">
          <td colSpan={readOnly ? 3 : (hasSelection ? 5 : 4)} className="px-3 py-2.5">Totales ({rows.length} items)</td>
          <td className="px-3 py-2.5 text-right font-bold">{fmtMXN(totalCostoDmkt)}</td>
          <td />
          <td />
          <td className="px-3 py-2.5 text-right font-bold">{fmtMXN(totalPrecioCliente)}</td>
          <td />
          <td />
          {!readOnly && <td className="print:hidden" />}
        </tr>
        <tr className="bg-muted/20 print:bg-gray-100 font-medium">
          <td colSpan={readOnly ? 4 : (hasSelection ? 6 : 5)} className="px-3 pb-2.5">Margen total</td>
          <td />
          <td />
          <td className={cn('px-3 pb-2.5 text-right font-bold', margen >= 0 ? 'text-emerald-500' : 'text-red-400')}>
            {fmtMXN(margen)} ({totalCostoDmkt > 0 ? ((margen / totalCostoDmkt) * 100).toFixed(1) : '0'}%)
          </td>
          <td />
          <td />
          {!readOnly && <td className="print:hidden" />}
        </tr>
      </tfoot>
    </table>
  )

  if (readOnly) return <div className="overflow-x-auto">{tableContent}</div>

  return (
    <div className="overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
          {tableContent}
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeCat ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-primary/10 border border-primary/40 shadow-xl">
                  <td className="px-3 py-2.5" colSpan={colCount}>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-primary" />
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        {activeCat.categoria}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({activeCat.items.length} items) &middot; {fmtMXN(activeCat.items.reduce((s, { row: r }) => s + r.cantidad * r.precio_cliente_unitario, 0))}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : activeRow ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="bg-card border border-primary/30 shadow-xl">
                  <RowCells row={activeRow} idx={activeRowIdx} readOnly />
                </tr>
              </tbody>
            </table>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface CatalogImage {
  mediaId: number
  url: string
  dataUrl: string
  filename: string
  title: string
  description: string
  naturalW: number
  naturalH: number
}

function MaterialsTab({ project, onUpdate, onQuotationGenerated, onSendToQuotation }: { project: Project; onUpdate: (p: Project) => void; onQuotationGenerated?: () => void; onSendToQuotation?: (quotationId: number) => void }) {
  const [rows, setRows] = useState<Material[]>(normalizeMaterials(project.materiales ?? []))
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState<Material[] | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const projectRef = useRef(project)
  const onUpdateRef = useRef(onUpdate)
  projectRef.current = project
  onUpdateRef.current = onUpdate
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const toggleRow = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }, [])
  const toggleCategory = (cat: string) => {
    const catIndices = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.categoria === cat).map(({ i }) => i)
    const allSelected = catIndices.every((i) => selectedRows.has(i))
    setSelectedRows((prev) => {
      const next = new Set(prev)
      catIndices.forEach((i) => allSelected ? next.delete(i) : next.add(i))
      return next
    })
  }
  const toggleAll = () => {
    const allSelected = rows.length > 0 && rows.every((_, i) => selectedRows.has(i))
    setSelectedRows(allSelected ? new Set() : new Set(rows.map((_, i) => i)))
  }

  // Quotation confirmation: items to confirm before creating
  const [quotationConfirmItems, setQuotationConfirmItems] = useState<QuotationItem[] | null>(null)
  const [creatingQuotation, setCreatingQuotation] = useState(false)

  const confirmCreateQuotation = async (items: QuotationItem[]) => {
    if (!onSendToQuotation) return
    setCreatingQuotation(true)
    try {
      const res = await cotizacionesApi.create({
        proyecto_id: project.id,
        nombre: `Cotización desde costeo`,
        items,
      })
      const q = res.data as { id: number }
      setQuotationConfirmItems(null)
      toast.success(`Cotización creada con ${items.length} conceptos`)
      onSendToQuotation(q.id)
    } catch {
      toast.error('Error al crear cotización')
    } finally {
      setCreatingQuotation(false)
    }
  }

  // Bulk margin modal
  const [showMarginModal, setShowMarginModal] = useState(false)
  const [bulkMargin, setBulkMargin] = useState(30)

  const applyBulkMargin = () => {
    setRows((prev) => prev.map((r, i) => {
      if (!selectedRows.has(i)) return r
      const newPrice = Math.round(r.costo_dmkt_unitario * (1 + bulkMargin / 100) * 100) / 100
      return { ...r, margen_porcentaje: bulkMargin, precio_cliente_unitario: newPrice }
    }))
    setDirty(true)
    setShowMarginModal(false)
    toast.success(`Margen ${bulkMargin}% aplicado a ${selectedRows.size} materiales`)
  }

  // "Enviar a proveedor" modal state
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendSupplier, setSendSupplier] = useState({ nombre: '', email: '', telefono: '' })
  const [catalogImages, setCatalogImages] = useState<CatalogImage[]>([])
  const [catalogCols] = useState(2)
  const [catalogRows, setCatalogRows] = useState(3)
  const [projectMedia, setProjectMedia] = useState<MediaFile[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [generalNote, setGeneralNote] = useState('Favor de enviar cotización con precios unitarios, tiempos de entrega y condiciones de pago.')


  const openSendModal = () => {
    setShowSendModal(true)
    setCatalogImages([])
    setSendSupplier({ nombre: '', email: '', telefono: '' })
    // Load project images
    setLoadingMedia(true)
    mediaApi.list({ entity_type: 'project', entity_id: project.id, tipo: 'image' }).then((res) => {
      setProjectMedia(res.data as MediaFile[])
    }).catch(() => setProjectMedia([])).finally(() => setLoadingMedia(false))
  }

  const toggleCatalogImage = async (file: MediaFile) => {
    const existing = catalogImages.find((c) => c.mediaId === file.id)
    if (existing) {
      setCatalogImages((prev) => prev.filter((c) => c.mediaId !== file.id))
      return
    }
    try {
      const res = await fetch(file.url)
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      // Get natural dimensions
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = () => resolve({ w: 1, h: 1 })
        img.src = dataUrl
      })
      const nameWithoutExt = file.nombre.replace(/\.[^/.]+$/, '')
      setCatalogImages((prev) => [...prev, {
        mediaId: file.id,
        url: file.url,
        dataUrl,
        filename: file.nombre,
        title: nameWithoutExt,
        description: '',
        naturalW: dims.w,
        naturalH: dims.h,
      }])
    } catch {
      toast.error('Error al cargar imagen')
    }
  }

  const updateCatalogImage = (mediaId: number, field: 'title' | 'description', value: string) => {
    setCatalogImages((prev) => prev.map((c) => c.mediaId === mediaId ? { ...c, [field]: value } : c))
  }

  const removeCatalogImage = (mediaId: number) => {
    setCatalogImages((prev) => prev.filter((c) => c.mediaId !== mediaId))
  }

  const catalogUploadRef = useRef<HTMLInputElement>(null)
  const [uploadingCatalog, setUploadingCatalog] = useState(false)

  const handleCatalogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingCatalog(true)
    try {
      const res = await mediaApi.upload(Array.from(files), {
        entity_type: 'project',
        entity_id: project.id,
      })
      const uploaded = res.data as MediaFile[]
      setProjectMedia((prev) => [...uploaded, ...prev])
      // Auto-select the uploaded images
      for (const file of uploaded) {
        if (file.tipo === 'image') {
          await toggleCatalogImage(file)
        }
      }
      toast.success(`${uploaded.length} imagen${uploaded.length !== 1 ? 'es' : ''} subida${uploaded.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Error al subir imágenes')
    } finally {
      setUploadingCatalog(false)
      if (catalogUploadRef.current) catalogUploadRef.current.value = ''
    }
  }

  const getSelectedCatMap = () => {
    const selRows = rows.filter((_, i) => selectedRows.has(i))
    const catMap = new Map<string, Material[]>()
    for (const r of selRows) {
      const arr = catMap.get(r.categoria) ?? []
      arr.push(r)
      catMap.set(r.categoria, arr)
    }
    return { selRows, catMap }
  }

  const buildMessage = () => {
    const { catMap } = getSelectedCatMap()
    let msg = 'Hola, me gustaria cotizar los siguientes materiales:\n'
    for (const [cat, items] of catMap) {
      msg += `\n${cat}:\n`
      for (const item of items) {
        msg += `- ${item.concepto} (cantidad: ${item.cantidad})\n`
      }
    }
    msg += '\nGracias.'
    return msg
  }

  const sendIframeRef = useRef<HTMLIFrameElement>(null)

  const buildPreviewHtml = () => {
    const { selRows, catMap } = getSelectedCatMap()
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    const supplierName = sendSupplier.nombre
    const supplierContact = [sendSupplier.email, sendSupplier.telefono].filter(Boolean).join(' | ')

    let tableRows = ''
    let rowNum = 0
    for (const [cat, items] of catMap) {
      tableRows += `<tr class="cat-row"><td colspan="3">${cat}</td></tr>`
      for (const item of items) {
        rowNum++
        tableRows += `<tr><td class="num">${rowNum}</td><td style="white-space:pre-wrap">${item.concepto}</td><td class="center">${item.cantidad}</td></tr>`
      }
    }

    let catalogHtml = ''
    if (catalogImages.length > 0) {
      const perPage = catalogRows || 3
      const totalPages = Math.ceil(catalogImages.length / perPage)
      for (let p = 0; p < totalPages; p++) {
        const pageImages = catalogImages.slice(p * perPage, (p + 1) * perPage)
        let cells = ''
        for (const img of pageImages) {
          cells += `<div class="catalog-item"><img src="${img.dataUrl}" /><div class="item-content"><div class="img-title">${img.title}</div>${img.description ? `<div class="img-desc">${img.description}</div>` : ''}</div></div>`
        }
        catalogHtml += `<div class="catalog-page"><div class="catalog-header">Catálogo de Imágenes — Página ${p + 1} de ${totalPages}</div>${cells}</div>`
      }
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; color-scheme: light; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; padding: 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #d4af37; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
  .header h2 { font-size: 12px; color: #64748b; font-weight: 400; margin-top: 2px; }
  .header .logo { height: 32px; }
  .meta { display: flex; gap: 32px; margin-bottom: 16px; font-size: 11px; }
  .meta .col { flex: 1; }
  .meta .label { font-weight: 600; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .meta .value { color: #1e293b; }
  .meta .sub { font-size: 10px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
  thead th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  .cat-row td { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #334155; }
  .num { text-align: center; color: #94a3b8; width: 30px; }
  .center { text-align: center; }
  .summary { margin-top: 12px; font-size: 10px; color: #64748b; }
  .notes { margin-top: 16px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px; color: #475569; white-space: pre-wrap; }
  .notes strong { display: block; margin-bottom: 3px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  .catalog-page { margin-top: 32px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
  .catalog-header { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #d4af37; padding-bottom: 6px; }
  .catalog-item { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 10px; }
  .catalog-item img { width: 100%; height: auto; display: block; }
  .item-content { padding: 12px 14px; border-left: 1px solid #e2e8f0; }
  .img-title { font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 6px; }
  .img-desc { font-size: 10px; color: #334155; line-height: 1.6; }
  .img-desc p { margin: 0 0 6px; } .img-desc ul, .img-desc ol { margin: 0 0 6px; padding-left: 18px; }
  .img-desc li { margin-bottom: 2px; } .img-desc strong { font-weight: 700; } .img-desc em { font-style: italic; }
</style></head><body>
  <div class="header">
    <div><h1>Solicitud de Cotización</h1><h2>${project.nombre} — ${project.cliente_nombre ?? ''}</h2></div>
    <img src="/logo-dark.png" class="logo" />
  </div>
  <div class="meta">
    <div class="col"><div class="label">Proveedor</div><div class="value">${supplierName}</div>${supplierContact ? `<div class="sub">${supplierContact}</div>` : ''}</div>
    <div class="col"><div class="label">Fecha</div><div class="value">${today}</div></div>
    <div class="col"><div class="label">Proyecto</div><div class="value">${project.nombre}</div></div>
  </div>
  <table><thead><tr><th style="width:30px;text-align:center">#</th><th>Concepto</th><th style="width:70px;text-align:center">Cantidad</th></tr></thead><tbody>${tableRows}</tbody></table>
  <p class="summary">${selRows.length} material${selRows.length !== 1 ? 'es' : ''} en ${catMap.size} categoría${catMap.size !== 1 ? 's' : ''}</p>
  ${generalNote.trim() ? `<div class="notes"><strong>Notas:</strong>${generalNote}</div>` : ''}
  <div class="footer">Generado por DistritoMKT CRM — ${today}</div>
  ${catalogHtml}
</body></html>`
  }

  // Update preview iframe
  useEffect(() => {
    if (!showSendModal || !sendIframeRef.current) return
    const doc = sendIframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(buildPreviewHtml())
    doc.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSendModal, sendSupplier.nombre, sendSupplier.email, sendSupplier.telefono, selectedRows, catalogImages, catalogCols, catalogRows, generalNote])

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const loadImageAsDataUrl = (url: string): Promise<string> =>
    fetch(url).then((r) => r.blob()).then((b) => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(b)
    }))

  const generatePdfDoc = async () => {
    const { jsPDF } = await import('jspdf')
    // @ts-ignore -- no types available for jspdf-autotable
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentW = pageW - margin * 2
    const gold = '#d4af37'
    const dark = '#0f172a'
    const gray = '#64748b'
    const lightGray = '#94a3b8'

    let logoDataUrl = ''
    let logoW = 0, logoH = 0
    try {
      logoDataUrl = await loadImageAsDataUrl('/logo-dark.png')
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = () => resolve({ w: 200, h: 80 })
        img.src = logoDataUrl
      })
      logoH = 12; logoW = 12 * (dims.w / dims.h)
    } catch { /* skip */ }

    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    const supplierName = sendSupplier.nombre
    const supplierContact = [sendSupplier.email, sendSupplier.telefono].filter(Boolean).join(' | ')

    // Header
    let y = margin
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(dark)
    doc.text('Solicitud de Cotización', margin, y + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(gray)
    doc.text(`${project.nombre} — ${project.cliente_nombre ?? ''}`, margin, y + 12)
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', pageW - margin - logoW, y - 2, logoW, logoH) } catch { /* skip */ }
    }
    y += 18
    doc.setDrawColor(gold)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageW - margin, y)
    y += 10

    // Meta
    const metaCols = [
      { label: 'PROVEEDOR', value: supplierName, sub: supplierContact },
      { label: 'FECHA', value: today },
      { label: 'PROYECTO', value: project.nombre },
    ]
    const colW = contentW / 3
    doc.setFontSize(8)
    for (let i = 0; i < metaCols.length; i++) {
      const x = margin + i * colW
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#475569')
      doc.text(metaCols[i].label, x, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(dark)
      doc.setFontSize(10)
      doc.text(metaCols[i].value, x, y + 5)
      if (metaCols[i].sub) {
        doc.setFontSize(8)
        doc.setTextColor(gray)
        doc.text(metaCols[i].sub!, x, y + 9)
      }
      doc.setFontSize(8)
    }
    y += 16

    // Table
    const { selRows, catMap } = getSelectedCatMap()
    const tableBody: (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] = []
    let rowNum = 0
    for (const [cat, items] of catMap) {
      tableBody.push([{
        content: cat.toUpperCase(),
        colSpan: 3,
        styles: { fontStyle: 'bold' as const, fillColor: '#f1f5f9', textColor: '#334155', fontSize: 9 },
      }])
      for (const item of items) {
        rowNum++
        tableBody.push([String(rowNum), item.concepto, String(item.cantidad)])
      }
    }
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Concepto', 'Cantidad']],
      body: tableBody,
      styles: { fontSize: 10, cellPadding: 3, textColor: dark, lineColor: '#e2e8f0', lineWidth: 0.2 },
      headStyles: { fillColor: '#f8fafc', textColor: '#475569', fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: lightGray },
        2: { cellWidth: 22, halign: 'center' },
      },
    })

    // Summary + notes
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    y = finalY
    doc.setFontSize(9)
    doc.setTextColor(gray)
    doc.text(`${selRows.length} material${selRows.length !== 1 ? 'es' : ''} en ${catMap.size} categoría${catMap.size !== 1 ? 's' : ''}`, margin, y)
    y += 6

    if (generalNote.trim()) {
      doc.setFillColor('#f8fafc')
      doc.setDrawColor('#e2e8f0')
      const noteLines = doc.splitTextToSize(generalNote.trim(), contentW - 8)
      const noteH = noteLines.length * 4.5 + 10
      doc.roundedRect(margin, y, contentW, noteH, 2, 2, 'FD')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#475569')
      doc.text('Notas:', margin + 4, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.text(noteLines, margin + 4, y + 10)
    }

    // Footer
    doc.setDrawColor('#e2e8f0')
    doc.setLineWidth(0.3)
    doc.line(margin, pageH - 15, pageW - margin, pageH - 15)
    doc.setFontSize(8)
    doc.setTextColor(lightGray)
    doc.text(`Generado por DistritoMKT CRM — ${today}`, pageW / 2, pageH - 10, { align: 'center' })

    // Catalog pages
    if (catalogImages.length > 0) {
      const perPage = catalogRows || 3
      const totalPages = Math.ceil(catalogImages.length / perPage)
      const gap = 6
      const halfW = contentW / 2

      // Rich text renderer for PDF
      const renderRich = (html: string, x: number, startY: number, maxW: number): number => {
        let ry = startY
        const lh = 3.5
        const div = document.createElement('div')
        div.innerHTML = html
        const walk = (node: Node, bold: boolean, italic: boolean, pfx: string) => {
          if (node.nodeType === 3) {
            const t = (node.textContent ?? '').replace(/\s+/g, ' ')
            if (!t.trim()) return
            doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal')
            const full = pfx ? `${pfx} ${t.trim()}` : t.trim()
            const lines = doc.splitTextToSize(full, pfx ? maxW - 4 : maxW)
            for (const line of lines) {
              if (ry > pageH - 15) { doc.addPage(); ry = margin }
              doc.text(line, pfx ? x + 4 : x, ry)
              ry += lh
            }
            return
          }
          if (node.nodeType !== 1) return
          const el = node as Element
          const tag = el.tagName.toLowerCase()
          const b = bold || tag === 'strong' || tag === 'b'
          const i = italic || tag === 'em' || tag === 'i'
          if (tag === 'ul' || tag === 'ol') {
            let idx = 0
            el.childNodes.forEach((c) => { if ((c as Element).tagName?.toLowerCase() === 'li') { idx++; walk(c, b, i, tag === 'ol' ? `${idx}.` : '•') } })
            ry += 1; return
          }
          if (tag === 'br') { ry += lh; return }
          el.childNodes.forEach((c) => walk(c, b, i, pfx))
          if (['p', 'div', 'li'].includes(tag)) ry += 1
        }
        doc.setFontSize(8); doc.setTextColor(gray)
        walk(div, false, false, '')
        return ry
      }

      for (let p = 0; p < totalPages; p++) {
        doc.addPage()
        let cy = margin
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(dark)
        doc.text(`Catálogo de Imágenes — Página ${p + 1} de ${totalPages}`, margin, cy + 5)
        cy += 8
        doc.setDrawColor(gold)
        doc.setLineWidth(0.6)
        doc.line(margin, cy, pageW - margin, cy)
        cy += 8

        const pageImages = catalogImages.slice(p * perPage, (p + 1) * perPage)
        for (let imgIdx = 0; imgIdx < pageImages.length; imgIdx++) {
          const img = pageImages[imgIdx]
          const imgDrawW = halfW - 4
          const ratio = img.naturalH / img.naturalW
          const imgH = Math.min(imgDrawW * ratio, 60)
          const imgW = imgH / ratio
          const textW = halfW - 8

          if (cy + imgH + 10 > pageH - 20) { doc.addPage(); cy = margin }

          try { doc.addImage(img.dataUrl, 'JPEG', margin + 2, cy + 2, imgW, imgH) } catch { /* skip */ }
          const imgBottom = cy + imgH + 4

          const textX = margin + halfW + 4
          let ty = cy + 5
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(dark)
          const titleLines = doc.splitTextToSize(img.title || '', textW)
          doc.text(titleLines, textX, ty)
          ty += titleLines.length * 4.5 + 2
          if (img.description) { ty = renderRich(img.description, textX, ty, textW) }
          const textBottom = ty + 4

          cy = Math.max(imgBottom, textBottom)

          if (imgIdx < pageImages.length - 1) {
            doc.setDrawColor('#e2e8f0'); doc.setLineWidth(0.2)
            doc.line(margin, cy, pageW - margin, cy)
            cy += gap
          }
        }
      }
    }

    return doc
  }

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const doc = await generatePdfDoc()
      const supplierSlug = (sendSupplier.nombre || 'proveedor').replace(/\s+/g, '_').toLowerCase()
      const filename = `solicitud_${supplierSlug}_${project.nombre.replace(/\s+/g, '_').toLowerCase()}.pdf`
      doc.save(filename)
      onQuotationGenerated?.()
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Error al generar PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleEmail = () => {
    if (!sendSupplier.email) return
    const subject = encodeURIComponent(`Cotizacion — ${project.nombre}`)
    const body = encodeURIComponent(buildMessage())
    window.open(`mailto:${sendSupplier.email}?subject=${subject}&body=${body}`, '_blank')
    setShowSendModal(false)
  }

  // Auto-save: debounced, uses refs to avoid dependency churn
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      if (!dirtyRef.current) return
      try {
        const data = rowsRef.current
        await projectsApi.update(projectRef.current.id, { materiales: data })
        onUpdateRef.current({ ...projectRef.current, materiales: data })
        setDirty(false)
        setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
      } catch {
        // Silent fail — user can still manual save
      }
    }, 2000)
  }, [])

  const [showGenModal, setShowGenModal] = useState(false)
  const [genIncludeProposal, setGenIncludeProposal] = useState(!!project.propuesta_texto)
  const [genIncludePdfs, setGenIncludePdfs] = useState(true)
  const [genExtraText, setGenExtraText] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setShowGenModal(false)
    try {
      const res = await projectsApi.generateMaterials(project.id, {
        incluir_propuesta: genIncludeProposal,
        incluir_pdfs: genIncludePdfs,
        texto_adicional: genExtraText || undefined,
      })
      const data = res.data as { materiales: Material[]; mensaje: string }
      const normalized = normalizeMaterials(data.materiales)
      if (normalized.length > 0) {
        setPreviewSource('AI')
        setPreview(normalized)
      } else {
        toast.info(data.mensaje || 'No se encontraron materiales en la propuesta')
      }
    } catch {
      toast.error('Error al generar materiales')
    } finally {
      setGenerating(false)
    }
  }

  // Import mode: ask replace or append when there are existing rows
  const [pendingImport, setPendingImport] = useState<{ materials: Material[]; source: string } | null>(null)

  const applyImport = (mode: 'replace' | 'append', materials: Material[], source: string) => {
    if (mode === 'replace') {
      setRows(materials)
      setSelectedRows(new Set())
    } else {
      setRows((prev) => [...prev, ...materials])
    }
    setDirty(true)
    const action = mode === 'replace' ? 'reemplazados' : 'agregados'
    toast.success(`${materials.length} materiales ${action} (${source})`)
  }

  const requestImport = (materials: Material[], source: string) => {
    if (rows.length > 0) {
      setPendingImport({ materials, source })
    } else {
      applyImport('replace', materials, source)
    }
  }

  const handleAcceptPreview = () => {
    if (!preview) return
    setPreview(null)
    requestImport(preview, previewSource)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await projectsApi.update(project.id, { materiales: rows })
      onUpdate({ ...project, materiales: rows })
      setDirty(false)
      toast.success('Costeo guardado')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const importFileRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default
    const { saveAs } = await import('file-saver')

    const wb = new ExcelJS.Workbook()
    wb.creator = 'DistritoMKT CRM'
    const ws = wb.addWorksheet('Materiales', { views: [{ showGridLines: true }] })

    // Add logo
    try {
      const resp = await fetch('/logo-dark.png')
      const buf = await resp.arrayBuffer()
      const logoId = wb.addImage({ buffer: buf, extension: 'png' })
      ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 92 } })
    } catch { /* skip logo if not available */ }

    // Leave space for logo
    ws.mergeCells('A1:H3')
    ws.getRow(1).height = 30
    ws.getRow(2).height = 30
    ws.getRow(3).height = 30

    // Title row
    const titleRow = ws.getRow(4)
    ws.mergeCells('A4:H4')
    titleRow.getCell(1).value = 'Template de Materiales — DistritoMKT'
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1a1a1a' } }
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    titleRow.height = 28

    // Instructions row
    const instrRow = ws.getRow(5)
    ws.mergeCells('A5:G5')
    instrRow.getCell(1).value = 'Las categorías van como filas completas (celdas combinadas). Los materiales van debajo de su categoría.'
    instrRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF666666' } }
    instrRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    instrRow.height = 22

    // Status legend row
    const legendRow = ws.getRow(6)
    ws.mergeCells('A6:G6')
    legendRow.getCell(1).value = 'Estados: pendiente · cotizado · aprobado · comprado · entregado'
    legendRow.getCell(1).font = { size: 9, color: { argb: 'FF888888' } }
    legendRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    legendRow.height = 18

    // Header row (7 columns: Material, Cantidad, Costo DMKT, Margen%, Precio Cliente, Proveedor, Estado)
    const headers = ['Concepto', 'Cantidad', 'Costo Unitario DMKT', 'Margen %', 'Precio Unitario Cliente', 'Proveedor', 'Estado']
    const headerRow = ws.getRow(8)
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF333333' } } }
    })
    headerRow.height = 24

    // Helper: write a category row (merged across all columns, styled)
    const writeCatRow = (rowNum: number, name: string, isExample: boolean) => {
      ws.mergeCells(`A${rowNum}:G${rowNum}`)
      const r = ws.getRow(rowNum)
      const cell = r.getCell(1)
      cell.value = name
      cell.font = { bold: true, size: 11, color: { argb: isExample ? 'FF999999' : 'FF1a1a1a' }, italic: isExample }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isExample ? 'FFF5F5F5' : 'FFE8E8E8' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
      r.height = 22
    }

    // Helper: write a material row
    const writeMatRow = (rowNum: number, data: (string | number)[], isExample: boolean) => {
      const r = ws.getRow(rowNum)
      data.forEach((v, i) => {
        const cell = r.getCell(i + 1)
        cell.value = v
        if (isExample) {
          cell.font = { size: 10, color: { argb: 'FF999999' }, italic: true }
        } else {
          cell.font = { size: 10 }
        }
        cell.alignment = { horizontal: i >= 1 && i <= 4 ? 'center' : 'left', vertical: 'middle' }
      })
      r.height = 20
    }

    // Example: Category 1 — IMPRESIÓN
    writeCatRow(9, 'IMPRESIÓN', true)
    writeMatRow(10, ['Lona impresa 3x2m', 5, 150, 30, 195, 'PrintMax SA', 'pendiente'], true)
    writeMatRow(11, ['Vinil adhesivo 1x1m', 10, 45, 30, 58.50, 'PrintMax SA', 'cotizado'], true)

    // Example: Category 2 — MOBILIARIO
    writeCatRow(12, 'MOBILIARIO', true)
    writeMatRow(13, ['Mesa rectangular 2.4m', 3, 80, 30, 104, '', 'pendiente'], true)

    // Column widths (7 columns now)
    ws.getColumn(1).width = 30  // Material
    ws.getColumn(2).width = 12  // Cantidad
    ws.getColumn(3).width = 22  // Costo DMKT
    ws.getColumn(4).width = 12  // Margen
    ws.getColumn(5).width = 24  // Precio Cliente
    ws.getColumn(6).width = 20  // Proveedor
    ws.getColumn(7).width = 16  // Estado

    const buffer = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'template_materiales_dmkt.xlsx')
    toast.success('Template descargado')
  }

  const [previewSource, setPreviewSource] = useState<'AI' | 'Excel'>('AI')

  const handleImportXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-imported

    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.getWorksheet(1)
      if (!ws) { toast.error('No se encontró hoja de datos'); return }

      const imported: Material[] = []
      let currentCat = 'General'

      ws.eachRow((row, rowNum) => {
        if (rowNum <= 8) return // skip logo + legend + header rows

        const cellA = String(row.getCell(1).value ?? '').trim()
        const cellB = String(row.getCell(2).value ?? '').trim()

        // Detect category row: merged cells or only first cell has data (no material in col B)
        const isMerged = ws.getCell(rowNum, 1).isMerged && ws.getCell(rowNum, 2).isMerged
        const isCategory = isMerged || (cellA && !cellB && !row.getCell(3).value && !row.getCell(4).value)

        if (isCategory) {
          currentCat = cellA || 'General'
          return
        }

        // Material row — col A = Material, col B = Cantidad, etc.
        const mat = cellA
        if (!mat) return // skip empty rows

        const cantidad = Number(row.getCell(2).value) || 0
        const costoUn = Number(row.getCell(3).value) || 0
        const margen = Number(row.getCell(4).value) || 30
        const precioUn = Number(row.getCell(5).value) || Math.round(costoUn * (1 + margen / 100) * 100) / 100
        const proveedor = String(row.getCell(6).value ?? '').trim()
        const status = String(row.getCell(7).value ?? 'pendiente').trim().toLowerCase()

        imported.push({
          categoria: currentCat,
          concepto: mat,
          cantidad,
          costo_dmkt_unitario: costoUn,
          margen_porcentaje: margen,
          precio_cliente_unitario: precioUn,
          proveedor,
          status: ['pendiente', 'cotizado', 'aprobado', 'comprado', 'entregado'].includes(status) ? status : 'pendiente',
        })
      })

      if (imported.length === 0) { toast.error('No se encontraron materiales en el archivo'); return }

      setPreviewSource('Excel')
      setPreview(imported)
    } catch {
      toast.error('Error al leer el archivo Excel')
    }
  }

  const handlePrintRows = (printRows: Material[]) => {
    const win = window.open('', '_blank')
    if (!win) return
    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
    const groups = groupByCategory(printRows)
    const totalCosto = printRows.reduce((s, r) => s + r.cantidad * r.costo_dmkt_unitario, 0)
    const totalPrecio = printRows.reduce((s, r) => s + r.cantidad * r.precio_cliente_unitario, 0)
    const margenTotal = totalPrecio - totalCosto

    let tableRows = ''
    for (const g of groups) {
      const catCosto = g.items.reduce((s, { row: r }) => s + r.cantidad * r.costo_dmkt_unitario, 0)
      const catPrecio = g.items.reduce((s, { row: r }) => s + r.cantidad * r.precio_cliente_unitario, 0)
      tableRows += `<tr style="background:#f3f4f6;font-weight:700"><td colspan="3" style="padding:8px;text-transform:uppercase;letter-spacing:0.05em">${g.categoria}</td><td style="padding:8px;text-align:right">${fmt(catCosto)}</td><td></td><td style="padding:8px;text-align:right">${fmt(catPrecio)}</td><td></td></tr>`
      for (const { row } of g.items) {
        tableRows += `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:6px 8px 6px 24px">${row.concepto}</td><td style="padding:6px 8px;text-align:right">${row.cantidad}</td><td style="padding:6px 8px;text-align:right">${fmt(row.costo_dmkt_unitario)}</td><td style="padding:6px 8px;text-align:right">${fmt(row.cantidad * row.costo_dmkt_unitario)}</td><td style="padding:6px 8px;text-align:right">${fmt(row.precio_cliente_unitario)}</td><td style="padding:6px 8px;text-align:right">${fmt(row.cantidad * row.precio_cliente_unitario)}</td><td style="padding:6px 8px;text-align:center;font-size:11px">${row.status}</td></tr>`
      }
    }

    win.document.write(`<!DOCTYPE html><html><head><title>Costeo — ${project.nombre}</title><style>body{font-family:Inter,-apple-system,sans-serif;color:#1e293b;margin:40px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8fafc;border-bottom:2px solid #cbd5e1;padding:10px 8px;text-align:left;font-weight:600;color:#475569}td{padding:6px 8px}.logo{height:40px}h1{font-size:18px;margin:0}h2{font-size:14px;color:#64748b;margin:4px 0 0;font-weight:400}@media print{body{margin:20px}}</style></head><body>`)
    win.document.write(`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;border-bottom:2px solid #e2e8f0;padding-bottom:16px"><div><h1>${project.nombre}</h1><h2>${project.cliente_nombre ?? ''} — Costeo de materiales</h2></div><img src="/logo-dark.png" class="logo" /></div>`)
    win.document.write(`<table><thead><tr><th>Concepto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Costo DMKT Unit.</th><th style="text-align:right">Costo DMKT Total</th><th style="text-align:right">Precio Cliente Unit.</th><th style="text-align:right">Precio Cliente Total</th><th style="text-align:center">Status</th></tr></thead><tbody>${tableRows}</tbody>`)
    win.document.write(`<tfoot><tr style="border-top:2px solid #cbd5e1;background:#f8fafc;font-weight:700"><td colspan="2" style="padding:10px 8px">Totales (${printRows.length} items)</td><td></td><td style="padding:10px 8px;text-align:right">${fmt(totalCosto)}</td><td></td><td style="padding:10px 8px;text-align:right">${fmt(totalPrecio)}</td><td></td></tr>`)
    win.document.write(`<tr style="background:#f8fafc;font-weight:700"><td colspan="4" style="padding:8px">Margen total</td><td></td><td style="padding:8px;text-align:right;color:${margenTotal >= 0 ? '#10b981' : '#ef4444'}">${fmt(margenTotal)} (${totalCosto > 0 ? ((margenTotal / totalCosto) * 100).toFixed(1) : '0'}%)</td><td></td></tr></tfoot></table>`)
    win.document.write(`<div style="margin-top:32px;font-size:11px;color:#94a3b8;text-align:center">Generado por DistritoMKT CRM — ${new Date().toLocaleDateString('es-MX')}</div></body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handlePrint = () => handlePrintRows(rows)
  const handlePrintSelected = () => handlePrintRows(rows.filter((_, i) => selectedRows.has(i)))

  const updateRow = useCallback((idx: number, field: keyof Material, value: string | number) => {
    setRows((prev) => {
      const next = [...prev]
      const row = { ...next[idx], [field]: value }
      // Cross-field recalculations
      if (field === 'costo_dmkt_unitario') {
        const pct = row.margen_porcentaje ?? 30
        row.precio_cliente_unitario = Math.round(Number(value) * (1 + pct / 100) * 100) / 100
      } else if (field === 'margen_porcentaje') {
        row.precio_cliente_unitario = Math.round(row.costo_dmkt_unitario * (1 + Number(value) / 100) * 100) / 100
      } else if (field === 'precio_cliente_unitario' && row.costo_dmkt_unitario > 0) {
        row.margen_porcentaje = Math.round((Number(value) / row.costo_dmkt_unitario - 1) * 10000) / 100
      }
      next[idx] = row
      return next
    })
    setDirty(true)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
    setDirty(true)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const duplicateRow = useCallback((idx: number) => {
    setRows((prev) => {
      const clone = { ...prev[idx] }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
    setDirty(true)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const handleReorder = useCallback((newRows: Material[]) => {
    setRows(newRows)
    setDirty(true)
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const addRow = () => {
    const lastCat = rows.length > 0 ? rows[rows.length - 1].categoria : 'GENERAL'
    setRows((prev) => [...prev, { categoria: lastCat, concepto: '', cantidad: 1, costo_dmkt_unitario: 0, margen_porcentaje: 30, precio_cliente_unitario: 0, proveedor: '', status: 'pendiente' }])
    setDirty(true)
  }

  const addCategory = () => {
    const name = `NUEVA CATEGORÍA ${groupByCategory(rows).length + 1}`
    setRows((prev) => [...prev, { categoria: name, concepto: '', cantidad: 1, costo_dmkt_unitario: 0, margen_porcentaje: 30, precio_cliente_unitario: 0, proveedor: '', status: 'pendiente' }])
    setDirty(true)
  }

  const renameCategory = (oldName: string, newName: string) => {
    setRows((prev) => prev.map((r) => r.categoria === oldName ? { ...r, categoria: newName } : r))
    setDirty(true)
  }

  const deleteCategory = (catName: string) => {
    setRows((prev) => prev.filter((r) => r.categoria !== catName))
    setDirty(true)
  }


  const hasProposalText = !!project.propuesta_texto
  const proposalTextPreview = project.propuesta_texto
    ? project.propuesta_texto.replace(/<[^>]*>/g, '').slice(0, 200)
    : ''

  return (
    <div className="space-y-4" ref={printRef}>
      {/* Generate AI Modal */}
      {showGenModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowGenModal(false)}
          />
          {/* Card */}
          <div className="relative w-[90vw] max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setShowGenModal(false)}
              className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generar costeo con AI
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecciona las fuentes de información para extraer materiales.
              </p>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3">
              {/* Source: Proposal text */}
              <label className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                hasProposalText
                  ? genIncludeProposal
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-border-hover'
                  : 'border-border opacity-50 cursor-not-allowed',
              )}>
                <input
                  type="checkbox"
                  checked={genIncludeProposal}
                  disabled={!hasProposalText}
                  onChange={(e) => setGenIncludeProposal(e.target.checked)}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Texto de propuesta</p>
                  {hasProposalText ? (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {proposalTextPreview}...
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No hay texto de propuesta guardado
                    </p>
                  )}
                </div>
              </label>

              {/* Source: PDFs */}
              <label className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                genIncludePdfs
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:border-border-hover',
              )}>
                <input
                  type="checkbox"
                  checked={genIncludePdfs}
                  onChange={(e) => setGenIncludePdfs(e.target.checked)}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Archivos PDF de propuesta</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PDFs subidos en la pestaña de Propuesta
                  </p>
                </div>
              </label>

              {/* Source: Custom text */}
              <div>
                <label className="text-sm font-medium">Texto adicional (opcional)</label>
                <textarea
                  className="mt-1.5 w-full h-16 rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Pega aquí texto adicional de una cotización, correo, propuesta, etc."
                  value={genExtraText}
                  onChange={(e) => setGenExtraText(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowGenModal(false)}>
                Cancelar
              </Button>
              <Button
                className="gap-2"
                disabled={!genIncludeProposal && !genIncludePdfs && !genExtraText.trim()}
                onClick={handleGenerate}
              >
                <Sparkles className="h-4 w-4" />
                Generar
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Preview modal */}
      {preview && (
        <div className="rounded-xl border-2 border-primary/40 bg-card overflow-hidden animate-in">
          <div className="p-4 border-b border-border bg-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {previewSource === 'AI' ? <Sparkles className="h-4 w-4 text-primary" /> : <FileSpreadsheet className="h-4 w-4 text-primary" />}
              <h3 className="font-semibold">Preview ({previewSource}) — {preview.length} materiales en {groupByCategory(preview).length} categorías</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
              <Button variant="default" size="sm" className="gap-2" onClick={handleAcceptPreview}>
                <CheckCircle className="h-4 w-4" />
                Importar
              </Button>
            </div>
          </div>
          <MaterialsTable rows={preview} readOnly />
        </div>
      )}

      {/* Import mode modal: replace or append */}
      {pendingImport && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPendingImport(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Importar {pendingImport.materials.length} materiales</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Ya tienes <strong>{rows.length}</strong> materiales en el costeo. ¿Qué deseas hacer con los <strong>{pendingImport.materials.length}</strong> nuevos materiales de {pendingImport.source}?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="default"
                className="w-full justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { applyImport('replace', pendingImport.materials, pendingImport.source); setPendingImport(null) }}
              >
                <Trash2 className="h-4 w-4" />
                Reemplazar todo
              </Button>
              <Button
                variant="default"
                className="w-full justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { applyImport('append', pendingImport.materials, pendingImport.source); setPendingImport(null) }}
              >
                <Plus className="h-4 w-4" />
                Agregar a existentes
              </Button>
              <Button variant="ghost" className="w-full justify-center" onClick={() => setPendingImport(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Bulk margin modal */}
      {showMarginModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMarginModal(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
            <h3 className="text-lg font-semibold mb-1">Aplicar margen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Se aplicará a <strong>{selectedRows.size}</strong> material{selectedRows.size !== 1 ? 'es' : ''} seleccionado{selectedRows.size !== 1 ? 's' : ''}.
              El precio cliente se recalculará automáticamente.
            </p>
            <div className="flex items-center gap-2 mb-5">
              <label className="text-sm font-medium whitespace-nowrap">Margen %</label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={bulkMargin}
                  min={0}
                  onChange={(e) => setBulkMargin(Number(e.target.value) || 0)}
                  autoFocus
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowMarginModal(false)}>
                Cancelar
              </Button>
              <Button className="gap-2" onClick={applyBulkMargin}>
                <Percent className="h-4 w-4" />
                Aplicar
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* "Enviar a proveedor" Modal */}
      {showSendModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSendModal(false)} />
          <div className="relative w-[95vw] max-w-2xl max-h-[90vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Enviar a proveedor
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedRows.size} material{selectedRows.size !== 1 ? 'es' : ''} seleccionado{selectedRows.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body — single column */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Supplier */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor</label>
                <div className="mt-1.5">
                  <SupplierCombobox
                    value={sendSupplier.nombre}
                    onChange={(name) => {
                      // When selecting from combobox, try to load full supplier data
                      setSendSupplier((prev) => ({ ...prev, nombre: name }))
                      if (name) {
                        proveedoresApi.list({ buscar: name, limit: 1 }).then((res) => {
                          const data = res.data as { elementos: Array<{ nombre: string; email: string | null; telefono: string | null }> }
                          const match = data.elementos.find((s) => s.nombre === name)
                          if (match) {
                            setSendSupplier({ nombre: name, email: match.email ?? '', telefono: match.telefono ?? '' })
                          }
                        }).catch(() => {})
                      }
                    }}
                    placeholder="Buscar o escribir proveedor..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={sendSupplier.email}
                      onChange={(e) => setSendSupplier((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Teléfono</label>
                    <input
                      type="tel"
                      value={sendSupplier.telefono}
                      onChange={(e) => setSendSupplier((prev) => ({ ...prev, telefono: e.target.value }))}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background-elevated px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="55 1234 5678"
                    />
                  </div>
                </div>
              </div>

              {/* General note */}
              <div>
                <label className="text-sm font-medium">Nota general</label>
                <textarea
                  className="mt-1.5 w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={3}
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  placeholder="Instrucciones para el proveedor..."
                />
              </div>

              {/* Catalog images */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    Catálogo de imágenes
                    {catalogImages.length > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{catalogImages.length}</span>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Por página</span>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={catalogRows}
                        onChange={(e) => setCatalogRows(Math.max(1, Math.min(6, Number(e.target.value))))}
                        className="w-10 rounded border border-border bg-background-elevated px-1.5 py-0.5 text-center text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => catalogUploadRef.current?.click()}
                      disabled={uploadingCatalog}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {uploadingCatalog ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Subir
                    </button>
                    <input
                      ref={catalogUploadRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleCatalogUpload}
                    />
                  </div>
                </div>

                {/* Project gallery */}
                {loadingMedia ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando imágenes...
                  </div>
                ) : projectMedia.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg">
                    <Image className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">No hay imágenes en este proyecto.</p>
                    <button
                      type="button"
                      onClick={() => catalogUploadRef.current?.click()}
                      disabled={uploadingCatalog}
                      className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium disabled:opacity-50"
                    >
                      {uploadingCatalog ? 'Subiendo...' : 'Subir imágenes'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {projectMedia.map((file) => {
                      const isSelected = catalogImages.some((c) => c.mediaId === file.id)
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => toggleCatalogImage(file)}
                          className={cn(
                            'relative aspect-square rounded-md overflow-hidden border-2 transition-all cursor-pointer',
                            isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'
                          )}
                        >
                          <img src={file.url} alt={file.nombre} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-5 w-5 text-primary drop-shadow" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Selected images with title/description */}
                {catalogImages.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Seleccionadas ({catalogImages.length})</p>
                    {catalogImages.map((img) => (
                      <div key={img.mediaId} className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/10 overflow-hidden">
                        <div className="relative bg-muted/20">
                          <img src={img.url} alt={img.title} className="w-full h-auto" />
                          <button type="button" onClick={() => removeCatalogImage(img.mediaId)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white hover:bg-destructive transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="py-3 pr-3 flex flex-col gap-2">
                          <input type="text" value={img.title}
                            onChange={(e) => updateCatalogImage(img.mediaId, 'title', e.target.value)}
                            className="w-full text-sm font-semibold rounded border border-border bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Título de la imagen"
                          />
                          <div className="flex-1 min-h-0 overflow-y-auto rounded border border-border bg-background">
                            <RichTextEditor
                              value={img.description}
                              onChange={(html) => updateCatalogImage(img.mediaId, 'description', html)}
                              placeholder="Descripción de la imagen..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live HTML preview */}
              <div>
                <label className="text-sm font-medium mb-2 block">Vista previa</label>
                <iframe
                  ref={sendIframeRef}
                  className="w-full rounded-lg border border-border bg-white shadow-sm"
                  title="Vista previa de solicitud"
                  style={{ height: '500px' }}
                />
              </div>
            </div>

            {/* Fixed footer actions */}
            <div className="shrink-0 border-t border-border px-5 py-3 flex items-center gap-2">
              <Button
                className="gap-2 flex-1 justify-center"
                disabled={downloadingPdf}
                onClick={handleDownloadPdf}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={!sendSupplier.email}
                onClick={handleEmail}
              >
                <Mail className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setShowSendModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Actions bar */}
      {!preview && (
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={generating}
              onClick={() => setShowGenModal(true)}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Analizando...' : 'Generar con AI'}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Fila
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={addCategory}>
              <FolderPlus className="h-4 w-4" />
              Categoría
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleDownloadTemplate} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Descargar template Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importFileRef.current?.click()} className="gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Importar Excel
                </DropdownMenuItem>
                {rows.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {onSendToQuotation && (
                      <DropdownMenuItem
                        onClick={() => {
                          setQuotationConfirmItems(rows.map((m) => ({
                            concepto: m.concepto,
                            cantidad: m.cantidad,
                            precio_unitario: m.precio_cliente_unitario,
                            categoria: m.categoria,
                          })))
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        Crear cotización con todo
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                      <Printer className="h-4 w-4" />
                      Imprimir todo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteAllDialog(true)}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar todo
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportXlsx} />
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando...
              </span>
            )}
            {!dirty && lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                Guardado {lastSaved}
              </span>
            )}
            <Button
              variant="default"
              size="sm"
              className="gap-2"
              disabled={saving || !dirty}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Delete all confirmation dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar todos los materiales</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán los {rows.length} materiales del costeo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setRows([]); setDirty(true); setSelectedRows(new Set()) }}
            >
              Eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating selection bar */}
      {!preview && selectedRows.size > 0 && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in print:hidden">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
            {selectedRows.size} seleccionado{selectedRows.size !== 1 ? 's' : ''}
          </span>
          <div className="h-5 w-px bg-border" />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setBulkMargin(30); setShowMarginModal(true) }}>
            <Percent className="h-3.5 w-3.5" />
            Margen
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={openSendModal}>
            <Send className="h-3.5 w-3.5" />
            Enviar a proveedor
          </Button>
          {onSendToQuotation && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setQuotationConfirmItems(rows
                  .filter((_, i) => selectedRows.has(i))
                  .map((m) => ({
                    concepto: m.concepto,
                    cantidad: m.cantidad,
                    precio_unitario: m.precio_cliente_unitario,
                    categoria: m.categoria,
                  })))
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              Cotización
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-2" onClick={handlePrintSelected}>
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
          <div className="h-5 w-px bg-border" />
          <button
            onClick={() => setSelectedRows(new Set())}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Deseleccionar todo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>,
        document.body,
      )}

      {/* Main table */}
      {!preview && generating ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border bg-card">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analizando propuesta...</h3>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Extrayendo materiales con AI, esto puede tardar unos segundos.
          </p>
        </div>
      ) : !preview && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border bg-card">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Boxes className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sin materiales</h3>
          <p className="text-muted-foreground text-sm text-center max-w-md mb-4">
            Usa "Generar con AI" para extraer materiales de la propuesta (texto o PDF), o agrega filas manualmente.
          </p>
        </div>
      ) : !preview && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <MaterialsTable
            rows={rows}
            onUpdateRow={updateRow}
            onRemoveRow={removeRow}
            onDuplicateRow={duplicateRow}
            onReorder={handleReorder}
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
            selectedRows={selectedRows}
            onToggleRow={toggleRow}
            onToggleCategory={toggleCategory}
            onToggleAll={toggleAll}
          />
        </div>
      )}

      {/* Quotation confirmation modal */}
      {quotationConfirmItems && quotationConfirmItems.length > 0 && (
        <PendingCosteoConfirm
          items={quotationConfirmItems}
          loading={creatingQuotation}
          onConfirm={confirmCreateQuotation}
          onCancel={() => setQuotationConfirmItems(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quotes Tab
// ---------------------------------------------------------------------------

function buildQuotationPreviewHtml(q: Quotation, project: Project): string {
  const items = q.items ?? []
  const imagenes = q.imagenes ?? []
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  const groups: Map<string, QuotationItem[]> = new Map()
  for (const item of items) {
    const cat = item.categoria || 'General'
    const arr = groups.get(cat) ?? []
    arr.push(item)
    groups.set(cat, arr)
  }

  let tableRows = ''
  let rowNum = 0
  for (const [cat, catItems] of groups) {
    tableRows += `<tr class="cat-row"><td colspan="4">${cat}</td></tr>`
    let catSub = 0
    for (const item of catItems) {
      rowNum++
      const lineTotal = item.cantidad * item.precio_unitario
      catSub += lineTotal
      tableRows += `<tr><td class="num">${rowNum}</td><td style="white-space:pre-wrap">${item.concepto}</td><td class="center">${item.cantidad}</td><td class="right">${fmtMXN(item.precio_unitario)}</td></tr>`
    }
    tableRows += `<tr class="cat-subtotal"><td colspan="3" style="text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Subtotal ${cat}</td><td class="right" style="font-weight:700">${fmtMXN(catSub)}</td></tr>`
  }

  const tot = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  let catalogHtml = ''
  if (imagenes.length > 0) {
    const perPage = q.imagen_rows || 3
    const totalPages = Math.ceil(imagenes.length / perPage)
    for (let p = 0; p < totalPages; p++) {
      const pageImages = imagenes.slice(p * perPage, (p + 1) * perPage)
      let cells = ''
      for (const img of pageImages) {
        cells += `<div class="catalog-item"><img src="${img.dataUrl}" /><div class="item-content"><div class="img-title">${img.title}</div>${img.description ? `<div class="img-desc">${img.description}</div>` : ''}</div></div>`
      }
      catalogHtml += `<div class="catalog-page"><div class="catalog-header">Catálogo de Imágenes — Página ${p + 1} de ${totalPages}</div>${cells}</div>`
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; color-scheme: light; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; padding: 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #d4af37; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
  .header h2 { font-size: 12px; color: #64748b; font-weight: 400; margin-top: 2px; }
  .header .logo { height: 32px; }
  .meta { display: flex; gap: 32px; margin-bottom: 16px; font-size: 11px; }
  .meta .col { flex: 1; }
  .meta .label { font-weight: 600; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .meta .value { color: #1e293b; }
  .intro { margin-bottom: 14px; font-size: 11px; color: #334155; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
  thead th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; }
  tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  .cat-row td { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #334155; }
  .cat-subtotal td { background: #fafbfc; font-size: 10px; color: #475569; border-bottom: 2px solid #e2e8f0; }
  .num { text-align: center; color: #94a3b8; width: 30px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .totals { margin-top: 12px; text-align: right; font-size: 11px; }
  .totals .line { display: flex; justify-content: flex-end; gap: 24px; padding: 3px 0; }
  .totals .line.total { font-weight: 700; font-size: 13px; border-top: 2px solid #cbd5e1; padding-top: 6px; margin-top: 4px; }
  .totals .label { color: #475569; min-width: 100px; text-align: right; }
  .totals .amount { min-width: 100px; text-align: right; }
  .terms { margin-top: 16px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px; color: #475569; white-space: pre-wrap; }
  .terms strong { display: block; margin-bottom: 3px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  .catalog-page { margin-top: 32px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
  .catalog-header { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #d4af37; padding-bottom: 6px; }
  .catalog-item { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 10px; }
  .catalog-item img { width: 100%; height: auto; display: block; }
  .item-content { padding: 12px 14px; border-left: 1px solid #e2e8f0; }
  .img-title { font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 6px; }
  .img-desc { font-size: 10px; color: #334155; line-height: 1.6; }
  .img-desc p { margin: 0 0 6px; }
  .img-desc ul, .img-desc ol { margin: 0 0 6px; padding-left: 18px; }
  .img-desc li { margin-bottom: 2px; }
  .img-desc strong, .img-desc b { font-weight: 700; }
  .img-desc em, .img-desc i { font-style: italic; }
  .img-desc h1, .img-desc h2, .img-desc h3 { font-weight: 700; margin: 0 0 4px; }
  .img-desc h1 { font-size: 13px; } .img-desc h2 { font-size: 12px; } .img-desc h3 { font-size: 11px; }
</style></head><body>
  <div class="header">
    <div><h1>Cotización ${q.codigo}</h1><h2>${q.nombre} — ${project.cliente_nombre ?? ''}</h2></div>
    <img src="/logo-dark.png" class="logo" />
  </div>
  <div class="meta">
    <div class="col"><div class="label">Cliente</div><div class="value">${project.cliente_nombre ?? ''}</div></div>
    <div class="col"><div class="label">Fecha</div><div class="value">${today}</div></div>
    <div class="col"><div class="label">Proyecto</div><div class="value">${project.nombre}</div></div>
  </div>
  ${q.texto_intro ? `<div class="intro">${q.texto_intro}</div>` : ''}
  <table><thead><tr><th style="width:30px;text-align:center">#</th><th>Concepto</th><th style="width:70px;text-align:center">Cantidad</th><th style="width:100px;text-align:right">Precio Unit.</th></tr></thead><tbody>${tableRows}</tbody></table>
  <div class="totals">
    <div class="line total"><span class="label">Subtotal:</span><span class="amount">${fmtMXN(tot)}</span></div>
  </div>
  ${q.texto_terminos ? `<div class="terms"><strong>Términos y Condiciones:</strong>${q.texto_terminos}</div>` : ''}
  <div class="footer">Generado por DistritoMKT CRM — ${today}</div>
  ${catalogHtml}
</body></html>`
}

async function generateQuotationPdfBlob(q: Quotation, project: Project): Promise<Blob> {
  const items = q.items ?? []
  const imagenes = q.imagenes ?? []
  const textoIntro = q.texto_intro ?? ''
  const textoTerminos = q.texto_terminos ?? ''

  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = autoTableModule.default
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2
  const gold = '#d4af37'
  const dark = '#0f172a'
  const gray = '#64748b'
  const lightGray = '#94a3b8'

  const loadImg = (url: string): Promise<string> =>
    fetch(url).then((r) => r.blob()).then((b) => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(b)
    }))

  let logoDataUrl = ''
  let logoW = 0
  let logoH = 0
  try {
    logoDataUrl = await loadImg('/logo-dark.png')
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new window.Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 200, h: 80 })
      img.src = logoDataUrl
    })
    const maxH = 12
    logoH = maxH
    logoW = maxH * (dims.w / dims.h)
  } catch { /* skip */ }

  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  // Header
  let y = margin
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(dark)
  doc.text(`Cotización ${q.codigo}`, margin, y + 6)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(gray)
  doc.text(`${q.nombre} — ${project.cliente_nombre ?? ''}`, margin, y + 12)
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', pageW - margin - logoW, y - 2, logoW, logoH) } catch { /* skip */ }
  }
  y += 18
  doc.setDrawColor(gold)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageW - margin, y)
  y += 10

  // Meta
  const metaCols = [
    { label: 'CLIENTE', value: project.cliente_nombre ?? '' },
    { label: 'FECHA', value: today },
    { label: 'PROYECTO', value: project.nombre },
  ]
  const colW = contentW / metaCols.length
  doc.setFontSize(8)
  for (let i = 0; i < metaCols.length; i++) {
    const x = margin + i * colW
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#475569')
    doc.text(metaCols[i].label, x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(dark)
    doc.setFontSize(10)
    doc.text(metaCols[i].value, x, y + 5)
    doc.setFontSize(8)
  }
  y += 14

  // Intro text
  const introPlain = textoIntro.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  if (introPlain) {
    doc.setFontSize(10)
    doc.setTextColor(dark)
    const introLines = doc.splitTextToSize(introPlain, contentW)
    doc.text(introLines, margin, y)
    y += introLines.length * 4.5 + 4
  }

  // Table
  const groups: Map<string, QuotationItem[]> = new Map()
  for (const item of items) {
    const cat = item.categoria || 'General'
    const arr = groups.get(cat) ?? []
    arr.push(item)
    groups.set(cat, arr)
  }
  const tableBody: (string | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] = []
  let rowNum = 0
  for (const [cat, catItems] of groups) {
    tableBody.push([{
      content: cat.toUpperCase(),
      colSpan: 4,
      styles: { fontStyle: 'bold' as const, fillColor: '#f1f5f9', textColor: '#334155', fontSize: 9 },
    }])
    let catSub = 0
    for (const item of catItems) {
      rowNum++
      catSub += item.cantidad * item.precio_unitario
      tableBody.push([String(rowNum), item.concepto, String(item.cantidad), fmtMXN(item.precio_unitario)])
    }
    tableBody.push([{
      content: `Subtotal ${cat}`,
      colSpan: 3,
      styles: { halign: 'right' as const, fontSize: 8, textColor: '#475569', fontStyle: 'bold' as const },
    }, { content: fmtMXN(catSub), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: 9 } }])
  }
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Concepto', 'Cantidad', 'Precio Unit.']],
    body: tableBody,
    styles: { fontSize: 10, cellPadding: 3, textColor: dark, lineColor: '#e2e8f0', lineWidth: 0.2 },
    headStyles: { fillColor: '#f8fafc', textColor: '#475569', fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: lightGray },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
    },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  y = finalY

  // Total
  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const rightX = pageW - margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(dark)
  doc.text(`Subtotal: ${fmtMXN(total)}`, rightX, y, { align: 'right' })
  y += 8

  // Terms
  if (textoTerminos.trim()) {
    doc.setFillColor('#f8fafc')
    doc.setDrawColor('#e2e8f0')
    const termLines = doc.splitTextToSize(textoTerminos.trim(), contentW - 8)
    const termH = termLines.length * 4.5 + 10
    if (y + termH > pageH - 20) { doc.addPage(); y = margin }
    doc.roundedRect(margin, y, contentW, termH, 2, 2, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#475569')
    doc.text('Términos y Condiciones:', margin + 4, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(termLines, margin + 4, y + 10)
  }

  // Footer
  doc.setDrawColor('#e2e8f0')
  doc.setLineWidth(0.3)
  doc.line(margin, pageH - 15, pageW - margin, pageH - 15)
  doc.setFontSize(8)
  doc.setTextColor(lightGray)
  doc.text(`Generado por DistritoMKT CRM — ${today}`, pageW / 2, pageH - 10, { align: 'center' })

  // Catalog pages — side-by-side layout (image left 50%, title+description right 50%)
  if (imagenes.length > 0) {
    const perPage = q.imagen_rows || 3
    const totalPages = Math.ceil(imagenes.length / perPage)
    const gap = 6
    const halfW = contentW / 2

    // Helper: render HTML rich text to jsPDF (supports bold, italic, lists, paragraphs)
    const renderRichText = (html: string, x: number, startY: number, maxW: number): number => {
      let y = startY
      const lineH = 3.5
      // Parse HTML into blocks
      const div = document.createElement('div')
      div.innerHTML = html
      const walk = (node: Node, isBold: boolean, isItalic: boolean, listPrefix: string) => {
        if (node.nodeType === 3) { // text
          const text = (node.textContent ?? '').replace(/\s+/g, ' ')
          if (!text.trim()) return
          const prefix = listPrefix
          doc.setFont('helvetica', isBold ? 'bold' : isItalic ? 'italic' : 'normal')
          const fullText = prefix ? `${prefix} ${text.trim()}` : text.trim()
          const lines = doc.splitTextToSize(fullText, prefix ? maxW - 4 : maxW)
          for (const line of lines) {
            if (y > pageH - 15) { doc.addPage(); y = margin }
            doc.text(line, prefix ? x + 4 : x, y)
            y += lineH
          }
          return
        }
        if (node.nodeType !== 1) return
        const el = node as Element
        const tag = el.tagName.toLowerCase()
        const bold = isBold || tag === 'strong' || tag === 'b'
        const italic = isItalic || tag === 'em' || tag === 'i'
        if (tag === 'ul' || tag === 'ol') {
          let idx = 0
          el.childNodes.forEach((child) => {
            if ((child as Element).tagName?.toLowerCase() === 'li') {
              idx++
              const pfx = tag === 'ol' ? `${idx}.` : '•'
              walk(child, bold, italic, pfx)
            }
          })
          y += 1
          return
        }
        if (tag === 'br') { y += lineH; return }
        el.childNodes.forEach((child) => walk(child, bold, italic, listPrefix))
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'li'].includes(tag)) y += 1
      }
      doc.setFontSize(8)
      doc.setTextColor(gray)
      walk(div, false, false, '')
      return y
    }

    for (let p = 0; p < totalPages; p++) {
      doc.addPage()
      let cy = margin
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(dark)
      doc.text(`Catálogo de Imágenes — Página ${p + 1} de ${totalPages}`, margin, cy + 5)
      cy += 8
      doc.setDrawColor(gold)
      doc.setLineWidth(0.6)
      doc.line(margin, cy, pageW - margin, cy)
      cy += 8

      const pageImages = imagenes.slice(p * perPage, (p + 1) * perPage)
      for (let imgIdx = 0; imgIdx < pageImages.length; imgIdx++) {
        const img = pageImages[imgIdx]
        const imgDrawW = halfW - 4
        const ratio = img.naturalH / img.naturalW
        const imgH = Math.min(imgDrawW * ratio, 60)
        const imgW = imgH / ratio
        const textW = halfW - 8

        // Page break check (estimate)
        if (cy + imgH + 10 > pageH - 20) { doc.addPage(); cy = margin }


        // Image (left half, top-aligned)
        try { doc.addImage(img.dataUrl, 'JPEG', margin + 2, cy + 2, imgW, imgH) } catch { /* skip */ }
        const imgBottom = cy + imgH + 4

        // Title + description (right half)
        const textX = margin + halfW + 4
        let ty = cy + 5
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(dark)
        const titleLines = doc.splitTextToSize(img.title || '', textW)
        doc.text(titleLines, textX, ty)
        ty += titleLines.length * 4.5 + 2
        if (img.description) {
          ty = renderRichText(img.description, textX, ty, textW)
        }
        const textBottom = ty + 4

        // Move past the taller side
        cy = Math.max(imgBottom, textBottom)

        // Separator line between items
        if (imgIdx < pageImages.length - 1) {
          doc.setDrawColor('#e2e8f0')
          doc.setLineWidth(0.2)
          doc.line(margin, cy, pageW - margin, cy)
          cy += gap
        }
      }
    }
  }

  return doc.output('blob') as unknown as Blob
}

function QuotesTab({ project, quotationIdParam, onCotizacionesChange }: {
  project: Project
  quotationIdParam?: string
  onCotizacionesChange?: (list: Quotation[]) => void
}) {
  const navigate = useNavigate()
  const { id: projectId } = useParams<{ id: string }>()

  const [cotizaciones, setCotizaciones] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showFromCosteo, setShowFromCosteo] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deletedIdsRef = useRef<Set<number>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const notifyParent = useCallback((list: Quotation[]) => {
    onCotizacionesChange?.(list)
  }, [onCotizacionesChange])

  // Fetch cotizaciones on mount
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoading(true)

    cotizacionesApi.list(project.id).then(async (res) => {
      if (cancelled) return
      const list = (res.data ?? []) as Quotation[]
      list.sort((a, b) => a.id - b.id)
      setCotizaciones(list)
      notifyParent(list)

      if (quotationIdParam === 'nueva') {
        try {
          const num = list.length + 1
          const created = await cotizacionesApi.create({
            proyecto_id: project.id,
            nombre: `Cotización v${num}`,
          })
          if (cancelled) return
          const q = created.data as Quotation
          const updated = [...list, q]
          setCotizaciones(updated)
          notifyParent(updated)
          setEditingId(q.id)
          navigate(`/proyectos/${projectId}/cotizaciones/${q.id}`, { replace: true })
        } catch {
          if (!cancelled) toast.error('Error al crear cotización')
        }
      } else if (quotationIdParam && quotationIdParam !== 'nueva') {
        const id = Number(quotationIdParam)
        if (list.find((q) => q.id === id)) {
          setEditingId(id)
        }
      }
    }).catch(() => {
      if (!cancelled) toast.error('Error al cargar cotizaciones')
    }).finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const setEditingWithUrl = (qId: number | null) => {
    setEditingId(qId)
    if (qId) {
      navigate(`/proyectos/${projectId}/cotizaciones/${qId}`, { replace: true })
    } else {
      navigate(`/proyectos/${projectId}/cotizaciones`, { replace: true })
    }
  }

  const handleCreateFromScratch = async () => {
    try {
      const num = cotizaciones.length + 1
      const created = await cotizacionesApi.create({
        proyecto_id: project.id,
        nombre: `Cotización v${num}`,
      })
      const q = created.data as Quotation
      const updated = [...cotizaciones, q]
      setCotizaciones(updated)
      notifyParent(updated)
      setEditingWithUrl(q.id)
    } catch {
      toast.error('Error al crear cotización')
    }
  }

  const handleCreateFromCosteo = async (items: QuotationItem[]) => {
    try {
      const num = cotizaciones.length + 1
      const created = await cotizacionesApi.create({
        proyecto_id: project.id,
        nombre: `Cotización v${num}`,
        items,
      })
      const q = created.data as Quotation
      const updated = [...cotizaciones, q]
      setCotizaciones(updated)
      notifyParent(updated)
      setEditingWithUrl(q.id)
    } catch {
      toast.error('Error al crear cotización')
    }
  }

  const handleDuplicate = async (q: Quotation) => {
    try {
      const created = await cotizacionesApi.create({
        proyecto_id: project.id,
        nombre: `${q.nombre} (copia)`,
        items: q.items,
        texto_intro: q.texto_intro,
        texto_terminos: q.texto_terminos,
        imagenes: q.imagenes,
        imagen_cols: q.imagen_cols,
        imagen_rows: q.imagen_rows,
        vigencia_dias: q.vigencia_dias,
        descuento_porcentaje: q.descuento_porcentaje,
        iva_porcentaje: q.iva_porcentaje,
        notas: q.notas,
      })
      const dup = created.data as Quotation
      const updated = [...cotizaciones, dup]
      setCotizaciones(updated)
      notifyParent(updated)
      toast.success('Cotización duplicada')
    } catch {
      toast.error('Error al duplicar cotización')
    }
  }

  const handleDelete = async (qId: number) => {
    // Mark as deleted immediately to prevent any pending auto-save from PATCHing
    deletedIdsRef.current.add(qId)
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }
    // Close editor if we're editing this one
    if (editingId === qId) {
      setEditingId(null)
      navigate(`/proyectos/${projectId}/cotizaciones`, { replace: true })
    }
    setDeleteConfirmId(null)
    try {
      await cotizacionesApi.delete(qId)
      // Reload list from server
      setLoading(true)
      try {
        const res = await cotizacionesApi.list(project.id)
        const list = (res.data ?? []) as Quotation[]
        list.sort((a, b) => a.id - b.id)
        setCotizaciones(list)
        notifyParent(list)
      } finally {
        setLoading(false)
      }
      toast.success('Cotización eliminada')
    } catch {
      deletedIdsRef.current.delete(qId)
      toast.error('Error al eliminar cotización')
    }
  }

  const handleToggleEstado = async (qId: number) => {
    const q = cotizaciones.find((c) => c.id === qId)
    if (!q) return
    const newEstado = q.estado === 'pendiente' ? 'aprobada' : 'pendiente'
    try {
      const res = await cotizacionesApi.update(qId, { estado: newEstado })
      const updated = cotizaciones.map((c) => c.id === qId ? res.data as Quotation : c)
      setCotizaciones(updated)
      notifyParent(updated)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  // Auto-save for editor: debounced PATCH
  const handleUpdateQuotation = (updated: Quotation) => {
    if (deletedIdsRef.current.has(updated.id)) return
    setCotizaciones((prev) => prev.map((q) => q.id === updated.id ? updated : q))
    setDirty(true)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      if (deletedIdsRef.current.has(updated.id)) return
      try {
        await cotizacionesApi.update(updated.id, {
          nombre: updated.nombre,
          estado: updated.estado,
          items: updated.items,
          texto_intro: updated.texto_intro,
          texto_terminos: updated.texto_terminos,
          imagenes: updated.imagenes,
          imagen_cols: updated.imagen_cols,
          imagen_rows: updated.imagen_rows,
          vigencia_dias: updated.vigencia_dias,
          descuento_porcentaje: updated.descuento_porcentaje,
          iva_porcentaje: updated.iva_porcentaje,
          notas: updated.notas,
        })
        setDirty(false)
        setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
        setCotizaciones((prev) => { setTimeout(() => notifyParent(prev), 0); return prev })
      } catch {
        if (!deletedIdsRef.current.has(updated.id)) {
          toast.error('Error al guardar cotización')
        }
      }
    }, 2000)
  }

  const handleSaveNow = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    const q = editingId ? cotizaciones.find((c) => c.id === editingId) : null
    if (!q || deletedIdsRef.current.has(q.id)) return
    try {
      await cotizacionesApi.update(q.id, {
        nombre: q.nombre, estado: q.estado, items: q.items,
        texto_intro: q.texto_intro, texto_terminos: q.texto_terminos,
        imagenes: q.imagenes, imagen_cols: q.imagen_cols, imagen_rows: q.imagen_rows,
        vigencia_dias: q.vigencia_dias, descuento_porcentaje: q.descuento_porcentaje, iva_porcentaje: q.iva_porcentaje, notas: q.notas,
      })
      setDirty(false)
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      toast.error('Error al guardar cotización')
    }
  }

  const editingQuotation = editingId ? cotizaciones.find((q) => q.id === editingId) ?? null : null
  const materials = normalizeMaterials(project.materiales ?? [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (editingQuotation) {
    return (
      <QuotationEditor
        quotation={editingQuotation}
        project={project}
        onUpdate={handleUpdateQuotation}
        onBack={() => setEditingWithUrl(null)}
        dirty={dirty}
        lastSaved={lastSaved}
        onSave={handleSaveNow}
      />
    )
  }

  return (
    <div className="space-y-3">
      {showFromCosteo && materials.length > 0 && (
        <FromCosteoSelector
          materials={materials}
          onClose={() => setShowFromCosteo(false)}
          onCreate={(items) => { handleCreateFromCosteo(items); setShowFromCosteo(false) }}
        />
      )}



      {cotizaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-border bg-card">
          <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-primary/60" />
          </div>
          <h3 className="text-base font-semibold mb-1">Sin cotizaciones</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm mb-5">
            Crea una cotización formal para el cliente.
          </p>
          <div className="flex gap-3">
            <Button size="sm" className="gap-2" onClick={handleCreateFromScratch}>
              <Plus className="h-4 w-4" />
              Crear desde cero
            </Button>
            {materials.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFromCosteo(true)}>
                <Boxes className="h-4 w-4" />
                Desde costeo
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCreateFromScratch}>
              <Plus className="h-4 w-4" />
              Nueva
            </Button>
            {materials.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFromCosteo(true)}>
                <Boxes className="h-4 w-4" />
                Desde costeo
              </Button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cotizaciones.map((q) => {
              const items = q.items ?? []
              const sub = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
              const totalWithDiscount = sub
              return (
                <div
                  key={q.id}
                  className="rounded-lg border border-border bg-card hover:border-primary/30 transition-all cursor-pointer p-3"
                  onClick={() => setEditingWithUrl(q.id)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate">{q.nombre}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono">{q.codigo}</p>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                      q.estado === 'aprobada'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-yellow-500/15 text-yellow-500',
                    )}>
                      {q.estado === 'aprobada' ? 'Aprobada' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-base font-bold">{fmtMXN(totalWithDiscount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                    <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{new Date(q.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-0.5 -mx-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleEstado(q.id) }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title={q.estado === 'aprobada' ? 'Marcar pendiente' : 'Aprobar'}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(q) }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Duplicar"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setPreviewId(q.id)
                        setPreviewLoading(true)
                        try {
                          const blob = await generateQuotationPdfBlob(q, project)
                          const url = URL.createObjectURL(blob)
                          setPreviewPdfUrl(url)
                        } catch (err) {
                          console.error('PDF preview error:', err)
                          toast.error('Error al generar vista previa')
                          setPreviewId(null)
                        } finally {
                          setPreviewLoading(false)
                        }
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Vista previa PDF"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingWithUrl(q.id) }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Descargar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(q.id) }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Delete confirmation dialog (rendered outside card grid to avoid click propagation) */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
            <AlertDialogDescription>
              Esta cotización se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteConfirmId) handleDelete(deleteConfirmId) }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview modal */}
      {previewId && (() => {
        const pq = cotizaciones.find((c) => c.id === previewId)
        if (!pq) return null
        const closePreview = () => {
          setPreviewId(null)
          if (previewPdfUrl) { URL.revokeObjectURL(previewPdfUrl); setPreviewPdfUrl(null) }
        }
        return createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closePreview}>
            <div className="bg-card rounded-xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold">{pq.nombre}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{pq.codigo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {previewPdfUrl && (
                    <a
                      href={previewPdfUrl}
                      download={`cotizacion_${pq.nombre.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Descargar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={closePreview} className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {previewLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Generando PDF...</span>
                  </div>
                </div>
              ) : previewPdfUrl ? (
                <iframe
                  src={previewPdfUrl}
                  className="flex-1 w-full"
                  title="Vista previa PDF"
                />
              ) : null}
            </div>
          </div>,
          document.body,
        )
      })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// From Costeo Selector
// ---------------------------------------------------------------------------

function PendingCosteoConfirm({ items, loading, onConfirm, onCancel }: {
  items: QuotationItem[]
  loading?: boolean
  onConfirm: (items: QuotationItem[]) => void
  onCancel: () => void
}) {
  const groups: Map<string, QuotationItem[]> = new Map()
  for (const item of items) {
    const cat = item.categoria || 'General'
    const arr = groups.get(cat) ?? []
    arr.push(item)
    groups.set(cat, arr)
  }
  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-[95vw] max-w-2xl max-h-[80vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-lg font-semibold">Confirmar cotización desde costeo</h3>
            <p className="text-sm text-muted-foreground">{items.length} concepto{items.length !== 1 ? 's' : ''} · Total: {fmtMXN(total)}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 sticky top-0">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Concepto</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Cant.</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Precio Unit.</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {[...groups.entries()].map(([cat, catItems], gi) => (
                <Fragment key={`${gi}-${cat}`}>
                  <tr className="bg-primary/5 border-t border-primary/20">
                    <td colSpan={4} className="px-3 py-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">{cat}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">({catItems.length})</span>
                    </td>
                  </tr>
                  {catItems.map((item, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-1.5 whitespace-pre-wrap">{item.concepto}</td>
                      <td className="px-3 py-1.5 text-right">{item.cantidad}</td>
                      <td className="px-3 py-1.5 text-right">{fmtMXN(item.precio_unitario)}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{fmtMXN(item.cantidad * item.precio_unitario)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Total: {fmtMXN(total)}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
            <Button className="gap-2" onClick={() => onConfirm(items)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? 'Creando...' : 'Crear cotización'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function FromCosteoSelector({
  materials,
  onClose,
  onCreate,
}: {
  materials: Material[]
  onClose: () => void
  onCreate: (items: QuotationItem[]) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const groups = groupByCategory(materials)

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const toggleCat = (cat: string) => {
    const indices = materials.map((_, i) => i).filter((i) => materials[i].categoria === cat)
    const allSel = indices.every((i) => selected.has(i))
    setSelected((prev) => {
      const next = new Set(prev)
      indices.forEach((i) => allSel ? next.delete(i) : next.add(i))
      return next
    })
  }

  const handleCreate = () => {
    const items: QuotationItem[] = materials
      .filter((_, i) => selected.has(i))
      .map((m) => ({
        concepto: m.concepto,
        cantidad: m.cantidad,
        precio_unitario: m.precio_cliente_unitario,
        categoria: m.categoria,
      }))
    onCreate(items)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[95vw] max-w-2xl max-h-[80vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-lg font-semibold">Seleccionar conceptos del costeo</h3>
            <p className="text-sm text-muted-foreground">Se importarán con precios cliente (sin costos internos)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 sticky top-0">
                <th className="w-8 px-3 py-2" />
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Concepto</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Cant.</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Precio Cliente</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, gi) => {
                const catIndices = group.items.map((x) => x.idx)
                const allSel = catIndices.every((i) => selected.has(i))
                const someSel = catIndices.some((i) => selected.has(i))
                return (
                  <Fragment key={`${gi}-${group.categoria}`}>
                    <tr className="bg-primary/5 border-t border-primary/20">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allSel}
                          ref={(el) => { if (el) el.indeterminate = someSel && !allSel }}
                          onChange={() => toggleCat(group.categoria)}
                          className="accent-[var(--primary)] cursor-pointer"
                        />
                      </td>
                      <td colSpan={3} className="px-3 py-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">{group.categoria}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">({group.items.length})</span>
                      </td>
                    </tr>
                    {group.items.map(({ row, idx }) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            checked={selected.has(idx)}
                            onChange={() => toggle(idx)}
                            className="accent-[var(--primary)] cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-1.5 whitespace-pre-wrap">{row.concepto}</td>
                        <td className="px-3 py-1.5 text-right">{row.cantidad}</td>
                        <td className="px-3 py-1.5 text-right">{fmtMXN(row.precio_cliente_unitario)}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{selected.size} material{selected.size !== 1 ? 'es' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button disabled={selected.size === 0} className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear cotización con {selected.size} items
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Quotation Editor (inline, replaces list view)
// ---------------------------------------------------------------------------

function QuotationEditor({
  quotation,
  project,
  onUpdate,
  onBack,
  dirty,
  lastSaved,
  onSave,
}: {
  quotation: Quotation
  project: Project
  onUpdate: (q: Quotation) => void
  onBack: () => void
  dirty: boolean
  lastSaved: string | null
  onSave: () => void
}) {
  const [q, setQ] = useState<Quotation>({
    ...quotation,
    items: quotation.items ?? [],
    imagenes: quotation.imagenes ?? [],
    texto_intro: quotation.texto_intro ?? '',
    texto_terminos: quotation.texto_terminos || 'La presente cotización tiene una validez de 15 días, no incluye IVA y se presenta en pesos mexicanos.',
    notas: quotation.notas ?? '',
    iva_porcentaje: quotation.iva_porcentaje ?? 16,
  })
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)
  const [showPreview, setShowPreview] = useState(true)

  // Catalog image state
  const [projectMedia, setProjectMedia] = useState<MediaFile[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [uploadingCatalog, setUploadingCatalog] = useState(false)
  const catalogUploadRef = useRef<HTMLInputElement>(null)
  const [showCatalog, setShowCatalog] = useState(q.imagenes.length > 0)
  const [editingCatName, setEditingCatName] = useState<string | null>(null)
  const [editCatValue, setEditCatValue] = useState('')

  useEffect(() => {
    setLoadingMedia(true)
    mediaApi.list({ entity_type: 'project', entity_id: project.id, tipo: 'image' }).then((res) => {
      const files = res.data as MediaFile[]
      setProjectMedia(files)
      // Refresh expired S3 URLs in catalog images
      if (q.imagenes.length > 0 && files.length > 0) {
        const urlMap = new Map(files.map((f) => [f.id, f.url]))
        const needsRefresh = q.imagenes.some((img) => {
          const freshUrl = urlMap.get(img.mediaId)
          return freshUrl && freshUrl !== img.url
        })
        if (needsRefresh) {
          setQ((prev) => ({
            ...prev,
            imagenes: prev.imagenes.map((img) => {
              const freshUrl = urlMap.get(img.mediaId)
              return freshUrl ? { ...img, url: freshUrl } : img
            }),
          }))
        }
      }
    }).catch(() => setProjectMedia([])).finally(() => setLoadingMedia(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  // Sync back — use setTimeout to avoid setState-during-render
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  useEffect(() => {
    const t = setTimeout(() => onUpdateRef.current(q), 0)
    return () => clearTimeout(t)
  }, [q])

  const updateField = <K extends keyof Quotation>(field: K, value: Quotation[K]) => {
    setQ((prev) => ({ ...prev, [field]: value }))
  }

  // Items
  const updateItem = (idx: number, field: keyof QuotationItem, value: string | number) => {
    setQ((prev) => {
      const items = [...prev.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, items }
    })
  }

  const removeItem = (idx: number) => {
    setQ((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  const addItem = () => {
    const lastCat = q.items.length > 0 ? q.items[q.items.length - 1].categoria : 'GENERAL'
    setQ((prev) => ({
      ...prev,
      items: [...prev.items, { concepto: '', cantidad: 1, precio_unitario: 0, categoria: lastCat }],
    }))
  }

  const addItemToCategory = (cat: string) => {
    // Find last item of this category and insert after it
    setQ((prev) => {
      const items = [...prev.items]
      let lastIdx = -1
      items.forEach((item, i) => { if (item.categoria === cat) lastIdx = i })
      const newItem: QuotationItem = { concepto: '', cantidad: 1, precio_unitario: 0, categoria: cat }
      if (lastIdx === -1) {
        items.push(newItem)
      } else {
        items.splice(lastIdx + 1, 0, newItem)
      }
      return { ...prev, items }
    })
  }

  const addCategory = () => {
    // Group existing categories to compute next number
    const existingCats = new Set(q.items.map((i) => i.categoria))
    let num = existingCats.size + 1
    let catName = `CATEGORÍA ${num}`
    while (existingCats.has(catName)) { num++; catName = `CATEGORÍA ${num}` }
    setQ((prev) => ({
      ...prev,
      items: [...prev.items, { concepto: '', cantidad: 1, precio_unitario: 0, categoria: catName }],
    }))
  }

  const renameQuotationCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return
    setQ((prev) => ({
      ...prev,
      items: prev.items.map((item) => item.categoria === oldName ? { ...item, categoria: newName } : item),
    }))
  }

  const deleteQuotationCategory = (catName: string) => {
    setQ((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.categoria !== catName),
    }))
  }

  // Fee de agencia modal
  const [feeCat, setFeeCat] = useState<string | null>(null)
  const [feePct, setFeePct] = useState(15)

  const addAgencyFee = (catName: string, pct: number) => {
    setQ((prev) => {
      const items = [...prev.items]
      const catItems = items.filter((i) => i.categoria === catName && !(i.concepto ?? '').startsWith('Fee de agencia'))
      const catSubtotal = catItems.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
      const feeAmount = Math.round(catSubtotal * (pct / 100) * 100) / 100
      // Remove existing fee for this category
      const filtered = items.filter((i) => !(i.categoria === catName && (i.concepto ?? '').startsWith('Fee de agencia')))
      // Recalculate lastIdx after filtering
      let insertIdx = -1
      filtered.forEach((item, i) => { if (item.categoria === catName) insertIdx = i })
      const feeItem: QuotationItem = {
        concepto: 'Fee de agencia',
        cantidad: 1,
        precio_unitario: feeAmount,
        categoria: catName,
      }
      if (insertIdx === -1) {
        filtered.push(feeItem)
      } else {
        filtered.splice(insertIdx + 1, 0, feeItem)
      }
      return { ...prev, items: filtered }
    })
    setFeeCat(null)
  }

  // Catalog images
  const toggleCatalogImage = async (file: MediaFile) => {
    const existing = q.imagenes.find((c) => c.mediaId === file.id)
    if (existing) {
      updateField('imagenes', q.imagenes.filter((c) => c.mediaId !== file.id))
      return
    }
    try {
      const res = await fetch(file.url)
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = () => resolve({ w: 1, h: 1 })
        img.src = dataUrl
      })
      const nameWithoutExt = file.nombre.replace(/\.[^/.]+$/, '')
      updateField('imagenes', [...q.imagenes, {
        mediaId: file.id, url: file.url, dataUrl, filename: file.nombre,
        title: nameWithoutExt, description: '', naturalW: dims.w, naturalH: dims.h,
      }])
    } catch {
      toast.error('Error al cargar imagen')
    }
  }

  const catalogUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateCatalogImage = (mediaId: number, field: 'title' | 'description', value: string) => {
    if (catalogUpdateTimer.current) clearTimeout(catalogUpdateTimer.current)
    catalogUpdateTimer.current = setTimeout(() => {
      setQ((prev) => ({
        ...prev,
        imagenes: prev.imagenes.map((c) => c.mediaId === mediaId ? { ...c, [field]: value } : c),
      }))
    }, 500)
  }

  const removeCatalogImage = (mediaId: number) => {
    updateField('imagenes', q.imagenes.filter((c) => c.mediaId !== mediaId))
  }

  const handleCatalogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingCatalog(true)
    try {
      const res = await mediaApi.upload(Array.from(files), { entity_type: 'project', entity_id: project.id })
      const uploaded = res.data as MediaFile[]
      setProjectMedia((prev) => [...uploaded, ...prev])
      for (const file of uploaded) {
        if (file.tipo === 'image') await toggleCatalogImage(file)
      }
      toast.success(`${uploaded.length} imagen${uploaded.length !== 1 ? 'es' : ''} subida${uploaded.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Error al subir imágenes')
    } finally {
      setUploadingCatalog(false)
      if (catalogUploadRef.current) catalogUploadRef.current.value = ''
    }
  }

  // Group items by category for display
  const itemGroups = (() => {
    const groups: Array<{ categoria: string; items: Array<{ item: QuotationItem; idx: number }> }> = []
    let currentCat = ''
    q.items.forEach((item, idx) => {
      const cat = item.categoria || 'General'
      if (cat !== currentCat || groups.length === 0) {
        groups.push({ categoria: cat, items: [] })
        currentCat = cat
      }
      groups[groups.length - 1].items.push({ item, idx })
    })
    return groups
  })()

  const total = q.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  // Build preview HTML — reuse shared function
  const buildPreviewHtml = useCallback(() => buildQuotationPreviewHtml(q, project), [q, project])

  // Write HTML into preview iframe
  const writePreview = useCallback(() => {
    if (!previewRef.current) return
    const doc = previewRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(buildPreviewHtml())
    doc.close()
  }, [buildPreviewHtml])

  // Update preview when data changes
  useEffect(() => {
    writePreview()
  }, [writePreview])

  // Also write preview when iframe mounts (ref callback)
  const iframeRefCallback = useCallback((node: HTMLIFrameElement | null) => {
    (previewRef as React.MutableRefObject<HTMLIFrameElement | null>).current = node
    if (node) {
      // Small delay to ensure iframe is ready
      requestAnimationFrame(() => writePreview())
    }
  }, [writePreview])

  // PDF generation
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const blob = await generateQuotationPdfBlob(q, project)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const slug = q.nombre.replace(/\s+/g, '_').toLowerCase()
      a.download = `cotizacion_${slug}_${project.nombre.replace(/\s+/g, '_').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Error al generar PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="space-y-0 animate-in">
      {/* Back + title bar */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <input
            className="text-lg font-semibold bg-transparent border-0 outline-none flex-1 min-w-0 placeholder:text-muted-foreground/50 focus:border-b focus:border-primary"
            value={q.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            placeholder="Nombre de la cotización"
          />
          <button
            onClick={() => updateField('estado', q.estado === 'pendiente' ? 'aprobada' : 'pendiente')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors shrink-0',
              q.estado === 'aprobada'
                ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25'
                : 'bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25',
            )}
          >
            {q.estado === 'aprobada' ? 'Aprobada' : 'Pendiente'}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {!dirty && lastSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              {lastSaved}
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-2" disabled={!dirty} onClick={onSave}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled={downloadingPdf} onClick={handleDownloadPdf}>
            {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </Button>
          <Button
            variant={showPreview ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Two column layout when preview is on, single column otherwise */}
      <div className={cn('gap-5', showPreview ? 'grid grid-cols-2' : '')}>
        {/* Editor column */}
        <div className="space-y-5">
          {/* Intro text — WYSIWYG */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Texto introductorio</label>
            </div>
            <div className="p-4">
              <RichTextEditor
                value={q.texto_intro ?? ''}
                onChange={(html) => updateField('texto_intro', html)}
                placeholder="Texto que aparece antes de la tabla de conceptos..."
              />
            </div>
          </div>

          {/* Items table with category grouping */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Items ({q.items.length}) · {itemGroups.length} categoría{itemGroups.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={addCategory}>
                  <FolderPlus className="h-3 w-3" />
                  Categoría
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={addItem}>
                  <Plus className="h-3 w-3" />
                  Fila
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs min-w-[240px]">Concepto</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-16">Cant.</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Precio Unit.</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs w-28">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {itemGroups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                        Sin items — agrega una categoría o conceptos
                      </td>
                    </tr>
                  )}
                  {itemGroups.map((group, gi) => {
                    const catSubtotal = group.items.reduce((s, { item }) => s + item.cantidad * item.precio_unitario, 0)
                    return (
                      <Fragment key={`${gi}-${group.categoria}`}>
                        {/* Category header */}
                        <tr className="bg-primary/5 border-t border-primary/20">
                          <td colSpan={4} className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-4 rounded-full bg-primary" />
                              {editingCatName === group.categoria ? (
                                <input
                                  className="bg-transparent border-b border-primary outline-none text-xs font-bold text-primary uppercase tracking-wider w-40"
                                  value={editCatValue}
                                  onChange={(e) => setEditCatValue(e.target.value.toUpperCase())}
                                  onBlur={() => { renameQuotationCategory(group.categoria, editCatValue.trim()); setEditingCatName(null) }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { renameQuotationCategory(group.categoria, editCatValue.trim()); setEditingCatName(null) } if (e.key === 'Escape') setEditingCatName(null) }}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="text-xs font-bold text-primary uppercase tracking-wider cursor-pointer hover:underline decoration-primary/40"
                                  onClick={() => { setEditingCatName(group.categoria); setEditCatValue(group.categoria) }}
                                >
                                  {group.categoria}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">({group.items.length})</span>
                              <button
                                onClick={() => { setEditingCatName(group.categoria); setEditCatValue(group.categoria) }}
                                className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => addItemToCategory(group.categoria)}
                                className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer"
                                title="Agregar item"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => { setFeeCat(group.categoria); setFeePct(15) }}
                                className="px-1.5 py-0.5 rounded hover:bg-amber-500/10 text-muted-foreground/50 hover:text-amber-600 transition-colors cursor-pointer text-[9px] font-semibold"
                                title="Agregar fee de agencia"
                              >
                                FEE
                              </button>
                            </div>
                          </td>
                          <td className="px-1 py-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar categoría &ldquo;{group.categoria}&rdquo;</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminarán los {group.items.length} items dentro de esta categoría.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteQuotationCategory(group.categoria)}
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                        {/* Items in category */}
                        {group.items.map(({ item, idx }) => (
                          <tr key={idx} className="border-b border-border/30 hover:bg-muted/10 transition-colors group">
                            <td className="px-3 py-1.5 pl-6">
                              <DeferredTextarea
                                className="w-full bg-transparent border-0 outline-none text-sm resize-none min-h-[1.75rem]"
                                value={item.concepto ?? ''}
                                onChange={(v) => updateItem(idx, 'concepto', v)}
                                placeholder="Descripción del concepto"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                className="w-full bg-transparent border-0 outline-none text-right text-sm"
                                value={item.cantidad}
                                min={0}
                                onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <CurrencyInput
                                value={item.precio_unitario}
                                onChange={(v) => updateItem(idx, 'precio_unitario', v)}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground text-sm">
                              {fmtMXN(item.cantidad * item.precio_unitario)}
                            </td>
                            <td className="px-1 py-1.5">
                              <button onClick={() => removeItem(idx)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {/* Category subtotal */}
                        <tr className="border-b border-border/60 bg-muted/5">
                          <td colSpan={3} className="px-3 py-1.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Subtotal {group.categoria}
                          </td>
                          <td className="px-3 py-1.5 text-right text-sm font-bold">
                            {fmtMXN(catSubtotal)}
                          </td>
                          <td />
                        </tr>
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Total footer */}
            <div className="border-t border-border bg-muted/10 px-4 py-3">
              <div className="flex justify-end gap-6 text-base">
                <span className="font-bold">Subtotal</span>
                <span className="font-bold w-28 text-right">{fmtMXN(total)}</span>
              </div>
            </div>
          </div>

          {/* Fee de agencia modal */}
          {feeCat && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setFeeCat(null)} />
              <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-5">
                <h3 className="text-sm font-semibold mb-1">Fee de agencia — {feeCat}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Se calculará sobre el subtotal de la categoría (sin incluir fees previos).
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold text-right outline-none focus:ring-2 focus:ring-primary/20"
                    value={feePct}
                    min={0}
                    max={100}
                    onChange={(e) => setFeePct(Number(e.target.value) || 0)}
                    autoFocus
                  />
                  <span className="text-lg text-muted-foreground">%</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setFeeCat(null)}>Cancelar</Button>
                  <Button size="sm" onClick={() => addAgencyFee(feeCat, feePct)}>Agregar fee</Button>
                </div>
              </div>
            </div>,
            document.body,
          )}

          {/* Catalog images */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div
              role="button"
              onClick={() => setShowCatalog(!showCatalog)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer hover:bg-muted/20 transition-colors select-none"
            >
              {showCatalog ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Image className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Catálogo de imágenes</span>
              {q.imagenes.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{q.imagenes.length}</span>
              )}
              <div className="flex-1" />
              {showCatalog && (
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Por página</span>
                    <input type="number" min={1} max={6} value={q.imagen_rows}
                      onChange={(e) => updateField('imagen_rows', Math.max(1, Math.min(6, Number(e.target.value))))}
                      className="w-8 rounded border border-border bg-background-elevated px-1 py-0.5 text-center text-xs outline-none"
                    />
                  </div>
                  <button type="button" onClick={() => catalogUploadRef.current?.click()} disabled={uploadingCatalog}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingCatalog ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Subir
                  </button>
                  <input ref={catalogUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleCatalogUpload} />
                </div>
              )}
            </div>

            {showCatalog && (
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                {loadingMedia ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando imágenes...
                  </div>
                ) : projectMedia.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg">
                    <Image className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">No hay imágenes en este proyecto.</p>
                    <button type="button" onClick={() => catalogUploadRef.current?.click()} disabled={uploadingCatalog}
                      className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium disabled:opacity-50"
                    >
                      {uploadingCatalog ? 'Subiendo...' : 'Subir imágenes'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-1.5">
                    {projectMedia.map((file) => {
                      const isSelected = q.imagenes.some((c) => c.mediaId === file.id)
                      return (
                        <button key={file.id} type="button" onClick={() => toggleCatalogImage(file)}
                          className={cn(
                            'relative aspect-square rounded-md overflow-hidden border-2 transition-all cursor-pointer',
                            isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'
                          )}
                        >
                          <img src={file.url} alt={file.nombre} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary drop-shadow" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.imagenes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Seleccionadas ({q.imagenes.length})</p>
                    {q.imagenes.map((img) => (
                      <div key={img.mediaId} className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/10 overflow-hidden">
                        {/* Left: Image */}
                        <div className="relative bg-muted/20">
                          <img src={img.url} alt={img.title} className="w-full h-auto" />
                          <button type="button" onClick={() => removeCatalogImage(img.mediaId)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white hover:bg-destructive transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Right: Title + Description */}
                        <div className="py-3 pr-3 flex flex-col gap-2">
                          <input type="text" value={img.title}
                            onChange={(e) => updateCatalogImage(img.mediaId, 'title', e.target.value)}
                            className="w-full text-sm font-semibold rounded border border-border bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Título de la imagen"
                          />
                          <div className="flex-1 min-h-0 overflow-y-auto rounded border border-border bg-background">
                            <RichTextEditor
                              value={img.description}
                              onChange={(html) => updateCatalogImage(img.mediaId, 'description', html)}
                              placeholder="Descripción de la imagen..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Términos y condiciones</label>
            <textarea
              className="w-full bg-transparent border-0 outline-none text-sm resize-none placeholder:text-muted-foreground/40"
              rows={3}
              value={q.texto_terminos ?? ''}
              onChange={(e) => updateField('texto_terminos', e.target.value)}
              placeholder="Términos y condiciones de la cotización..."
            />
          </div>

          {/* Internal notes */}
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Notas internas (no se imprimen)</label>
            <textarea
              className="w-full bg-transparent border-0 outline-none text-sm resize-none placeholder:text-muted-foreground/40"
              rows={2}
              value={q.notas ?? ''}
              onChange={(e) => updateField('notas', e.target.value)}
              placeholder="Notas privadas..."
            />
          </div>
        </div>

        {/* Preview column (only visible when toggled) */}
        {showPreview && (
          <div className="rounded-xl border border-border bg-card overflow-hidden sticky top-4 self-start">
            <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vista previa</span>
            </div>
            <iframe
              ref={iframeRefCallback}
              className="w-full bg-white"
              title="Vista previa de cotización"
              style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

const TIMELINE_EVENT_STYLES: Record<string, { icon: typeof FileText; color: string }> = {
  created: { icon: Plus, color: 'text-emerald-500' },
  status_change: { icon: RefreshCw, color: 'text-blue-500' },
  checklist_update: { icon: CheckCircle2, color: 'text-violet-500' },
  move: { icon: ArrowRight, color: 'text-cyan-500' },
  propuesta: { icon: Presentation, color: 'text-amber-500' },
  costeo: { icon: Boxes, color: 'text-orange-500' },
  cotizacion_created: { icon: Receipt, color: 'text-emerald-500' },
  cotizacion_deleted: { icon: Trash2, color: 'text-red-500' },
  cotizacion_status: { icon: CheckCircle2, color: 'text-blue-500' },
}

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
        {timeline.map((entry) => {
          const style = TIMELINE_EVENT_STYLES[entry.tipo_evento] ?? { icon: FileText, color: 'text-muted-foreground' }
          const Icon = style.icon
          return (
            <div key={entry.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
              <div className={cn('mt-0.5 shrink-0', style.color)}>
                <Icon className="h-4 w-4" />
              </div>
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
          )
        })}
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

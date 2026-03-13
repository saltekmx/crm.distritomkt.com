import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Calendar, Building2, User,
  Activity, FileText, ShoppingCart, FolderOpen, MessageSquare,
  History, Receipt, CreditCard, CheckCircle, Lock, Zap,
  Banknote, Package, Loader2, Presentation, Boxes, Sparkles,
  Plus, Trash2, Save, Printer, GripVertical, ChevronDown,
  ChevronRight, Pencil, FolderPlus, X, Send, Mail, MessageCircle, Download, Upload, FileSpreadsheet,
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
import { projectsApi, proveedoresApi } from '@/services/api'
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
  creado_en: string
}

interface Material {
  categoria: string
  material: string
  cantidad: number
  costo_dmkt_unitario: number
  margen_porcentaje: number
  precio_cliente_unitario: number
  proveedor: string
  status: string
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
  const { id, tab: tabSlug } = useParams<{ id: string; tab?: string }>()
  const navigate = useNavigate()
  const user = useUser()
  const tz = user?.timezone || 'America/Mexico_City'

  const activeTab: TabType = (tabSlug && SLUG_TO_TAB[tabSlug]) || 'overview'
  const setActiveTab = (t: TabType) => {
    const slug = TAB_SLUG[t]
    navigate(t === 'overview' ? `/proyectos/${id}` : `/proyectos/${id}/${slug}`, { replace: true })
  }

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [descExpanded, setDescExpanded] = useState(false)

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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab project={project} timeline={timeline} tz={tz} />
      )}
      {activeTab === 'proposal' && (
        <ProposalTab project={project} onUpdate={setProject} />
      )}
      {activeTab === 'materials' && (
        <MaterialsTab project={project} onUpdate={setProject} />
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
      {activeTab !== 'overview' && activeTab !== 'proposal' && activeTab !== 'materials' && activeTab !== 'files' && activeTab !== 'history' && (
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
  { value: 'pendiente', label: 'Pendiente', bg: '#c4c4c4', text: '#fff' },
  { value: 'cotizado', label: 'Cotizado', bg: '#579bfc', text: '#fff' },
  { value: 'aprobado', label: 'Aprobado', bg: '#00c875', text: '#fff' },
  { value: 'comprado', label: 'Comprado', bg: '#a25ddc', text: '#fff' },
  { value: 'entregado', label: 'Entregado', bg: '#fdab3d', text: '#fff' },
]

const STATUS_COLORS: Record<string, { bg: string; text: string }> = Object.fromEntries(
  MATERIAL_STATUS_OPTIONS.map((o) => [o.value, { bg: o.bg, text: o.text }]),
)

const STATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  cotizado: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  aprobado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  comprado: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  entregado: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
}

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

/** Static row cells — shared by SortableRow and DragOverlay */
function RowCells({
  row, idx, onUpdateRow, onRemoveRow, readOnly, dragHandleProps,
  selected, onToggleSelect,
}: {
  row: Material
  idx: number
  onUpdateRow?: (idx: number, field: keyof Material, value: string | number) => void
  onRemoveRow?: (idx: number) => void
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
          <span className="text-foreground">{row.material}</span>
        ) : (
          <input
            className="w-full bg-transparent border-0 outline-none text-foreground text-sm"
            value={row.material}
            onChange={(e) => onUpdateRow?.(idx, 'material', e.target.value)}
            placeholder="Nombre del material"
          />
        )}
      </td>
      <td className="px-3 py-1.5">
        {readOnly ? (
          <span className="block text-right">{row.cantidad}</span>
        ) : (
          <input type="number" className="w-full bg-transparent border-0 outline-none text-right text-foreground text-sm" value={row.cantidad} min={0} onChange={(e) => onUpdateRow?.(idx, 'cantidad', Number(e.target.value) || 0)} />
        )}
      </td>
      <td className="px-3 py-1.5">
        {readOnly ? <span className="block text-right">{fmtMXN(row.costo_dmkt_unitario)}</span> : <CurrencyInput value={row.costo_dmkt_unitario} onChange={(v) => onUpdateRow?.(idx, 'costo_dmkt_unitario', v)} />}
      </td>
      <td className="px-3 py-1.5 text-right text-muted-foreground print:text-gray-500">{fmtMXN(row.cantidad * row.costo_dmkt_unitario)}</td>
      <td className="px-3 py-1.5">
        {readOnly ? (
          <span className="block text-right">{row.margen_porcentaje ?? 30}%</span>
        ) : (
          <div className="flex items-center justify-end gap-0.5">
            <input type="number" className="w-14 bg-transparent border-0 outline-none text-right text-foreground text-sm" value={row.margen_porcentaje ?? 30} min={0} onChange={(e) => { const pct = Number(e.target.value) || 0; onUpdateRow?.(idx, 'margen_porcentaje', pct); onUpdateRow?.(idx, 'precio_cliente_unitario', Math.round(row.costo_dmkt_unitario * (1 + pct / 100) * 100) / 100) }} />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
        )}
      </td>
      <td className="px-3 py-1.5">
        {readOnly ? <span className="block text-right">{fmtMXN(row.precio_cliente_unitario)}</span> : <CurrencyInput value={row.precio_cliente_unitario} onChange={(v) => onUpdateRow?.(idx, 'precio_cliente_unitario', v)} />}
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
        <td className="px-2 py-1.5 print:hidden">
          <button onClick={() => onRemoveRow?.(idx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </>
  )
}

/** Sortable row — becomes a placeholder when dragging (DragOverlay renders the floating copy) */
function SortableRow({
  id, row, idx, onUpdateRow, onRemoveRow, readOnly,
  selected, onToggleSelect,
}: {
  id: string
  row: Material
  idx: number
  onUpdateRow?: (idx: number, field: keyof Material, value: string | number) => void
  onRemoveRow?: (idx: number) => void
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
      <RowCells row={row} idx={idx} onUpdateRow={onUpdateRow} onRemoveRow={onRemoveRow} readOnly={readOnly} dragHandleProps={{ ...attributes, ...listeners }} selected={selected} onToggleSelect={onToggleSelect} />
    </tr>
  )
}

/** Sortable category header with drag handle */
function SortableCategoryHeader({
  id, group, groups, isCollapsed, catPrecio, colCount, readOnly,
  editingCat, editCatValue,
  onToggleCollapse, onStartEditCat, onEditCatValueChange, onCommitEditCat, onCancelEditCat,
  onDeleteCategory,
  catSelected, onToggleCatSelect,
}: {
  id: string
  group: { categoria: string; items: Array<{ row: Material; idx: number }> }
  groups: Array<{ categoria: string; items: Array<{ row: Material; idx: number }> }>
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
}

function MaterialsTable({
  rows,
  onUpdateRow,
  onRemoveRow,
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
    const draggedId = activeId
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
    <table className="w-full text-sm min-w-[900px]">
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
          <th className="text-left px-3 py-2.5 font-medium text-muted-foreground print:text-gray-600 min-w-[240px]">Material</th>
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
            <Fragment key={`cat-${group.categoria}`}>
              <SortableCategoryHeader
                id={`cat-${gi}`}
                group={group}
                groups={groups}
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
                <SortableRow key={`row-${idx}`} id={`row-${idx}`} row={row} idx={idx} onUpdateRow={onUpdateRow} onRemoveRow={onRemoveRow} readOnly={readOnly} selected={selectedRows?.has(idx)} onToggleSelect={onToggleRow} />
              ))}
              {/* Subtotal */}
              {!isCollapsed && (
                <tr className="bg-muted/20 print:bg-gray-50">
                  <td colSpan={readOnly ? 3 : (hasSelection ? 5 : 4)} className="px-3 py-1.5 text-right text-[11px] text-muted-foreground font-medium">
                    Subtotal {group.categoria}
                  </td>
                  <td className="px-3 py-1.5 text-right text-[11px] text-muted-foreground font-semibold">{fmtMXN(catCosto)}</td>
                  <td />
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
            {fmtMXN(margen)} ({totalPrecioCliente > 0 ? ((margen / totalPrecioCliente) * 100).toFixed(1) : '0'}%)
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

interface SupplierOption {
  id: number
  nombre: string
  email: string | null
  whatsapp: string | null
}

function MaterialsTab({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const [rows, setRows] = useState<Material[]>(project.materiales ?? [])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState<Material[] | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const toggleRow = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }
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

  // "Enviar a proveedor" modal state
  const [showSendModal, setShowSendModal] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)

  const openSendModal = () => {
    setShowSendModal(true)
    setLoadingSuppliers(true)
    proveedoresApi.list({ limit: 100 }).then((res) => {
      const data = res.data as { elementos: SupplierOption[] }
      setSuppliers(data.elementos)
      if (data.elementos.length > 0) setSelectedSupplierId(data.elementos[0].id)
    }).catch(() => setSuppliers([])).finally(() => setLoadingSuppliers(false))
  }

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) ?? null
  const sendIframeRef = useRef<HTMLIFrameElement>(null)

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
        msg += `- ${item.material} (cantidad: ${item.cantidad})\n`
      }
    }
    msg += '\nGracias.'
    return msg
  }

  const buildPdfHtml = () => {
    const { selRows, catMap } = getSelectedCatMap()
    const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    const supplierName = selectedSupplier?.nombre ?? ''
    const supplierContact = selectedSupplier ? [selectedSupplier.email, selectedSupplier.whatsapp].filter(Boolean).join(' | ') : ''

    let tableRows = ''
    let rowNum = 0
    for (const [cat, items] of catMap) {
      tableRows += `<tr class="cat-row"><td colspan="4">${cat}</td></tr>`
      for (const item of items) {
        rowNum++
        tableRows += `<tr><td class="num">${rowNum}</td><td>${item.material}</td><td class="center">${item.cantidad}</td><td class="center">${item.status === 'pendiente' ? '' : item.status}</td></tr>`
      }
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Solicitud de Cotizacion — ${project.nombre}</title>
<style>
  @page { size: letter; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; padding: 40px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #d4af37; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; color: #0f172a; }
  .header h2 { font-size: 13px; color: #64748b; font-weight: 400; margin-top: 2px; }
  .header .logo { height: 36px; }
  .meta { display: flex; gap: 40px; margin-bottom: 20px; font-size: 12px; }
  .meta .col { flex: 1; }
  .meta .label { font-weight: 600; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .meta .value { color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  thead th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  .cat-row td { background: #f1f5f9; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; color: #334155; padding: 8px 10px; }
  .num { text-align: center; color: #94a3b8; width: 40px; }
  .center { text-align: center; }
  .summary { margin-top: 16px; font-size: 11px; color: #64748b; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .notes { margin-top: 24px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; color: #475569; }
  .notes strong { display: block; margin-bottom: 4px; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div>
      <h1>Solicitud de Cotizacion</h1>
      <h2>${project.nombre} — ${project.cliente_nombre ?? ''}</h2>
    </div>
    <img src="/logo-dark.png" class="logo" />
  </div>

  <div class="meta">
    <div class="col">
      <div class="label">Proveedor</div>
      <div class="value">${supplierName}</div>
      ${supplierContact ? `<div class="value" style="font-size:11px;color:#64748b">${supplierContact}</div>` : ''}
    </div>
    <div class="col">
      <div class="label">Fecha</div>
      <div class="value">${today}</div>
    </div>
    <div class="col">
      <div class="label">Proyecto</div>
      <div class="value">${project.nombre}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center">#</th>
        <th>Material / Descripcion</th>
        <th style="width:80px;text-align:center">Cantidad</th>
        <th style="width:100px;text-align:center">Notas</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <p class="summary">${selRows.length} material${selRows.length !== 1 ? 'es' : ''} en ${catMap.size} categoria${catMap.size !== 1 ? 's' : ''}</p>

  <div class="notes">
    <strong>Instrucciones:</strong>
    Favor de enviar cotizacion con precios unitarios, tiempos de entrega y condiciones de pago.
  </div>

  <div class="footer">
    Generado por DistritoMKT CRM — ${today}
  </div>
</body></html>`
  }

  // Write PDF HTML into iframe whenever relevant state changes
  useEffect(() => {
    if (!showSendModal || !sendIframeRef.current) return
    const doc = sendIframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(buildPdfHtml())
    doc.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSendModal, selectedSupplierId, selectedRows])

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handlePrintPdf = () => {
    sendIframeRef.current?.contentWindow?.print()
  }

  const handleDownloadPdf = async () => {
    const iframeDoc = sendIframeRef.current?.contentDocument
    if (!iframeDoc?.body) return
    setDownloadingPdf(true)
    try {
      const supplierSlug = (selectedSupplier?.nombre ?? 'proveedor').replace(/\s+/g, '_').toLowerCase()
      const filename = `solicitud_${supplierSlug}_${project.nombre.replace(/\s+/g, '_').toLowerCase()}.pdf`
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
      }).from(iframeDoc.body).save()
    } catch {
      toast.error('Error al generar PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleWhatsApp = () => {
    if (!selectedSupplier?.whatsapp) return
    const msg = encodeURIComponent(buildMessage())
    window.open(`https://wa.me/${selectedSupplier.whatsapp}?text=${msg}`, '_blank')
    setShowSendModal(false)
  }

  const handleEmail = () => {
    if (!selectedSupplier?.email) return
    const subject = encodeURIComponent(`Cotizacion — ${project.nombre}`)
    const body = encodeURIComponent(buildMessage())
    window.open(`mailto:${selectedSupplier.email}?subject=${subject}&body=${body}`, '_blank')
    setShowSendModal(false)
  }

  // Auto-save: 2 seconds after last change
  const doAutoSave = useCallback(async (data: Material[]) => {
    try {
      await projectsApi.update(project.id, { materiales: data })
      onUpdate({ ...project, materiales: data })
      setDirty(false)
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      // Silent fail — user can still manual save
    }
  }, [project, onUpdate])

  useEffect(() => {
    if (!dirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doAutoSave(rows), 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [rows, dirty, doAutoSave])

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
      if (data.materiales.length > 0) {
        setPreview(data.materiales)
      } else {
        toast.info(data.mensaje || 'No se encontraron materiales en la propuesta')
      }
    } catch {
      toast.error('Error al generar materiales')
    } finally {
      setGenerating(false)
    }
  }

  const handleAcceptPreview = () => {
    if (!preview) return
    setRows(preview)
    setPreview(null)
    setDirty(true)
    toast.success(`${preview.length} materiales importados`)
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
    ws.mergeCells('A5:H5')
    instrRow.getCell(1).value = 'Llena las filas debajo del encabezado. La columna "Estado" acepta: pendiente, cotizado, aprobado, comprado, entregado.'
    instrRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF666666' } }
    instrRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    instrRow.height = 22

    // Header row
    const headers = ['Categoría', 'Material', 'Cantidad', 'Costo Unitario DMKT', 'Margen %', 'Precio Unitario Cliente', 'Proveedor', 'Estado']
    const headerRow = ws.getRow(7)
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a1a' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF333333' } } }
    })
    headerRow.height = 24

    // Example row
    const exRow = ws.getRow(8)
    const exData = ['Impresión', 'Lona impresa 3x2m', 5, 150, 30, 195, 'PrintMax SA', 'pendiente']
    exData.forEach((v, i) => {
      const cell = exRow.getCell(i + 1)
      cell.value = v as string | number
      cell.font = { size: 10, color: { argb: 'FF999999' }, italic: true }
      cell.alignment = { horizontal: i >= 2 && i <= 5 ? 'center' : 'left', vertical: 'middle' }
    })
    exRow.height = 20

    // Column widths
    ws.getColumn(1).width = 18  // Categoría
    ws.getColumn(2).width = 30  // Material
    ws.getColumn(3).width = 12  // Cantidad
    ws.getColumn(4).width = 22  // Costo DMKT
    ws.getColumn(5).width = 12  // Margen
    ws.getColumn(6).width = 24  // Precio Cliente
    ws.getColumn(7).width = 20  // Proveedor
    ws.getColumn(8).width = 16  // Estado

    const buffer = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'template_materiales_dmkt.xlsx')
    toast.success('Template descargado')
  }

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
      ws.eachRow((row, rowNum) => {
        if (rowNum <= 7) return // skip logo + header rows
        const cat = String(row.getCell(1).value ?? '').trim()
        const mat = String(row.getCell(2).value ?? '').trim()
        if (!mat) return // skip empty rows

        const cantidad = Number(row.getCell(3).value) || 0
        const costoUn = Number(row.getCell(4).value) || 0
        const margen = Number(row.getCell(5).value) || 30
        const precioUn = Number(row.getCell(6).value) || Math.round(costoUn * (1 + margen / 100) * 100) / 100
        const proveedor = String(row.getCell(7).value ?? '').trim()
        const status = String(row.getCell(8).value ?? 'pendiente').trim().toLowerCase()

        imported.push({
          categoria: cat || 'General',
          material: mat,
          cantidad,
          costo_dmkt_unitario: costoUn,
          margen_porcentaje: margen,
          precio_cliente_unitario: precioUn,
          proveedor,
          status: ['pendiente', 'cotizado', 'aprobado', 'comprado', 'entregado'].includes(status) ? status : 'pendiente',
        })
      })

      if (imported.length === 0) { toast.error('No se encontraron materiales en el archivo'); return }

      setRows((prev) => [...prev, ...imported])
      setDirty(true)
      toast.success(`${imported.length} materiales importados desde Excel`)
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
        tableRows += `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:6px 8px 6px 24px">${row.material}</td><td style="padding:6px 8px;text-align:right">${row.cantidad}</td><td style="padding:6px 8px;text-align:right">${fmt(row.costo_dmkt_unitario)}</td><td style="padding:6px 8px;text-align:right">${fmt(row.cantidad * row.costo_dmkt_unitario)}</td><td style="padding:6px 8px;text-align:right">${fmt(row.precio_cliente_unitario)}</td><td style="padding:6px 8px;text-align:right">${fmt(row.cantidad * row.precio_cliente_unitario)}</td><td style="padding:6px 8px;text-align:center;font-size:11px">${row.status}</td></tr>`
      }
    }

    win.document.write(`<!DOCTYPE html><html><head><title>Costeo — ${project.nombre}</title><style>body{font-family:Inter,-apple-system,sans-serif;color:#1e293b;margin:40px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8fafc;border-bottom:2px solid #cbd5e1;padding:10px 8px;text-align:left;font-weight:600;color:#475569}td{padding:6px 8px}.logo{height:40px}h1{font-size:18px;margin:0}h2{font-size:14px;color:#64748b;margin:4px 0 0;font-weight:400}@media print{body{margin:20px}}</style></head><body>`)
    win.document.write(`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;border-bottom:2px solid #e2e8f0;padding-bottom:16px"><div><h1>${project.nombre}</h1><h2>${project.cliente_nombre ?? ''} — Costeo de materiales</h2></div><img src="/logo-dark.png" class="logo" /></div>`)
    win.document.write(`<table><thead><tr><th>Material</th><th style="text-align:right">Cant.</th><th style="text-align:right">Costo DMKT Unit.</th><th style="text-align:right">Costo DMKT Total</th><th style="text-align:right">Precio Cliente Unit.</th><th style="text-align:right">Precio Cliente Total</th><th style="text-align:center">Status</th></tr></thead><tbody>${tableRows}</tbody>`)
    win.document.write(`<tfoot><tr style="border-top:2px solid #cbd5e1;background:#f8fafc;font-weight:700"><td colspan="2" style="padding:10px 8px">Totales (${printRows.length} items)</td><td></td><td style="padding:10px 8px;text-align:right">${fmt(totalCosto)}</td><td></td><td style="padding:10px 8px;text-align:right">${fmt(totalPrecio)}</td><td></td></tr>`)
    win.document.write(`<tr style="background:#f8fafc;font-weight:700"><td colspan="4" style="padding:8px">Margen total</td><td></td><td style="padding:8px;text-align:right;color:${margenTotal >= 0 ? '#10b981' : '#ef4444'}">${fmt(margenTotal)} (${totalPrecio > 0 ? ((margenTotal / totalPrecio) * 100).toFixed(1) : '0'}%)</td><td></td></tr></tfoot></table>`)
    win.document.write(`<div style="margin-top:32px;font-size:11px;color:#94a3b8;text-align:center">Generado por DistritoMKT CRM — ${new Date().toLocaleDateString('es-MX')}</div></body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  const handlePrint = () => handlePrintRows(rows)
  const handlePrintSelected = () => handlePrintRows(rows.filter((_, i) => selectedRows.has(i)))

  const updateRow = (idx: number, field: keyof Material, value: string | number) => {
    setRows((prev) => {
      const next = [...prev]
      const row = { ...next[idx], [field]: value }
      if (field === 'costo_dmkt_unitario') {
        const pct = row.margen_porcentaje ?? 30
        row.precio_cliente_unitario = Math.round(Number(value) * (1 + pct / 100) * 100) / 100
      }
      next[idx] = row
      return next
    })
    setDirty(true)
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
    setDirty(true)
  }

  const handleReorder = (newRows: Material[]) => {
    setRows(newRows)
    setDirty(true)
  }

  const addRow = () => {
    const lastCat = rows.length > 0 ? rows[rows.length - 1].categoria : 'GENERAL'
    setRows((prev) => [...prev, { categoria: lastCat, material: '', cantidad: 1, costo_dmkt_unitario: 0, margen_porcentaje: 30, precio_cliente_unitario: 0, proveedor: '', status: 'pendiente' }])
    setDirty(true)
  }

  const addCategory = () => {
    const name = `NUEVA CATEGORÍA ${groupByCategory(rows).length + 1}`
    setRows((prev) => [...prev, { categoria: name, material: '', cantidad: 1, costo_dmkt_unitario: 0, margen_porcentaje: 30, precio_cliente_unitario: 0, proveedor: '', status: 'pendiente' }])
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
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Preview — {preview.length} materiales en {groupByCategory(preview).length} categorías</h3>
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

      {/* "Enviar a proveedor" Modal */}
      {showSendModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSendModal(false)} />
          <div className="relative w-[95vw] max-w-5xl max-h-[90vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
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

            {/* Body: PDF preview + controls */}
            <div className="flex flex-1 min-h-0">
              {/* PDF Preview (left) */}
              <div className="flex-1 bg-muted/30 p-4 min-w-0">
                <iframe
                  ref={sendIframeRef}
                  className="w-full h-full rounded-lg border border-border bg-white shadow-sm"
                  title="Vista previa de solicitud"
                  style={{ minHeight: '400px' }}
                />
              </div>

              {/* Controls (right) */}
              <div className="w-72 shrink-0 border-l border-border p-4 flex flex-col gap-4 overflow-y-auto">
                {/* Supplier selector */}
                <div>
                  <label className="text-sm font-medium">Proveedor</label>
                  {loadingSuppliers ? (
                    <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                    </div>
                  ) : suppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-1.5">No hay proveedores registrados.</p>
                  ) : (
                    <select
                      className="mt-1.5 w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={selectedSupplierId ?? ''}
                      onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Supplier info */}
                {selectedSupplier && (
                  <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/30 border border-border">
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {selectedSupplier.email}
                      </div>
                    )}
                    {selectedSupplier.whatsapp && (
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="h-3 w-3" /> {selectedSupplier.whatsapp}
                      </div>
                    )}
                    {!selectedSupplier.email && !selectedSupplier.whatsapp && (
                      <span>Sin datos de contacto</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border">
                  <Button
                    className="gap-2 w-full justify-center"
                    disabled={downloadingPdf}
                    onClick={handleDownloadPdf}
                  >
                    {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Descargar PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 w-full justify-center"
                    onClick={handlePrintPdf}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 w-full justify-center"
                    disabled={!selectedSupplier?.email}
                    onClick={handleEmail}
                  >
                    <Mail className="h-4 w-4" />
                    Enviar por Email
                  </Button>
                  <Button
                    className="gap-2 w-full justify-center"
                    disabled={!selectedSupplier?.whatsapp}
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar por WhatsApp
                  </Button>
                  <Button variant="ghost" className="w-full justify-center" onClick={() => setShowSendModal(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Actions bar */}
      {!preview && (
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
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
              Agregar fila
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={addCategory}>
              <FolderPlus className="h-4 w-4" />
              Agregar categoría
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4" />
              Descargar template
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => importFileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportXlsx} />
            {rows.length > 0 && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Eliminar todo
                    </Button>
                  </AlertDialogTrigger>
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
                <div className="h-5 w-px bg-border" />
                <Button variant="ghost" size="sm" className="gap-2" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </>
            )}
            {/* Selection toolbar */}
            {selectedRows.size > 0 && (
              <>
                <div className="h-5 w-px bg-border" />
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {selectedRows.size} seleccionado{selectedRows.size !== 1 ? 's' : ''}
                </span>
                <Button variant="outline" size="sm" className="gap-2" onClick={openSendModal}>
                  <Send className="h-4 w-4" />
                  Enviar a proveedor
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handlePrintSelected}>
                  <Printer className="h-4 w-4" />
                  Imprimir seleccion
                </Button>
              </>
            )}
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

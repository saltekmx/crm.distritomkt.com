// --- Project categories (hierarchical) ---

export interface ProjectSubcategory {
  value: string
  label: string
}

export interface ProjectCategory {
  value: string
  label: string
  subcategories: ProjectSubcategory[]
}

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    value: 'experiencias',
    label: 'Experiencias',
    subcategories: [
      { value: 'activacion_evento', label: 'Activación / Evento' },
      { value: 'stand_display_escenografia', label: 'Stand / Display / Escenografía' },
      { value: 'staff_talento_operacion', label: 'Staff / Talento / Operación on-site' },
    ],
  },
  {
    value: 'materiales',
    label: 'Materiales',
    subcategories: [
      { value: 'kits_giveaways', label: 'Kits & Giveaways' },
      { value: 'pop_impresos_senalizacion', label: 'POP / Impresos / Señalización' },
      { value: 'compra_materiales', label: 'Compra de materiales solicitados' },
      { value: 'produccion_especial', label: 'Producción especial (fabricación a medida)' },
    ],
  },
  {
    value: 'servicios',
    label: 'Servicios',
    subcategories: [
      { value: 'creatividad_concepto', label: 'Creatividad & Concepto' },
      { value: 'diseno', label: 'Diseño' },
      { value: 'produccion_audiovisual', label: 'Producción audiovisual' },
      { value: 'digital', label: 'Digital' },
      { value: 'operacion_logistica', label: 'Operación & Logística' },
    ],
  },
  {
    value: 'pago_terceros',
    label: 'Pago a terceros',
    subcategories: [],
  },
]

/** Flat list of category values for selects/filters */
export const PROJECT_TYPES = PROJECT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))

export function getCategory(value: string) {
  return PROJECT_CATEGORIES.find((c) => c.value === value)
}

export function getSubcategory(categoryValue: string, subcategoryValue: string) {
  const cat = getCategory(categoryValue)
  return cat?.subcategories.find((s) => s.value === subcategoryValue)
}

export function getProjectTypeLabel(tipo: string, subcategoria?: string | null): string {
  const cat = getCategory(tipo)
  if (!cat) return tipo
  if (subcategoria) {
    const sub = cat.subcategories.find((s) => s.value === subcategoria)
    return sub ? `${cat.label} — ${sub.label}` : cat.label
  }
  return cat.label
}

// --- Statuses ---

export const OPERATIVE_STATUSES = [
  { value: 'solicitud', label: 'Solicitud', color: 'gray' },
  { value: 'propuesta', label: 'Propuesta', color: 'blue' },
  { value: 'cotizado', label: 'Cotizado', color: 'yellow' },
  { value: 'aprobado', label: 'Aprobado', color: 'orange' },
  { value: 'en_proceso', label: 'En Proceso', color: 'purple' },
  { value: 'entregado', label: 'Entregado', color: 'emerald' },
  { value: 'cerrado', label: 'Cerrado', color: 'slate' },
] as const

export const ADMIN_STATUSES = [
  { value: 'por_facturar', label: 'Por Facturar', color: 'gray' },
  { value: 'facturado', label: 'Facturado', color: 'blue' },
  { value: 'pago_parcial', label: 'Pago Parcial', color: 'yellow' },
  { value: 'cobrado', label: 'Cobrado', color: 'emerald' },
  { value: 'cerrado', label: 'Cerrado', color: 'slate' },
] as const

export const URGENCY_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
] as const

export function getOperativeStatus(value: string) {
  return OPERATIVE_STATUSES.find((s) => s.value === value)
}

export function getAdminStatus(value: string) {
  return ADMIN_STATUSES.find((s) => s.value === value)
}

export function getProjectType(value: string) {
  return PROJECT_TYPES.find((t) => t.value === value)
}

export function getUrgency(value: string) {
  return URGENCY_OPTIONS.find((u) => u.value === value)
}

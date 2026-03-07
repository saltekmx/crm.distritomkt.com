import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAiFill } from '@/hooks/useAiFill'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderKanban, Pencil, Loader2, ArrowLeft, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { projectsApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PROJECT_CATEGORIES, getCategory } from '@/lib/projects'
import { ClientCombobox } from '@/components/ClientCombobox'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.string().min(1, 'La categoría es requerida'),
  subcategoria: z.string().optional(),
  cliente_id: z.coerce.number({ message: 'El cliente es requerido' }).min(1, 'El cliente es requerido'),
  fecha_inicio: z.string().optional(),
  fecha_entrega: z.string().optional(),
  notas: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectState {
  id: number
  nombre: string
  tipo: string
  subcategoria: string | null
  cliente_id: number
  fecha_inicio: string | null
  fecha_entrega: string | null
  notas: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)
  const projectFromState = location.state as ProjectState | null

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      nombre: projectFromState?.nombre ?? '',
      tipo: projectFromState?.tipo ?? '',
      subcategoria: projectFromState?.subcategoria ?? '',
      cliente_id: projectFromState?.cliente_id ?? ('' as unknown as number),
      fecha_inicio: projectFromState?.fecha_inicio?.slice(0, 10) ?? '',
      fecha_entrega: projectFromState?.fecha_entrega?.slice(0, 10) ?? '',
      notas: projectFromState?.notas ?? '',
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form
  useAiFill(form)

  const tipoValue = watch('tipo')
  const subcategoriaValue = watch('subcategoria')
  const clienteValue = watch('cliente_id')

  // Get subcategories for the selected category
  const selectedCategory = getCategory(tipoValue)
  const subcategories = selectedCategory?.subcategories ?? []
  const hasSubcategories = subcategories.length > 0

  // Clear subcategoria when tipo changes and it's no longer valid
  const prevTipoRef = useRef(tipoValue)
  useEffect(() => {
    if (prevTipoRef.current === tipoValue) return
    prevTipoRef.current = tipoValue
    setValue('subcategoria', '')
  }, [tipoValue, setValue])

  // Load project from API if editing without state
  useEffect(() => {
    if (!isEdit || projectFromState) return
    setLoading(true)
    projectsApi
      .get(id!)
      .then((res) => {
        const p = res.data as ProjectState
        setValue('nombre', p.nombre ?? '')
        setValue('tipo', p.tipo ?? '')
        setValue('subcategoria', p.subcategoria ?? '')
        setValue('cliente_id', p.cliente_id ?? ('' as unknown as number))
        setValue('fecha_inicio', p.fecha_inicio?.slice(0, 10) ?? '')
        setValue('fecha_entrega', p.fecha_entrega?.slice(0, 10) ?? '')
        setValue('notas', p.notas ?? '')
      })
      .catch(() => {
        toast.error('Proyecto no encontrado')
        navigate(ROUTES.PROJECTS)
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, projectFromState, setValue, navigate])

  const onSubmit = async (data: ProjectFormData) => {
    setSubmitting(true)
    const payload = {
      nombre: data.nombre,
      tipo: data.tipo,
      subcategoria: data.subcategoria || null,
      cliente_id: data.cliente_id,
      fecha_inicio: data.fecha_inicio || undefined,
      fecha_entrega: data.fecha_entrega || undefined,
      notas: data.notas || undefined,
    }
    try {
      if (isEdit && id) {
        await projectsApi.update(id, payload)
        toast.success('Proyecto actualizado')
        navigate(ROUTES.PROJECTS)
      } else {
        const res = await projectsApi.create(payload)
        toast.success('Proyecto creado')
        navigate(ROUTES.PROJECTS_DETAIL(res.data.id))
      }
    } catch {
      // toast handled by global interceptor
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Proyectos', href: ROUTES.PROJECTS },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
        title={isEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        icon={isEdit ? <Pencil className="h-5 w-5" /> : <FolderKanban className="h-5 w-5" />}
      />

      <div className="card-modern">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Info General */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Información del Proyecto</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del proyecto *</Label>
              <Input
                id="nombre"
                placeholder="Ej. Activación Marca X — Plaza Reforma"
                autoFocus={!isEdit}
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <ClientCombobox
                  value={clienteValue}
                  onChange={(val) => setValue('cliente_id', val as number, { shouldValidate: true })}
                  error={errors.cliente_id?.message}
                />
                {errors.cliente_id && (
                  <p className="text-xs text-destructive">{errors.cliente_id.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select
                  value={tipoValue}
                  onValueChange={(val) => setValue('tipo', val, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-xs text-destructive">{errors.tipo.message}</p>
                )}
              </div>
            </div>

            {/* Subcategory — only shown when selected category has subcategories */}
            {hasSubcategories && (
              <div className="space-y-2">
                <Label>Subcategoría</Label>
                <Select
                  value={subcategoriaValue || ''}
                  onValueChange={(val) => setValue('subcategoria', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar subcategoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  {...register('fecha_inicio')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_entrega">Fecha de entrega</Label>
                <Input
                  id="fecha_entrega"
                  type="date"
                  {...register('fecha_entrega')}
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Descripción del Proyecto</h3>
            </div>
            <Textarea
              id="notas"
              placeholder="Descripción general del proyecto..."
              rows={4}
              {...register('notas')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border/30 p-5 px-6">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(ROUTES.PROJECTS)}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

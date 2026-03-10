import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAiFill } from '@/hooks/useAiFill'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderKanban, Pencil, Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { projectsApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { ClientCombobox } from '@/components/ClientCombobox'
import { CategoryPicker } from '@/components/CategoryPicker'
import { RichTextEditor } from '@/components/RichTextEditor'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const projectSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.string().min(1, 'La categoría es requerida'),
  subcategoria: z.string().optional(),
  cliente_id: z.number().min(1, 'El cliente es requerido'),
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
      cliente_id: projectFromState?.cliente_id ?? (0),
      fecha_entrega: projectFromState?.fecha_entrega?.slice(0, 10) ?? '',
      notas: projectFromState?.notas ?? '',
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form
  useAiFill(form)

  const clienteValue = watch('cliente_id')
  const tipoValue = watch('tipo')
  const subcategoriaValue = watch('subcategoria')

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
        setValue('cliente_id', p.cliente_id ?? (0))
        // fecha_inicio removed from form
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
          <div className="p-6 space-y-5">
            {/* Row 1: Nombre (full width) */}
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

            {/* Row 2: Cliente + Categoría + Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                <CategoryPicker
                  tipo={tipoValue}
                  subcategoria={subcategoriaValue ?? ''}
                  onSelect={(tipo, sub) => {
                    setValue('tipo', tipo, { shouldValidate: true })
                    setValue('subcategoria', sub)
                  }}
                  error={errors.tipo?.message}
                />
                {errors.tipo && (
                  <p className="text-xs text-destructive">{errors.tipo.message}</p>
                )}
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

            {/* Descripción del proyecto */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="notas">Descripción del proyecto</Label>
                <button
                  type="button"
                  onClick={() => {
                    const vals = form.getValues()
                    const parts = ['Ayúdame a generar la descripción de este proyecto']
                    if (vals.nombre) parts.push(`Nombre: ${vals.nombre}`)
                    window.dispatchEvent(new CustomEvent('ai:open', { detail: { message: parts.join('. ') } }))
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generar con AI
                </button>
              </div>
              <RichTextEditor
                value={watch('notas') ?? ''}
                onChange={(html) => setValue('notas', html, { shouldDirty: true })}
                placeholder="¿De qué trata el proyecto? Puedes escribir libremente o usar el asistente AI para generar una descripción estructurada."
              />
            </div>
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

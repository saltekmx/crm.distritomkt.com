import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Truck, Pencil, Loader2, ArrowLeft, Building2, FileText, Save } from 'lucide-react'
import { toast } from 'sonner'
import { proveedoresApi, supplierBillingApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { INDUSTRIAS } from '@/lib/industrias'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BillingEntitiesSection } from '@/components/billing/BillingEntitiesSection'
import { SupplierContactsSection } from '@/components/contacts/SupplierContactsSection'

// ---------------------------------------------------------------------------
// Schema — same as clients: nombre, industria, notas
// ---------------------------------------------------------------------------

const supplierSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  industria: z.string().optional(),
  industria_otro: z.string().optional(),
  notas: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierState {
  id: number
  nombre: string
  industria?: string | null
  notas: string | null
}

const toUpper = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.value = e.target.value.toUpperCase()
}

function resolveIndustria(value: string | null | undefined): { industria: string; industria_otro: string } {
  if (!value) return { industria: '', industria_otro: '' }
  const upper = value.toUpperCase()
  if (INDUSTRIAS.includes(upper as typeof INDUSTRIAS[number])) {
    return { industria: upper, industria_otro: '' }
  }
  return { industria: 'OTRO', industria_otro: upper }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProveedorFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const supplierFromState = location.state as SupplierState | null

  const { industria: initIndustria, industria_otro: initIndustriaOtro } = resolveIndustria(supplierFromState?.industria)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nombre: supplierFromState?.nombre?.toUpperCase() ?? '',
      industria: initIndustria,
      industria_otro: initIndustriaOtro,
      notas: supplierFromState?.notas ?? '',
    },
  })

  const industriaValue = watch('industria')

  useEffect(() => {
    if (!isEditing) return
    if (supplierFromState) return

    setLoading(true)
    proveedoresApi
      .get(id!)
      .then((res) => {
        const s = res.data as SupplierState
        const { industria, industria_otro } = resolveIndustria(s.industria)
        reset({
          nombre: s.nombre?.toUpperCase() ?? '',
          industria,
          industria_otro,
          notas: s.notas ?? '',
        })
      })
      .catch(() => {
        toast.error('Proveedor no encontrado')
        navigate(ROUTES.SUPPLIERS)
      })
      .finally(() => setLoading(false))
  }, [id, isEditing, supplierFromState, navigate, reset])

  const onSubmit = async (data: SupplierFormData) => {
    setSubmitting(true)
    const finalIndustria = data.industria === 'OTRO'
      ? (data.industria_otro?.toUpperCase() || undefined)
      : (data.industria || undefined)
    const payload = {
      nombre: data.nombre.toUpperCase(),
      industria: finalIndustria,
      notas: data.notas || undefined,
    }
    try {
      if (isEditing) {
        await proveedoresApi.update(id!, payload)
        toast.success('Proveedor actualizado')
      } else {
        const res = await proveedoresApi.create(payload)
        toast.success('Proveedor creado')
        const created = res.data as { id: number }
        navigate(`/proveedores/${created.id}`, { replace: true })
        return
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
          { label: 'Proveedores', href: ROUTES.SUPPLIERS },
          { label: isEditing ? 'Editar' : 'Nuevo' },
        ]}
        title={isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        icon={isEditing ? <Pencil className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        actions={
          <Button variant="ghost" className="gap-2" onClick={() => navigate(ROUTES.SUPPLIERS)}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        }
      />

      {/* General info */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Información General</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="NOMBRE DEL PROVEEDOR"
                  className={`uppercase ${errors.nombre ? 'border-destructive' : ''}`}
                  {...register('nombre', { onChange: toUpper })}
                />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Industria</Label>
                <Select
                  value={industriaValue || '_none'}
                  onValueChange={(val) => {
                    setValue('industria', val === '_none' ? '' : val, { shouldDirty: true })
                    if (val !== 'OTRO') setValue('industria_otro', '')
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar industria..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin industria</SelectItem>
                    {INDUSTRIAS.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
                {industriaValue === 'OTRO' && (
                  <Input placeholder="Especificar..." className="mt-1.5 uppercase" {...register('industria_otro', { onChange: toUpper })} />
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-border/30 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notas</h3>
            </div>
            <Textarea
              placeholder="Notas generales sobre el proveedor..."
              rows={3}
              {...register('notas')}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end border-t border-border/30 px-5 py-3">
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? 'Guardar' : 'Crear Proveedor'}
            </Button>
          </div>
        </form>
      </div>

      {/* Billing & Contacts — only when editing */}
      {isEditing && id && (
        <>
          <BillingEntitiesSection parentId={id} apiService={supplierBillingApi} />
          <SupplierContactsSection supplierId={id} />
        </>
      )}
    </div>
  )
}

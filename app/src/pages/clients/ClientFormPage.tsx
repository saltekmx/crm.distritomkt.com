import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Pencil, Loader2, ArrowLeft, Receipt, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  razon_social: z.string().optional(),
  rfc: z.string().optional(),
  regimen_fiscal: z.string().optional(),
  direccion_fiscal: z.string().optional(),
  industria: z.string().optional(),
  notas: z.string().optional(),
  dias_pago: z.coerce.number().min(0).default(30),
  portal_facturas: z.string().optional(),
  requiere_oc: z.boolean().default(false),
  notas_facturacion: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientState {
  id: string
  nombre: string
  razon_social: string | null
  rfc: string | null
  regimen_fiscal: string | null
  direccion_fiscal: string | null
  industria: string | null
  notas: string | null
  dias_pago: number
  portal_facturas: string | null
  requiere_oc: boolean
  notas_facturacion: string | null
  eliminado_en: string | null
  creado_en: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const clientFromState = location.state as ClientState | null

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nombre: clientFromState?.nombre ?? '',
      razon_social: clientFromState?.razon_social ?? '',
      rfc: clientFromState?.rfc ?? '',
      regimen_fiscal: clientFromState?.regimen_fiscal ?? '',
      direccion_fiscal: clientFromState?.direccion_fiscal ?? '',
      industria: clientFromState?.industria ?? '',
      notas: clientFromState?.notas ?? '',
      dias_pago: clientFromState?.dias_pago ?? 30,
      portal_facturas: clientFromState?.portal_facturas ?? '',
      requiere_oc: clientFromState?.requiere_oc ?? false,
      notas_facturacion: clientFromState?.notas_facturacion ?? '',
    },
  })

  const requiereOc = watch('requiere_oc')

  useEffect(() => {
    if (!isEdit || clientFromState) return
    setLoading(true)
    clientsApi
      .get(id!)
      .then((res) => {
        const c = res.data as ClientState
        setValue('nombre', c.nombre)
        setValue('razon_social', c.razon_social ?? '')
        setValue('rfc', c.rfc ?? '')
        setValue('regimen_fiscal', c.regimen_fiscal ?? '')
        setValue('direccion_fiscal', c.direccion_fiscal ?? '')
        setValue('industria', c.industria ?? '')
        setValue('notas', c.notas ?? '')
        setValue('dias_pago', c.dias_pago)
        setValue('portal_facturas', c.portal_facturas ?? '')
        setValue('requiere_oc', c.requiere_oc ?? false)
        setValue('notas_facturacion', c.notas_facturacion ?? '')
      })
      .catch(() => {
        toast.error('Cliente no encontrado')
        navigate(ROUTES.CLIENTS)
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, clientFromState, setValue, navigate])

  const onSubmit = async (data: ClientFormData) => {
    setSubmitting(true)
    // Clean empty strings to undefined
    const payload = {
      nombre: data.nombre,
      razon_social: data.razon_social || undefined,
      rfc: data.rfc || undefined,
      regimen_fiscal: data.regimen_fiscal || undefined,
      direccion_fiscal: data.direccion_fiscal || undefined,
      industria: data.industria || undefined,
      notas: data.notas || undefined,
      dias_pago: data.dias_pago,
      portal_facturas: data.portal_facturas || undefined,
      requiere_oc: data.requiere_oc,
      notas_facturacion: data.notas_facturacion || undefined,
    }
    try {
      if (isEdit && id) {
        await clientsApi.update(id, payload)
        toast.success('Cliente actualizado')
        navigate(ROUTES.CLIENTS)
      } else {
        const res = await clientsApi.create(payload)
        toast.success('Cliente creado')
        navigate(ROUTES.CLIENTS_EDIT(res.data.id))
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
          { label: 'Clientes', href: ROUTES.CLIENTS },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
        title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        icon={isEdit ? <Pencil className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
      />

      <div className="card-modern">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Info General */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Informacion General</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. Empresa ABC"
                  autoFocus={!isEdit}
                  {...register('nombre')}
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="razon_social">Razon social</Label>
                <Input
                  id="razon_social"
                  placeholder="Ej. Empresa ABC S.A. de C.V."
                  {...register('razon_social')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  placeholder="Ej. EAB123456XX0"
                  {...register('rfc')}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industria">Industria</Label>
                <Input
                  id="industria"
                  placeholder="Ej. Tecnologia, Alimentos, Retail..."
                  {...register('industria')}
                />
              </div>
            </div>
          </div>

          {/* Facturacion */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Facturacion</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="regimen_fiscal">Regimen fiscal</Label>
                <Input
                  id="regimen_fiscal"
                  placeholder="Ej. 601 - General de Ley"
                  {...register('regimen_fiscal')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion_fiscal">Direccion fiscal</Label>
                <Input
                  id="direccion_fiscal"
                  placeholder="Direccion completa"
                  {...register('direccion_fiscal')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dias_pago">Dias de pago</Label>
                <Input
                  id="dias_pago"
                  type="number"
                  min={0}
                  {...register('dias_pago')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal_facturas">Portal de facturas</Label>
                <Input
                  id="portal_facturas"
                  placeholder="URL del portal"
                  {...register('portal_facturas')}
                />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch
                  checked={requiereOc}
                  onCheckedChange={(checked) => setValue('requiere_oc', checked, { shouldDirty: true })}
                />
                <Label htmlFor="requiere_oc" className="cursor-pointer">
                  Requiere orden de compra
                </Label>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notas_facturacion">Notas de facturacion</Label>
                <Textarea
                  id="notas_facturacion"
                  placeholder="Instrucciones especiales para facturacion..."
                  rows={3}
                  {...register('notas_facturacion')}
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Notas</h3>
            </div>
            <div className="space-y-2">
              <Textarea
                id="notas"
                placeholder="Notas generales sobre el cliente..."
                rows={4}
                {...register('notas')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border/30 p-5 px-6">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(ROUTES.CLIENTS)}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

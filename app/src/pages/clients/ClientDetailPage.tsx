import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Loader2, ArrowLeft, Building2, FileText, Save } from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi, clientBillingApi } from '@/services/api'
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
import ClientContactsSection from './ClientContactsSection'
import { BillingEntitiesSection } from '@/components/billing/BillingEntitiesSection'

// ---------------------------------------------------------------------------
// Schema — simplified (billing/address moved to BillingEntitiesSection)
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  nombre: z.string().min(1, 'El nombre comercial es requerido'),
  industria: z.string().optional(),
  industria_otro: z.string().optional(),
  notas: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientState {
  id: number
  nombre: string
  industria: string | null
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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const clientFromState = location.state as ClientState | null
  const [clientName, setClientName] = useState(clientFromState?.nombre ?? '')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { industria: initIndustria, industria_otro: initIndustriaOtro } = resolveIndustria(clientFromState?.industria)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nombre: clientFromState?.nombre?.toUpperCase() ?? '',
      industria: initIndustria,
      industria_otro: initIndustriaOtro,
      notas: clientFromState?.notas ?? '',
    },
  })

  const industriaValue = watch('industria')

  useEffect(() => {
    if (clientFromState) return
    setLoading(true)
    clientsApi
      .get(id!)
      .then((res) => {
        const c = res.data as ClientState
        setClientName(c.nombre)
        setValue('nombre', c.nombre?.toUpperCase() ?? '')
        const { industria, industria_otro } = resolveIndustria(c.industria)
        setValue('industria', industria)
        setValue('industria_otro', industria_otro)
        setValue('notas', c.notas ?? '')
      })
      .catch(() => {
        toast.error('Cliente no encontrado')
        navigate(ROUTES.CLIENTS)
      })
      .finally(() => setLoading(false))
  }, [id, clientFromState, setValue, navigate])

  const onSubmit = async (data: ClientFormData) => {
    setSubmitting(true)
    const finalIndustria = data.industria === 'OTRO'
      ? (data.industria_otro?.toUpperCase() || undefined)
      : (data.industria || undefined)
    try {
      await clientsApi.update(id!, {
        nombre: data.nombre.toUpperCase(),
        industria: finalIndustria,
        notas: data.notas || undefined,
      })
      toast.success('Cliente actualizado')
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
          { label: clientName || 'Detalle' },
        ]}
        title={clientName || 'Detalle del Cliente'}
        icon={<Pencil className="h-5 w-5" />}
        actions={
          <Button variant="ghost" className="gap-2" onClick={() => navigate(ROUTES.CLIENTS)}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        }
      />

      {/* Client general info */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Información General</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre comercial *</Label>
                <Input
                  id="nombre"
                  placeholder="EMPRESA ABC"
                  className="uppercase"
                  {...register('nombre', { onChange: toUpper })}
                />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industria">Industria</Label>
                <Select
                  value={industriaValue}
                  onValueChange={(val) => {
                    setValue('industria', val, { shouldDirty: true })
                    if (val !== 'OTRO') setValue('industria_otro', '')
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
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
              placeholder="Notas generales sobre el cliente..."
              rows={3}
              {...register('notas')}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end border-t border-border/30 px-5 py-3">
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </form>
      </div>

      {/* Billing Entities — add/edit/delete via modal with CIF parser */}
      <BillingEntitiesSection parentId={id!} apiService={clientBillingApi} />

      {/* Contacts — add/edit/delete via modal */}
      <ClientContactsSection clientId={id!} />
    </div>
  )
}

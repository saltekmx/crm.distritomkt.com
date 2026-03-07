import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAiFill } from '@/hooks/useAiFill'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Pencil, Loader2, ArrowLeft, Receipt, FileText, Upload, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { clientsApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { INDUSTRIAS } from '@/lib/industrias'
import { parseCifPdf } from '@/lib/cif-parser'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  nombre: z.string().min(1, 'El nombre comercial es requerido'),
  razon_social: z.string().optional(),
  rfc: z.string().optional(),
  regimen_fiscal: z.string().optional(),
  industria: z.string().optional(),
  industria_otro: z.string().optional(),
  notas: z.string().optional(),
  // Address
  calle: z.string().optional(),
  numero_exterior: z.string().optional(),
  numero_interior: z.string().optional(),
  colonia: z.string().optional(),
  codigo_postal: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  // Billing
  dias_pago: z.number().min(0),
  portal_facturas: z.string().optional(),
  requiere_oc: z.boolean(),
  notas_facturacion: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientState {
  id: number
  nombre: string
  razon_social: string | null
  rfc: string | null
  regimen_fiscal: string | null
  industria: string | null
  notas: string | null
  calle: string | null
  numero_exterior: string | null
  numero_interior: string | null
  colonia: string | null
  codigo_postal: string | null
  ciudad: string | null
  estado: string | null
  dias_pago: number
  portal_facturas: string | null
  requiere_oc: boolean
  notas_facturacion: string | null
  eliminado_en: string | null
  creado_en: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export default function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const clientFromState = location.state as ClientState | null

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [parsingCif, setParsingCif] = useState(false)
  const cifInputRef = useRef<HTMLInputElement>(null)

  const { industria: initIndustria, industria_otro: initIndustriaOtro } = resolveIndustria(clientFromState?.industria)

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nombre: clientFromState?.nombre?.toUpperCase() ?? '',
      razon_social: clientFromState?.razon_social?.toUpperCase() ?? '',
      rfc: clientFromState?.rfc?.toUpperCase() ?? '',
      regimen_fiscal: clientFromState?.regimen_fiscal ?? '',
      industria: initIndustria,
      industria_otro: initIndustriaOtro,
      notas: clientFromState?.notas ?? '',
      calle: clientFromState?.calle ?? '',
      numero_exterior: clientFromState?.numero_exterior ?? '',
      numero_interior: clientFromState?.numero_interior ?? '',
      colonia: clientFromState?.colonia ?? '',
      codigo_postal: clientFromState?.codigo_postal ?? '',
      ciudad: clientFromState?.ciudad ?? '',
      estado: clientFromState?.estado ?? '',
      dias_pago: clientFromState?.dias_pago ?? 30,
      portal_facturas: clientFromState?.portal_facturas ?? '',
      requiere_oc: clientFromState?.requiere_oc ?? false,
      notas_facturacion: clientFromState?.notas_facturacion ?? '',
    },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form
  useAiFill(form)

  const requiereOc = watch('requiere_oc')
  const industriaValue = watch('industria')

  useEffect(() => {
    if (!isEdit || clientFromState) return
    setLoading(true)
    clientsApi
      .get(id!)
      .then((res) => {
        const c = res.data as ClientState
        setValue('nombre', c.nombre?.toUpperCase() ?? '')
        setValue('razon_social', c.razon_social?.toUpperCase() ?? '')
        setValue('rfc', c.rfc?.toUpperCase() ?? '')
        setValue('regimen_fiscal', c.regimen_fiscal ?? '')
        const { industria, industria_otro } = resolveIndustria(c.industria)
        setValue('industria', industria)
        setValue('industria_otro', industria_otro)
        setValue('notas', c.notas ?? '')
        setValue('calle', c.calle ?? '')
        setValue('numero_exterior', c.numero_exterior ?? '')
        setValue('numero_interior', c.numero_interior ?? '')
        setValue('colonia', c.colonia ?? '')
        setValue('codigo_postal', c.codigo_postal ?? '')
        setValue('ciudad', c.ciudad ?? '')
        setValue('estado', c.estado ?? '')
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

  const handleCifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF')
      return
    }
    setParsingCif(true)
    try {
      const data = await parseCifPdf(file)
      if (!data.rfc) {
        toast.error('No se encontraron datos de CIF en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.')
        return
      }
      setValue('rfc', data.rfc)
      if (data.razon_social) setValue('razon_social', data.razon_social)
      if (data.nombre_comercial) setValue('nombre', data.nombre_comercial)
      if (data.regimen_fiscal) setValue('regimen_fiscal', data.regimen_fiscal)
      if (data.calle) setValue('calle', data.calle)
      if (data.numero_exterior) setValue('numero_exterior', data.numero_exterior)
      if (data.numero_interior) setValue('numero_interior', data.numero_interior)
      if (data.colonia) setValue('colonia', data.colonia)
      if (data.codigo_postal) setValue('codigo_postal', data.codigo_postal)
      if (data.ciudad) setValue('ciudad', data.ciudad)
      if (data.estado) setValue('estado', data.estado)
      toast.success('Datos del CIF extraídos correctamente')
    } catch {
      toast.error('No se encontraron datos de CIF en el PDF. Verifica que sea una Constancia de Situación Fiscal válida.')
    } finally {
      setParsingCif(false)
      if (cifInputRef.current) cifInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: ClientFormData) => {
    setSubmitting(true)
    const finalIndustria = data.industria === 'OTRO'
      ? (data.industria_otro?.toUpperCase() || undefined)
      : (data.industria || undefined)
    const payload = {
      nombre: data.nombre.toUpperCase(),
      razon_social: data.razon_social?.toUpperCase() || undefined,
      rfc: data.rfc?.toUpperCase() || undefined,
      regimen_fiscal: data.regimen_fiscal || undefined,
      industria: finalIndustria,
      notas: data.notas || undefined,
      calle: data.calle || undefined,
      numero_exterior: data.numero_exterior || undefined,
      numero_interior: data.numero_interior || undefined,
      colonia: data.colonia || undefined,
      codigo_postal: data.codigo_postal || undefined,
      ciudad: data.ciudad || undefined,
      estado: data.estado || undefined,
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
              <h3 className="text-sm font-semibold">Información General</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre comercial *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej. EMPRESA ABC"
                  autoFocus={!isEdit}
                  className="uppercase"
                  {...register('nombre', { onChange: toUpper })}
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="industria">Industria</Label>
                <Select
                  value={industriaValue}
                  onValueChange={(val) => {
                    setValue('industria', val, { shouldDirty: true })
                    if (val !== 'OTRO') setValue('industria_otro', '')
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar industria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIAS.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {industriaValue === 'OTRO' && (
                  <Input
                    id="industria_otro"
                    placeholder="Especificar industria..."
                    className="mt-2 uppercase"
                    {...register('industria_otro', { onChange: toUpper })}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dias_pago">Días de pago</Label>
                <Input
                  id="dias_pago"
                  type="number"
                  min={0}
                  {...register('dias_pago', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Facturacion */}
          <div className="border-t border-border/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold">Facturación</h3>
              </div>
              <div>
                <input
                  ref={cifInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleCifUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={parsingCif}
                  onClick={() => cifInputRef.current?.click()}
                >
                  {parsingCif ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {parsingCif ? 'Extrayendo datos...' : 'Cargar CIF (PDF)'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Sube la Constancia de Situación Fiscal (CIF) en PDF para llenar automáticamente los datos fiscales.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  placeholder="Ej. EAB123456XX0"
                  className="font-mono uppercase"
                  {...register('rfc', { onChange: toUpper })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razon_social">Razón social</Label>
                <Input
                  id="razon_social"
                  placeholder="Ej. EMPRESA ABC S.A. DE C.V."
                  className="uppercase"
                  {...register('razon_social', { onChange: toUpper })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regimen_fiscal">Régimen fiscal</Label>
                <Input
                  id="regimen_fiscal"
                  placeholder="Ej. General de Ley Personas Morales"
                  {...register('regimen_fiscal')}
                />
              </div>
            </div>

            {/* Dirección fiscal */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dirección fiscal</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                  <Label htmlFor="calle">Calle</Label>
                  <Input
                    id="calle"
                    placeholder="Ej. AV. MAGDALENA"
                    className="uppercase"
                    {...register('calle', { onChange: toUpper })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="numero_exterior">No. Ext.</Label>
                    <Input
                      id="numero_exterior"
                      placeholder="35"
                      {...register('numero_exterior')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_interior">No. Int.</Label>
                    <Input
                      id="numero_interior"
                      placeholder="—"
                      {...register('numero_interior')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colonia">Colonia</Label>
                  <Input
                    id="colonia"
                    placeholder="Ej. DEL VALLE NORTE"
                    className="uppercase"
                    {...register('colonia', { onChange: toUpper })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_postal">Código postal</Label>
                  <Input
                    id="codigo_postal"
                    placeholder="Ej. 03103"
                    maxLength={5}
                    {...register('codigo_postal')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad / Municipio</Label>
                  <Input
                    id="ciudad"
                    placeholder="Ej. BENITO JUÁREZ"
                    className="uppercase"
                    {...register('ciudad', { onChange: toUpper })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    placeholder="Ej. CIUDAD DE MÉXICO"
                    className="uppercase"
                    {...register('estado', { onChange: toUpper })}
                  />
                </div>
              </div>
            </div>

            {/* Billing extras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="portal_facturas">Portal de facturas</Label>
                <Input
                  id="portal_facturas"
                  placeholder="URL del portal"
                  {...register('portal_facturas')}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={requiereOc}
                  onCheckedChange={(checked) => setValue('requiere_oc', checked, { shouldDirty: true })}
                />
                <Label htmlFor="requiere_oc" className="cursor-pointer">
                  Requiere orden de compra
                </Label>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notas_facturacion">Proceso de facturación y cobranza</Label>
                <Textarea
                  id="notas_facturacion"
                  placeholder="Instrucciones del proceso de facturación y cobranza..."
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

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Truck, Pencil, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { proveedoresApi } from '@/services/api'
import { ROUTES } from '@/lib/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const supplierSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  rfc: z.string().optional(),
  contacto: z.string().optional(),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  whatsapp: z.string().optional(),
  notas: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierState {
  id: number
  nombre: string
  rfc: string | null
  contacto: string | null
  email: string | null
  telefono: string | null
  whatsapp: string | null
  notas: string | null
}

export default function ProveedorFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nombre: '',
      rfc: '',
      contacto: '',
      email: '',
      telefono: '',
      whatsapp: '',
      notas: '',
    },
  })

  useEffect(() => {
    if (!isEditing) return

    const state = location.state as SupplierState | null
    if (state?.id === Number(id)) {
      reset({
        nombre: state.nombre ?? '',
        rfc: state.rfc ?? '',
        contacto: state.contacto ?? '',
        email: state.email ?? '',
        telefono: state.telefono ?? '',
        whatsapp: state.whatsapp ?? '',
        notas: state.notas ?? '',
      })
      return
    }

    setLoading(true)
    proveedoresApi
      .get(id!)
      .then((res) => {
        const s = res.data
        reset({
          nombre: s.nombre ?? '',
          rfc: s.rfc ?? '',
          contacto: s.contacto ?? '',
          email: s.email ?? '',
          telefono: s.telefono ?? '',
          whatsapp: s.whatsapp ?? '',
          notas: s.notas ?? '',
        })
      })
      .catch(() => {
        toast.error('Proveedor no encontrado')
        navigate(ROUTES.SUPPLIERS)
      })
      .finally(() => setLoading(false))
  }, [id, isEditing, location.state, navigate, reset])

  const onSubmit = async (data: SupplierFormData) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        email: data.email || undefined,
        contacto: data.contacto || undefined,
        telefono: data.telefono || undefined,
        whatsapp: data.whatsapp || undefined,
        notas: data.notas || undefined,
      }

      if (isEditing) {
        await proveedoresApi.update(id!, payload)
        toast.success('Proveedor actualizado')
      } else {
        await proveedoresApi.create(payload)
        toast.success('Proveedor creado')
      }
      navigate(ROUTES.SUPPLIERS)
    } catch {
      // toast handled by global interceptor
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="card-modern p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Informacion del Proveedor
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                {...register('nombre')}
                placeholder="Nombre del proveedor"
                className={errors.nombre ? 'border-destructive' : ''}
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                {...register('rfc')}
                placeholder="ABC123456XYZ"
                className="uppercase"
              />
            </div>

            <div>
              <Label htmlFor="contacto">Contacto</Label>
              <Input
                id="contacto"
                {...register('contacto')}
                placeholder="Nombre del contacto"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="correo@ejemplo.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                {...register('telefono')}
                placeholder="55 1234 5678"
              />
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                {...register('whatsapp')}
                placeholder="5215512345678"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Numero completo con codigo de pais (ej: 5215512345678)
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              {...register('notas')}
              placeholder="Notas sobre el proveedor..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(ROUTES.SUPPLIERS)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
          </Button>
        </div>
      </form>
    </div>
  )
}

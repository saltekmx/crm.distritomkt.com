import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Users, Plus, MoreHorizontal, Pencil, Trash2, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { contactsApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
  cargo: string | null
  fecha_cumpleanos: string | null
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email invalido').or(z.literal('')).optional(),
  telefono: z.string().optional(),
  cargo: z.string().optional(),
  fecha_cumpleanos: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  clientId: string
}

export default function ClientContactsSection({ clientId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { nombre: '', email: '', telefono: '', cargo: '', fecha_cumpleanos: '' },
  })

  const fetchContacts = useCallback(() => {
    setLoading(true)
    contactsApi
      .list(clientId)
      .then((res) => {
        const data = res.data
        setContacts(Array.isArray(data) ? data : data.elementos ?? [])
      })
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const openCreate = () => {
    setEditingContact(null)
    reset({ nombre: '', email: '', telefono: '', cargo: '', fecha_cumpleanos: '' })
    setDialogOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditingContact(contact)
    reset({
      nombre: contact.nombre,
      email: contact.email ?? '',
      telefono: contact.telefono ?? '',
      cargo: contact.cargo ?? '',
      fecha_cumpleanos: contact.fecha_cumpleanos ?? '',
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: ContactFormData) => {
    setSubmitting(true)
    const payload = {
      nombre: data.nombre,
      email: data.email || undefined,
      telefono: data.telefono || undefined,
      cargo: data.cargo || undefined,
      fecha_cumpleanos: data.fecha_cumpleanos || undefined,
    }
    try {
      if (editingContact) {
        await contactsApi.update(clientId, editingContact.id, payload)
        toast.success('Contacto actualizado')
      } else {
        await contactsApi.create(clientId, payload)
        toast.success('Contacto creado')
      }
      setDialogOpen(false)
      fetchContacts()
    } catch {
      // toast handled by global interceptor
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await contactsApi.delete(clientId, deleteTarget.id)
      toast.success('Contacto eliminado')
      fetchContacts()
    } catch {
      // toast handled by global interceptor
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="card-modern">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">Contactos</h3>
            {!loading && (
              <span className="text-xs text-muted-foreground">({contacts.length})</span>
            )}
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Nuevo Contacto
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-t border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Nombre</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Telefono</th>
                <th className="px-6 py-3 font-medium">Cargo</th>
                <th className="px-6 py-3 font-medium">Cumpleaños</th>
                <th className="px-6 py-3 font-medium w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-3.5 w-28 rounded bg-muted animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 w-32 rounded bg-muted animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 w-24 rounded bg-muted animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 w-20 rounded bg-muted animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 rounded bg-muted animate-pulse" /></td>
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No hay contactos registrados</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">Agrega un contacto para este cliente</p>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="transition-colors hover:bg-muted/20 group">
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-medium">{contact.nombre}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">{contact.email || '—'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">{contact.telefono || '—'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">{contact.cargo || '—'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {contact.fecha_cumpleanos
                          ? new Date(contact.fecha_cumpleanos + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(contact)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(contact)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-nombre">Nombre *</Label>
              <Input
                id="contact-nombre"
                placeholder="Nombre del contacto"
                autoFocus
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive">{errors.nombre.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-telefono">Telefono</Label>
                <Input
                  id="contact-telefono"
                  placeholder="55 1234 5678"
                  {...register('telefono')}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-cargo">Cargo</Label>
                <Input
                  id="contact-cargo"
                  placeholder="Ej. Director de Marketing"
                  {...register('cargo')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-cumpleanos">Fecha de cumpleaños</Label>
                <Input
                  id="contact-cumpleanos"
                  type="date"
                  {...register('fecha_cumpleanos')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingContact ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  ¿Estas seguro de eliminar a <strong>{deleteTarget.nombre}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supplierContactsApi } from '@/services/api'

interface SupplierContact {
  id: number
  nombre: string
  email: string | null
  telefono: string | null
  cargo: string | null
  fecha_cumpleanos: string | null
}

const EMPTY: Record<string, string> = { nombre: '', email: '', telefono: '', cargo: '', fecha_cumpleanos: '' }

export function SupplierContactsSection({ supplierId }: { supplierId: number | string }) {
  const [contacts, setContacts] = useState<SupplierContact[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  const fetch = async () => {
    try {
      const res = await supplierContactsApi.list(supplierId)
      setContacts(res.data as SupplierContact[])
    } catch { /* skip */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [supplierId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setForm({ ...EMPTY }); setEditingId(null); setDialogOpen(true) }
  const openEdit = (c: SupplierContact) => {
    setForm({ nombre: c.nombre, email: c.email ?? '', telefono: c.telefono ?? '', cargo: c.cargo ?? '', fecha_cumpleanos: c.fecha_cumpleanos ?? '' })
    setEditingId(c.id); setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { toast.error('Nombre requerido'); return }
    setSubmitting(true)
    try {
      const data = { ...form, email: form.email || undefined, telefono: form.telefono || undefined, cargo: form.cargo || undefined, fecha_cumpleanos: form.fecha_cumpleanos || undefined }
      if (editingId) {
        await supplierContactsApi.update(supplierId, editingId, data)
        toast.success('Contacto actualizado')
      } else {
        await supplierContactsApi.create(supplierId, data)
        toast.success('Contacto agregado')
      }
      setDialogOpen(false)
      await fetch()
    } catch { toast.error('Error al guardar') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await supplierContactsApi.delete(supplierId, deleteId)
      setDeleteId(null)
      await fetch()
      toast.success('Contacto eliminado')
    } catch { toast.error('Error al eliminar') }
  }

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Contactos</h3>
        <Button variant="outline" size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : contacts.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Sin contactos</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Teléfono</th>
              <th className="px-4 py-2.5 font-medium">Cargo</th>
              <th className="px-4 py-2.5 font-medium">Cumpleaños</th>
              <th className="px-4 py-2.5 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-medium">{c.nombre}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.email || '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.telefono || '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.cargo || '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.fecha_cumpleanos || '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(c)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold">{editingId ? 'Editar contacto' : 'Nuevo contacto'}</h3>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} /></div>
                <div><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setField('cargo', e.target.value)} /></div>
                <div><Label>Cumpleaños</Label><Input type="date" value={form.fecha_cumpleanos} onChange={(e) => setField('fecha_cumpleanos', e.target.value)} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contacto</AlertDialogTitle>
            <AlertDialogDescription>Este contacto se eliminará permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

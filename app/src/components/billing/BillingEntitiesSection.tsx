import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { parseCifPdf } from '@/lib/cif-parser'

interface BillingEntity {
  id: number
  rfc: string | null
  razon_social: string | null
  regimen_fiscal: string | null
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
}

interface ApiService {
  list: (parentId: number | string) => Promise<{ data: unknown }>
  create: (parentId: number | string, data: Record<string, unknown>) => Promise<{ data: unknown }>
  update: (parentId: number | string, entityId: number | string, data: Record<string, unknown>) => Promise<{ data: unknown }>
  delete: (parentId: number | string, entityId: number | string) => Promise<unknown>
}

const EMPTY_FORM: Record<string, unknown> = {
  rfc: '', razon_social: '', regimen_fiscal: '', calle: '', numero_exterior: '',
  numero_interior: '', colonia: '', codigo_postal: '', ciudad: '', estado: '',
  dias_pago: 30, portal_facturas: '', requiere_oc: false, notas_facturacion: '',
}

export function BillingEntitiesSection({ parentId, apiService }: {
  parentId: number | string
  apiService: ApiService
}) {
  const [entities, setEntities] = useState<BillingEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const cifRef = useRef<HTMLInputElement>(null)

  const fetchEntities = async () => {
    try {
      const res = await apiService.list(parentId)
      setEntities(res.data as BillingEntity[])
    } catch { /* skip */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEntities() }, [parentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (e: BillingEntity) => {
    setForm({
      rfc: e.rfc ?? '', razon_social: e.razon_social ?? '', regimen_fiscal: e.regimen_fiscal ?? '',
      calle: e.calle ?? '', numero_exterior: e.numero_exterior ?? '', numero_interior: e.numero_interior ?? '',
      colonia: e.colonia ?? '', codigo_postal: e.codigo_postal ?? '', ciudad: e.ciudad ?? '', estado: e.estado ?? '',
      dias_pago: e.dias_pago, portal_facturas: e.portal_facturas ?? '',
      requiere_oc: e.requiere_oc, notas_facturacion: e.notas_facturacion ?? '',
    })
    setEditingId(e.id)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (editingId) {
        await apiService.update(parentId, editingId, form)
        toast.success('Facturación actualizada')
      } else {
        await apiService.create(parentId, form)
        toast.success('Facturación agregada')
      }
      setDialogOpen(false)
      await fetchEntities()
    } catch {
      toast.error('Error al guardar')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await apiService.delete(parentId, deleteId)
      setDeleteId(null)
      await fetchEntities()
      toast.success('Facturación eliminada')
    } catch { toast.error('Error al eliminar') }
  }

  const handleCif = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await parseCifPdf(file)
      setForm((prev) => ({
        ...prev,
        rfc: data.rfc || prev.rfc,
        razon_social: data.razon_social || prev.razon_social,
        regimen_fiscal: data.regimen_fiscal || prev.regimen_fiscal,
        calle: data.calle || prev.calle,
        numero_exterior: data.numero_exterior || prev.numero_exterior,
        numero_interior: data.numero_interior || prev.numero_interior,
        colonia: data.colonia || prev.colonia,
        codigo_postal: data.codigo_postal || prev.codigo_postal,
        ciudad: data.ciudad || prev.ciudad,
        estado: data.estado || prev.estado,
      }))
      toast.success('CIF cargado correctamente')
    } catch {
      toast.error('Error al leer el CIF')
    }
    if (cifRef.current) cifRef.current.value = ''
  }

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Facturación</h3>
        <Button variant="outline" size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : entities.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Sin entidades de facturación</div>
      ) : (
        <div className="divide-y divide-border">
          {entities.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary font-semibold">{e.rfc || '—'}</span>
                  {e.requiere_oc && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Requiere OC</span>}
                </div>
                <p className="text-sm truncate">{e.razon_social || 'Sin razón social'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[e.regimen_fiscal, e.codigo_postal, e.ciudad].filter(Boolean).join(' · ') || 'Sin datos fiscales'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(e)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/50">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-semibold">{editingId ? 'Editar facturación' : 'Nueva facturación'}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => cifRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Cargar CIF
                </Button>
                <input ref={cifRef} type="file" accept=".pdf" className="hidden" onChange={handleCif} />
                <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>RFC</Label>
                  <Input value={String(form.rfc ?? '')} onChange={(e) => setField('rfc', e.target.value.toUpperCase())} placeholder="ABC123456XYZ" className="uppercase" />
                </div>
                <div>
                  <Label>Régimen Fiscal</Label>
                  <Input value={String(form.regimen_fiscal ?? '')} onChange={(e) => setField('regimen_fiscal', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Razón Social</Label>
                <Input value={String(form.razon_social ?? '')} onChange={(e) => setField('razon_social', e.target.value.toUpperCase())} className="uppercase" />
              </div>

              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Dirección fiscal</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Calle</Label>
                  <Input value={String(form.calle ?? '')} onChange={(e) => setField('calle', e.target.value.toUpperCase())} className="uppercase" />
                </div>
                <div>
                  <Label>No. Ext.</Label>
                  <Input value={String(form.numero_exterior ?? '')} onChange={(e) => setField('numero_exterior', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>No. Int.</Label>
                  <Input value={String(form.numero_interior ?? '')} onChange={(e) => setField('numero_interior', e.target.value)} />
                </div>
                <div>
                  <Label>Colonia</Label>
                  <Input value={String(form.colonia ?? '')} onChange={(e) => setField('colonia', e.target.value.toUpperCase())} className="uppercase" />
                </div>
                <div>
                  <Label>C.P.</Label>
                  <Input value={String(form.codigo_postal ?? '')} onChange={(e) => setField('codigo_postal', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ciudad</Label>
                  <Input value={String(form.ciudad ?? '')} onChange={(e) => setField('ciudad', e.target.value.toUpperCase())} className="uppercase" />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input value={String(form.estado ?? '')} onChange={(e) => setField('estado', e.target.value.toUpperCase())} className="uppercase" />
                </div>
              </div>

              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Datos de pago</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Días de pago</Label>
                  <Input type="number" value={Number(form.dias_pago ?? 30)} onChange={(e) => setField('dias_pago', Number(e.target.value) || 30)} />
                </div>
                <div>
                  <Label>Portal de facturas</Label>
                  <Input value={String(form.portal_facturas ?? '')} onChange={(e) => setField('portal_facturas', e.target.value)} placeholder="URL del portal" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(form.requiere_oc)} onChange={(e) => setField('requiere_oc', e.target.checked)} className="accent-[var(--primary)]" />
                <Label className="cursor-pointer">Requiere orden de compra</Label>
              </div>
              <div>
                <Label>Notas de facturación</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={2}
                  value={String(form.notas_facturacion ?? '')}
                  onChange={(e) => setField('notas_facturacion', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar facturación</AlertDialogTitle>
            <AlertDialogDescription>Esta entidad de facturación se eliminará permanentemente.</AlertDialogDescription>
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

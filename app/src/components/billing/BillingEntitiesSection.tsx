import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Upload, Save } from 'lucide-react'
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
  const [editingId, setEditingId] = useState<number | null>(null) // null = list, 0 = new, >0 = editing
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

  const startCreate = () => {
    setForm({ ...EMPTY_FORM })
    setEditingId(0)
  }

  const startEdit = (e: BillingEntity) => {
    setForm({
      rfc: e.rfc ?? '', razon_social: e.razon_social ?? '', regimen_fiscal: e.regimen_fiscal ?? '',
      calle: e.calle ?? '', numero_exterior: e.numero_exterior ?? '', numero_interior: e.numero_interior ?? '',
      colonia: e.colonia ?? '', codigo_postal: e.codigo_postal ?? '', ciudad: e.ciudad ?? '', estado: e.estado ?? '',
      dias_pago: e.dias_pago, portal_facturas: e.portal_facturas ?? '',
      requiere_oc: e.requiere_oc, notas_facturacion: e.notas_facturacion ?? '',
    })
    setEditingId(e.id)
  }

  const cancelEdit = () => setEditingId(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (editingId && editingId > 0) {
        await apiService.update(parentId, editingId, form)
        toast.success('Facturación actualizada')
      } else {
        await apiService.create(parentId, form)
        toast.success('Facturación agregada')
      }
      setEditingId(null)
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
      if (editingId === deleteId) setEditingId(null)
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
    } catch { toast.error('Error al leer el CIF') }
    if (cifRef.current) cifRef.current.value = ''
  }

  const setField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }))

  // Inline form for create/edit
  const renderForm = () => (
    <div className="border-t border-border px-5 py-4 space-y-3 bg-muted/5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {editingId && editingId > 0 ? 'Editar facturación' : 'Nueva facturación'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => cifRef.current?.click()}>
            <Upload className="h-3 w-3" /> Cargar CIF
          </Button>
          <input ref={cifRef} type="file" accept=".pdf" className="hidden" onChange={handleCif} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-2">
        <div><Label className="text-xs">RFC</Label><Input className="h-8 text-sm uppercase" value={String(form.rfc ?? '')} onChange={(e) => setField('rfc', e.target.value.toUpperCase())} placeholder="ABC123456XYZ" /></div>
        <div><Label className="text-xs">Razón Social</Label><Input className="h-8 text-sm uppercase" value={String(form.razon_social ?? '')} onChange={(e) => setField('razon_social', e.target.value.toUpperCase())} /></div>
        <div><Label className="text-xs">Régimen Fiscal</Label><Input className="h-8 text-sm" value={String(form.regimen_fiscal ?? '')} onChange={(e) => setField('regimen_fiscal', e.target.value)} /></div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Dirección fiscal</span>
      <div className="grid grid-cols-6 gap-x-3 gap-y-2">
        <div className="col-span-2"><Label className="text-xs">Calle</Label><Input className="h-8 text-sm uppercase" value={String(form.calle ?? '')} onChange={(e) => setField('calle', e.target.value.toUpperCase())} /></div>
        <div><Label className="text-xs">No. Ext.</Label><Input className="h-8 text-sm" value={String(form.numero_exterior ?? '')} onChange={(e) => setField('numero_exterior', e.target.value)} /></div>
        <div><Label className="text-xs">No. Int.</Label><Input className="h-8 text-sm" value={String(form.numero_interior ?? '')} onChange={(e) => setField('numero_interior', e.target.value)} /></div>
        <div><Label className="text-xs">Colonia</Label><Input className="h-8 text-sm uppercase" value={String(form.colonia ?? '')} onChange={(e) => setField('colonia', e.target.value.toUpperCase())} /></div>
        <div><Label className="text-xs">C.P.</Label><Input className="h-8 text-sm" value={String(form.codigo_postal ?? '')} onChange={(e) => setField('codigo_postal', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-6 gap-x-3 gap-y-2">
        <div className="col-span-2"><Label className="text-xs">Ciudad</Label><Input className="h-8 text-sm uppercase" value={String(form.ciudad ?? '')} onChange={(e) => setField('ciudad', e.target.value.toUpperCase())} /></div>
        <div className="col-span-2"><Label className="text-xs">Estado</Label><Input className="h-8 text-sm uppercase" value={String(form.estado ?? '')} onChange={(e) => setField('estado', e.target.value.toUpperCase())} /></div>
        <div><Label className="text-xs">Días pago</Label><Input className="h-8 text-sm" type="number" value={Number(form.dias_pago ?? 30)} onChange={(e) => setField('dias_pago', Number(e.target.value) || 30)} /></div>
        <div className="flex items-end gap-1.5 pb-0.5">
          <input type="checkbox" checked={Boolean(form.requiere_oc)} onChange={(e) => setField('requiere_oc', e.target.checked)} className="accent-[var(--primary)]" />
          <Label className="cursor-pointer text-xs">Requiere OC</Label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Portal de facturas</Label><Input className="h-8 text-sm" value={String(form.portal_facturas ?? '')} onChange={(e) => setField('portal_facturas', e.target.value)} placeholder="URL" /></div>
        <div><Label className="text-xs">Notas de facturación</Label><Input className="h-8 text-sm" value={String(form.notas_facturacion ?? '')} onChange={(e) => setField('notas_facturacion', e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>Cancelar</Button>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Guardando...' : <><Save className="h-3 w-3" /> Guardar</>}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Facturación</h3>
        {editingId === null && (
          <Button variant="outline" size="sm" className="gap-2" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : entities.length === 0 && editingId === null ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">Sin entidades de facturación</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5" /> Agregar facturación
          </Button>
        </div>
      ) : (
        <div>
          {/* Existing entities list */}
          {entities.map((e) => (
            <div key={e.id}>
              {editingId === e.id ? (
                renderForm()
              ) : (
                <div className="px-5 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors border-b border-border/50 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-primary font-semibold">{e.rfc || '—'}</span>
                      {e.requiere_oc && <span className="text-[10px] bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded font-medium">Requiere OC</span>}
                    </div>
                    <p className="text-sm font-medium">{e.razon_social || 'Sin razón social'}</p>
                    <p className="text-xs text-muted-foreground">
                      {[e.regimen_fiscal, e.codigo_postal && `CP ${e.codigo_postal}`, e.ciudad, e.estado].filter(Boolean).join(' · ') || 'Sin datos fiscales'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(e)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer" title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline create form at the bottom */}
      {editingId === 0 && renderForm()}

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

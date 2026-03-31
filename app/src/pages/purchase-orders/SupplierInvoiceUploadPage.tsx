import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicOcApi } from '@/services/api'

interface OcPublic {
  codigo: string
  nombre: string
  proveedor_nombre: string
  proveedor_rfc: string | null
  receptor_rfc: string | null
  estado: string
  items: Array<{ concepto: string; cantidad: number; precio_unitario: number; categoria: string }> | null
  iva_porcentaje: number
  ya_facturo: boolean
}

interface XmlPreview {
  valid: boolean
  error?: string
  version?: string
  total?: number
  subtotal?: number
  moneda?: string
  folio?: string
  serie?: string
  fecha?: string
  rfc_emisor?: string
  nombre_emisor?: string
  rfc_receptor?: string
  nombre_receptor?: string
  uuid?: string
}

const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

function parseCfdiXml(text: string): XmlPreview {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) return { valid: false, error: 'El archivo no es un XML válido.' }

    const root = doc.documentElement
    if (!root.tagName.includes('Comprobante')) return { valid: false, error: 'El XML no es un CFDI válido.' }

    const version = root.getAttribute('Version') || root.getAttribute('version') || ''
    if (!version.startsWith('3') && !version.startsWith('4')) return { valid: false, error: `Versión CFDI no soportada: ${version}` }

    const total = parseFloat(root.getAttribute('Total') || '0')
    const subtotal = parseFloat(root.getAttribute('SubTotal') || '0')
    if (total <= 0) return { valid: false, error: 'El CFDI no tiene un Total válido.' }

    const emisor = root.querySelector('Emisor')
    const receptor = root.querySelector('Receptor')
    const timbre = root.querySelector('TimbreFiscalDigital')

    return {
      valid: true,
      version,
      total,
      subtotal,
      moneda: root.getAttribute('Moneda') || 'MXN',
      folio: root.getAttribute('Folio') || '',
      serie: root.getAttribute('Serie') || '',
      fecha: root.getAttribute('Fecha') || '',
      rfc_emisor: emisor?.getAttribute('Rfc') || '',
      nombre_emisor: emisor?.getAttribute('Nombre') || '',
      rfc_receptor: receptor?.getAttribute('Rfc') || '',
      nombre_receptor: receptor?.getAttribute('Nombre') || '',
      uuid: timbre?.getAttribute('UUID') || '',
    }
  } catch {
    return { valid: false, error: 'Error al leer el archivo XML.' }
  }
}

export default function SupplierInvoiceUploadPage() {
  const { token } = useParams<{ token: string }>()
  const [oc, setOc] = useState<OcPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [xmlPreview, setXmlPreview] = useState<XmlPreview | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ mensaje: string; mismatch: boolean } | null>(null)

  useEffect(() => {
    if (!token) return
    publicOcApi.get(token)
      .then((res) => setOc(res.data))
      .catch(() => setError('Orden de compra no encontrada o enlace inválido.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleXmlSelect = async (file: File | null) => {
    setXmlFile(file)
    setXmlPreview(null)
    if (!file) return
    try {
      const text = await file.text()
      setXmlPreview(parseCfdiXml(text))
    } catch {
      setXmlPreview({ valid: false, error: 'No se pudo leer el archivo.' })
    }
  }

  const handleUpload = async () => {
    if (!token || !xmlFile) return
    setShowConfirm(false)
    setUploading(true)
    try {
      const res = await publicOcApi.uploadInvoice(token, xmlFile, pdfFile ?? undefined)
      setResult({ mensaje: res.data.mensaje, mismatch: res.data.factura_mismatch })
    } catch {
      setResult({ mensaje: 'Error al subir la factura. Intenta de nuevo.', mismatch: false })
    } finally {
      setUploading(false)
    }
  }

  const items = oc?.items ?? []
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const ivaPct = oc?.iva_porcentaje ?? 16
  const totalConIva = subtotal * (1 + ivaPct / 100)

  // Validation errors
  const hasMismatch = xmlPreview?.valid && xmlPreview.total ? Math.abs(xmlPreview.total - totalConIva) > 0.01 : false
  const hasRfcEmisorMismatch = xmlPreview?.valid && oc?.proveedor_rfc && xmlPreview.rfc_emisor
    ? xmlPreview.rfc_emisor.toUpperCase() !== oc.proveedor_rfc.toUpperCase() : false
  const hasRfcReceptorMismatch = xmlPreview?.valid && oc?.receptor_rfc && xmlPreview.rfc_receptor
    ? xmlPreview.rfc_receptor.toUpperCase() !== oc.receptor_rfc.toUpperCase() : false
  const hasErrors = hasMismatch || hasRfcEmisorMismatch || hasRfcReceptorMismatch

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src="/logo-dark.png" alt="DistritoMKT" className="h-10 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Portal de Facturación</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mb-3" />
              <p>Cargando...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center"><p className="text-red-600 font-medium">{error}</p></div>
          ) : !oc ? null : (
            <>
              {/* OC Summary */}
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">{oc.codigo}</h2>
                <p className="text-sm text-gray-500">{oc.nombre}</p>
                <p className="text-sm text-gray-600 mt-1">Proveedor: <strong>{oc.proveedor_nombre}</strong></p>
              </div>

              {/* Items */}
              <div className="p-6 border-b border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                      <th className="pb-2">Concepto</th>
                      <th className="pb-2 text-center">Cant.</th>
                      <th className="pb-2 text-right">Precio Unit.</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 text-gray-800">{item.concepto}</td>
                        <td className="py-2 text-center text-gray-600">{item.cantidad}</td>
                        <td className="py-2 text-right text-gray-600">{fmtMXN(item.precio_unitario)}</td>
                        <td className="py-2 text-right font-medium text-gray-800">{fmtMXN(item.cantidad * item.precio_unitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1 mt-3 pt-3 border-t border-gray-200 text-right">
                  <div className="text-sm text-gray-500">Subtotal: {fmtMXN(subtotal)}</div>
                  <div className="text-sm text-gray-500">IVA ({ivaPct}%): {fmtMXN(subtotal * (ivaPct / 100))}</div>
                  <div className="text-lg font-bold text-gray-900">Total: {fmtMXN(totalConIva)}</div>
                </div>
              </div>

              {/* Upload */}
              <div className="p-6">
                {result ? (
                  <div className={`p-4 rounded-lg text-center ${result.mismatch ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                    <p className={`font-medium ${result.mismatch ? 'text-amber-700' : 'text-green-700'}`}>{result.mensaje}</p>
                  </div>
                ) : uploading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-[#d4af37] mb-4" />
                    <p className="font-medium text-gray-700">Subiendo factura...</p>
                    <p className="text-sm text-gray-500 mt-1">Validando XML y guardando archivos</p>
                  </div>
                ) : oc.ya_facturo ? (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                    <p className="font-medium text-green-700">Factura ya recibida. Gracias.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900 mb-3">Subir Factura</h3>
                    <p className="text-sm text-gray-500 mb-4">Sube tu factura en formato XML (CFDI) y opcionalmente el PDF.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">XML (CFDI) *</label>
                        <input type="file" accept=".xml"
                          onChange={(e) => handleXmlSelect(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>

                      {/* XML validation */}
                      {xmlPreview && (xmlPreview.valid ? (
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="font-semibold text-green-700 text-sm">CFDI válido</span>
                            <span className="text-xs text-green-600 ml-auto">v{xmlPreview.version}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-green-800 ml-7">
                            <div><span className="text-green-600">UUID:</span> <span className="font-mono">{xmlPreview.uuid?.slice(0, 18)}...</span></div>
                            <div><span className="text-green-600">Folio:</span> {xmlPreview.serie}{xmlPreview.folio}</div>
                            <div><span className="text-green-600">Emisor:</span> {xmlPreview.nombre_emisor}</div>
                            <div><span className="text-green-600">RFC Emisor:</span> {xmlPreview.rfc_emisor}</div>
                            <div><span className="text-green-600">Receptor:</span> {xmlPreview.nombre_receptor}</div>
                            <div><span className="text-green-600">RFC Receptor:</span> {xmlPreview.rfc_receptor}</div>
                            <div><span className="text-green-600">Subtotal:</span> {fmtMXN(xmlPreview.subtotal ?? 0)}</div>
                            <div><span className="text-green-600">Total:</span> <strong>{fmtMXN(xmlPreview.total ?? 0)}</strong> {xmlPreview.moneda}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            <span className="font-semibold text-red-700 text-sm">{xmlPreview.error}</span>
                          </div>
                        </div>
                      ))}

                      {/* Validation errors */}
                      {hasRfcEmisorMismatch && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            <div><span className="font-semibold text-red-700 text-sm">RFC Emisor no coincide con el proveedor</span>
                            <div className="text-xs text-red-600">Factura: {xmlPreview?.rfc_emisor} · Proveedor: {oc?.proveedor_rfc || 'Sin RFC registrado'}</div></div>
                          </div>
                        </div>
                      )}
                      {hasRfcReceptorMismatch && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            <div><span className="font-semibold text-red-700 text-sm">RFC Receptor no coincide</span>
                            <div className="text-xs text-red-600">Factura: {xmlPreview?.rfc_receptor} · Esperado: {oc?.receptor_rfc || 'No configurado'}</div></div>
                          </div>
                        </div>
                      )}
                      {hasMismatch && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div><span className="font-semibold text-red-700 text-sm">El total no coincide</span>
                            <div className="text-xs text-red-600">ODC: {fmtMXN(totalConIva)} · Factura: {fmtMXN(xmlPreview?.total ?? 0)}</div></div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PDF *</label>
                        <input type="file" accept=".pdf"
                          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={() => setShowConfirm(true)}
                        disabled={!xmlFile || !pdfFile || !xmlPreview?.valid || hasErrors}
                        className="w-full py-3 px-4 rounded-lg bg-[#d4af37] text-white font-semibold text-sm hover:bg-[#c5a030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Subir Factura
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Confirmation modal */}
        {showConfirm && xmlPreview?.valid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Confirmar envío de factura</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Emisor:</strong> {xmlPreview.nombre_emisor} ({xmlPreview.rfc_emisor})</p>
                <p><strong>Receptor:</strong> {xmlPreview.nombre_receptor} ({xmlPreview.rfc_receptor})</p>
                <p><strong>UUID:</strong> <span className="font-mono text-xs">{xmlPreview.uuid}</span></p>
                <p><strong>Total:</strong> {fmtMXN(xmlPreview.total ?? 0)} {xmlPreview.moneda}</p>
                {hasRfcEmisorMismatch && <p className="text-red-600 text-xs font-medium">⚠ RFC Emisor no coincide: {xmlPreview.rfc_emisor} ≠ {oc?.proveedor_rfc}</p>}
                {hasRfcReceptorMismatch && <p className="text-red-600 text-xs font-medium">⚠ RFC Receptor no coincide: {xmlPreview.rfc_receptor} ≠ {oc?.receptor_rfc}</p>}
                {hasMismatch && <p className="text-red-600 text-xs font-medium">⚠ Total no coincide: ODC {fmtMXN(totalConIva)} ≠ Factura {fmtMXN(xmlPreview.total ?? 0)}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={handleUpload} className="px-4 py-2 text-sm font-semibold text-white bg-[#d4af37] hover:bg-[#c5a030] rounded-lg transition-colors">
                  Confirmar y subir
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">DistritoMKT — Este enlace es exclusivo para esta orden de compra.</p>
      </div>
    </div>
  )
}

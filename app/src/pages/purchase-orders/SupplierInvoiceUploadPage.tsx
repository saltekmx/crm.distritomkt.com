import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicOcApi } from '@/services/api'

interface OcPublic {
  codigo: string
  nombre: string
  proveedor_nombre: string
  estado: string
  items: Array<{ concepto: string; cantidad: number; precio_unitario: number; categoria: string }> | null
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
  uuid?: string
}

const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

function parseCfdiXml(text: string): XmlPreview {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')

    // Check parse errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) return { valid: false, error: 'El archivo no es un XML válido.' }

    const root = doc.documentElement
    const tag = root.tagName || ''

    // Must be a CFDI Comprobante
    if (!tag.includes('Comprobante')) return { valid: false, error: 'El XML no es un CFDI válido. Debe ser un Comprobante.' }

    const version = root.getAttribute('Version') || root.getAttribute('version') || ''
    if (!version.startsWith('3') && !version.startsWith('4')) return { valid: false, error: `Versión CFDI no soportada: ${version}. Se requiere 3.3 o 4.0.` }

    const total = parseFloat(root.getAttribute('Total') || '0')
    const subtotal = parseFloat(root.getAttribute('SubTotal') || '0')
    if (total <= 0) return { valid: false, error: 'El CFDI no tiene un Total válido.' }

    // Find Emisor (namespace-agnostic)
    const emisor = root.querySelector('Emisor')
    const rfc_emisor = emisor?.getAttribute('Rfc') || ''
    const nombre_emisor = emisor?.getAttribute('Nombre') || ''

    // Find TimbreFiscalDigital UUID
    const timbre = root.querySelector('TimbreFiscalDigital')
    const uuid = timbre?.getAttribute('UUID') || ''

    return {
      valid: true,
      version,
      total,
      subtotal,
      moneda: root.getAttribute('Moneda') || 'MXN',
      folio: root.getAttribute('Folio') || '',
      serie: root.getAttribute('Serie') || '',
      fecha: root.getAttribute('Fecha') || '',
      rfc_emisor,
      nombre_emisor,
      uuid,
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
      const preview = parseCfdiXml(text)
      setXmlPreview(preview)
    } catch {
      setXmlPreview({ valid: false, error: 'No se pudo leer el archivo.' })
    }
  }

  const handleUpload = async () => {
    if (!token || !xmlFile) return
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
  const totalConIva = subtotal * 1.16 // OC total with 16% IVA

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo-dark.png" alt="DistritoMKT" className="h-10 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Portal de Facturación</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Cargando...</div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : !oc ? null : (
            <>
              {/* OC Summary */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{oc.codigo}</h2>
                    <p className="text-sm text-gray-500">{oc.nombre}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Proveedor: <strong>{oc.proveedor_nombre}</strong></p>
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
                  <div className="text-sm text-gray-500">IVA (16%): {fmtMXN(subtotal * 0.16)}</div>
                  <div className="text-lg font-bold text-gray-900">Total: {fmtMXN(totalConIva)}</div>
                </div>
              </div>

              {/* Upload section */}
              <div className="p-6">
                {result ? (
                  <div className={`p-4 rounded-lg text-center ${result.mismatch ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                    <p className={`font-medium ${result.mismatch ? 'text-amber-700' : 'text-green-700'}`}>{result.mensaje}</p>
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
                      {/* XML input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">XML (CFDI) *</label>
                        <input
                          type="file"
                          accept=".xml"
                          onChange={(e) => handleXmlSelect(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>

                      {/* XML validation preview */}
                      {xmlPreview && (
                        xmlPreview.valid ? (
                          <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              <span className="font-semibold text-green-700 text-sm">CFDI válido</span>
                              <span className="text-xs text-green-600 ml-auto">v{xmlPreview.version}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                              <div><span className="text-green-600">UUID:</span> <span className="font-mono">{xmlPreview.uuid?.slice(0, 18)}...</span></div>
                              <div><span className="text-green-600">RFC Emisor:</span> {xmlPreview.rfc_emisor}</div>
                              <div><span className="text-green-600">Emisor:</span> {xmlPreview.nombre_emisor}</div>
                              <div><span className="text-green-600">Folio:</span> {xmlPreview.serie}{xmlPreview.folio}</div>
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
                        )
                      )}

                      {/* Total mismatch warning */}
                      {xmlPreview?.valid && xmlPreview.total && Math.abs(xmlPreview.total - totalConIva) > 0.01 && (
                        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span className="font-semibold text-red-700 text-sm">El total de la factura no coincide con la orden de compra</span>
                          </div>
                          <div className="text-xs text-red-600 ml-7">
                            OC: {fmtMXN(totalConIva)} · Factura: {fmtMXN(xmlPreview.total)}
                            {' '}(diferencia: {fmtMXN(Math.abs(xmlPreview.total - totalConIva))})
                          </div>
                        </div>
                      )}

                      {/* PDF input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PDF (opcional)</label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
                        />
                      </div>

                      {/* Submit */}
                      <button
                        onClick={handleUpload}
                        disabled={!xmlFile || !xmlPreview?.valid || uploading}
                        className="w-full py-3 px-4 rounded-lg bg-[#d4af37] text-white font-semibold text-sm hover:bg-[#c5a030] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {uploading ? 'Subiendo...' : 'Subir Factura'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">DistritoMKT — Este enlace es exclusivo para esta orden de compra.</p>
      </div>
    </div>
  )
}

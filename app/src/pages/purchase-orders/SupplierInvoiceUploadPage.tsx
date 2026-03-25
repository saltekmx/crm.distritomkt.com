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

const fmtMXN = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

export default function SupplierInvoiceUploadPage() {
  const { token } = useParams<{ token: string }>()
  const [oc, setOc] = useState<OcPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [xmlFile, setXmlFile] = useState<File | null>(null)
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
  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

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
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                    {oc.estado}
                  </span>
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
                <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Subtotal: {fmtMXN(total)}</span>
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
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">XML (CFDI) *</label>
                        <input
                          type="file"
                          accept=".xml"
                          onChange={(e) => setXmlFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PDF (opcional)</label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={handleUpload}
                        disabled={!xmlFile || uploading}
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

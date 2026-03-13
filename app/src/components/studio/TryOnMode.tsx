import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle, XCircle, User, Shirt } from 'lucide-react'
import { toast } from 'sonner'
import { studioApi, type StudioGeneration } from '@/services/api'

interface TryOnModeProps {
  projectId: number
}

type TryOnModel = 'kolors-virtual-try-on-v1' | 'kolors-virtual-try-on-v1-5'

function ImageUploadSlot({
  label,
  icon: Icon,
  preview,
  onFile,
}: {
  label: string
  icon: typeof User
  // preview: full data URL for display; onFile: raw base64 for API
  preview: string | null
  onFile: (base64: string, previewUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // Kling requires raw base64 — strip the "data:image/...;base64," prefix
      const base64 = dataUrl.split(',')[1]
      onFile(base64, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-full aspect-[3/4] max-w-[200px] rounded-lg border-2 border-dashed border-zinc-600 hover:border-violet-500 transition-colors overflow-hidden bg-zinc-900 flex items-center justify-center"
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <Upload className="h-8 w-8" />
            <span className="text-xs">Subir imagen</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

export function TryOnMode({ projectId }: TryOnModeProps) {
  const [humanBase64, setHumanBase64] = useState<string | null>(null)
  const [humanPreview, setHumanPreview] = useState<string | null>(null)
  const [clothBase64, setClothBase64] = useState<string | null>(null)
  const [clothPreview, setClothPreview] = useState<string | null>(null)
  const [model, setModel] = useState<TryOnModel>('kolors-virtual-try-on-v1-5')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<StudioGeneration | null>(null)

  const canSubmit = humanBase64 && clothBase64 && !isLoading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsLoading(true)
    setResult(null)
    try {
      const res = await studioApi.submitTryOn({
        project_id: projectId,
        human_image: humanBase64!,
        cloth_image: clothBase64,
        model,
      })
      setResult(res.data)
      if (res.data.estado === 'complete') {
        toast.success('Probador virtual completado')
      } else {
        toast.error(`Error: ${res.data.mensaje_error ?? 'Try-on falló'}`)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error al generar'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto p-8 gap-8">
      <div className="w-full max-w-2xl">
        <h2 className="text-xl font-semibold text-zinc-100 mb-1">Probador Virtual</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Sube una foto de la persona y la prenda. Kling generará la imagen con la ropa puesta.
        </p>

        {/* Image slots */}
        <div className="flex gap-8 mb-6">
          <ImageUploadSlot
            label="Persona"
            icon={User}
            preview={humanPreview}
            onFile={(b64, preview) => { setHumanBase64(b64); setHumanPreview(preview) }}
          />
          <ImageUploadSlot
            label="Prenda"
            icon={Shirt}
            preview={clothPreview}
            onFile={(b64, preview) => { setClothBase64(b64); setClothPreview(preview) }}
          />
        </div>

        {/* Model selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-300 block mb-2">Modelo</label>
          <div className="flex gap-3">
            {([
              { id: 'kolors-virtual-try-on-v1', label: 'v1 — Básico' },
              { id: 'kolors-virtual-try-on-v1-5', label: 'v1.5 — Mejorado' },
            ] as const).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  model === m.id
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-white font-medium flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando (puede tardar 30s)...
            </>
          ) : (
            'Generar probador virtual'
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            {result.estado === 'complete' ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm font-medium text-zinc-300">
              {result.estado === 'complete' ? 'Resultado' : `Error: ${result.mensaje_error}`}
            </span>
          </div>
          {result.url_salida && (
            <img
              src={result.url_salida}
              alt="Try-on result"
              className="w-full max-w-sm rounded-lg border border-zinc-700"
            />
          )}
        </div>
      )}
    </div>
  )
}

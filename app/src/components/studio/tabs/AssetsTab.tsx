import { useCallback, useRef, useState, useEffect } from 'react'
import { Upload, Loader2, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { pipelineApi, type PipelineAsset } from '@/services/api'
import { usePipelineStore } from '@/stores/pipelineStore'
import { useStudioStore } from '@/stores/studioStore'

interface AssetsTabProps {
  projectId: number
}

export function AssetsTab({ projectId }: AssetsTabProps) {
  const { pipeline } = usePipelineStore()
  const pipelineId = pipeline?.id ?? null
  const [assets, setAssets] = useState<PipelineAsset[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Studio generations for "From Studio" import
  const generations = useStudioStore((s) => s.generations)
  const studioImages = generations.filter((g) => g.estado === 'complete' && g.url_salida)

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (!pipelineId) {
        toast.error('Primero inicia el pipeline')
        return
      }
      setUploading(true)
      try {
        for (const file of Array.from(files)) {
          const { data } = await pipelineApi.uploadAsset(pipelineId, file)
          setAssets((prev) => [...prev, data])
        }
        toast.success(`${files.length} archivo(s) subido(s)`)
      } catch {
        toast.error('Error al subir archivos')
      } finally {
        setUploading(false)
      }
    },
    [pipelineId],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleImportFromStudio = useCallback(
    async (imageUrl: string, fileName: string) => {
      if (!pipelineId) {
        toast.error('Primero inicia el pipeline')
        return
      }
      try {
        const { data } = await pipelineApi.importAssetUrl(pipelineId, imageUrl, fileName)
        setAssets((prev) => [...prev, data])
        toast.success('Imagen importada al pipeline')
      } catch {
        toast.error('Error al importar imagen')
      }
    },
    [pipelineId],
  )

  const removeAsset = (id: number) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
        <p className="text-[11px] font-medium text-zinc-400">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} de referencia
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {/* Drop zone */}
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-4 flex flex-col items-center gap-2 transition-colors cursor-pointer',
            isDragging
              ? 'border-violet-500/50 bg-violet-500/5'
              : 'border-zinc-700/40 hover:border-zinc-600',
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
          ) : (
            <Upload className="h-5 w-5 text-zinc-500" />
          )}
          <p className="text-[10px] text-zinc-500 text-center">
            Arrastra imagenes o haz clic
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {/* Uploaded assets grid */}
        {assets.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-zinc-500 mb-1.5">Subidos</p>
            <div className="grid grid-cols-3 gap-1.5">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative rounded-md overflow-hidden aspect-square border border-zinc-700/30"
                >
                  <img
                    src={asset.url_archivo}
                    alt={asset.nombre_archivo || 'Asset'}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import from Studio gallery */}
        {studioImages.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-zinc-500 mb-1.5">Desde el Estudio</p>
            <div className="grid grid-cols-3 gap-1.5">
              {studioImages.slice(0, 12).map((gen) => (
                <button
                  key={gen.id}
                  type="button"
                  onClick={() => handleImportFromStudio(gen.url_salida!, `studio-${gen.id}.png`)}
                  className="group relative rounded-md overflow-hidden aspect-square border border-zinc-700/30 hover:border-violet-500/30 transition-colors"
                >
                  <img
                    src={gen.url_salida!}
                    alt={gen.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

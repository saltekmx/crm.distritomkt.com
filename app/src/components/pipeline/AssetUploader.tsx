import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, ImagePlus, Sparkles, Loader2, X, Images, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pipelineApi, type PipelineAsset } from '@/services/api'
import { mediaApi, type MediaFile, isImage } from '@/lib/media'
import { usePipelineStore } from '@/stores/pipelineStore'
import { toast } from 'sonner'

interface Props {
  projectId: number
  pipelineId?: number
}

export function AssetUploader({ projectId, pipelineId }: Props) {
  const [assets, setAssets] = useState<PipelineAsset[]>([])
  const [projectMedia, setProjectMedia] = useState<MediaFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { startPipeline, isLoading } = usePipelineStore()

  // Load existing project media
  useEffect(() => {
    mediaApi
      .list({ entity_type: 'project', entity_id: projectId })
      .then(({ data }) => {
        const images = data.filter((f) => isImage(f.mime))
        setProjectMedia(images)
        // Select all by default
        setSelectedIds(new Set(images.map((f) => f.id)))
      })
      .catch(() => {})
  }, [projectId])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(projectMedia.map((f) => f.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

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
    [pipelineId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const removeAsset = (id: number) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const totalSelected = selectedIds.size + assets.length

  return (
    <div className="space-y-6">
      {/* Existing Project Media */}
      {projectMedia.length > 0 && (
        <div className="card-modern p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Media del proyecto</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {selectedIds.size}/{projectMedia.length} seleccionada{projectMedia.length !== 1 && 's'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Todas
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button
                onClick={selectNone}
                className="text-xs text-muted-foreground hover:underline"
              >
                Ninguna
              </button>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Selecciona las imágenes que se usarán como referencia para el pipeline.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {projectMedia.map((file) => {
              const selected = selectedIds.has(file.id)
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => toggleSelect(file.id)}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={file.url}
                    alt={file.nombre}
                    className="aspect-square w-full object-cover"
                  />
                  {/* Selection indicator */}
                  <div
                    className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background/60 text-muted-foreground'
                    }`}
                  >
                    {selected && <Check className="h-4 w-4" />}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                    <p className="truncate text-xs text-white">{file.nombre}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Drop Zone for additional uploads */}
      <div
        className={`card-modern flex flex-col items-center justify-center gap-4 border-2 border-dashed p-12 transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="icon-badge bg-primary/10 text-primary">
          <ImagePlus className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">
            {projectMedia.length > 0 ? 'Sube imágenes adicionales' : 'Sube imágenes de referencia'}
          </p>
          <p className="text-sm text-muted-foreground">
            Arrastra y suelta imágenes del producto, brand kit, o referencias visuales
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Seleccionar archivos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Pipeline-uploaded Assets Grid */}
      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-border">
              <img
                src={asset.url_archivo}
                alt={asset.nombre_archivo || 'Asset'}
                className="aspect-square w-full object-cover"
              />
              <button
                onClick={() => removeAsset(asset.id)}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                <p className="truncate text-xs text-white">{asset.nombre_archivo}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Pipeline Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => startPipeline(projectId)}
          disabled={isLoading || totalSelected === 0}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          Analizar Brief con IA
        </Button>
      </div>
    </div>
  )
}

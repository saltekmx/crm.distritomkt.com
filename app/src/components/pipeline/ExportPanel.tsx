import { useState } from 'react'
import { Download, Loader2, Check, Film, Library, Archive, Clock, Clapperboard } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePipelineStore } from '@/stores/pipelineStore'

const formats = [
  { value: 'mp4', label: 'MP4' },
  { value: 'gif', label: 'GIF' },
  { value: 'webm', label: 'WebM' },
]

const resolutions = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
]

function handleDownload(videoUrl: string, sceneName: string) {
  const a = document.createElement('a')
  a.href = videoUrl
  a.download = sceneName
  a.click()
}

export function ExportPanel() {
  const { pipeline, exportPipeline, isLoading, exportProgress, exportedMediaIds } =
    usePipelineStore()
  const [format, setFormat] = useState('mp4')
  const [resolution, setResolution] = useState('1080p')

  if (!pipeline) return null

  const approvedScenes = pipeline.escenas
    .filter((s) => s.aprobado)
    .sort((a, b) => a.orden - b.orden)

  const totalScenes = pipeline.escenas.length
  const totalDuration = approvedScenes.reduce((acc, s) => acc + (s.duracion_seg ?? 0), 0)

  const isExported = pipeline.estado === 'exported'
  const isExporting = isLoading && pipeline.estado === 'exporting'

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="card-modern p-6">
        <h3 className="mb-4 text-lg font-semibold">Resumen del pipeline</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Clapperboard className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-lg font-bold">{approvedScenes.length}/{totalScenes}</p>
            <p className="text-xs text-muted-foreground">Escenas aprobadas</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Clock className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-lg font-bold">{totalDuration}s</p>
            <p className="text-xs text-muted-foreground">Duracion total</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Film className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-lg font-bold">{format.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">Formato</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Download className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-lg font-bold">{resolution}</p>
            <p className="text-xs text-muted-foreground">Resolucion</p>
          </div>
        </div>
      </div>

      {/* Approved Scenes Preview */}
      <div className="card-modern p-6">
        <h3 className="mb-4 text-lg font-semibold">Escenas aprobadas</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {approvedScenes.map((scene) => (
            <div key={scene.id} className="group relative overflow-hidden rounded-lg border border-border">
              <div className="relative h-28">
                {scene.video_url ? (
                  <video
                    src={scene.video_url}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <Film className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {scene.orden}
                </div>
                <div className="absolute bottom-1.5 right-1.5 rounded-full bg-green-500 p-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-xs font-medium">Escena {scene.orden}</p>
                  <p className="text-[10px] text-muted-foreground">{scene.duracion_seg}s</p>
                </div>
                {scene.video_url && isExported && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(scene.video_url!, `escena-${scene.orden}.${format}`)
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Descargar"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="card-modern p-6">
        <h3 className="mb-4 text-lg font-semibold">Opciones de exportacion</h3>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Format */}
          <div>
            <label className="mb-2 block text-sm font-medium">Formato</label>
            <div className="flex gap-2">
              {formats.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  disabled={isExporting}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    format === f.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="mb-2 block text-sm font-medium">Resolucion</label>
            <div className="flex gap-2">
              {resolutions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setResolution(r.value)}
                  disabled={isExporting}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    resolution === r.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Progress */}
      {isExporting && exportProgress && (
        <div className="card-modern p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Exportando escena {exportProgress.step} de {exportProgress.total}...
              </span>
              <span className="text-muted-foreground">
                {Math.round((exportProgress.step / exportProgress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: `${(exportProgress.step / exportProgress.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enviando videos a la biblioteca de medios del proyecto...
            </p>
          </div>
        </div>
      )}

      {/* Export Button / Status */}
      <div className="flex flex-col items-center gap-4">
        {isExported && exportedMediaIds.length > 0 ? (
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-green-400">
              <Check className="h-5 w-5" />
              Videos exportados al CRM
            </div>
            <p className="text-sm text-muted-foreground">
              Los videos estan disponibles en la biblioteca de medios del proyecto
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open('/medios', '_blank')}
              >
                <Library className="h-4 w-4" />
                Ver en Medios
              </Button>
              {approvedScenes.some((s) => s.video_url) && (
                <>
                  {approvedScenes.filter((s) => s.video_url).map((scene) => (
                    <Button
                      key={scene.id}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        handleDownload(
                          scene.video_url!,
                          `escena-${scene.orden}.${format}`
                        )
                      }
                    >
                      <Download className="h-3.5 w-3.5" />
                      Escena {scene.orden}
                    </Button>
                  ))}
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => toast.info('Proximamente')}
              >
                <Archive className="h-3.5 w-3.5" />
                Descargar Todo (ZIP)
              </Button>
            </div>
          </div>
        ) : isExported ? (
          <div className="space-y-4 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-green-400">
              <Check className="h-5 w-5" />
              Video exportado exitosamente
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {approvedScenes
                .filter((s) => s.video_url)
                .map((scene) => (
                  <Button
                    key={scene.id}
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      handleDownload(
                        scene.video_url!,
                        `escena-${scene.orden}.${format}`
                      )
                    }
                  >
                    <Download className="h-4 w-4" />
                    Descargar Escena {scene.orden}
                  </Button>
                ))}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open('/medios', '_blank')}
              >
                <Library className="h-4 w-4" />
                Ver en Medios
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => toast.info('Proximamente')}
              >
                <Archive className="h-4 w-4" />
                Descargar Todo (ZIP)
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={() => exportPipeline(format)}
              disabled={isLoading || approvedScenes.length === 0}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {isExporting ? 'Exportando...' : 'Exportar al CRM'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

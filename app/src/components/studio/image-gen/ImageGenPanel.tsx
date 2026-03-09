import { useState } from 'react'
import { Sparkles, Download, Upload, Trash2, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/stores/studioStore'
import type { StudioGeneration } from '@/services/api'

const stylePresets = [
  { id: null, label: 'Personalizado' },
  { id: 'product', label: 'Producto' },
  { id: 'social', label: 'Social Media' },
  { id: 'cinematic', label: 'Cinematico' },
] as const

const aspectRatios = [
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
] as const

interface ImageGenPanelProps {
  projectId: number
}

export function ImageGenPanel({ projectId }: ImageGenPanelProps) {
  const { generations, isGenerating, generateImage, exportToMedia, deleteGeneration } =
    useStudioStore()

  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState('1:1')

  const imageGenerations = generations.filter((g) => g.tipo === 'image')

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    await generateImage({
      project_id: projectId,
      prompt: prompt.trim(),
      style_preset: stylePreset,
      aspect_ratio: aspectRatio,
    })
  }

  const handleDownload = (gen: StudioGeneration) => {
    if (gen.url_salida) {
      window.open(gen.url_salida, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="card-modern p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Prompt</label>
          <Textarea
            placeholder="Describe la imagen que quieres generar..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Style Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">Estilo</label>
          <div className="flex flex-wrap gap-2">
            {stylePresets.map((preset) => (
              <button
                key={preset.id ?? 'custom'}
                onClick={() => setStylePreset(preset.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                  stylePreset === preset.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tamano</label>
          <div className="flex gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => setAspectRatio(ratio.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                  aspectRatio === ratio.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generar Imagen
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {imageGenerations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resultados
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imageGenerations.map((gen) => (
              <GenerationCard
                key={gen.id}
                generation={gen}
                onExport={() => exportToMedia(gen.id)}
                onDownload={() => handleDownload(gen)}
                onDelete={() => deleteGeneration(gen.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GenerationCard({
  generation,
  onExport,
  onDownload,
  onDelete,
}: {
  generation: StudioGeneration
  onExport: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const isComplete = generation.estado === 'complete'
  const isFailed = generation.estado === 'failed'
  const isGenerating = generation.estado === 'generating' || generation.estado === 'pending'

  return (
    <div className="card-modern overflow-hidden group">
      {/* Image Preview */}
      <div className="aspect-square bg-muted/30 relative">
        {isComplete && generation.url_salida ? (
          <img
            src={generation.url_salida}
            alt={generation.prompt}
            className="w-full h-full object-cover"
          />
        ) : isGenerating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <ImageIcon className="h-8 w-8 text-destructive mb-2" />
            <p className="text-xs text-destructive text-center">
              {generation.mensaje_error || 'Error'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Info & Actions */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-2">{generation.prompt}</p>
        {isComplete && (
          <div className="flex gap-1">
            {!generation.media_id_salida ? (
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-7" onClick={onExport}>
                <Upload className="h-3 w-3" />
                Exportar
              </Button>
            ) : (
              <span className="flex-1 text-xs text-emerald-500 flex items-center justify-center gap-1">
                <Upload className="h-3 w-3" />
                Exportado
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDownload}>
              <Download className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        {isFailed && (
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3 mr-1" />
            Eliminar
          </Button>
        )}
      </div>
    </div>
  )
}

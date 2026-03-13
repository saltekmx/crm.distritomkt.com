import { useState } from 'react'
import {
  Shuffle,
  Paintbrush,
  Expand,
  ArrowUpFromLine,
  Sparkles,
  Eraser,
  Download,
  Loader2,
  ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { studioApi } from '@/services/api'

export function EditTab() {
  const {
    selectedImageId,
    isGenerating,
    isUpscaling,
    isEnhancingImage,
    setShowInpaintOverlay,
    setShowOutpaintControls,
    createVariation,
    upscaleImage,
    autoEnhanceImage,
  } = useStudioAiStore()

  const generations = useStudioStore((s) => s.generations)
  const selectedGen = generations.find((g) => g.id === selectedImageId) ?? null

  const [isRemovingBg, setIsRemovingBg] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const disabled = !selectedImageId

  const handleRemoveBg = async () => {
    if (!selectedImageId || isRemovingBg) return
    setIsRemovingBg(true)
    try {
      const { data } = await studioApi.removeBackground(selectedImageId)
      useStudioStore.setState((s) => ({ generations: [data, ...s.generations] }))
      useStudioAiStore.getState().setSelectedImageId(data.id)
      toast.success('Fondo removido')
    } catch {
      toast.error('Error al quitar fondo')
    } finally {
      setIsRemovingBg(false)
    }
  }

  const handleExport = async () => {
    if (!selectedImageId || isExporting) return
    setIsExporting(true)
    try {
      const { data } = await studioApi.exportGeneration(selectedImageId)
      toast.success(data.mensaje || 'Asset exportado al CRM')
    } catch {
      toast.error('Error al exportar')
    } finally {
      setIsExporting(false)
    }
  }

  type OpButton = {
    label: string
    icon: React.ComponentType<{ className?: string }>
    action: () => void
    loading?: boolean
    loadingLabel?: string
  }

  const ops: OpButton[] = [
    {
      label: 'Variacion',
      icon: Shuffle,
      action: () => selectedImageId && createVariation(selectedImageId),
      loading: isGenerating,
      loadingLabel: 'Generando...',
    },
    {
      label: 'Inpaint',
      icon: Paintbrush,
      action: () => setShowInpaintOverlay(true),
    },
    {
      label: 'Outpaint',
      icon: Expand,
      action: () => setShowOutpaintControls(true),
    },
    {
      label: 'Auto mejorar',
      icon: Sparkles,
      action: () => selectedImageId && autoEnhanceImage(selectedImageId),
      loading: isEnhancingImage,
      loadingLabel: 'Mejorando...',
    },
    {
      label: 'Upscale 2×',
      icon: ArrowUpFromLine,
      action: () => selectedImageId && upscaleImage(selectedImageId, 2),
      loading: isUpscaling,
      loadingLabel: 'Escalando...',
    },
    {
      label: 'Upscale 4×',
      icon: ArrowUpFromLine,
      action: () => selectedImageId && upscaleImage(selectedImageId, 4),
      loading: isUpscaling,
      loadingLabel: 'Escalando...',
    },
    {
      label: 'Quitar fondo',
      icon: Eraser,
      action: handleRemoveBg,
      loading: isRemovingBg,
      loadingLabel: 'Procesando...',
    },
    {
      label: 'Exportar',
      icon: Download,
      action: handleExport,
      loading: isExporting,
      loadingLabel: 'Exportando...',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-200">Editar</h2>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          Operaciones de edicion con IA
        </p>
      </div>

      {/* Selected image context */}
      {selectedGen ? (
        <div className="px-4 py-3 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              {selectedGen.url_salida ? (
                <img
                  src={selectedGen.url_salida}
                  alt={selectedGen.prompt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-zinc-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-300 line-clamp-2 leading-tight">
                {selectedGen.prompt}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {selectedGen.modelo && (
                  <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                    {selectedGen.modelo.split('-').slice(0, 2).join('-')}
                  </span>
                )}
                <span className="text-[9px] text-zinc-600">{selectedGen.aspect_ratio}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-6 text-center border-b border-zinc-800/60 shrink-0">
          <ImageIcon className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">Selecciona una imagen para editar</p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Haz clic en una tarjeta del tablero
          </p>
        </div>
      )}

      {/* Operations grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          {ops.map(({ label, icon: Icon, action, loading, loadingLabel }) => (
            <button
              key={label}
              onClick={action}
              disabled={disabled || loading}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all',
                disabled || loading
                  ? 'border-zinc-800/40 bg-zinc-900/40 text-zinc-700 cursor-not-allowed'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-zinc-100 active:scale-95',
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-center leading-tight">
                {loading && loadingLabel ? loadingLabel : label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

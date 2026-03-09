import {
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  Crop,
  Undo2,
  Redo2,
  RefreshCcw,
  Eraser,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { studioApi } from '@/services/api'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import {
  useStudioCanvasStore,
  type EditType,
  type AspectPreset,
} from '@/stores/studioCanvasStore'

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
      {children}
    </h3>
  )
}

// ─── Transform Button ────────────────────────────────────────────────────────

function TransformButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 hover:border-zinc-600/50 transition-all"
      title={label}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  )
}

// ─── Adjustment Slider Row ───────────────────────────────────────────────────

function AdjustmentSlider({
  label,
  type,
  value,
  onValueChange,
}: {
  label: string
  type: EditType
  value: number
  onValueChange: (type: EditType, v: number) => void
}) {
  const handleChange = useCallback(
    ([v]: number[]) => {
      onValueChange(type, v)
    },
    [type, onValueChange],
  )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <span
          className={cn(
            'text-xs font-mono tabular-nums min-w-[32px] text-right',
            value === 0 ? 'text-zinc-600' : 'text-violet-400',
          )}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleChange}
        min={-100}
        max={100}
        step={1}
        className="[&_[data-slot=slider-track]]:bg-zinc-800 [&_[data-slot=slider-range]]:bg-violet-500/60 [&_[data-slot=slider-thumb]]:bg-violet-400 [&_[data-slot=slider-thumb]]:border-violet-500 [&_[data-slot=slider-thumb]]:size-3"
      />
    </div>
  )
}

// ─── Crop Aspect Preset Button ───────────────────────────────────────────────

function AspectButton({
  label,
  preset,
  active,
  onClick,
}: {
  label: string
  preset: AspectPreset
  active: boolean
  onClick: (preset: AspectPreset) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(preset)}
      className={cn(
        'px-2.5 py-1 rounded text-[11px] font-medium transition-all',
        active
          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
          : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600/50',
      )}
    >
      {label}
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdjustTab() {
  const selectedImageId = useStudioAiStore((s) => s.selectedImageId)
  const imageId = selectedImageId ?? 0

  const store = useStudioCanvasStore()
  const imgState = store.getImageState(imageId)

  const addEdit = useCallback((edit: { type: EditType; value: number | import('@/stores/studioCanvasStore').CropRect }) => store.addEdit(imageId, edit), [store, imageId])
  const undo = useCallback(() => store.undo(imageId), [store, imageId])
  const redo = useCallback(() => store.redo(imageId), [store, imageId])
  const canUndo = useCallback(() => store.canUndo(imageId), [store, imageId])
  const canRedo = useCallback(() => store.canRedo(imageId), [store, imageId])
  const setCropping = useCallback((v: boolean) => store.setCropping(imageId, v), [store, imageId])
  const setCropAspect = useCallback((preset: AspectPreset) => store.setCropAspect(imageId, preset), [store, imageId])
  const resetEdits = useCallback(() => store.resetEdits(imageId), [store, imageId])

  const cropAspect = imgState.cropAspect
  const edits = imgState.edits

  // Derive current slider values from the edit stack (last value of each type)
  const currentValues = useMemo(() => {
    let brightness = 0
    let contrast = 0
    let saturation = 0

    for (const edit of edits) {
      if (edit.type === 'brightness') brightness = edit.value as number
      if (edit.type === 'contrast') contrast = edit.value as number
      if (edit.type === 'saturation') saturation = edit.value as number
    }

    return { brightness, contrast, saturation }
  }, [edits])

  const handleFlipH = useCallback(() => {
    addEdit({ type: 'flip-h', value: 1 })
  }, [addEdit])

  const handleFlipV = useCallback(() => {
    addEdit({ type: 'flip-v', value: 1 })
  }, [addEdit])

  const handleRotateCCW = useCallback(() => {
    addEdit({ type: 'rotate', value: -90 })
  }, [addEdit])

  const handleRotateCW = useCallback(() => {
    addEdit({ type: 'rotate', value: 90 })
  }, [addEdit])

  const handleSliderChange = useCallback(
    (type: EditType, value: number) => {
      addEdit({ type, value })
    },
    [addEdit],
  )

  const handleCrop = useCallback(() => {
    setCropping(true)
  }, [setCropping])

  const handleAspectChange = useCallback(
    (preset: AspectPreset) => {
      setCropAspect(preset)
    },
    [setCropAspect],
  )

  const hasEdits = canUndo()
  const autoEnhanceImage = useStudioAiStore((s) => s.autoEnhanceImage)
  const isEnhancingImage = useStudioAiStore((s) => s.isEnhancingImage)
  const [isRemovingBg, setIsRemovingBg] = useState(false)

  const handleRemoveBg = useCallback(async () => {
    if (!selectedImageId || isRemovingBg) return
    setIsRemovingBg(true)
    try {
      const { data } = await studioApi.removeBackground(selectedImageId)
      useStudioStore.setState((s) => ({
        generations: [data, ...s.generations],
      }))
      useStudioAiStore.getState().setSelectedImageId(data.id)
      toast.success('Fondo removido')
    } catch {
      toast.error('Error al quitar fondo')
    } finally {
      setIsRemovingBg(false)
    }
  }, [selectedImageId, isRemovingBg])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60">
        <h2 className="text-sm font-semibold text-zinc-200">Ajustes</h2>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          Transforma, ajusta y recorta
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* ── Transformar ── */}
        <div>
          <SectionHeader>Transformar</SectionHeader>
          <div className="grid grid-cols-4 gap-1.5">
            <TransformButton
              icon={FlipHorizontal2}
              label="Flip H"
              onClick={handleFlipH}
            />
            <TransformButton
              icon={FlipVertical2}
              label="Flip V"
              onClick={handleFlipV}
            />
            <TransformButton
              icon={RotateCcw}
              label="Rot -90"
              onClick={handleRotateCCW}
            />
            <TransformButton
              icon={RotateCw}
              label="Rot +90"
              onClick={handleRotateCW}
            />
          </div>
        </div>

        {/* ── Ajustar ── */}
        <div>
          <SectionHeader>Ajustar</SectionHeader>
          <div className="space-y-4">
            <AdjustmentSlider
              label="Brillo"
              type="brightness"
              value={currentValues.brightness}
              onValueChange={handleSliderChange}
            />
            <AdjustmentSlider
              label="Contraste"
              type="contrast"
              value={currentValues.contrast}
              onValueChange={handleSliderChange}
            />
            <AdjustmentSlider
              label="Saturacion"
              type="saturation"
              value={currentValues.saturation}
              onValueChange={handleSliderChange}
            />
          </div>
        </div>

        {/* ── Recortar ── */}
        <div>
          <SectionHeader>Recortar</SectionHeader>
          <button
            type="button"
            onClick={handleCrop}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 hover:border-zinc-600/50 transition-all text-sm"
          >
            <Crop className="h-4 w-4" />
            <span>Recortar imagen</span>
          </button>
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="text-[10px] text-zinc-600 mr-1">Aspecto:</span>
            <AspectButton
              label="Libre"
              preset="free"
              active={cropAspect === 'free'}
              onClick={handleAspectChange}
            />
            <AspectButton
              label="1:1"
              preset="1:1"
              active={cropAspect === '1:1'}
              onClick={handleAspectChange}
            />
            <AspectButton
              label="16:9"
              preset="16:9"
              active={cropAspect === '16:9'}
              onClick={handleAspectChange}
            />
            <AspectButton
              label="9:16"
              preset="9:16"
              active={cropAspect === '9:16'}
              onClick={handleAspectChange}
            />
          </div>
        </div>

        {/* ── IA ── */}
        <div>
          <SectionHeader>IA</SectionHeader>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => selectedImageId && autoEnhanceImage(selectedImageId)}
              disabled={!selectedImageId || isEnhancingImage}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                selectedImageId && !isEnhancingImage
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
              )}
            >
              {isEnhancingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isEnhancingImage ? 'Mejorando...' : 'Auto mejorar'}
            </button>
            <button
              type="button"
              onClick={handleRemoveBg}
              disabled={!selectedImageId || isRemovingBg}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                selectedImageId && !isRemovingBg
                  ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25'
                  : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
              )}
            >
              {isRemovingBg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="h-4 w-4" />
              )}
              {isRemovingBg ? 'Procesando...' : 'Quitar fondo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Acciones (sticky bottom) ── */}
      <div className="px-4 py-3 border-t border-zinc-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo()}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
              canUndo()
                ? 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60'
                : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
            )}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Deshacer
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo()}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
              canRedo()
                ? 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/60'
                : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
            )}
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
            Rehacer
          </button>
        </div>
        <button
          type="button"
          onClick={resetEdits}
          disabled={!hasEdits}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all',
            hasEdits
              ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-zinc-900/40 border border-zinc-800/30 text-zinc-700 cursor-not-allowed',
          )}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Restablecer todo
        </button>
      </div>
    </div>
  )
}

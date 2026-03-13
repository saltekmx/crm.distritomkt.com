import { useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore } from '@/stores/studioAiStore'

const stylePresets = [
  { id: null, label: 'Auto' },
  { id: 'product', label: 'Producto' },
  { id: 'social', label: 'Social' },
  { id: 'cinematic', label: 'Cinematico' },
] as const

// All known ratios — models filter this list via aspect_ratios
const ALL_ASPECT_RATIOS = ['1:1', '4:5', '3:4', '16:9', '9:16', '3:2', '2:3', '5:4']

const outputFormats = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'webp', label: 'WEBP' },
] as const

export function QuickControls() {
  const {
    selectedStyle,
    selectedRatio,
    selectedModel,
    availableModels,
    batchSize,
    outputFormat,
    seed,
    seedLocked,
    setSelectedStyle,
    setSelectedRatio,
    setSelectedModel,
    setBatchSize,
    setOutputFormat,
    setSeed,
    setSeedLocked,
    loadModels,
  } = useStudioAiStore()

  useEffect(() => {
    if (availableModels.length === 0) loadModels()
  }, [availableModels.length, loadModels])

  const currentModelInfo = availableModels.find((m) => m.id === selectedModel)
  const maxBatch = currentModelInfo?.max_batch ?? 1

  // Ratios supported by the current model (fall back to a default set)
  const allowedRatios: string[] =
    currentModelInfo?.aspect_ratios?.length
      ? ALL_ASPECT_RATIOS.filter((r) => currentModelInfo.aspect_ratios.includes(r))
      : ALL_ASPECT_RATIOS.slice(0, 6)

  // If selected ratio is not allowed by this model, snap to first allowed
  useEffect(() => {
    if (allowedRatios.length > 0 && !allowedRatios.includes(selectedRatio)) {
      setSelectedRatio(allowedRatios[0])
    }
  }, [selectedModel, allowedRatios, selectedRatio, setSelectedRatio])

  // Per-model exact pixel dimensions (e.g. recraft-v4-pro)
  const modelDimensions = currentModelInfo?.dimensions ?? null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Model selector */}
      {availableModels.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 mr-1">Modelo</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.price_hint}){m.img2img_mode ? ' ✦img2img' : ''}
              </option>
            ))}
          </select>
          {currentModelInfo?.img2img_mode && (
            <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium">
              img2img
            </span>
          )}
        </div>
      )}

      {availableModels.length > 0 && <div className="h-4 w-px bg-zinc-700" />}

      {/* Style presets */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 mr-1">Estilo</span>
        {stylePresets.map((preset) => (
          <button
            key={preset.id ?? 'auto'}
            onClick={() => setSelectedStyle(preset.id)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
              selectedStyle === preset.id
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-zinc-700" />

      {/* Aspect ratios — filtered to model's allowed ratios */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 mr-1">Ratio</span>
        {allowedRatios.map((ratio) => {
          const dimLabel = modelDimensions?.[ratio]
            ? ` ${modelDimensions[ratio].split('x')[0]}px`
            : ''
          return (
            <button
              key={ratio}
              onClick={() => setSelectedRatio(ratio)}
              title={modelDimensions?.[ratio] ? `${modelDimensions[ratio]} px` : ratio}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                selectedRatio === ratio
                  ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
              )}
            >
              {ratio}
              {dimLabel && (
                <span className="ml-1 text-[10px] text-zinc-600">{dimLabel}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Batch size — only show if model supports it */}
      {maxBatch > 1 && (
        <>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-1">Lote</span>
            {[1, 2, 4].filter((n) => n <= maxBatch).map((n) => (
              <button
                key={n}
                onClick={() => setBatchSize(n)}
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-medium transition-all',
                  batchSize === n
                    ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                )}
              >
                {n}x
              </button>
            ))}
          </div>
        </>
      )}

      {/* Output format */}
      <div className="h-4 w-px bg-zinc-700" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 mr-1">Formato</span>
        {outputFormats.map((f) => (
          <button
            key={f.id}
            onClick={() => setOutputFormat(f.id)}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium transition-all',
              outputFormat === f.id
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Seed */}
      <div className="h-4 w-px bg-zinc-700" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 mr-1">Seed</span>
        <input
          type="number"
          value={seed ?? ''}
          onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
          placeholder="Auto"
          className="w-20 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => setSeedLocked(!seedLocked)}
          className={cn(
            'p-1 rounded-md text-xs transition-all',
            seedLocked
              ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
          )}
          title={seedLocked ? 'Desbloquear seed' : 'Bloquear seed'}
        >
          {seedLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </button>
      </div>

      {/* Cost estimate */}
      {currentModelInfo && (
        <>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-600">~</span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {currentModelInfo.price_hint}{batchSize > 1 ? ` ×${batchSize}` : ''}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

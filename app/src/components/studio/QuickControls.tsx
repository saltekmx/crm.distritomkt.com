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

const aspectRatios = [
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: '3:4', label: '3:4' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '3:2', label: '3:2' },
] as const

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
                {m.name} ({m.price_hint})
              </option>
            ))}
          </select>
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

      {/* Aspect ratios */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500 mr-1">Ratio</span>
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.id}
            onClick={() => setSelectedRatio(ratio.id)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
              selectedRatio === ratio.id
                ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            {ratio.label}
          </button>
        ))}
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

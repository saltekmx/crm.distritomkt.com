import React, { useEffect, useState } from 'react'
import { X, Expand, Loader2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudioAiStore } from '@/stores/studioAiStore'

interface OutpaintControlsProps {
  generationId: number
}

interface ExpandFieldProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: number
  onChange: (v: number) => void
}

function ExpandField({ label, icon: Icon, value, onChange }: ExpandFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
      <span className="text-xs text-zinc-400 w-16">{label}</span>
      <div className="flex items-center gap-1 flex-1">
        <button
          onClick={() => onChange(Math.max(0, value - 64))}
          className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs"
        >
          -
        </button>
        <span className="text-xs text-zinc-100 w-12 text-center font-mono">{value}px</span>
        <button
          onClick={() => onChange(Math.min(512, value + 64))}
          className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:text-zinc-100 text-xs"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function OutpaintControls({ generationId }: OutpaintControlsProps) {
  const [expandLeft, setExpandLeft] = useState(0)
  const [expandRight, setExpandRight] = useState(256)
  const [expandUp, setExpandUp] = useState(0)
  const [expandDown, setExpandDown] = useState(0)
  const [prompt, setPrompt] = useState('')

  const {
    setShowOutpaintControls,
    outpaintGeneration,
    isGenerating,
    consumePendingPrompt,
  } = useStudioAiStore()

  // Pre-fill prompt from agent suggestion on mount
  useEffect(() => {
    const p = consumePendingPrompt()
    if (p) setPrompt(p)
  // consumePendingPrompt is stable (Zustand action), run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalExpansion = expandLeft + expandRight + expandUp + expandDown

  const handleGenerate = async () => {
    if (!totalExpansion) return
    await outpaintGeneration(generationId, {
      prompt: prompt.trim() || undefined,
      expand_left: expandLeft,
      expand_right: expandRight,
      expand_up: expandUp,
      expand_down: expandDown,
    })
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-zinc-900 border-t border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Expand className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-100">Outpaint — Expandir Lienzo</span>
        </div>
        <button
          onClick={() => setShowOutpaintControls(false)}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ExpandField
          label="Izquierda"
          icon={ArrowLeft}
          value={expandLeft}
          onChange={setExpandLeft}
        />
        <ExpandField
          label="Derecha"
          icon={ArrowRight}
          value={expandRight}
          onChange={setExpandRight}
        />
        <ExpandField
          label="Arriba"
          icon={ArrowUp}
          value={expandUp}
          onChange={setExpandUp}
        />
        <ExpandField
          label="Abajo"
          icon={ArrowDown}
          value={expandDown}
          onChange={setExpandDown}
        />
      </div>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Descripcion del area expandida (opcional)..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
      />

      <Button
        onClick={handleGenerate}
        disabled={!totalExpansion || isGenerating}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        size="sm"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Expand className="h-4 w-4 mr-2" />
        )}
        Expandir
      </Button>
    </div>
  )
}

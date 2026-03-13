import { X, Trash2, Clock } from 'lucide-react'
import { useStudioAiStore } from '@/stores/studioAiStore'

interface PromptHistoryProps {
  onSelect: (prompt: string) => void
  onClose: () => void
}

export function PromptHistory({ onSelect, onClose }: PromptHistoryProps) {
  const { promptHistory } = useStudioAiStore()

  const handleClear = () => {
    localStorage.removeItem('studio-prompt-history')
    useStudioAiStore.setState({ promptHistory: [] })
  }

  if (promptHistory.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-850 bg-zinc-900 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <Clock className="h-3 w-3" />
            Historial
          </div>
          <button onClick={onClose} className="p-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 text-center py-2">Sin historial de prompts</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 max-h-48 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <Clock className="h-3 w-3" />
          Historial
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClear}
            className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
            title="Limpiar historial"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button onClick={onClose} className="p-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-thin">
        {promptHistory.map((prompt, i) => (
          <button
            key={`${prompt}-${i}`}
            onClick={() => onSelect(prompt)}
            className="w-full text-left px-3 py-2 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors border-b border-zinc-800/50 last:border-0 line-clamp-2"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

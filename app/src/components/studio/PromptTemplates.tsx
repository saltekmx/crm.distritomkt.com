import { useEffect, useState } from 'react'
import { X, Loader2, Trash2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore } from '@/stores/studioAiStore'

// ---- Save Template Form ----

interface SaveTemplateFormProps {
  prompt: string
  onClose: () => void
}

export function SaveTemplateForm({ prompt, onClose }: SaveTemplateFormProps) {
  const { saveTemplate, selectedStyle, selectedRatio, negativePrompt } = useStudioAiStore()
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !prompt.trim()) return
    setIsSaving(true)
    await saveTemplate({
      name: name.trim(),
      prompt: prompt.trim(),
      negative_prompt: negativePrompt || null,
      style_preset: selectedStyle,
      aspect_ratio: selectedRatio,
    })
    setIsSaving(false)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-400">Guardar como plantilla</span>
        <button onClick={onClose} className="p-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre de la plantilla..."
        autoFocus
        className="w-full px-2.5 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 mb-2"
      />

      <div className="bg-zinc-800/50 rounded-md p-2 mb-2">
        <p className="text-[10px] text-zinc-500 line-clamp-2">{prompt}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            name.trim() && !isSaving
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Guardar
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ---- Load Templates ----

interface LoadTemplatesProps {
  onSelect: (prompt: string) => void
  onClose: () => void
}

export function LoadTemplates({ onSelect, onClose }: LoadTemplatesProps) {
  const { templates, isLoadingTemplates, loadTemplates, deleteTemplate } = useStudioAiStore()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setDeletingId(id)
    await deleteTemplate(id)
    setDeletingId(null)
  }

  if (isLoadingTemplates) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 max-h-56 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <FileText className="h-3 w-3" />
          Plantillas
        </div>
        <button onClick={onClose} className="p-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-[11px] text-zinc-600">Sin plantillas guardadas</p>
        </div>
      ) : (
        <div className="overflow-y-auto scrollbar-thin">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl.prompt)}
              className="w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 font-medium truncate">{tpl.nombre}</p>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-tight">{tpl.prompt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {tpl.estilo && (
                      <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                        {tpl.estilo}
                      </span>
                    )}
                    <span className="text-[9px] text-zinc-600">{tpl.aspect_ratio}</span>
                  </div>
                </div>
                <div
                  onClick={(e) => handleDelete(e, tpl.id)}
                  className="p-1 rounded text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  {deletingId === tpl.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

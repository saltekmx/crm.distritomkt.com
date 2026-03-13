import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Send,
  Loader2,
  Trash2,
  Sparkles,
  Copy,
  Shuffle,
  ImageIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Save,
  X,
  Wand2,
  Video,
  Hammer,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useStudioAiStore, type StudioAiMessage } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { usePipelineStore } from '@/stores/pipelineStore'
import type { StudioGeneration } from '@/services/api'
import { aiApi } from '@/services/api'
import { PromptHistory } from '../PromptHistory'
import { SaveTemplateForm, LoadTemplates } from '../PromptTemplates'

interface GenerateTabProps {
  projectId: number
}

export function GenerateTab({ projectId }: GenerateTabProps) {
  const {
    messages,
    isGenerating,
    isEnhancing,
    selectedImageId,
    negativePrompt,
    referenceImageUrl,
    pendingPrompt,
    leftTab,
    sendMessage,
    clearMessages,
    enhancePrompt,
    setSelectedStyle,
    setSelectedRatio,
    setNegativePrompt,
    setReferenceImageUrl,
    loadPromptHistory,
    consumePendingPrompt,
  } = useStudioAiStore()

  const availableModels = useStudioAiStore((s) => s.availableModels)
  const selectedModel = useStudioAiStore((s) => s.selectedModel)
  const selectedModelInfo = availableModels.find((m) => m.id === selectedModel)
  const modelSupportsImg2img = (selectedModelInfo?.supports_editing ?? false) && !!selectedModelInfo?.img2img_mode

  const generations = useStudioStore((s) => s.generations)
  const activeImage = generations.find((g) => g.id === selectedImageId) ?? null

  // Pipeline store for video mode
  const { activeSceneId, pipeline, submitRevision } = usePipelineStore()

  // Detect video mode
  const activeScene = pipeline?.escenas?.find((s) => s.id === activeSceneId) ?? null
  const studioMode = useStudioAiStore((s) => s.studioMode)
  const isVideoMode = studioMode === 'video' && activeSceneId != null

  const [input, setInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showLoadTemplates, setShowLoadTemplates] = useState(false)
  const [isRefDragOver, setIsRefDragOver] = useState(false)
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false)
  const [showPromptBuilder, setShowPromptBuilder] = useState(false)
  const [pbSujeto, setPbSujeto] = useState('')
  const [pbAccion, setPbAccion] = useState('')
  const [pbAmbiente, setPbAmbiente] = useState('')
  const [pbEstilo, setPbEstilo] = useState('')
  const [pbIluminacion, setPbIluminacion] = useState('')
  const [pbCamara, setPbCamara] = useState('')
  const [isUploadingRef, setIsUploadingRef] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    scrollToBottom()
  }, [messages, isGenerating])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    loadPromptHistory()
  }, [loadPromptHistory])

  // Pick up prompt from duplicate / re-generate action
  useEffect(() => {
    if (pendingPrompt) {
      const prompt = consumePendingPrompt()
      if (prompt) {
        setInput(prompt)
        inputRef.current?.focus()
      }
    }
  }, [pendingPrompt, consumePendingPrompt])

  // Auto-assemble prompt from builder fields (Task 4)
  useEffect(() => {
    if (!showPromptBuilder) return
    const parts: string[] = []
    if (pbSujeto.trim()) parts.push(pbSujeto.trim())
    if (pbAccion.trim()) parts.push(pbAccion.trim())
    if (pbAmbiente.trim()) parts.push(pbAmbiente.trim())
    if (pbEstilo.trim()) parts.push(`estilo: ${pbEstilo.trim()}`)
    if (pbIluminacion) parts.push(`iluminacion: ${pbIluminacion}`)
    if (pbCamara) parts.push(`angulo de camara: ${pbCamara}`)
    if (parts.length > 0) {
      setInput(parts.join(', '))
    }
  }, [showPromptBuilder, pbSujeto, pbAccion, pbAmbiente, pbEstilo, pbIluminacion, pbCamara])

  const handleSend = async () => {
    if (!input.trim()) return

    // Video mode: submit revision to pipeline store
    if (isVideoMode && activeSceneId) {
      if (isSubmittingRevision) return
      setIsSubmittingRevision(true)
      try {
        await submitRevision(activeSceneId, input.trim())
        toast.success('Revision enviada - regenerando escena...')
        setInput('')
      } catch {
        toast.error('Error al enviar revision')
      } finally {
        setIsSubmittingRevision(false)
      }
      return
    }

    // Image mode: existing logic
    if (isGenerating) return
    sendMessage(input.trim(), projectId)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVariation = () => {
    if (!activeImage || isGenerating) return
    sendMessage(activeImage.prompt, projectId)
  }

  const handleRefine = (prefix: string) => {
    if (!activeImage) return
    setInput(`${prefix}: ${activeImage.prompt}`)
    inputRef.current?.focus()
  }

  const handleCopyPrompt = () => {
    if (!activeImage) return
    navigator.clipboard.writeText(activeImage.prompt)
    toast.success('Prompt copiado')
  }

  const handleUseStyle = (style: string | null, ratio: string) => {
    setSelectedStyle(style)
    setSelectedRatio(ratio)
    toast.success('Estilo aplicado')
  }

  const handleEnhance = async () => {
    if (!input.trim() || isEnhancing) return
    const enhanced = await enhancePrompt(input.trim())
    setInput(enhanced)
    toast.success('Prompt mejorado')
  }

  const handleUseCurrentImage = () => {
    if (!activeImage?.url_salida) return
    setReferenceImageUrl(activeImage.url_salida)
    setShowRefImage(true)
    toast.success('Imagen de referencia establecida')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen')
      return
    }
    setIsUploadingRef(true)
    try {
      const { data } = await aiApi.uploadFiles([file])
      if (data.length > 0) {
        setReferenceImageUrl(data[0].url)
        setShowRefImage(true)
        toast.success('Imagen de referencia subida')
      }
    } catch {
      toast.error('Error al subir imagen')
    } finally {
      setIsUploadingRef(false)
      // Reset input so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRefDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRefDragOver(false)

    // Gallery image dragged in
    const imageUrl = e.dataTransfer.getData('application/x-studio-image') || e.dataTransfer.getData('text/plain')
    if (imageUrl && imageUrl.startsWith('http')) {
      setReferenceImageUrl(imageUrl)
      return
    }

    // File dropped from disk
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setIsUploadingRef(true)
    try {
      const { data } = await aiApi.uploadFiles([file])
      if (data.length > 0) {
        setReferenceImageUrl(data[0].url)
        toast.success('Imagen de referencia subida')
      }
    } catch {
      toast.error('Error al subir imagen')
    } finally {
      setIsUploadingRef(false)
    }
  }

  const handleHistorySelect = (prompt: string) => {
    setInput(prompt)
    setShowHistory(false)
    inputRef.current?.focus()
  }

  const handleTemplateLoad = (prompt: string) => {
    setInput(prompt)
    setShowLoadTemplates(false)
    inputRef.current?.focus()
  }

  const isBusy = isVideoMode ? isSubmittingRevision : isGenerating

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          {isVideoMode ? (
            <>
              <Video className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-zinc-200">Revision de Video</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium text-zinc-200">AI Generador</span>
            </>
          )}
        </div>
        {!isVideoMode && messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Limpiar chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Video Mode: Scene context bar */}
      {isVideoMode && activeScene && (
        <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700">
          <div className="flex items-center gap-2 text-violet-400 mb-1">
            <Video className="h-3 w-3" />
            <span className="text-xs font-medium">Escena {activeScene.orden}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-xs text-zinc-400 truncate">
              {activeScene.descripcion
                ? activeScene.descripcion.length > 60
                  ? activeScene.descripcion.slice(0, 60) + '...'
                  : activeScene.descripcion
                : 'Sin descripcion'}
            </span>
          </div>
          {activeScene.video_prompt && (
            <div className="text-zinc-500 line-clamp-2 font-mono text-[11px]">
              {activeScene.video_prompt.length > 120
                ? activeScene.video_prompt.slice(0, 120) + '...'
                : activeScene.video_prompt}
            </div>
          )}
        </div>
      )}

      {/* Active Image Context (image mode only) */}
      {!isVideoMode && activeImage && (
        <ImageContextBar
          generation={activeImage}
          onVariation={handleVariation}
          onCopyPrompt={handleCopyPrompt}
          onRefine={handleRefine}
          onUseStyle={handleUseStyle}
          isGenerating={isGenerating}
        />
      )}

      {/* Reference Image — always visible in image mode */}
      {!isVideoMode && (
        <div className="border-b border-zinc-800 px-3 py-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          {referenceImageUrl ? (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                <img src={referenceImageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-400 font-medium">Referencia img2img</p>
                {!modelSupportsImg2img && (
                  <p className="text-[10px] text-amber-500">Modelo actual no soporta img2img — cambia a FLUX Dev</p>
                )}
              </div>
              <button
                onClick={() => setReferenceImageUrl(null)}
                className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
                title="Quitar referencia"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : modelSupportsImg2img ? (
            <div
              onDrop={handleRefDrop}
              onDragOver={(e) => { e.preventDefault(); setIsRefDragOver(true) }}
              onDragEnter={(e) => { e.preventDefault(); setIsRefDragOver(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsRefDragOver(false) }}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 transition-all cursor-pointer',
                isRefDragOver
                  ? 'border-violet-500/60 bg-violet-500/5'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingRef ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500 shrink-0" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              )}
              <span className="text-xs text-zinc-500">
                {isRefDragOver ? 'Suelta aquí' : 'Referencia img2img — arrastra o haz clic'}
              </span>
              {activeImage?.url_salida && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleUseCurrentImage() }}
                  className="ml-auto text-[10px] text-violet-400 hover:text-violet-300 whitespace-nowrap shrink-0"
                >
                  Usar actual
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-800 px-3 py-2 opacity-50 cursor-not-allowed">
              <Upload className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
              <span className="text-xs text-zinc-600">img2img — solo disponible con FLUX Dev</span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Video mode empty state */}
        {isVideoMode && activeScene && (
          <div className="flex flex-col items-center text-center px-2 pt-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
              <Video className="h-7 w-7 text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">Revision de Escena</h3>
            <p className="text-xs text-zinc-500 max-w-[260px]">
              Describe los cambios que quieres para esta escena. La IA revisara el prompt y regenerara el video.
            </p>

            {/* Video revision suggestions */}
            <div className="mt-4 space-y-2 w-full">
              {[
                'Hacer el movimiento de camara mas lento',
                'Cambiar la iluminacion a tonos calidos',
                'Agregar mas profundidad de campo',
                'Hacer la transicion mas suave',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:border-violet-500/50 hover:text-zinc-300 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image mode empty states */}
        {!isVideoMode && messages.length === 0 && !activeImage && <EmptyState onSelect={setInput} />}

        {!isVideoMode && messages.length === 0 && activeImage && (
          <div className="flex flex-col items-center text-center px-2 pt-4">
            <p className="text-xs text-zinc-500 max-w-[260px]">
              Describe variaciones o refinamientos para la imagen actual, o escribe un prompt nuevo.
            </p>
          </div>
        )}

        {!isVideoMode && messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {!isVideoMode && isGenerating && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs px-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generando imagen...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Advanced Options (collapsible, image mode only) */}
      {!isVideoMode && (
        <div className="border-t border-zinc-800">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            <span>Opciones avanzadas</span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showAdvanced && (
            <div className="px-4 pb-3 space-y-2">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">
                  Prompt negativo
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Lo que NO quieres en la imagen..."
                  rows={2}
                  className="w-full resize-none rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-zinc-800 p-3">
        {/* Load Templates overlay (image mode only) */}
        {!isVideoMode && showLoadTemplates && (
          <div className="mb-2">
            <LoadTemplates
              onSelect={handleTemplateLoad}
              onClose={() => setShowLoadTemplates(false)}
            />
          </div>
        )}

        {/* Save Template form (image mode only) */}
        {!isVideoMode && showSaveTemplate && (
          <div className="mb-2">
            <SaveTemplateForm
              prompt={input}
              onClose={() => setShowSaveTemplate(false)}
            />
          </div>
        )}

        {/* Prompt History popover (image mode only) */}
        {!isVideoMode && showHistory && (
          <div className="mb-2">
            <PromptHistory
              onSelect={handleHistorySelect}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={handleEnhance}
            disabled={!input.trim() || isEnhancing}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors',
              input.trim() && !isEnhancing
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-zinc-600 cursor-not-allowed'
            )}
            title="Mejorar prompt con IA"
          >
            {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            Mejorar
          </button>

          {!isVideoMode && (
            <button
              onClick={() => setShowPromptBuilder(!showPromptBuilder)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors',
                showPromptBuilder
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'
              )}
              title="Prompt Builder"
            >
              <Hammer className="h-3 w-3" />
              Builder
            </button>
          )}

          {/* Image-only action buttons */}
          {!isVideoMode && (
            <>
              <button
                onClick={() => {
                  setShowHistory(!showHistory)
                  setShowSaveTemplate(false)
                  setShowLoadTemplates(false)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
                title="Historial de prompts"
              >
                <Clock className="h-3 w-3" />
                Historial
              </button>
              <button
                onClick={() => {
                  setShowSaveTemplate(!showSaveTemplate)
                  setShowHistory(false)
                  setShowLoadTemplates(false)
                }}
                disabled={!input.trim()}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors',
                  input.trim()
                    ? 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'
                    : 'text-zinc-700 cursor-not-allowed'
                )}
                title="Guardar como plantilla"
              >
                <Save className="h-3 w-3" />
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowLoadTemplates(!showLoadTemplates)
                  setShowHistory(false)
                  setShowSaveTemplate(false)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 transition-colors ml-auto"
                title="Cargar plantilla"
              >
                Plantillas
              </button>
            </>
          )}
        </div>

        {/* Prompt Builder (collapsible) */}
        {!isVideoMode && showPromptBuilder && (
          <div className="mb-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16 shrink-0">Sujeto</label>
              <input value={pbSujeto} onChange={(e) => setPbSujeto(e.target.value)} placeholder="un cafe latte con arte" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16 shrink-0">Accion</label>
              <input value={pbAccion} onChange={(e) => setPbAccion(e.target.value)} placeholder="sobre una mesa de madera" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16 shrink-0">Ambiente</label>
              <input value={pbAmbiente} onChange={(e) => setPbAmbiente(e.target.value)} placeholder="cafeteria moderna, luz natural" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16 shrink-0">Estilo</label>
              <input value={pbEstilo} onChange={(e) => setPbEstilo(e.target.value)} placeholder="fotografia profesional, macro" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16 shrink-0">Iluminacion</label>
              <select value={pbIluminacion} onChange={(e) => setPbIluminacion(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50">
                <option value="">-- Seleccionar --</option>
                <option value="Natural">Natural</option>
                <option value="Estudio">Estudio</option>
                <option value="Calida">Calida</option>
                <option value="Fria">Fria</option>
                <option value="Dramatica">Dramatica</option>
                <option value="Neon">Neon</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-zinc-500 w-16 shrink-0">Camara</label>
              <select value={pbCamara} onChange={(e) => setPbCamara(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50">
                <option value="">-- Seleccionar --</option>
                <option value="Primer plano">Primer plano</option>
                <option value="Plano medio">Plano medio</option>
                <option value="Plano general">Plano general</option>
                <option value="Cenital">Cenital</option>
                <option value="Bajo angulo">Bajo angulo</option>
                <option value="Macro">Macro</option>
              </select>
            </div>
            <button
              onClick={() => {
                const parts: string[] = []
                if (pbSujeto.trim()) parts.push(pbSujeto.trim())
                if (pbAccion.trim()) parts.push(pbAccion.trim())
                if (pbAmbiente.trim()) parts.push(pbAmbiente.trim())
                if (pbEstilo.trim()) parts.push(`estilo: ${pbEstilo.trim()}`)
                if (pbIluminacion) parts.push(`iluminacion: ${pbIluminacion}`)
                if (pbCamara) parts.push(`angulo de camara: ${pbCamara}`)
                if (parts.length > 0) {
                  setInput(parts.join(', '))
                  inputRef.current?.focus()
                }
              }}
              disabled={!pbSujeto.trim() && !pbAccion.trim() && !pbAmbiente.trim() && !pbEstilo.trim() && !pbIluminacion && !pbCamara}
              className="w-full mt-1 px-2 py-1.5 rounded-md text-xs font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generar prompt
            </button>
          </div>
        )}

        {/* Textarea + send */}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isVideoMode
                ? 'Describe cambios para esta escena...'
                : activeImage
                  ? 'Refina o genera algo nuevo...'
                  : 'Describe tu imagen...'
            }
            rows={2}
            className="flex-1 resize-none rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isBusy}
            aria-label={isVideoMode ? 'Enviar revision' : 'Enviar mensaje'}
            className={cn(
              'self-end p-2.5 rounded-lg transition-all',
              input.trim() && !isBusy
                ? 'bg-violet-600 text-white hover:bg-violet-500'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        {/* Character counter */}
        <div className="flex justify-end mt-1">
          <span className={cn(
            'text-[10px]',
            input.length > 2000 ? 'text-red-400' : input.length > 1800 ? 'text-amber-400' : 'text-zinc-600'
          )}>
            {input.length} / 2000
          </span>
        </div>
      </div>
    </div>
  )
}

// ---- Image Context Bar ----

function ImageContextBar({
  generation,
  onVariation,
  onCopyPrompt,
  onRefine,
  onUseStyle,
  isGenerating,
}: {
  generation: StudioGeneration
  onVariation: () => void
  onCopyPrompt: () => void
  onRefine: (prefix: string) => void
  onUseStyle: (style: string | null, ratio: string) => void
  isGenerating: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50">
      {/* Thumbnail + prompt */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
          {generation.url_salida ? (
            <img src={generation.url_salida} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-zinc-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-300 truncate">{generation.prompt}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {generation.estilo && (
              <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                {generation.estilo}
              </span>
            )}
            <span className="text-[10px] text-zinc-500">{generation.aspect_ratio}</span>
          </div>
        </div>
        <span className={cn('text-zinc-600 text-[10px] transition-transform', expanded && 'rotate-180')}>
          &#x25BC;
        </span>
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={onVariation}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              <Shuffle className="h-3 w-3" />
              Variacion
            </button>
            <button
              onClick={onCopyPrompt}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copiar prompt
            </button>
            <button
              onClick={() => onUseStyle(generation.estilo, generation.aspect_ratio)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Usar estilo
            </button>
          </div>

          {/* Refinement suggestions */}
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Refinar</p>
            <div className="flex flex-wrap gap-1">
              {[
                'Mas brillante y vibrante',
                'Fondo mas limpio',
                'Estilo mas profesional',
                'Agregar luz calida',
                'Cambiar a vista cenital',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onRefine(suggestion)}
                  className="px-2 py-1 rounded-md text-[11px] text-zinc-400 border border-zinc-800 hover:border-violet-500/40 hover:text-zinc-300 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Full prompt display */}
          <div className="bg-zinc-800/50 rounded-lg p-2.5">
            <p className="text-[11px] text-zinc-400 leading-relaxed">{generation.prompt}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Empty State ----

function EmptyState({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
        <Sparkles className="h-7 w-7 text-violet-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">AI Estudio</h3>
      <p className="text-xs text-zinc-500 max-w-[280px]">
        Describe la imagen que quieres generar. Puedes ser tan detallado como quieras.
      </p>
      <div className="mt-4 space-y-2 w-full">
        {[
          'Foto de producto minimalista con fondo blanco',
          'Banner para redes sociales estilo moderno',
          'Imagen cinematica de paisaje urbano',
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            className="w-full text-left px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:border-violet-500/50 hover:text-zinc-300 transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- Message Bubble ----

function MessageBubble({ message }: { message: StudioAiMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-xl px-3 py-2 text-sm',
          isUser ? 'bg-violet-600/20 text-violet-100' : 'bg-zinc-800 text-zinc-300'
        )}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        <span className="block text-[10px] text-zinc-600 mt-1">
          {new Date(message.timestamp).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

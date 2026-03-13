import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Send,
  Loader2,
  Bot,
  ArrowRight,
  ImageIcon,
  Video,
  Copy,
  CheckCircle,
  Sparkles,
  Plus,
  Mic,
  MicOff,
  Paperclip,
  X,
  MessageSquare,
  Pencil,
  Trash2,
  Square,
  Check,
  MessagesSquare,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useStudioAiStore,
  type HubMessage,
  type HubCard,
} from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { usePipelineStore } from '@/stores/pipelineStore'
import { mediaApi, formatFileSize } from '@/lib/media'
import type { StudioGeneration } from '@/services/api'

// ── Props ────────────────────────────────────────────────────────────────────

interface UnifiedChatProps {
  projectId: number
  projectName?: string
  /** When true, renders without header/borders — blends into parent layout */
  embedded?: boolean
}

// ── Time-ago helper ──────────────────────────────────────────────────────────

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

// ── Welcome message pool ─────────────────────────────────────────────────────

const WELCOME_GREETINGS: Array<(name: string, count: number) => string> = [
  (name, count) =>
    `Hola! Soy tu asistente creativo${name ? ` para ${name}` : ''}. ${count > 0 ? `Este proyecto tiene ${count} imagen${count !== 1 ? 'es' : ''} generada${count !== 1 ? 's' : ''}.` : 'Aun no tienes contenido generado.'} Que te gustaria crear hoy?`,
  (name, count) =>
    `Bienvenido al estudio${name ? ` de ${name}` : ''}! ${count > 0 ? `Ya cuentas con ${count} imagen${count !== 1 ? 'es' : ''}.` : 'Empecemos a crear contenido.'} Como puedo ayudarte?`,
  (name, count) =>
    `Listo para crear!${name ? ` Estamos en ${name}.` : ''} ${count > 0 ? `Tienes ${count} imagen${count !== 1 ? 'es' : ''} en tu galeria.` : 'Tu galeria esta vacia, vamos a llenarla.'} Que necesitas?`,
  (name, count) =>
    `Hola! Soy tu copiloto creativo.${name ? ` Proyecto: ${name}.` : ''} ${count > 0 ? `${count} imagen${count !== 1 ? 'es' : ''} lista${count !== 1 ? 's' : ''}.` : 'Sin assets aun — empecemos!'} Que vamos a crear?`,
  (name, count) =>
    `Buen dia! Te ayudo a crear contenido increible${name ? ` para ${name}` : ''}. ${count > 0 ? `Ya tienes ${count} creacion${count !== 1 ? 'es' : ''}.` : 'Empecemos con tu primera imagen.'} Que tienes en mente?`,
  (name, count) =>
    `Hola! Tu estudio creativo esta listo.${name ? ` Proyecto: ${name}.` : ''} ${count > 0 ? `${count} asset${count !== 1 ? 's' : ''} en galeria.` : 'Galeria vacia — vamos a crear!'} Dime que necesitas.`,
]

function pickWelcome(name: string, count: number): string {
  const idx = Math.floor(Math.random() * WELCOME_GREETINGS.length)
  return WELCOME_GREETINGS[idx](name, count)
}

// ── Module-level sets — persist across mount/unmount cycles ──────────────────

/** Message IDs that have already played their mount animation (fade-in). */
const seenMessageIds = new Set<string>()

// ── SpeechRecognition (vendor-prefixed in Chrome) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition: any =
  (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null

// ── File attachment type ─────────────────────────────────────────────────────

interface AttachedFile {
  file: File
  preview?: string // object URL for image preview
}

// ── Main Component ───────────────────────────────────────────────────────────

export function UnifiedChat({ projectId, projectName, embedded }: UnifiedChatProps) {
  const {
    studioMode,
    hubMessages,
    isHubLoading,
    streamingText,
    sendHubMessage,
    addHubMessage,
    selectedImageId,
    leftTab,
    conversations,
    activeConversationId,
    loadConversations,
    startNewChat,
    switchConversation,
    renameConversation,
    removeConversation,
  } = useStudioAiStore()

  const chatContextImageId = useStudioAiStore((s) => s.chatContextImageId)
  const setChatContextImageId = useStudioAiStore((s) => s.setChatContextImageId)

  const { generations } = useStudioStore()
  const { activeSceneId, pipeline } = usePipelineStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Phase G: Conversation management state ──────────────────────────────
  const [showConversations, setShowConversations] = useState(false)
  const [editingConvId, setEditingConvId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // ── Phase F: File attachment state ──────────────────────────────────────
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Phase H: Voice input state ──────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribedText, setTranscribedText] = useState('')
  const recognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Context detection
  const isHomeMode = studioMode === 'home'
  const isImageMode = studioMode === 'image'
  const isVideoMode = studioMode === 'video'

  // Selected image context (for image mode)
  const selectedGen = generations.find((g) => g.id === selectedImageId) ?? null

  // Chat context image (when pinned to a different image than canvas selection)
  const contextGen = chatContextImageId
    ? generations.find((g) => g.id === chatContextImageId) ?? null
    : null
  const showContextBar = contextGen && chatContextImageId !== selectedImageId

  // Active scene context (for video mode)
  const activeScene = pipeline?.escenas?.find((s) => s.id === activeSceneId) ?? null

  // ── Welcome message ────────────────────────────────────────────────────

  useEffect(() => {
    if (hubMessages.length === 0) {
      const imageCount = generations.filter(
        (g) => g.tipo === 'image' && g.estado === 'complete',
      ).length

      addHubMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: pickWelcome(projectName || '', imageCount),
        animated: true,
        quickActions: [
          'Generar Imagenes',
          'Crear Videos',
          'Ver Galeria',
          'Estado del Proyecto',
        ],
        timestamp: new Date().toISOString(),
      })
    }
    // Only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load conversations on mount ─────────────────────────────────────────

  useEffect(() => {
    loadConversations(projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ── Auto-scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [hubMessages, isHubLoading, streamingText])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Cleanup file previews on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isHubLoading) return

    setInput('')
    let uploadedFiles: Array<{ url: string; key: string; nombre: string; mime: string }> = []

    // Upload attached files and capture URLs
    if (attachedFiles.length > 0) {
      const files = attachedFiles.map((a) => a.file)
      // Clear previews
      attachedFiles.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview) })
      setAttachedFiles([])
      try {
        const { data } = await mediaApi.upload(files, { folder: 'studio', entity_type: 'proyecto', entity_id: projectId })
        uploadedFiles = data.map((f) => ({ url: f.url, key: f.key, nombre: f.nombre, mime: f.mime }))
        toast.success(`${files.length} archivo${files.length > 1 ? 's' : ''} subido${files.length > 1 ? 's' : ''}`)
      } catch {
        toast.error('Error al subir archivos')
      }
    }

    sendHubMessage(trimmed, projectId, uploadedFiles.length > 0 ? uploadedFiles : undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleCardAction = (action: string) => {
    if (isHubLoading) return
    sendHubMessage(action, projectId)
  }

  // ── Phase F: File handling ─────────────────────────────────────────────

  const handleFileSelect = (files: FileList | File[]) => {
    const newFiles: AttachedFile[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setAttachedFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => {
      const removed = prev[index]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    dragCounter.current = 0; setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFileSelect(files)
  }

  // ── Phase H: Voice recording ───────────────────────────────────────────

  const startRecording = async () => {
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'es-MX'

      let accumulated = ''

      recognition.onresult = (event: any) => {
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript
          if (result.isFinal) final += transcript
          else interim += transcript
        }
        if (final) accumulated = final.toLowerCase()
        setTranscribedText((accumulated || interim).toLowerCase())
      }

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') toast.error('Permiso de microfono denegado')
      }

      recognitionRef.current = recognition
      recognition.start()

      setRecordingTime(0)
      setTranscribedText('')
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
      setIsRecording(true)
    } catch {
      toast.error('No se pudo acceder al microfono')
    }
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (transcribedText.trim()) {
      setInput((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : ''
        return prev + separator + transcribedText.trim()
      })
    }
    setIsRecording(false)
    setTranscribedText('')
    setRecordingTime(0)
  }

  const cancelRecording = () => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)
    setTranscribedText('')
    setRecordingTime(0)
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Phase G: Conversation handlers ─────────────────────────────────────

  const handleNewChat = () => {
    startNewChat()
    setShowConversations(false)
    setInput('')
    setAttachedFiles([])
    // Re-add welcome message
    const imageCount = generations.filter(
      (g) => g.tipo === 'image' && g.estado === 'complete',
    ).length
    addHubMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      text: pickWelcome(projectName || '', imageCount),
      animated: true,
      quickActions: [
        'Generar Imagenes',
        'Crear Videos',
        'Ver Galeria',
        'Estado del Proyecto',
      ],
      timestamp: new Date().toISOString(),
    })
  }

  const handleSelectConv = (convId: number) => {
    switchConversation(projectId, convId)
    setShowConversations(false)
  }

  const handleStartRename = (id: number, currentTitle: string) => {
    setEditingConvId(id)
    setEditingTitle(currentTitle)
  }

  const handleSaveRename = () => {
    if (!editingConvId || !editingTitle.trim()) {
      setEditingConvId(null)
      return
    }
    renameConversation(projectId, editingConvId, editingTitle.trim())
    setEditingConvId(null)
  }

  const handleDeleteConv = (id: number) => {
    removeConversation(projectId, id)
    if (activeConversationId === id) {
      handleNewChat()
    }
  }

  // ── Placeholder text ──────────────────────────────────────────────────

  function getPlaceholder(): string {
    if (isImageMode && selectedGen) return 'Describe cambios o genera nuevas imagenes...'
    if (isVideoMode) return 'Describe cambios para la escena...'
    return 'Escribe que necesitas...'
  }

  // ── Get quick actions from last assistant message ─────────────────────

  const lastAssistantMsg = [...hubMessages].reverse().find((m) => m.role === 'assistant')
  const lastQuickActions = lastAssistantMsg?.quickActions ?? []
  const isLastAnimating = !!lastAssistantMsg?.animated

  // Sorted conversations (most recent first)
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.actualizado_en).getTime() - new Date(a.actualizado_en).getTime(),
  )

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className={cn('flex flex-col h-full', embedded ? 'bg-transparent' : 'bg-zinc-900')}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay (Phase F) */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm border-2 border-dashed border-violet-500/50 rounded-lg m-2">
          <div className="flex flex-col items-center gap-3 text-violet-400">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10">
              <Upload className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">Suelta archivos aqui</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFileSelect(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Header — hidden in embedded mode */}
      {!embedded && (
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 shrink-0">
          <Bot className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-200">AI Asistente</span>
          <span className="text-[10px] text-zinc-500 ml-1">
            {isImageMode && 'Imagenes'}
            {isVideoMode && 'Video'}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* New Chat button */}
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Nueva conversacion"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>

            {/* Conversations toggle */}
            <button
              onClick={() => {
                setShowConversations(!showConversations)
                if (!showConversations) loadConversations(projectId)
              }}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                showConversations
                  ? 'bg-violet-500/15 text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800',
              )}
              title="Conversaciones"
            >
              <MessagesSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Context bar when in editor mode */}
      {isImageMode && selectedGen && (
        <ImageContextBar generation={selectedGen} />
      )}
      {isVideoMode && activeScene && (
        <VideoContextBar
          scene={activeScene}
        />
      )}

      {/* Chat context pinned image indicator */}
      {showContextBar && (
        <div className="px-3 py-1.5 border-b border-violet-500/20 bg-violet-500/5 flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
          {contextGen.url_salida && (
            <img
              src={contextGen.url_salida}
              alt=""
              className="w-7 h-7 rounded object-cover border border-violet-500/30"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-violet-400 font-medium">Contexto del chat</p>
            <p className="text-[10px] text-zinc-500 truncate">
              #{contextGen.id} — {contextGen.prompt}
            </p>
          </div>
          <button
            onClick={() => setChatContextImageId(null)}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
            title="Usar imagen del canvas"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Conversation list (Phase G) */}
      {showConversations ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {sortedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <MessageSquare className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Sin conversaciones</p>
              <p className="text-xs text-zinc-600 mt-1">Inicia una nueva para comenzar</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {sortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
                    conv.id === activeConversationId
                      ? 'bg-violet-500/10 border border-violet-500/20'
                      : 'hover:bg-zinc-800 border border-transparent',
                  )}
                  onClick={() => handleSelectConv(conv.id)}
                >
                  <div className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-lg shrink-0',
                    conv.id === activeConversationId ? 'bg-violet-500/15' : 'bg-zinc-800',
                  )}>
                    <MessageSquare className={cn(
                      'h-3.5 w-3.5',
                      conv.id === activeConversationId ? 'text-violet-400' : 'text-zinc-500',
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingConvId === conv.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename()
                          if (e.key === 'Escape') setEditingConvId(null)
                        }}
                        onBlur={handleSaveRename}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm w-full bg-zinc-900 border border-violet-500/40 rounded-md px-2 py-0.5 outline-none text-zinc-200"
                      />
                    ) : (
                      <p className={cn(
                        'text-sm truncate',
                        conv.id === activeConversationId ? 'text-zinc-200 font-medium' : 'text-zinc-400',
                      )}>{conv.titulo}</p>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {formatTimeAgo(conv.actualizado_en)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {editingConvId === conv.id ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveRename() }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-violet-500/10 text-violet-400 transition-all"
                        title="Guardar"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartRename(conv.id, conv.titulo) }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
                        title="Renombrar"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConv(conv.id) }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div className={cn(
            'flex-1 overflow-y-auto space-y-3 scrollbar-thin',
            embedded ? 'px-6 py-3' : 'p-3',
          )}>
            {hubMessages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onCardAction={handleCardAction}
                wide={!!embedded}
              />
            ))}

            {isHubLoading && (
              streamingText ? (
                <StreamingBubble text={streamingText} wide={!!embedded} />
              ) : (
                <TypingIndicator />
              )
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions — show after animation completes */}
          {lastQuickActions.length > 0 && !isHubLoading && !isLastAnimating && (
            <div className={cn(
              'py-2 flex flex-wrap gap-1.5 shrink-0',
              embedded ? 'px-6' : 'px-3 border-t border-zinc-800/50',
            )}>
              {lastQuickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  className="px-3 py-1.5 text-xs rounded-full bg-zinc-800/80 text-zinc-300 hover:bg-violet-600/20 hover:text-violet-300 border border-zinc-700/50 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Input area */}
      <div className={cn(
        'shrink-0',
        embedded ? 'px-6 pb-4 pt-2' : 'p-3 border-t border-zinc-800',
      )}>
        {/* Attached files preview (Phase F) */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((af, i) => (
              <div
                key={i}
                className="relative group flex items-center gap-1.5 bg-zinc-800 border border-zinc-700/50 rounded-lg px-2 py-1.5"
              >
                {af.preview ? (
                  <img src={af.preview} alt="" className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center">
                    <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-300 truncate max-w-[120px]">{af.file.name}</p>
                  <p className="text-[9px] text-zinc-600">{formatFileSize(af.file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 text-zinc-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice recording overlay (Phase H) */}
        {isRecording && (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/30 p-3 space-y-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-xs text-zinc-400 font-mono">{formatTime(recordingTime)}</span>
            </div>
            <p className="text-xs text-zinc-400 min-h-[1.25rem] truncate px-1">
              {transcribedText || 'Escuchando...'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={cancelRecording}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-500 transition-all"
                title="Detener y transcribir"
              >
                <Square className="h-3 w-3 fill-current" />
                Listo
              </button>
            </div>
          </div>
        )}

        {/* Input row */}
        {!isRecording && (
          <div className={cn(
            'flex items-center gap-2',
            embedded && 'bg-zinc-900/60 border border-zinc-800 rounded-xl p-2',
          )}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
                embedded ? 'bg-transparent' : 'bg-zinc-800',
              )}
            />

            {/* Attach file button (Phase F) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
              title="Adjuntar archivo"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Voice button (Phase H) */}
            <button
              onClick={startRecording}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
              title="Nota de voz"
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Send button */}
            <button
              onClick={() => handleSend(input)}
              disabled={isHubLoading || (!input.trim() && attachedFiles.length === 0)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
                input.trim() || attachedFiles.length > 0
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : 'bg-zinc-800 text-zinc-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label="Enviar mensaje"
            >
              {isHubLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  onCardAction,
  wide,
}: {
  message: HubMessage
  onCardAction: (action: string) => void
  wide?: boolean
}) {
  const isUser = message.role === 'user'
  const shouldTypewrite = !!message.animated
  const [typewriterDone, setTypewriterDone] = useState(!shouldTypewrite)

  // Track whether this message has been seen for CSS entrance animation
  const isNew = !seenMessageIds.has(message.id)
  useEffect(() => {
    seenMessageIds.add(message.id)
  }, [message.id])

  const handleTypewriterComplete = useCallback(() => {
    setTypewriterDone(true)
    // Persist in store so remounts don't replay
    useStudioAiStore.setState((s) => ({
      hubMessages: s.hubMessages.map((m) =>
        m.id === message.id ? { ...m, animated: false } : m,
      ),
    }))
  }, [message.id])

  return (
    <div
      className={cn(
        'flex gap-2.5',
        isNew && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center mt-1">
          <Bot className="h-3.5 w-3.5 text-violet-400" />
        </div>
      )}

      <div className={cn(
        'space-y-1.5',
        wide ? 'max-w-[90%]' : 'max-w-[85%]',
        isUser ? 'items-end' : 'items-start',
      )}>
        {/* Text bubble */}
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-violet-600/80 text-white rounded-br-sm'
              : wide
                ? 'bg-zinc-900/60 text-zinc-200 rounded-bl-sm border border-zinc-800/50'
                : 'bg-zinc-800 text-zinc-200 rounded-bl-sm',
          )}
        >
          <p className="whitespace-pre-wrap">
            {shouldTypewrite && !typewriterDone ? (
              <TypewriterText text={stripActionBlock(message.text)} speed={18} onComplete={handleTypewriterComplete} />
            ) : (
              stripActionBlock(message.text)
            )}
          </p>
          {typewriterDone && (
            <span className="block text-[10px] text-zinc-600 mt-1">
              {new Date(message.timestamp).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Cards */}
        {message.cards && message.cards.length > 0 && (
          <div className="space-y-1.5">
            {message.cards.map((card, i) => (
              <RichCard key={i} card={card} onAction={onCardAction} />
            ))}
          </div>
        )}

        {/* Action indicator */}
        {message.action && (
          <div className="flex items-center gap-1.5 text-[10px] text-violet-400 px-1">
            <ArrowRight className="h-3 w-3" />
            {message.action.type === 'open_image_editor' && 'Abriendo editor de imagenes...'}
            {message.action.type === 'generate_image' && 'Generando imagen...'}
            {message.action.type === 'show_asset' && 'Mostrando asset...'}
            {message.action.type === 'open_video_pipeline' && 'Abriendo pipeline de video...'}
            {message.action.type === 'show_gallery' && 'Abriendo galeria...'}
            {message.action.type === 'approve_asset' && 'Asset aprobado'}
            {message.action.type === 'export_asset' && 'Exportando al CRM...'}
            {message.action.type === 'open_adjust' && 'Abriendo ajustes...'}
          </div>
        )}
      </div>

      {isUser && <div className="shrink-0 w-7" />}
    </div>
  )
}

// ── Rich Card ────────────────────────────────────────────────────────────────

function RichCard({
  card,
  onAction,
}: {
  card: HubCard
  onAction: (action: string) => void
}) {
  switch (card.type) {
    case 'project_status':
      return <ProjectStatusCard data={card.data} />
    case 'asset_preview':
      return <AssetPreviewCard data={card.data} onAction={onAction} />
    case 'approval_confirmation':
      return <ApprovalCard data={card.data} />
    case 'session_info':
      return <SessionInfoCard data={card.data} />
    default:
      return null
  }
}

// ── Card Components (compact versions for panel width) ───────────────────────

function ProjectStatusCard({ data }: { data: Record<string, unknown> }) {
  const images = data.images as
    | { total: number; completed: number; approved: number }
    | undefined
  const videos = data.videos as
    | { total: number; completed: number }
    | undefined

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2">
      <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
        Estado del Proyecto
      </div>
      <div className="flex gap-3">
        {images && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
              <ImageIcon className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                {images.completed}/{images.total}
              </div>
              <div className="text-[9px] text-zinc-500">Imagenes</div>
            </div>
          </div>
        )}
        {videos && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Video className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                {videos.completed}/{videos.total}
              </div>
              <div className="text-[9px] text-zinc-500">Videos</div>
            </div>
          </div>
        )}
      </div>
      {Array.isArray(data.recent) &&
        (data.recent as Array<{ id: number; url: string }>).length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pt-1 scrollbar-thin">
            {(data.recent as Array<{ id: number; url: string }>).map((item) => (
              <div
                key={item.id}
                className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-zinc-700"
              >
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

function AssetPreviewCard({
  data,
  onAction,
}: {
  data: Record<string, unknown>
  onAction: (action: string) => void
}) {
  const thumbnailUrl = data.thumbnail_url as string | undefined
  const prompt = data.prompt as string | undefined
  const status = data.status as string | undefined
  const createdAt = data.created_at as string | undefined

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg overflow-hidden">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-200 truncate">
            {prompt
              ? prompt.length > 40
                ? prompt.slice(0, 40) + '...'
                : prompt
              : 'Sin titulo'}
          </span>
          {status && (
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                status === 'complete'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : status === 'failed'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-zinc-700 text-zinc-400',
              )}
            >
              {status === 'complete'
                ? 'Completo'
                : status === 'failed'
                  ? 'Error'
                  : status}
            </span>
          )}
        </div>
        {createdAt && (
          <div className="text-[10px] text-zinc-500">
            {formatTimeAgo(createdAt)}
          </div>
        )}
        <div className="flex gap-1.5">
          <button
            onClick={() => onAction('Abrir en editor')}
            className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
          >
            Abrir
          </button>
          <button
            onClick={() => onAction('Exportar')}
            className="px-2.5 py-1 text-[11px] font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-md transition-colors"
          >
            Exportar
          </button>
        </div>
      </div>
    </div>
  )
}

function ApprovalCard({ data }: { data: Record<string, unknown> }) {
  const title = data.title as string | undefined

  return (
    <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-2.5">
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Asset Aprobado</span>
      </div>
      {title && (
        <div className="text-[10px] text-zinc-400 mt-1">{title}</div>
      )}
    </div>
  )
}

function SessionInfoCard({ data }: { data: Record<string, unknown> }) {
  const name = data.name as string | undefined
  const model = data.model as string | undefined
  const generationCount = data.generation_count as number | undefined

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-xs font-medium text-zinc-200">
          {name ?? 'Sesion'}
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-[10px] text-zinc-500">
        {model && <span>Modelo: {model}</span>}
        {generationCount != null && (
          <span>{generationCount} generaciones</span>
        )}
      </div>
    </div>
  )
}

// ── Image Context Bar ────────────────────────────────────────────────────────

function ImageContextBar({ generation }: { generation: StudioGeneration }) {
  const handleCopyPrompt = () => {
    if (!generation.prompt) return
    navigator.clipboard.writeText(generation.prompt)
    toast.success('Prompt copiado')
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 px-3 py-2 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
          {generation.url_salida ? (
            <img
              src={generation.url_salida}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-zinc-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-zinc-300 truncate">{generation.prompt}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {generation.estilo && (
              <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                {generation.estilo}
              </span>
            )}
            <span className="text-[9px] text-zinc-500">{generation.aspect_ratio}</span>
          </div>
        </div>
        <button
          onClick={handleCopyPrompt}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          title="Copiar prompt"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ── Video Context Bar ────────────────────────────────────────────────────────

function VideoContextBar({
  scene,
}: {
  scene: { orden: number; descripcion?: string | null; video_prompt?: string | null; estado: string }
}) {
  return (
    <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700 shrink-0">
      <div className="flex items-center gap-2 text-violet-400 mb-0.5">
        <Video className="h-3 w-3" />
        <span className="text-[11px] font-medium">Escena {scene.orden}</span>
        <span className="text-zinc-600">|</span>
        <span className="text-[10px] text-zinc-400 truncate">
          {scene.descripcion
            ? scene.descripcion.length > 50
              ? scene.descripcion.slice(0, 50) + '...'
              : scene.descripcion
            : 'Sin descripcion'}
        </span>
      </div>
      {scene.video_prompt && (
        <div className="text-zinc-500 line-clamp-2 font-mono text-[10px]">
          {scene.video_prompt.length > 100
            ? scene.video_prompt.slice(0, 100) + '...'
            : scene.video_prompt}
        </div>
      )}
    </div>
  )
}

// ── Typewriter Text ──────────────────────────────────────────────────────────

function TypewriterText({
  text,
  speed = 18,
  onComplete,
}: {
  text: string
  speed?: number
  onComplete?: () => void
}) {
  const [charCount, setCharCount] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    setCharCount(0)
    completedRef.current = false

    const interval = setInterval(() => {
      setCharCount((prev) => {
        const next = prev + 1
        if (next >= text.length) {
          clearInterval(interval)
          if (!completedRef.current) {
            completedRef.current = true
            // Defer to avoid setState-during-render warning
            queueMicrotask(() => onComplete?.())
          }
          return text.length
        }
        return next
      })
    }, speed)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed])

  return (
    <>
      {text.slice(0, charCount)}
      {charCount < text.length && (
        <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </>
  )
}

// ── Streaming Bubble ─────────────────────────────────────────────────────────

/** Strip ```action {...}``` blocks from text so they don't render in chat */
function stripActionBlock(text: string): string {
  const idx = text.indexOf('```action')
  return idx === -1 ? text : text.slice(0, idx).trimEnd()
}

function StreamingBubble({ text, wide }: { text: string; wide?: boolean }) {
  const cleanText = stripActionBlock(text)
  if (!cleanText) return <TypingIndicator />
  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center mt-1">
        <Bot className="h-3.5 w-3.5 text-violet-400" />
      </div>
      <div className={cn(
        'space-y-1.5',
        wide ? 'max-w-[90%]' : 'max-w-[85%]',
      )}>
        <div className={cn(
          'rounded-xl px-3 py-2 text-sm leading-relaxed rounded-bl-sm',
          wide
            ? 'bg-zinc-900/60 text-zinc-200 border border-zinc-800/50'
            : 'bg-zinc-800 text-zinc-200',
        )}>
          <p className="whitespace-pre-wrap">{cleanText}</p>
          <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />
        </div>
      </div>
    </div>
  )
}

// ── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center mt-1">
        <Bot className="h-3.5 w-3.5 text-violet-400" />
      </div>
      <div className="bg-zinc-800 rounded-xl rounded-bl-sm px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

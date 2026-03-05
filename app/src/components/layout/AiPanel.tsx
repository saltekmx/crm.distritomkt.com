import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUser } from '@/stores/authStore'
import { Bot, Send, X, Mic, Square, Route, Paperclip, File as FileIcon, Upload, Plus, MessageSquare, Trash2, MessagesSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Map routes to friendly labels for the context badge
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Inicio',
  '/clientes': 'Clientes',
  '/proyectos': 'Proyectos',
  '/cotizaciones': 'Cotizaciones',
  '/admin/usuarios': 'Usuarios',
  '/admin/usuarios/nuevo': 'Nuevo Usuario',
  '/perfil': 'Mi Perfil',
}

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  if (/^\/admin\/usuarios\/[^/]+$/.test(pathname)) return 'Editar Usuario'
  if (/^\/clientes\/[^/]+$/.test(pathname)) return 'Detalle Cliente'
  if (/^\/proyectos\/[^/]+$/.test(pathname)) return 'Detalle Proyecto'
  return pathname
}

const AI_NAME = 'DMKT Bot'

const MIN_WIDTH = 320
const MAX_WIDTH = 700
const WAVEFORM_BARS = 32

// SpeechRecognition (vendor-prefixed in Chrome)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition: any =
  (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  files?: { name: string; size: number }[]
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

const CONVERSATIONS_KEY = 'ai-conversations'
const ACTIVE_CONV_KEY = 'ai-active-conversation'

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs))
}

function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_CONV_KEY)
}

function saveActiveId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_CONV_KEY, id)
  else localStorage.removeItem(ACTIVE_CONV_KEY)
}

function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'Nueva conversacion',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first?.text) return 'Nueva conversacion'
  return first.text.length > 40 ? first.text.slice(0, 40) + '...' : first.text
}

interface AiPanelProps {
  open: boolean
  onClose: () => void
  width: number
  onWidthChange: (w: number) => void
}

// ---- Waveform visualizer component ----
function Waveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (!analyser || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const barWidth = w / WAVEFORM_BARS
      const step = Math.floor(bufferLength / WAVEFORM_BARS)

      // Get primary color from CSS var
      const style = getComputedStyle(document.documentElement)
      const primary = style.getPropertyValue('--primary').trim()

      for (let i = 0; i < WAVEFORM_BARS; i++) {
        const value = dataArray[i * step] / 255
        const barHeight = Math.max(2, value * h * 0.85)
        const x = i * barWidth + barWidth * 0.15
        const bw = barWidth * 0.7
        const y = (h - barHeight) / 2

        ctx.fillStyle = primary
        ctx.globalAlpha = 0.4 + value * 0.6
        ctx.beginPath()
        ctx.roundRect(x, y, bw, barHeight, 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [analyser])

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={40}
      className="w-full h-10"
    />
  )
}

export function AiPanel({ open, onClose, width, onWidthChange }: AiPanelProps) {
  const location = useLocation()
  const user = useUser()
  const [input, setInput] = useState('')
  const [includePageContext, setIncludePageContext] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeConvId, setActiveConvId] = useState<string | null>(loadActiveId)
  const [isThinking, setIsThinking] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showConvList, setShowConvList] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribedText, setTranscribedText] = useState('')
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const recognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Resize drag ---
  const isResizing = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - ev.clientX
      onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onWidthChange])

  // --- Start voice recording + transcription ---
  const startRecording = async () => {
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    try {
      // 1. Get mic stream for waveform
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 2. Set up audio analyser for visualization
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      setAnalyserNode(analyser)

      // 3. Start speech recognition
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
          if (result.isFinal) {
            final += transcript
          } else {
            interim += transcript
          }
        }
        if (final) accumulated = final.toLowerCase()
        setTranscribedText((accumulated || interim).toLowerCase())
      }

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          toast.error('Permiso de microfono denegado')
        }
      }

      recognition.onend = () => {
        // Don't auto-stop, we control it manually
      }

      recognitionRef.current = recognition
      recognition.start()

      // 4. Timer
      setRecordingTime(0)
      setTranscribedText('')
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
      setIsRecording(true)
    } catch {
      toast.error('No se pudo acceder al microfono')
    }
  }

  const stopRecording = () => {
    // Stop recognition
    recognitionRef.current?.stop()
    recognitionRef.current = null

    // Stop mic stream
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    // Close audio context
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setAnalyserNode(null)

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Put transcribed text into input
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const pageLabel = getPageLabel(location.pathname)

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles])
    }
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...droppedFiles])
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null
  const messages = activeConv?.messages ?? []

  // Persist conversations
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  useEffect(() => {
    saveActiveId(activeConvId)
  }, [activeConvId])

  const updateActiveMessages = (updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
    if (!activeConvId) return
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConvId) return c
        const newMsgs = updater(c.messages)
        return {
          ...c,
          messages: newMsgs,
          title: deriveTitle(newMsgs),
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }

  const handleNewChat = () => {
    const conv = createConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveConvId(conv.id)
    setShowConvList(false)
    setInput('')
    setAttachedFiles([])
  }

  const handleSelectConv = (id: string) => {
    setActiveConvId(id)
    setShowConvList(false)
    setInput('')
    setAttachedFiles([])
  }

  const handleDeleteConv = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConvId === id) {
      const remaining = conversations.filter((c) => c.id !== id)
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text && attachedFiles.length === 0) return

    // Auto-create conversation if none active
    let convId = activeConvId
    if (!convId) {
      const conv = createConversation()
      setConversations((prev) => [conv, ...prev])
      setActiveConvId(conv.id)
      convId = conv.id
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      files: attachedFiles.map((f) => ({ name: f.name, size: f.size })),
      timestamp: new Date().toISOString(),
    }

    const targetId = convId
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetId) return c
        const newMsgs = [...c.messages, userMsg]
        return { ...c, messages: newMsgs, title: deriveTitle(newMsgs), updatedAt: new Date().toISOString() }
      })
    )
    setInput('')
    setAttachedFiles([])
    setIsThinking(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Hola${user?.name ? ` ${user.name.split(' ')[0]}` : ''}, soy ${AI_NAME}. Esta funcionalidad esta en desarrollo, pronto podre ayudarte con clientes, proyectos, reportes y mas.`,
        timestamp: new Date().toISOString(),
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetId) return c
          return { ...c, messages: [...c.messages, aiMsg], updatedAt: new Date().toISOString() }
        })
      )
      setIsThinking(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-screen z-40 transition-all duration-300 ease-in-out',
        open ? '' : 'w-0 overflow-hidden pointer-events-none'
      )}
      style={open ? { width } : undefined}
    >
      {/* Panel content */}
      <div
        className={cn(
          'relative h-full flex flex-col bg-card border-l border-border min-w-0',
          open && 'ai-panel-glow'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/90 backdrop-blur-sm border-2 border-dashed border-primary/50 rounded-lg m-2">
            <div className="flex flex-col items-center gap-3 text-primary">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                <Upload className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Suelta los archivos aqui</p>
                <p className="text-xs text-muted-foreground mt-0.5">Se adjuntaran al mensaje</p>
              </div>
            </div>
          </div>
        )}

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="group absolute left-0 top-0 w-3 h-full z-50 cursor-col-resize flex items-center justify-center -translate-x-1/2"
        >
          <div className="w-1 h-8 rounded-full bg-border group-hover:bg-primary/60 group-active:bg-primary transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{AI_NAME}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Nueva conversacion"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowConvList(!showConvList)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer',
                showConvList
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title="Conversaciones"
            >
              <MessagesSquare className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showConvList ? (
          /* ===== Full-height conversation list ===== */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {sortedConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Sin conversaciones</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Inicia una nueva para comenzar</p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {sortedConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all',
                        conv.id === activeConvId
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted border border-transparent'
                      )}
                      onClick={() => handleSelectConv(conv.id)}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                        conv.id === activeConvId ? 'bg-primary/15' : 'bg-muted'
                      )}>
                        <MessageSquare className={cn(
                          'h-4 w-4',
                          conv.id === activeConvId ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-sm truncate',
                          conv.id === activeConvId ? 'text-foreground font-medium' : 'text-foreground/80'
                        )}>{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {conv.messages.length} mensaje{conv.messages.length !== 1 ? 's' : ''}
                          {' · '}
                          {new Date(conv.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConv(conv.id)
                        }}
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* New chat button at bottom */}
            <div className="p-3 border-t border-border shrink-0">
              <button
                onClick={handleNewChat}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Nueva conversacion
              </button>
            </div>
          </div>
        ) : (
          /* ===== Chat view ===== */
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {!hasMessages ? (
                /* Welcome screen */
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 border border-primary/20">
                      <Bot className="h-9 w-9 text-primary" />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-8 max-w-[260px] leading-relaxed">
                    Soy <span className="font-medium text-primary">{AI_NAME}</span>, tu asistente de DistritoMKT. Preguntame lo que necesites.
                  </p>

                  <div className="w-full grid grid-cols-1 gap-2">
                    {[
                      { icon: '📊', label: 'Resumen de proyectos activos' },
                      { icon: '💰', label: 'Clientes con pagos pendientes' },
                      { icon: '📋', label: 'Reporte de esta semana' },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => setInput(suggestion.label)}
                        className="group flex items-center gap-3 w-full text-left text-sm px-3.5 py-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        <span className="text-base shrink-0">{suggestion.icon}</span>
                        <span className="flex-1">{suggestion.label}</span>
                        <Send className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat messages */
                <div className="space-y-5">
                  {messages.map((msg) =>
                    msg.role === 'user' ? (
                      /* --- User message --- */
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%]">
                          {/* Files */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                              {msg.files.map((f, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-[11px] text-primary">
                                  <FileIcon className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[120px]">{f.name}</span>
                                  <span className="opacity-60">{formatFileSize(f.size)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed">
                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* --- Assistant message --- */
                      <div key={msg.id} className="flex gap-2.5">
                        <div className="flex items-start shrink-0 pt-0.5">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                        </div>
                        <div className="max-w-[85%]">
                          <p className="text-xs font-medium text-primary mb-1">{AI_NAME}</p>
                          <div className="bg-secondary rounded-2xl rounded-bl-sm px-3.5 py-2.5 border border-border">
                            {/* Files */}
                            {msg.files && msg.files.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {msg.files.map((f, i) => (
                                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border text-[11px] text-muted-foreground">
                                    <FileIcon className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[120px]">{f.name}</span>
                                    <span className="opacity-60">{formatFileSize(f.size)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {msg.text && (
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {/* Thinking indicator */}
                  {isThinking && (
                    <div className="flex gap-2.5">
                      <div className="flex items-start shrink-0 pt-0.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-primary mb-1.5">{AI_NAME}</p>
                        <div className="flex items-center gap-2">
                          <span className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-border shrink-0 space-y-2">
              {/* Attached files preview */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {attachedFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground max-w-[200px] group"
                    >
                      <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-foreground text-[11px] font-medium">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Context badge row */}
              <div className="flex items-center gap-1.5 px-1">
                <label className="cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includePageContext}
                    onChange={(e) => setIncludePageContext(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border text-[11px] text-muted-foreground peer-checked:border-primary/40 peer-checked:bg-primary/10 peer-checked:text-primary transition-all">
                    <Route className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{pageLabel}</span>
                    <div className={cn(
                      'w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-all',
                      includePageContext
                        ? 'bg-primary border-primary'
                        : 'border-border group-hover:border-muted-foreground'
                    )}>
                      {includePageContext && (
                        <svg className="w-2 h-2 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </label>
              </div>

              {/* Voice recording overlay */}
              {isRecording && (
                <div className="rounded-xl bg-primary/5 border border-primary/30 p-3 space-y-2">
                  <Waveform analyser={analyserNode} />
                  <p className="text-xs text-muted-foreground min-h-[1.25rem] truncate px-1">
                    {transcribedText || 'Escuchando...'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary font-mono font-medium">
                      {formatTime(recordingTime)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          recognitionRef.current?.abort()
                          recognitionRef.current = null
                          streamRef.current?.getTracks().forEach((t) => t.stop())
                          streamRef.current = null
                          audioCtxRef.current?.close()
                          audioCtxRef.current = null
                          setAnalyserNode(null)
                          if (timerRef.current) clearInterval(timerRef.current)
                          setIsRecording(false)
                          setTranscribedText('')
                          setRecordingTime(0)
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all cursor-pointer"
                        title="Detener y transcribir"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        Listo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Input row */}
              {!isRecording && (
                <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-3 py-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 transition-all">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Preguntale a ${AI_NAME}...`}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleAttachFiles}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shrink-0"
                    title="Adjuntar archivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    onClick={startRecording}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer shrink-0"
                    title="Nota de voz"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isThinking}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer shrink-0',
                      input.trim() || attachedFiles.length > 0
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                {AI_NAME} puede cometer errores. Verifica la informacion.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '@/stores/authStore'
import {
  Bot, Send, X, Mic, Square, Route, Paperclip,
  File as FileIcon, Upload, Plus, MessageSquare,
  Trash2, MessagesSquare, Pencil, Check, Copy, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { aiApi, type AiConversation, type AiMessage, type AiFileInfo } from '@/services/api'
import { formatFileSize, mediaApi, type MediaFile as MediaFileType } from '@/lib/media'
import { MediaPanel } from '@/components/media/MediaPanel'

import { type AiAction, dispatchAiAction } from '@/lib/ai-actions'

// Map routes to friendly labels for the context badge
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Inicio',
  '/clientes': 'Clientes',
  '/proyectos': 'Proyectos',
  '/cotizaciones': 'Cotizaciones',
  '/admin/usuarios': 'Usuarios',
  '/admin/usuarios/nuevo': 'Nuevo Usuario',
  '/media': 'Media',
  '/perfil': 'Mi Perfil',
}

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  if (/^\/admin\/usuarios\/[^/]+$/.test(pathname)) return 'Editar Usuario'
  if (/^\/clientes\/nuevo$/.test(pathname)) return 'Nuevo Cliente'
  if (/^\/clientes\/[^/]+$/.test(pathname)) return 'Detalle Cliente'
  if (/^\/proyectos\/nuevo$/.test(pathname)) return 'Nuevo Proyecto'
  if (/^\/proyectos\/[^/]+\/editar$/.test(pathname)) return 'Editar Proyecto'
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

interface ChatFile {
  name: string
  size: number
  tipo: 'image' | 'pdf' | 'file'
  url?: string  // presigned URL for preview
}

/** An attachment can be a raw File (needs upload) or an already-uploaded MediaFile reference. */
type Attachment =
  | { kind: 'local'; file: File }
  | { kind: 'media'; id: number; nombre: string; tipo: 'image' | 'pdf' | 'file'; mime: string; tamano: number; key: string; url: string }

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  files?: ChatFile[]
  actions?: AiAction[]
  timestamp: string
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

  return <canvas ref={canvasRef} width={240} height={40} className="w-full h-10" />
}

// ---- Action buttons component ----
function AiActions({
  actions,
  onAction,
}: {
  actions: AiAction[]
  onAction: (action: AiAction) => void
}) {
  if (!actions.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
            action.variant === 'primary' &&
              'bg-primary text-primary-foreground hover:opacity-90',
            action.variant === 'secondary' &&
              'bg-muted text-foreground hover:bg-muted/80',
            action.variant === 'outline' &&
              'border border-border text-foreground hover:bg-muted',
            action.variant === 'destructive' &&
              'bg-destructive/10 text-destructive hover:bg-destructive/20',
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export function AiPanel({ open, onClose, width, onWidthChange }: AiPanelProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useUser()
  const [input, setInput] = useState('')
  const [includePageContext, setIncludePageContext] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaPickerWidth, setMediaPickerWidth] = useState(280)
  const MEDIA_MIN_W = 220
  const MEDIA_MAX_W = 420
  const [isThinking, setIsThinking] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [sidebarView, setSidebarView] = useState<'chat' | 'conversations'>('chat')
  const [editingConvId, setEditingConvId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const dragCounter = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // DB-backed conversations
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<number | null>(() => {
    const saved = localStorage.getItem('ai-active-conv')
    return saved ? Number(saved) : null
  })
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Edit user message state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editingMsgText, setEditingMsgText] = useState('')

  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribedText, setTranscribedText] = useState('')
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const recognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Load conversations and models on mount ---
  useEffect(() => {
    if (!open) return
    aiApi.listConversations().then((res) => setConversations(res.data)).catch(() => {})
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist active conversation
  useEffect(() => {
    if (activeConvId) localStorage.setItem('ai-active-conv', String(activeConvId))
    else localStorage.removeItem('ai-active-conv')
  }, [activeConvId])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      return
    }
    aiApi.getConversation(activeConvId).then((res) => {
      setMessages(
        res.data.mensajes.map((m: AiMessage) => ({
          id: String(m.id),
          role: m.rol as 'user' | 'assistant',
          text: m.contenido,
          actions: m.acciones as AiAction[] | undefined,
          files: m.archivos?.map((f) => ({
            name: f.nombre,
            size: f.tamano,
            tipo: f.tipo as ChatFile['tipo'],
            url: f.url,
          })),
          timestamp: m.creado_en,
        }))
      )
    }).catch(() => setMessages([]))
  }, [activeConvId])

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

  // --- Media picker resize ---
  const isResizingMedia = useRef(false)

  const handleMediaResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingMedia.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingMedia.current) return
      // The media panel's right edge is at (window.innerWidth - width)
      // Its left edge should be at ev.clientX
      const rightEdge = window.innerWidth - width
      const newW = rightEdge - ev.clientX
      setMediaPickerWidth(Math.min(MEDIA_MAX_W, Math.max(MEDIA_MIN_W, newW)))
    }

    const handleMouseUp = () => {
      isResizingMedia.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width])

  // --- Voice recording ---
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
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      setAnalyserNode(analyser)

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
    setAnalyserNode(null)
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

  // --- File handling ---
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragging(false); const f = Array.from(e.dataTransfer.files); if (f.length > 0) setAttachedFiles((prev) => [...prev, ...f.map((file): Attachment => ({ kind: 'local', file }))]) }
  const removeFile = (index: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== index))

  const handleMediaSelect = (file: MediaFileType) => {
    const alreadyAttached = attachedFiles.some((a) => a.kind === 'media' && a.id === file.id)
    if (alreadyAttached) return
    setAttachedFiles((prev) => [...prev, {
      kind: 'media', id: file.id, nombre: file.nombre, tipo: file.tipo,
      mime: file.mime, tamano: file.tamano, key: file.key, url: file.url,
    }])
  }

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages, isThinking, isUploading, streamingText])


  // --- Conversation management ---
  const handleNewChat = () => {
    setActiveConvId(null)
    setMessages([])
    setSidebarView('chat')
    setInput('')
    setAttachedFiles([])
    setStreamingText('')
  }

  const handleSelectConv = (id: number) => {
    setActiveConvId(id)
    setSidebarView('chat')
    setInput('')
    setAttachedFiles([])
    setStreamingText('')
  }

  const handleDeleteConv = async (id: number) => {
    try {
      await aiApi.deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConvId === id) {
        setActiveConvId(null)
        setMessages([])
      }
    } catch { /* handled by interceptor */ }
    setConfirmDeleteId(null)
  }

  const handleStartRename = (id: number, currentTitle: string) => {
    setEditingConvId(id)
    setEditingTitle(currentTitle)
  }

  const handleSaveRename = async () => {
    if (!editingConvId || !editingTitle.trim()) {
      setEditingConvId(null)
      return
    }
    try {
      await aiApi.updateConversation(editingConvId, { titulo: editingTitle.trim() })
      setConversations((prev) =>
        prev.map((c) => c.id === editingConvId ? { ...c, titulo: editingTitle.trim() } : c)
      )
    } catch { /* handled by interceptor */ }
    setEditingConvId(null)
  }

  // --- Action dispatcher ---
  const handleAction = (action: AiAction) => {
    dispatchAiAction(
      action,
      (text) => {
        setInput(text)
        // Auto-send the reply
        setTimeout(() => {
          const sendBtn = document.getElementById('ai-send-btn')
          sendBtn?.click()
        }, 100)
      },
      navigate,
    )
  }

  // --- Copy message ---
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  // --- Edit user message (resend) ---
  const handleEditMessage = (msgId: string, text: string) => {
    setEditingMsgId(msgId)
    setEditingMsgText(text)
  }

  const handleResendEdited = () => {
    if (!editingMsgId || !editingMsgText.trim()) {
      setEditingMsgId(null)
      return
    }
    // Remove the edited message and all subsequent messages
    const idx = messages.findIndex((m) => m.id === editingMsgId)
    if (idx === -1) { setEditingMsgId(null); return }
    setMessages((prev) => prev.slice(0, idx))
    setInput(editingMsgText.trim())
    setEditingMsgId(null)
    setEditingMsgText('')
    // Auto-send after state update
    setTimeout(() => {
      document.getElementById('ai-send-btn')?.click()
    }, 100)
  }

  // --- Delete conversation confirm ---
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // --- Retry last message ---
  const handleRetry = (msgId: string, msgText: string) => {
    const idx = messages.findIndex((m) => m.id === msgId)
    if (idx === -1) return
    // Remove this message and everything after it, then resend
    setMessages((prev) => prev.slice(0, idx))
    handleSend(msgText)
  }

  // --- Fullscreen file preview ---
  const [previewFile, setPreviewFile] = useState<ChatFile | null>(null)

  // --- Send message (SSE streaming) ---
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text && attachedFiles.length === 0) return
    if (isThinking || isUploading) return

    const currentAttachments = [...attachedFiles]
    setInput('')
    setAttachedFiles([])

    // Separate local files (need upload) from already-uploaded media
    let uploaded: AiFileInfo[] = []
    if (currentAttachments.length > 0) {
      const localFiles = currentAttachments.filter((a): a is Extract<Attachment, { kind: 'local' }> => a.kind === 'local')
      const mediaFiles = currentAttachments.filter((a): a is Extract<Attachment, { kind: 'media' }> => a.kind === 'media')

      // Already-uploaded media → pass through directly
      uploaded = mediaFiles.map((m) => ({
        id: String(m.id),
        nombre: m.nombre,
        tipo: m.tipo,
        mime: m.mime,
        tamano: m.tamano,
        key: m.key,
        url: m.url,
      }))

      // Local files → upload first
      if (localFiles.length > 0) {
        setIsUploading(true)
        try {
          const res = await mediaApi.upload(localFiles.map((l) => l.file), { folder: 'ai', entity_type: 'ai_message' })
          uploaded.push(...res.data.map((m) => ({
            id: String(m.id),
            nombre: m.nombre,
            tipo: m.tipo,
            mime: m.mime,
            tamano: m.tamano,
            key: m.key,
            url: m.url,
          })))
        } catch (err: any) {
          const msg = err?.response?.data?.detalle || err?.message || 'Error al subir archivos'
          toast.error(msg)
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }
    }

    setIsThinking(true)
    setStreamingText('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      files: uploaded.length > 0
        ? uploaded.map((f) => ({ name: f.nombre, size: f.tamano, tipo: f.tipo as ChatFile['tipo'], url: f.url }))
        : undefined,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])

    try {
      const token = localStorage.getItem('token')
      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch(aiApi.chatStreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contenido: text,
          conversacion_id: activeConvId,
          contexto_pagina: includePageContext ? `${location.pathname} (${pageLabel})` : null,
          archivos: uploaded.length > 0 ? uploaded : undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let allActions: AiAction[] = []
      // activeConvId tracked via state

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            switch (data.type) {
              case 'token':
                fullContent += data.content
                setStreamingText(fullContent)
                break
              case 'actions':
                allActions = data.actions as AiAction[]
                break
              case 'done':
                fullContent = data.content || fullContent
                allActions = data.actions || allActions
                break
              case 'meta':
                if (data.conversation_id && !activeConvId) {
                  setActiveConvId(data.conversation_id)
                }
                break
              case 'error':
                fullContent = data.message || 'Error del asistente AI'
                break
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Add assistant message
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: fullContent,
        actions: allActions.length > 0 ? allActions : undefined,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
      setStreamingText('')

      // Refresh conversation list
      aiApi.listConversations().then((res) => setConversations(res.data)).catch(() => {})

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('No se pudo conectar con el asistente AI')
      }
    } finally {
      setIsThinking(false)
      setStreamingText('')
      abortRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0
  const activeConv = conversations.find((c) => c.id === activeConvId)

  // Inline title editing in header
  const [editingHeaderTitle, setEditingHeaderTitle] = useState(false)
  const [headerTitleDraft, setHeaderTitleDraft] = useState('')

  const startEditHeaderTitle = () => {
    if (!activeConv) return
    setHeaderTitleDraft(activeConv.titulo)
    setEditingHeaderTitle(true)
  }

  const saveHeaderTitle = async () => {
    if (!activeConvId || !headerTitleDraft.trim()) {
      setEditingHeaderTitle(false)
      return
    }
    try {
      await aiApi.updateConversation(activeConvId, { titulo: headerTitleDraft.trim() })
      setConversations((prev) =>
        prev.map((c) => c.id === activeConvId ? { ...c, titulo: headerTitleDraft.trim() } : c)
      )
    } catch { /* handled by interceptor */ }
    setEditingHeaderTitle(false)
  }

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.actualizado_en).getTime() - new Date(a.actualizado_en).getTime()
  )


  return (
    <>
    {/* Fullscreen file preview — covers entire screen */}
    {previewFile && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => setPreviewFile(null)}
      >
        <button
          onClick={() => setPreviewFile(null)}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="absolute top-4 left-4 text-white/70 text-sm truncate max-w-[60%]">
          {previewFile.name}
        </p>
        <div
          className="max-w-[90vw] max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {previewFile.tipo === 'image' && previewFile.url && (
            <img
              src={previewFile.url}
              alt={previewFile.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          )}
          {previewFile.tipo === 'pdf' && previewFile.url && (
            <iframe
              src={previewFile.url}
              title={previewFile.name}
              className="w-[80vw] h-[85vh] rounded-lg bg-white"
            />
          )}
          {previewFile.tipo === 'file' && (
            <div className="bg-card rounded-2xl p-8 text-center">
              <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">{previewFile.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatFileSize(previewFile.size)}</p>
              <p className="text-xs text-muted-foreground mt-3">Vista previa no disponible para este tipo de archivo</p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Media picker side panel */}
    {open && showMediaPicker && (
      <div
        className="fixed top-0 h-screen z-[39] transition-all duration-200 ease-in-out"
        style={{ right: width, width: mediaPickerWidth }}
      >
        <div className="relative h-full flex flex-col bg-card border-l border-border shadow-xl shadow-black/20">
          {/* Resize handle (left edge) */}
          <div
            onMouseDown={handleMediaResizeDown}
            className="group absolute left-0 top-0 w-3 h-full z-50 cursor-col-resize flex items-center justify-center -translate-x-1/2"
          >
            <div className="w-[3px] h-8 rounded-full bg-border group-hover:bg-primary/60 transition-colors" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-semibold">Media</span>
            <button
              onClick={() => setShowMediaPicker(false)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <MediaPanel compact onSelectFile={(file) => { handleMediaSelect(file); setShowMediaPicker(false) }} />
        </div>
      </div>
    )}

    <div
      className={cn(
        'fixed top-0 right-0 h-screen z-40 transition-all duration-300 ease-in-out',
        open ? '' : 'w-0 overflow-hidden pointer-events-none'
      )}
      style={open ? { width } : undefined}
    >
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

        {/* Delete confirmation modal */}
        {confirmDeleteId !== null && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-5 mx-6 max-w-[280px] w-full shadow-xl">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 mx-auto mb-3">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h4 className="text-sm font-semibold text-foreground text-center mb-1">Eliminar conversacion</h4>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Esta accion no se puede deshacer. Se eliminaran todos los mensajes de esta conversacion.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteConv(confirmDeleteId)}
                  className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
                >
                  Eliminar
                </button>
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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            {activeConv && sidebarView === 'chat' ? (
              editingHeaderTitle ? (
                <input
                  autoFocus
                  value={headerTitleDraft}
                  onChange={(e) => setHeaderTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveHeaderTitle()
                    if (e.key === 'Escape') setEditingHeaderTitle(false)
                  }}
                  onBlur={saveHeaderTitle}
                  className="text-sm font-semibold w-full bg-background border border-primary/40 rounded-md px-2 py-0.5 outline-none text-foreground min-w-0"
                />
              ) : (
                <div className="flex items-center gap-1 min-w-0 group/title">
                  <p className="text-sm font-semibold text-foreground truncate">{activeConv.titulo}</p>
                  <button
                    onClick={startEditHeaderTitle}
                    className="opacity-0 group-hover/title:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                    title="Editar titulo"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )
            ) : (
              <p className="text-sm font-semibold text-foreground">{AI_NAME}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Nueva conversacion"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSidebarView(sidebarView === 'conversations' ? 'chat' : 'conversations')}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer',
                sidebarView === 'conversations'
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

        {sidebarView === 'conversations' ? (
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
                            className="text-sm w-full bg-background border border-primary/40 rounded-md px-2 py-0.5 outline-none text-foreground"
                          />
                        ) : (
                          <p className={cn(
                            'text-sm truncate',
                            conv.id === activeConvId ? 'text-foreground font-medium' : 'text-foreground/80'
                          )}>{conv.titulo}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(conv.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: user?.timezone || 'America/Mexico_City' })}
                          {' '}
                          {new Date(conv.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: user?.timezone || 'America/Mexico_City' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {editingConvId === conv.id ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveRename() }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary transition-all cursor-pointer"
                            title="Guardar"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRename(conv.id, conv.titulo) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            title="Renombrar"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(conv.id) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              {!hasMessages && !streamingText ? (
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
                      { icon: '👤', label: 'Da de alta un nuevo cliente' },
                      { icon: '📋', label: 'Crea un proyecto nuevo' },
                      { icon: '🔍', label: 'Busca proyectos en proceso' },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => {
                          setInput(suggestion.label)
                          setTimeout(() => {
                            document.getElementById('ai-send-btn')?.click()
                          }, 100)
                        }}
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
                      <div key={msg.id} className="group/msg flex justify-end">
                        <div className="max-w-[85%] w-fit">
                          {msg.files && msg.files.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                              {msg.files.map((f, i) =>
                                f.tipo === 'image' && f.url ? (
                                  <button
                                    key={i}
                                    onClick={() => setPreviewFile(f)}
                                    className="rounded-lg overflow-hidden border border-primary/20 hover:border-primary/50 transition-all cursor-pointer max-w-[140px]"
                                  >
                                    <img
                                      src={f.url}
                                      alt={f.name}
                                      className="w-full h-20 object-cover"
                                    />
                                    <div className="px-1.5 py-1 bg-primary/10 text-[10px] text-primary truncate">
                                      {f.name}
                                    </div>
                                  </button>
                                ) : (
                                  <button
                                    key={i}
                                    onClick={() => f.url ? setPreviewFile(f) : undefined}
                                    className={cn(
                                      'flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-[11px] text-primary',
                                      f.url && 'hover:bg-primary/20 cursor-pointer transition-colors'
                                    )}
                                  >
                                    <FileIcon className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[120px]">{f.name}</span>
                                    <span className="opacity-60">{formatFileSize(f.size)}</span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                          {editingMsgId === msg.id ? (
                            <div className="space-y-2">
                              <textarea
                                autoFocus
                                value={editingMsgText}
                                onChange={(e) => setEditingMsgText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleResendEdited() }
                                  if (e.key === 'Escape') setEditingMsgId(null)
                                }}
                                className="w-full bg-background border border-primary/40 rounded-xl px-3 py-2 text-sm outline-none text-foreground resize-none min-h-[60px]"
                                rows={Math.min(5, editingMsgText.split('\n').length + 1)}
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingMsgId(null)}
                                  className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleResendEdited}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
                                >
                                  <Send className="h-3 w-3" />
                                  Reenviar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.text && (
                                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed w-fit ml-auto">
                                  <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                              )}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <button
                                  onClick={() => handleRetry(msg.id, msg.text)}
                                  className="opacity-0 group-hover/msg:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  title="Reintentar"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleEditMessage(msg.id, msg.text)}
                                  className="opacity-0 group-hover/msg:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  title="Editar mensaje"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleCopy(msg.text)}
                                  className="opacity-0 group-hover/msg:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                  title="Copiar"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={msg.id} className="group/msg flex gap-2.5">
                        <div className="flex items-start shrink-0 pt-0.5">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                        </div>
                        <div className="max-w-[85%] min-w-0">
                          <p className="text-xs font-medium text-primary mb-1">{AI_NAME}</p>
                          <div className="bg-secondary rounded-2xl rounded-bl-sm px-3.5 py-2.5 border border-border">
                            {msg.text && (
                              <div className="text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                              </div>
                            )}
                            {/* Action buttons */}
                            {msg.actions && msg.actions.length > 0 && (
                              <AiActions actions={msg.actions} onAction={handleAction} />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={() => handleCopy(msg.text)}
                              className="opacity-0 group-hover/msg:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                              title="Copiar"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Upload indicator */}
                  {isUploading && (
                    <div className="flex justify-end">
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-primary/10 rounded-2xl rounded-br-sm text-sm text-primary">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Subiendo archivos...
                      </div>
                    </div>
                  )}

                  {/* Streaming text */}
                  {(isThinking || streamingText) && (
                    <div className="flex gap-2.5">
                      <div className="flex items-start shrink-0 pt-0.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <div className="min-w-0 max-w-[85%]">
                        <p className="text-xs font-medium text-primary mb-1">{AI_NAME}</p>
                        {streamingText ? (
                          <div className="bg-secondary rounded-2xl rounded-bl-sm px-3.5 py-2.5 border border-border">
                            <div className="text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                              <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        )}
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
                  {attachedFiles.map((att, i) => {
                    const name = att.kind === 'local' ? att.file.name : att.nombre
                    const size = att.kind === 'local' ? att.file.size : att.tamano
                    const isImg = att.kind === 'local' ? att.file.type.startsWith('image/') : att.tipo === 'image'
                    const thumbUrl = att.kind === 'local' ? (isImg ? URL.createObjectURL(att.file) : undefined) : (isImg ? att.url : undefined)
                    return isImg ? (
                      <div
                        key={`${name}-${i}`}
                        className="relative rounded-lg overflow-hidden border border-border max-w-[100px] group"
                      >
                        <button
                          onClick={() => setPreviewFile({ name, size, tipo: 'image', url: thumbUrl })}
                          className="cursor-pointer"
                        >
                          <img src={thumbUrl} alt={name} className="w-full h-16 object-cover" />
                        </button>
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 hover:bg-destructive text-white transition-colors cursor-pointer z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="px-1 py-0.5 text-[10px] text-foreground truncate bg-muted/80">{name}</p>
                      </div>
                    ) : (
                      <div
                        key={`${name}-${i}`}
                        className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground max-w-[200px] group"
                      >
                        <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-foreground text-[11px] font-medium">{name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(size)}</p>
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Context badge + Model selector row */}
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
                    <span className="truncate max-w-[120px]">{pageLabel}</span>
                    <div className={cn(
                      'w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-all',
                      includePageContext ? 'bg-primary border-primary' : 'border-border group-hover:border-muted-foreground'
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
                          recognitionRef.current?.abort(); recognitionRef.current = null
                          streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null
                          audioCtxRef.current?.close(); audioCtxRef.current = null; setAnalyserNode(null)
                          if (timerRef.current) clearInterval(timerRef.current)
                          setIsRecording(false); setTranscribedText(''); setRecordingTime(0)
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
                  <button
                    onClick={() => setShowMediaPicker((v) => !v)}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer shrink-0',
                      showMediaPicker ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
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
                    id="ai-send-btn"
                    onClick={() => handleSend()}
                    disabled={isThinking || isUploading}
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
    </>
  )
}

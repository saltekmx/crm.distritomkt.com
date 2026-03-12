import { create } from 'zustand'
import { toast } from 'sonner'
import { studioApi, type StudioGeneration, type StudioTemplate } from '@/services/api'
import { useStudioStore } from './studioStore'
import { useStudioCanvasStore } from './studioCanvasStore'

export interface StudioAiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  generationId?: number
  timestamp: string
}

export type PanelTab = 'generate' | 'adjust' | 'gallery'
export type LeftTab = 'generate' | 'adjust' | 'gallery' | 'edit' | 'scenes' | 'assets'

// ── Hub (AI Chat Home) types ──────────────────────────────────────────────────

export type StudioMode = 'home' | 'image' | 'video' | 'try-on'

export interface HubCard {
  type: 'project_status' | 'asset_preview' | 'approval_confirmation' | 'session_info'
  data: Record<string, unknown>
}

export interface HubAction {
  type: 'open_image_editor' | 'generate_image' | 'open_video_pipeline' | 'approve_asset' | 'export_asset' | 'show_gallery' | 'show_asset' | 'open_adjust' | 'set_reference_image' | 'generate_variation' | 'inpaint_image' | 'outpaint_image'
  params: Record<string, unknown>
}

export interface HubMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  cards?: HubCard[]
  action?: HubAction | null
  quickActions?: string[]
  animated?: boolean
  timestamp: string
}

interface StudioAiStore {
  messages: StudioAiMessage[]
  isOpen: boolean
  panelWidth: number
  activeTab: PanelTab | null
  leftTab: LeftTab | null
  selectedStyle: string | null
  selectedRatio: string
  selectedImageId: number | null
  chatContextImageId: number | null
  compareParentId: number | null
  isGenerating: boolean
  negativePrompt: string
  referenceImageUrl: string | null
  isEnhancing: boolean
  templates: StudioTemplate[]
  isLoadingTemplates: boolean
  promptHistory: string[]
  pendingPrompt: string | null

  // Model / batch / format
  selectedModel: string
  availableModels: Array<{ id: string; name: string; api_type: string; max_batch: number; supports_editing: boolean; aspect_ratios: string[]; price_hint: string; dimensions: Record<string, string> | null }>
  batchSize: number
  outputFormat: string
  isDescribing: boolean
  isUpscaling: boolean
  isEnhancingImage: boolean
  seed: number | null
  seedLocked: boolean

  // Inpaint / Outpaint overlay state
  showInpaintOverlay: boolean
  showOutpaintControls: boolean
  setShowInpaintOverlay: (show: boolean) => void
  setShowOutpaintControls: (show: boolean) => void

  // Hub state
  studioMode: StudioMode
  hubMessages: HubMessage[]
  isHubLoading: boolean
  streamingText: string
  activeConversationId: number | null

  // Focused image (null = dashboard view, number = single-image editor)
  activeImageId: number | null

  // Multi-selection
  selectedImageIds: Set<number>

  setSeed: (seed: number | null) => void
  setSeedLocked: (locked: boolean) => void
  setSelectedModel: (model: string) => void
  setBatchSize: (size: number) => void
  setOutputFormat: (format: string) => void
  loadModels: () => Promise<void>
  describeImage: (imageUrl: string, imageKey?: string | null) => Promise<{ description: string; suggested_prompt: string }>
  upscaleImage: (generationId: number, scale: number) => Promise<void>
  autoEnhanceImage: (generationId: number) => Promise<void>
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  setActiveTab: (tab: PanelTab | null) => void
  setLeftTab: (tab: LeftTab | null) => void
  setPanelWidth: (w: number) => void
  setSelectedStyle: (style: string | null) => void
  setSelectedRatio: (ratio: string) => void
  setSelectedImageId: (id: number | null) => void
  setChatContextImageId: (id: number | null) => void
  setCompareParentId: (id: number | null) => void
  setNegativePrompt: (text: string) => void
  setReferenceImageUrl: (url: string | null) => void
  sendMessage: (text: string, projectId: number) => Promise<void>
  enhancePrompt: (prompt: string) => Promise<string>
  loadPromptHistory: () => void
  addToPromptHistory: (prompt: string) => void
  loadTemplates: () => Promise<void>
  saveTemplate: (data: {
    name: string
    prompt: string
    negative_prompt?: string | null
    style_preset?: string | null
    aspect_ratio?: string
    is_shared?: boolean
  }) => Promise<void>
  deleteTemplate: (id: number) => Promise<void>
  loadFromGeneration: (gen: StudioGeneration) => void
  consumePendingPrompt: () => string | null
  clearMessages: () => void
  reset: () => void

  // Runware actions
  createVariation: (generationId: number, prompt?: string) => Promise<void>
  inpaintGeneration: (generationId: number, prompt: string, maskDataUrl: string, negativePrompt?: string) => Promise<void>
  outpaintGeneration: (generationId: number, data: { prompt?: string; expand_left?: number; expand_right?: number; expand_up?: number; expand_down?: number }) => Promise<void>

  // Hub actions
  setStudioMode: (mode: StudioMode) => void
  addHubMessage: (msg: HubMessage) => void
  clearHubMessages: () => void
  setActiveConversationId: (id: number | null) => void
  sendHubMessage: (text: string, projectId: number, attachments?: Array<{ url: string; key: string; nombre: string; mime: string }>) => Promise<void>
  executeQuickAction: (actionKey: string, projectId: number) => void
  _executeAction: (action: HubAction, projectId: number) => void

  // Canvas focus actions
  setActiveImage: (id: number | null) => void

  // Multi-selection actions
  toggleImageSelection: (id: number, modifiers: { ctrl: boolean; shift: boolean }) => void
  clearSelection: () => void
  selectAll: () => void
  getSelectedGenerations: () => StudioGeneration[]

  // Conversation management
  conversations: Array<{ id: number; titulo: string; creado_en: string; actualizado_en: string }>
  loadConversations: (projectId: number) => Promise<void>
  startNewChat: () => void
  switchConversation: (projectId: number, conversationId: number) => Promise<void>
  renameConversation: (projectId: number, conversationId: number, titulo: string) => Promise<void>
  removeConversation: (projectId: number, conversationId: number) => Promise<void>
}

const DEFAULT_WIDTH = 400
const MIN_WIDTH = 320
const MAX_WIDTH = 600
const STORAGE_KEY = 'studio-ai-panel'
const HISTORY_KEY = 'studio-prompt-history'

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(history: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
}

function loadPanelState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        open: !!data.open,
        width: data.width || DEFAULT_WIDTH,
        activeTab: (data.activeTab as PanelTab | null) ?? (data.open ? 'generate' : null),
      }
    }
  } catch {
    /* ignore */
  }
  return { open: false, width: DEFAULT_WIDTH, activeTab: null as PanelTab | null }
}

function persistPanelState(open: boolean, width: number, activeTab: PanelTab | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, width, activeTab }))
}

export { MIN_WIDTH, MAX_WIDTH }

export const useStudioAiStore = create<StudioAiStore>((set, get) => {
  const saved = loadPanelState()

  return {
    messages: [],
    isOpen: saved.open,
    panelWidth: saved.width,
    activeTab: saved.activeTab,
    leftTab: 'generate',
    selectedStyle: null,
    selectedRatio: '1:1',
    selectedImageId: null,
    chatContextImageId: null,
    compareParentId: null,
    isGenerating: false,
    negativePrompt: '',
    referenceImageUrl: null,
    isEnhancing: false,
    templates: [],
    isLoadingTemplates: false,
    promptHistory: [],
    pendingPrompt: null,

    // Model / batch / format
    selectedModel: 'flux-dev',
    availableModels: [],
    batchSize: 1,
    outputFormat: 'png',
    isDescribing: false,
    isUpscaling: false,
    isEnhancingImage: false,
    seed: null,
    seedLocked: false,

    // Inpaint / Outpaint overlay state
    showInpaintOverlay: false,
    showOutpaintControls: false,

    // Hub state
    studioMode: 'home',
    hubMessages: [],
    isHubLoading: false,
    streamingText: '',
    activeConversationId: null,
    conversations: [],

    // Focused image (null = dashboard, number = single-image editor)
    activeImageId: null,

    // Multi-selection
    selectedImageIds: new Set(),

    setSeed: (seed) => set({ seed }),
    setSeedLocked: (locked) => set({ seedLocked: locked }),
    setSelectedModel: (model) => set({ selectedModel: model }),
    setBatchSize: (size) => set({ batchSize: Math.min(Math.max(1, size), 4) }),
    setOutputFormat: (format) => set({ outputFormat: format }),
    loadModels: async () => {
      try {
        const { data } = await studioApi.getModels()
        set({ availableModels: data.models })
      } catch {
        // Fallback — don't block UI
      }
    },
    describeImage: async (imageUrl, imageKey) => {
      set({ isDescribing: true })
      try {
        const { data } = await studioApi.describeImage(imageUrl, imageKey)
        set({ isDescribing: false })
        return data
      } catch {
        set({ isDescribing: false })
        toast.error('Error al analizar la imagen')
        return { description: '', suggested_prompt: '' }
      }
    },
    upscaleImage: async (generationId, scale) => {
      set({ isUpscaling: true })
      try {
        const { data } = await studioApi.upscaleImage(generationId, scale)
        useStudioStore.setState((s) => ({
          generations: [data, ...s.generations],
        }))
        useStudioCanvasStore.getState().addToBoard(data.id)
        set({ isUpscaling: false, selectedImageId: data.id })
        toast.success(`Imagen escalada ${scale}x`)
      } catch {
        set({ isUpscaling: false })
        toast.error('Error al escalar la imagen')
      }
    },
    autoEnhanceImage: async (generationId) => {
      set({ isEnhancingImage: true })
      try {
        const { data } = await studioApi.autoEnhance(generationId)
        useStudioStore.setState((s) => ({
          generations: [data, ...s.generations],
        }))
        useStudioCanvasStore.getState().addToBoard(data.id)
        set({ isEnhancingImage: false, selectedImageId: data.id })
        toast.success('Imagen mejorada')
      } catch {
        set({ isEnhancingImage: false })
        toast.error('Error al mejorar la imagen')
      }
    },

    togglePanel: () => {
      const { activeTab, panelWidth } = get()
      if (activeTab !== null) {
        set({ activeTab: null, isOpen: false })
        persistPanelState(false, panelWidth, null)
      } else {
        set({ activeTab: 'generate', isOpen: true })
        persistPanelState(true, panelWidth, 'generate')
      }
    },

    openPanel: () => {
      const { activeTab, panelWidth } = get()
      const tab = activeTab ?? 'generate'
      set({ isOpen: true, activeTab: tab })
      persistPanelState(true, panelWidth, tab)
    },

    closePanel: () => {
      const { panelWidth } = get()
      set({ isOpen: false, activeTab: null })
      persistPanelState(false, panelWidth, null)
    },

    setActiveTab: (tab) => {
      const { panelWidth } = get()
      const open = tab !== null
      set({ activeTab: tab, isOpen: open })
      persistPanelState(open, panelWidth, tab)
    },

    setLeftTab: (tab) => {
      set({ leftTab: get().leftTab === tab ? null : tab })
    },

    setPanelWidth: (w) => {
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))
      set({ panelWidth: clamped })
      persistPanelState(get().isOpen, clamped, get().activeTab)
    },

    setSelectedStyle: (style) => set({ selectedStyle: style }),
    setSelectedRatio: (ratio) => set({ selectedRatio: ratio }),
    setSelectedImageId: (id) => set({ selectedImageId: id, activeImageId: id }),
    setChatContextImageId: (id) => set({ chatContextImageId: id }),
    setCompareParentId: (id) => set({ compareParentId: id }),
    setNegativePrompt: (text) => set({ negativePrompt: text }),
    setReferenceImageUrl: (url) => set({ referenceImageUrl: url }),
    setShowInpaintOverlay: (show) => set({ showInpaintOverlay: show }),
    setShowOutpaintControls: (show) => set({ showOutpaintControls: show }),

    sendMessage: async (text, projectId) => {
      const { selectedStyle, selectedRatio, negativePrompt, referenceImageUrl, selectedModel, batchSize, outputFormat, seed } = get()
      const trimmed = text.trim()
      if (!trimmed) return
      if (get().isGenerating) return

      const userMsg: StudioAiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed,
        timestamp: new Date().toISOString(),
      }

      set((s) => ({ messages: [...s.messages, userMsg], isGenerating: true }))

      // Save to prompt history
      get().addToPromptHistory(trimmed)

      try {
        const { data } = await studioApi.generateImage({
          project_id: projectId,
          prompt: trimmed,
          style_preset: selectedStyle,
          aspect_ratio: selectedRatio,
          negative_prompt: negativePrompt || null,
          source_image_url: referenceImageUrl || null,
          model: selectedModel,
          batch_size: batchSize,
          output_format: outputFormat,
          ...(seed != null ? { seed } : {}),
        })

        const assistantMsg: StudioAiMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text:
            data.estado === 'complete'
              ? 'Imagen generada exitosamente.'
              : data.estado === 'failed'
                ? `Error: ${data.mensaje_error || 'No se pudo generar la imagen.'}`
                : 'Generando imagen...',
          generationId: data.id,
          timestamp: new Date().toISOString(),
        }

        // Capture parent BEFORE changing selectedImageId
        const parentId = get().selectedImageId

        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isGenerating: false,
        }))

        // Also update the main studioStore
        useStudioStore.setState((s) => ({
          generations: [data, ...s.generations],
        }))

        // Place on board
        useStudioCanvasStore.getState().addToBoard(data.id)

        // Select the new image
        if (data.estado === 'complete') {
          set({ selectedImageId: data.id })
        }
        // Record version link if generated from a selected image
        if (parentId && data.id && referenceImageUrl) {
          useStudioStore.getState().addVersionLink(data.id, parentId)
          // Auto-trigger compare view
          set({ compareParentId: parentId })
        }

        if (data.estado === 'complete') {
          toast.success('Imagen generada')
        } else if (data.estado === 'failed') {
          toast.error(data.mensaje_error || 'Error al generar imagen')
        }
      } catch {
        const errorMsg: StudioAiMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Error al generar imagen. Intenta de nuevo.',
          timestamp: new Date().toISOString(),
        }
        set((s) => ({
          messages: [...s.messages, errorMsg],
          isGenerating: false,
        }))
        toast.error('Error al generar imagen')
      }
    },

    enhancePrompt: async (prompt) => {
      const { selectedStyle } = get()
      set({ isEnhancing: true })
      try {
        const { data } = await studioApi.enhancePrompt({
          prompt,
          style_preset: selectedStyle,
        })
        set({ isEnhancing: false })
        return data.enhanced_prompt
      } catch {
        set({ isEnhancing: false })
        toast.error('Error al mejorar el prompt')
        return prompt
      }
    },

    loadPromptHistory: () => {
      set({ promptHistory: loadHistory() })
    },

    addToPromptHistory: (prompt) => {
      const current = get().promptHistory
      const deduped = [prompt, ...current.filter((p) => p !== prompt)].slice(0, 20)
      set({ promptHistory: deduped })
      saveHistory(deduped)
    },

    loadTemplates: async () => {
      set({ isLoadingTemplates: true })
      try {
        const { data } = await studioApi.getTemplates()
        set({ templates: data, isLoadingTemplates: false })
      } catch {
        set({ isLoadingTemplates: false })
        toast.error('Error al cargar plantillas')
      }
    },

    saveTemplate: async (data) => {
      try {
        const { data: template } = await studioApi.createTemplate(data)
        set((s) => ({ templates: [template, ...s.templates] }))
        toast.success('Plantilla guardada')
      } catch {
        toast.error('Error al guardar plantilla')
      }
    },

    deleteTemplate: async (id) => {
      try {
        await studioApi.deleteTemplate(id)
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
        toast.success('Plantilla eliminada')
      } catch {
        toast.error('Error al eliminar plantilla')
      }
    },

    loadFromGeneration: (gen) => {
      const { panelWidth } = get()
      set({
        selectedStyle: gen.estilo,
        selectedRatio: gen.aspect_ratio,
        negativePrompt: '',
        selectedImageId: gen.id,
        pendingPrompt: gen.prompt,
        activeTab: 'generate',
        isOpen: true,
      })
      persistPanelState(true, panelWidth, 'generate')
    },

    consumePendingPrompt: () => {
      const prompt = get().pendingPrompt
      if (prompt) set({ pendingPrompt: null })
      return prompt
    },

    clearMessages: () => set({ messages: [] }),

    // ── Runware actions ────────────────────────────────────────────────────────

    createVariation: async (generationId, prompt) => {
      set({ isGenerating: true })
      try {
        const { selectedRatio, selectedModel } = get()
        const { data } = await studioApi.variationImage(generationId, { prompt, aspect_ratio: selectedRatio, model: selectedModel })
        useStudioStore.setState((s) => ({ generations: [data, ...s.generations] }))
        useStudioCanvasStore.getState().addToBoard(data.id)
        set({ isGenerating: false, selectedImageId: data.id })
        toast.success('Variacion creada')
      } catch {
        set({ isGenerating: false })
        toast.error('Error al crear variacion')
      }
    },

    inpaintGeneration: async (generationId, prompt, maskDataUrl, negativePrompt) => {
      set({ isGenerating: true, showInpaintOverlay: false })
      try {
        const { data } = await studioApi.inpaintImage(generationId, { prompt, mask_data_url: maskDataUrl, negative_prompt: negativePrompt })
        useStudioStore.setState((s) => ({ generations: [data, ...s.generations] }))
        useStudioCanvasStore.getState().addToBoard(data.id)
        set({ isGenerating: false, selectedImageId: data.id })
        toast.success('Region editada')
      } catch {
        set({ isGenerating: false })
        toast.error('Error al editar region')
      }
    },

    outpaintGeneration: async (generationId, expandData) => {
      set({ isGenerating: true, showOutpaintControls: false })
      try {
        const { data } = await studioApi.outpaintImage(generationId, expandData)
        useStudioStore.setState((s) => ({ generations: [data, ...s.generations] }))
        useStudioCanvasStore.getState().addToBoard(data.id)
        set({ isGenerating: false, selectedImageId: data.id })
        toast.success('Lienzo expandido')
      } catch {
        set({ isGenerating: false })
        toast.error('Error al expandir lienzo')
      }
    },

    // ── Hub actions ───────────────────────────────────────────────────────────

    setStudioMode: (mode) => set({ studioMode: mode }),

    addHubMessage: (msg) =>
      set((s) => ({ hubMessages: [...s.hubMessages, msg] })),

    clearHubMessages: () => set({ hubMessages: [], activeConversationId: null }),

    setActiveConversationId: (id) => set({ activeConversationId: id }),

    sendHubMessage: async (text, projectId, attachments) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (get().isHubLoading) return

      const userMsg: HubMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed,
        timestamp: new Date().toISOString(),
      }

      set((s) => ({
        hubMessages: [...s.hubMessages, userMsg],
        isHubLoading: true,
        streamingText: '',
      }))

      // Build UI context for the agent
      const { studioMode, selectedImageId, leftTab, chatContextImageId } = get()
      const gens = useStudioStore.getState().generations
      const contextImageId = chatContextImageId ?? selectedImageId
      const selectedGen = gens.find((g) => g.id === contextImageId)
      const context: Record<string, unknown> = {
        mode: studioMode,
        active_tab: leftTab,
      }
      if (selectedGen) {
        context.selected_image = {
          id: selectedGen.id,
          prompt: selectedGen.prompt,
          status: selectedGen.estado,
          style: selectedGen.estilo,
          aspect_ratio: selectedGen.aspect_ratio,
          is_favorite: selectedGen.is_favorito,
          output_url: selectedGen.url_salida || null,
          output_key: selectedGen.key_salida || null,
        }
      }
      // Include attached image info in context
      if (attachments?.length) {
        context.attached_files = attachments.map((a) => ({
          url: a.url,
          key: a.key,
          nombre: a.nombre,
          mime: a.mime,
        }))
      }

      try {
        const token = localStorage.getItem('token')
        const response = await fetch(studioApi.chatStreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: projectId,
            message: trimmed,
            conversacion_id: get().activeConversationId,
            context,
            archivos: attachments || undefined,
          }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No stream')

        const decoder = new TextDecoder()
        let buffer = ''
        let fullContent = ''
        let actionData: HubAction | null = null

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
                  set({ streamingText: fullContent })
                  break
                case 'done':
                  // Use nullish coalescing: data.content may be "" (empty string)
                  // which is valid (agent stripped action block, leaving empty text).
                  // `||` would skip "" and keep dirty fullContent with raw action block.
                  fullContent = data.content ?? fullContent
                  if (data.action) {
                    actionData = data.action as HubAction
                  }
                  break
                case 'meta':
                  if (data.conversation_id) {
                    set({ activeConversationId: data.conversation_id })
                  }
                  break
                case 'error':
                  fullContent = data.message || 'Error al procesar'
                  break
              }
            } catch { /* ignore parse errors */ }
          }
        }

        const assistantMsg: HubMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: fullContent,
          action: actionData,
          timestamp: new Date().toISOString(),
        }

        set((s) => ({
          hubMessages: [...s.hubMessages, assistantMsg],
          isHubLoading: false,
          streamingText: '',
        }))

        // Execute action if present
        if (actionData) {
          setTimeout(() => {
            get()._executeAction(actionData!, projectId)
          }, 800)
        }
      } catch {
        const errorMsg: HubMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Error al procesar tu mensaje. Puedes intentar de nuevo?',
          timestamp: new Date().toISOString(),
        }
        set((s) => ({
          hubMessages: [...s.hubMessages, errorMsg],
          isHubLoading: false,
          streamingText: '',
        }))
        toast.error('Error en el chat')
      }
    },

    executeQuickAction: (actionKey, projectId) => {
      if (get().isHubLoading) return

      // Actions that need AI streaming (no predefined reply)
      const chatDelegated = ['Estado del Proyecto']
      if (chatDelegated.includes(actionKey)) {
        get().sendHubMessage(actionKey, projectId)
        return
      }

      const quickActions: Record<
        string,
        { reply: string; transition: () => void; delay: number }
      > = {
        'Generar Imagenes': {
          reply: 'Perfecto! Te llevo al editor de imagenes. Usa la galeria para explorar o escribe un prompt para crear algo nuevo.',
          transition: () => set({ studioMode: 'image', leftTab: 'gallery', selectedImageId: null }),
          delay: 1400,
        },
        'Crear Videos': {
          reply: 'Preparando el pipeline de video. Vamos a crear contenido cinematico!',
          transition: () => set({ studioMode: 'video', leftTab: 'scenes' }),
          delay: 1200,
        },
        'Ver Galeria': {
          reply: 'Aqui tienes tu galeria. Selecciona cualquier asset para editarlo o crear variaciones.',
          transition: () => set({ studioMode: 'image', leftTab: 'gallery', selectedImageId: null }),
          delay: 1200,
        },
      }

      const config = quickActions[actionKey]
      if (!config) {
        get().sendHubMessage(actionKey, projectId)
        return
      }

      const now = new Date().toISOString()
      const userMsg: HubMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: actionKey,
        timestamp: now,
      }
      const assistantMsg: HubMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: config.reply,
        animated: true,
        timestamp: now,
      }

      set((s) => ({
        hubMessages: [...s.hubMessages, userMsg, assistantMsg],
      }))

      // Delayed transition — let the typewriter animation finish first
      setTimeout(() => {
        config.transition()
      }, config.delay)
    },

    _executeAction: (action, projectId) => {
      // Normalise: the LLM may return params at the top level (no "params" key)
      // or nested inside a "params" sub-object. Handle both formats.
      const raw = action as unknown as Record<string, unknown>
      const p: Record<string, unknown> = (action.params && typeof action.params === 'object')
        ? action.params
        : Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'type'))
      switch (action.type) {
        case 'open_image_editor':
          set({ studioMode: 'image' })
          if (p.prompt) set({ pendingPrompt: p.prompt as string })
          if (p.style) set({ selectedStyle: p.style as string })
          if (p.aspect_ratio) set({ selectedRatio: p.aspect_ratio as string })
          break

        case 'generate_image': {
          set({ studioMode: 'image' })
          // Resolve prompt & source image from selected generation
          const selId = get().selectedImageId
          const selGen = selId ? useStudioStore.getState().generations.find((g) => g.id === selId) : null
          let genPrompt = p.prompt as string | undefined
          if (!genPrompt) genPrompt = selGen?.prompt
          if (genPrompt) {
            set({ pendingPrompt: genPrompt })
            if (p.style) set({ selectedStyle: p.style as string })
            if (p.aspect_ratio) set({ selectedRatio: p.aspect_ratio as string })
            // If modifying an existing image, use it as reference
            if (selGen?.url_salida) {
              set({ referenceImageUrl: selGen.url_salida })
            }
            // Auto-trigger generation after mode transition
            setTimeout(() => {
              get().sendMessage(genPrompt!, projectId)
            }, 300)
          } else {
            toast.error('No se pudo determinar el prompt para generar')
          }
          break
        }

        case 'show_asset': {
          const genId = p.generation_id as number | undefined
          if (genId) {
            set({ studioMode: 'image', selectedImageId: genId })
          } else {
            const gens = useStudioStore.getState().generations
            const latest = gens.find((g) => g.estado === 'complete' && g.url_salida)
            if (latest) set({ studioMode: 'image', selectedImageId: latest.id })
            else set({ studioMode: 'image' })
          }
          break
        }

        case 'open_video_pipeline':
          set({ studioMode: 'video', leftTab: 'scenes' })
          break

        case 'show_gallery':
          set({ studioMode: 'image', leftTab: 'gallery', selectedImageId: null })
          break

        case 'approve_asset': {
          const favId = (p.generation_id as number) || get().selectedImageId
          if (favId) {
            studioApi.toggleFavorite(favId).then(() => {
              useStudioStore.setState((s) => ({
                generations: s.generations.map((g) =>
                  g.id === favId ? { ...g, is_favorito: !g.is_favorito } : g,
                ),
              }))
              toast.success('Asset actualizado')
            }).catch(() => toast.error('Error al aprobar'))
          }
          break
        }

        case 'export_asset': {
          const exportId = (p.generation_id as number) || get().selectedImageId
          if (exportId) {
            studioApi.exportGeneration(exportId).then(() => {
              toast.success('Asset exportado al CRM')
            }).catch(() => toast.error('Error al exportar'))
          }
          break
        }

        case 'open_adjust':
          set({ studioMode: 'image', leftTab: 'adjust' })
          break

        case 'set_reference_image': {
          const imgUrl = (p.image_url as string) || (p.url as string)
          if (imgUrl) {
            set({ referenceImageUrl: imgUrl, studioMode: 'image', activeTab: 'generate' })
            toast.success('Imagen establecida como referencia')
          }
          break
        }

        case 'generate_variation': {
          const selId = get().selectedImageId
          if (!selId) {
            toast.info('Selecciona una imagen primero')
            break
          }
          const varPrompt = p.prompt as string | undefined
          get().createVariation(selId, varPrompt)
          break
        }

        case 'inpaint_image': {
          const selId = get().selectedImageId
          if (!selId) {
            toast.info('Selecciona una imagen primero para editar')
            break
          }
          // Show inpaint overlay — user will draw mask and submit
          set({ showInpaintOverlay: true })
          // Store the suggested prompt in pendingPrompt for InpaintOverlay to pick up
          if (p.prompt) set({ pendingPrompt: p.prompt as string })
          break
        }

        case 'outpaint_image': {
          const selId = get().selectedImageId
          if (!selId) {
            toast.info('Selecciona una imagen primero para expandir')
            break
          }
          // Show outpaint controls
          set({ showOutpaintControls: true })
          if (p.prompt) set({ pendingPrompt: p.prompt as string })
          break
        }
      }
    },

    // ── Canvas focus actions ───────────────────────────────────────────────────

    setActiveImage: (id) => {
      set({
        activeImageId: id,
        selectedImageId: id,
        selectedImageIds: id !== null ? new Set([id]) : new Set(),
      })
    },

    // ── Multi-selection actions ──────────────────────────────────────────────

    toggleImageSelection: (id, modifiers) => {
      const { selectedImageIds } = get()

      if (!modifiers.ctrl && !modifiers.shift) {
        // Single click — select this image
        set({ selectedImageId: id, selectedImageIds: new Set([id]) })
        return
      }

      if (modifiers.ctrl) {
        // Toggle in/out
        const next = new Set(selectedImageIds)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        set({ selectedImageIds: next })
        return
      }

      if (modifiers.shift) {
        // Range select from last selected to clicked (gallery order)
        const gens = useStudioStore.getState().generations
        const genIds = gens.filter((g) => g.estado === 'complete').map((g) => g.id)
        const lastSelected = [...selectedImageIds].pop()
        if (lastSelected === undefined) {
          set({ selectedImageIds: new Set([id]) })
          return
        }
        const startIdx = genIds.indexOf(lastSelected)
        const endIdx = genIds.indexOf(id)
        if (startIdx === -1 || endIdx === -1) {
          set({ selectedImageIds: new Set([id]) })
          return
        }
        const lo = Math.min(startIdx, endIdx)
        const hi = Math.max(startIdx, endIdx)
        const range = genIds.slice(lo, hi + 1)
        set({ selectedImageIds: new Set([...selectedImageIds, ...range]) })
      }
    },

    clearSelection: () => set({ selectedImageIds: new Set() }),

    selectAll: () => {
      const gens = useStudioStore.getState().generations
      const ids = gens.filter((g) => g.estado === 'complete').map((g) => g.id)
      set({ selectedImageIds: new Set(ids) })
    },

    getSelectedGenerations: () => {
      const { selectedImageIds } = get()
      const gens = useStudioStore.getState().generations
      return gens.filter((g) => selectedImageIds.has(g.id))
    },

    // ── Conversation management ────────────────────────────────────────────────

    loadConversations: async (projectId) => {
      try {
        const { data } = await studioApi.listConversations(projectId)
        set({ conversations: data })
      } catch {
        // silent
      }
    },

    startNewChat: () => {
      set({
        activeConversationId: null,
        hubMessages: [],
        streamingText: '',
        isHubLoading: false,
      })
    },

    switchConversation: async (projectId, conversationId) => {
      try {
        const { data } = await studioApi.getConversation(projectId, conversationId)
        const msgs: HubMessage[] = (data.mensajes || []).map((m: any) => ({
          id: String(m.id),
          role: m.rol === 'user' ? 'user' as const : 'assistant' as const,
          text: m.contenido,
          action: m.accion,
          timestamp: m.creado_en,
        }))
        set({
          activeConversationId: conversationId,
          hubMessages: msgs,
          streamingText: '',
          isHubLoading: false,
        })
      } catch {
        toast.error('Error al cargar conversacion')
      }
    },

    renameConversation: async (projectId, conversationId, titulo) => {
      try {
        await studioApi.updateConversation(projectId, conversationId, { titulo })
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, titulo } : c,
          ),
        }))
      } catch {
        toast.error('Error al renombrar')
      }
    },

    removeConversation: async (projectId, conversationId) => {
      try {
        await studioApi.deleteConversation(projectId, conversationId)
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== conversationId),
          ...(s.activeConversationId === conversationId
            ? { activeConversationId: null, hubMessages: [] }
            : {}),
        }))
        toast.success('Conversacion eliminada')
      } catch {
        toast.error('Error al eliminar')
      }
    },

    reset: () => {
      useStudioCanvasStore.getState().clearBoard()
      set({
        messages: [],
        selectedStyle: null,
        selectedRatio: '1:1',
        selectedImageId: null,
        chatContextImageId: null,
        compareParentId: null,
        isGenerating: false,
        negativePrompt: '',
        referenceImageUrl: null,
        isEnhancing: false,
        pendingPrompt: null,
        selectedModel: 'flux-dev',
        batchSize: 1,
        outputFormat: 'png',
        availableModels: [],
        isDescribing: false,
        isUpscaling: false,
        isEnhancingImage: false,
        seed: null,
        seedLocked: false,
        studioMode: 'home',
        hubMessages: [],
        isHubLoading: false,
        streamingText: '',
        activeConversationId: null,
        conversations: [],
        activeImageId: null,
        selectedImageIds: new Set(),
      })
    },
  }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStudioAiStore } from '../studioAiStore'
import { studioApi, type StudioTemplate } from '@/services/api'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/services/api', () => ({
  studioApi: {
    generateImage: vi.fn(),
    enhancePrompt: vi.fn(),
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    getModels: vi.fn(),
    describeImage: vi.fn(),
    upscaleImage: vi.fn(),
    autoEnhance: vi.fn(),
    toggleFavorite: vi.fn(),
    exportGeneration: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn(),
    chatStreamUrl: 'http://test/api/v1/studio/chat',
  },
}))

vi.mock('../studioStore', () => ({
  useStudioStore: {
    getState: vi.fn(() => ({ generations: [] })),
    setState: vi.fn(),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<StudioTemplate> = {}): StudioTemplate {
  return {
    id: 1,
    nombre: 'Test Template',
    prompt: 'A beautiful landscape',
    negative_prompt: null,
    style_preset: null,
    aspect_ratio: '1:1',
    is_shared: false,
    creado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('studioAiStore', () => {
  beforeEach(() => {
    useStudioAiStore.getState().reset()
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ── Initial state ────────────────────────────────────────────────────────

  it('should have correct initial state after reset', () => {
    const state = useStudioAiStore.getState()
    expect(state.messages).toEqual([])
    expect(state.selectedStyle).toBeNull()
    expect(state.selectedRatio).toBe('1:1')
    expect(state.selectedImageId).toBeNull()
    expect(state.isGenerating).toBe(false)
    expect(state.negativePrompt).toBe('')
    expect(state.referenceImageUrl).toBeNull()
    expect(state.isEnhancing).toBe(false)
    expect(state.templates).toEqual([])
    expect(state.pendingPrompt).toBeNull()
    expect(state.selectedModel).toBe('gemini-2.5-flash-image')
    expect(state.batchSize).toBe(1)
    expect(state.outputFormat).toBe('png')
    expect(state.studioMode).toBe('home')
    expect(state.hubMessages).toEqual([])
    expect(state.isHubLoading).toBe(false)
    expect(state.streamingText).toBe('')
    expect(state.activeConversationId).toBeNull()
    expect(state.conversations).toEqual([])
    expect(state.activeImageId).toBeNull()
    expect(state.selectedImageIds.size).toBe(0)
  })

  // ── Simple setters ───────────────────────────────────────────────────────

  it('setStudioMode should switch between home, image, video', () => {
    useStudioAiStore.getState().setStudioMode('image')
    expect(useStudioAiStore.getState().studioMode).toBe('image')

    useStudioAiStore.getState().setStudioMode('video')
    expect(useStudioAiStore.getState().studioMode).toBe('video')

    useStudioAiStore.getState().setStudioMode('home')
    expect(useStudioAiStore.getState().studioMode).toBe('home')
  })

  it('setSelectedStyle should update style', () => {
    useStudioAiStore.getState().setSelectedStyle('anime')
    expect(useStudioAiStore.getState().selectedStyle).toBe('anime')

    useStudioAiStore.getState().setSelectedStyle(null)
    expect(useStudioAiStore.getState().selectedStyle).toBeNull()
  })

  it('setSelectedRatio should update aspect ratio', () => {
    useStudioAiStore.getState().setSelectedRatio('16:9')
    expect(useStudioAiStore.getState().selectedRatio).toBe('16:9')
  })

  it('setNegativePrompt should update negative prompt', () => {
    useStudioAiStore.getState().setNegativePrompt('blurry, low quality')
    expect(useStudioAiStore.getState().negativePrompt).toBe('blurry, low quality')
  })

  it('setReferenceImageUrl should update reference URL', () => {
    useStudioAiStore.getState().setReferenceImageUrl('https://cdn/ref.png')
    expect(useStudioAiStore.getState().referenceImageUrl).toBe('https://cdn/ref.png')
  })

  it('setSelectedModel should update model', () => {
    useStudioAiStore.getState().setSelectedModel('dall-e-3')
    expect(useStudioAiStore.getState().selectedModel).toBe('dall-e-3')
  })

  it('setBatchSize should clamp between 1 and 4', () => {
    useStudioAiStore.getState().setBatchSize(3)
    expect(useStudioAiStore.getState().batchSize).toBe(3)

    useStudioAiStore.getState().setBatchSize(0)
    expect(useStudioAiStore.getState().batchSize).toBe(1)

    useStudioAiStore.getState().setBatchSize(10)
    expect(useStudioAiStore.getState().batchSize).toBe(4)
  })

  it('setOutputFormat should update format', () => {
    useStudioAiStore.getState().setOutputFormat('webp')
    expect(useStudioAiStore.getState().outputFormat).toBe('webp')
  })

  it('setSeed and setSeedLocked should update seed state', () => {
    useStudioAiStore.getState().setSeed(12345)
    expect(useStudioAiStore.getState().seed).toBe(12345)

    useStudioAiStore.getState().setSeedLocked(true)
    expect(useStudioAiStore.getState().seedLocked).toBe(true)
  })

  it('setActiveConversationId should update active conversation', () => {
    useStudioAiStore.getState().setActiveConversationId(5)
    expect(useStudioAiStore.getState().activeConversationId).toBe(5)
  })

  it('setSelectedVideoProjectId should update video project', () => {
    useStudioAiStore.getState().setSelectedVideoProjectId(7)
    expect(useStudioAiStore.getState().selectedVideoProjectId).toBe(7)
  })

  // ── addHubMessage / clearHubMessages ─────────────────────────────────────

  it('addHubMessage should append a message', () => {
    const msg = {
      id: 'abc',
      role: 'user' as const,
      text: 'Hello',
      timestamp: '2026-01-01T00:00:00Z',
    }
    useStudioAiStore.getState().addHubMessage(msg)

    expect(useStudioAiStore.getState().hubMessages).toHaveLength(1)
    expect(useStudioAiStore.getState().hubMessages[0].text).toBe('Hello')
  })

  it('clearHubMessages should empty messages and clear conversation', () => {
    useStudioAiStore.setState({
      hubMessages: [{ id: '1', role: 'user', text: 'Hi', timestamp: '' }],
      activeConversationId: 5,
    })

    useStudioAiStore.getState().clearHubMessages()

    expect(useStudioAiStore.getState().hubMessages).toEqual([])
    expect(useStudioAiStore.getState().activeConversationId).toBeNull()
  })

  // ── Panel toggling ───────────────────────────────────────────────────────

  it('togglePanel should open when closed and close when open', () => {
    // Initially reset — activeTab is null
    useStudioAiStore.setState({ activeTab: null, isOpen: false })
    useStudioAiStore.getState().togglePanel()
    expect(useStudioAiStore.getState().isOpen).toBe(true)
    expect(useStudioAiStore.getState().activeTab).toBe('generate')

    useStudioAiStore.getState().togglePanel()
    expect(useStudioAiStore.getState().isOpen).toBe(false)
    expect(useStudioAiStore.getState().activeTab).toBeNull()
  })

  it('openPanel should set isOpen and default tab', () => {
    useStudioAiStore.setState({ isOpen: false, activeTab: null })
    useStudioAiStore.getState().openPanel()

    expect(useStudioAiStore.getState().isOpen).toBe(true)
    expect(useStudioAiStore.getState().activeTab).toBe('generate')
  })

  it('closePanel should set isOpen false and clear tab', () => {
    useStudioAiStore.setState({ isOpen: true, activeTab: 'gallery' })
    useStudioAiStore.getState().closePanel()

    expect(useStudioAiStore.getState().isOpen).toBe(false)
    expect(useStudioAiStore.getState().activeTab).toBeNull()
  })

  it('setActiveTab should update tab and toggle isOpen', () => {
    useStudioAiStore.getState().setActiveTab('gallery')
    expect(useStudioAiStore.getState().activeTab).toBe('gallery')
    expect(useStudioAiStore.getState().isOpen).toBe(true)

    useStudioAiStore.getState().setActiveTab(null)
    expect(useStudioAiStore.getState().isOpen).toBe(false)
  })

  it('setLeftTab should toggle off when same tab is set again', () => {
    useStudioAiStore.getState().setLeftTab('gallery')
    expect(useStudioAiStore.getState().leftTab).toBe('gallery')

    useStudioAiStore.getState().setLeftTab('gallery')
    expect(useStudioAiStore.getState().leftTab).toBeNull()

    useStudioAiStore.getState().setLeftTab('scenes')
    expect(useStudioAiStore.getState().leftTab).toBe('scenes')
  })

  it('setPanelWidth should clamp width between MIN and MAX', () => {
    useStudioAiStore.getState().setPanelWidth(100)
    expect(useStudioAiStore.getState().panelWidth).toBe(320) // MIN_WIDTH

    useStudioAiStore.getState().setPanelWidth(1000)
    expect(useStudioAiStore.getState().panelWidth).toBe(600) // MAX_WIDTH

    useStudioAiStore.getState().setPanelWidth(450)
    expect(useStudioAiStore.getState().panelWidth).toBe(450)
  })

  // ── enhancePrompt ────────────────────────────────────────────────────────

  it('enhancePrompt should call API and return enhanced text', async () => {
    vi.mocked(studioApi.enhancePrompt).mockResolvedValue({
      data: { enhanced_prompt: 'A vivid, detailed sunset...' },
    } as any)

    const result = await useStudioAiStore.getState().enhancePrompt('sunset')

    expect(studioApi.enhancePrompt).toHaveBeenCalledWith({
      prompt: 'sunset',
      style_preset: null,
    })
    expect(result).toBe('A vivid, detailed sunset...')
    expect(useStudioAiStore.getState().isEnhancing).toBe(false)
  })

  it('enhancePrompt should return original prompt on error', async () => {
    vi.mocked(studioApi.enhancePrompt).mockRejectedValue(new Error('fail'))

    const result = await useStudioAiStore.getState().enhancePrompt('sunset')

    expect(result).toBe('sunset')
    expect(useStudioAiStore.getState().isEnhancing).toBe(false)
  })

  // ── Prompt history ───────────────────────────────────────────────────────

  it('addToPromptHistory should add and deduplicate', () => {
    useStudioAiStore.getState().addToPromptHistory('prompt A')
    useStudioAiStore.getState().addToPromptHistory('prompt B')
    useStudioAiStore.getState().addToPromptHistory('prompt A') // duplicate

    const history = useStudioAiStore.getState().promptHistory
    expect(history[0]).toBe('prompt A') // Most recent first
    expect(history[1]).toBe('prompt B')
    expect(history).toHaveLength(2)
  })

  // ── Templates ────────────────────────────────────────────────────────────

  it('loadTemplates should call API and populate templates', async () => {
    const templates = [makeTemplate({ id: 1 }), makeTemplate({ id: 2, nombre: 'T2' })]
    vi.mocked(studioApi.getTemplates).mockResolvedValue({ data: templates } as any)

    await useStudioAiStore.getState().loadTemplates()

    expect(studioApi.getTemplates).toHaveBeenCalled()
    expect(useStudioAiStore.getState().templates).toEqual(templates)
    expect(useStudioAiStore.getState().isLoadingTemplates).toBe(false)
  })

  it('saveTemplate should call API and prepend to list', async () => {
    useStudioAiStore.setState({ templates: [makeTemplate({ id: 1 })] })
    const newTemplate = makeTemplate({ id: 2, nombre: 'New' })
    vi.mocked(studioApi.createTemplate).mockResolvedValue({ data: newTemplate } as any)

    await useStudioAiStore.getState().saveTemplate({
      name: 'New',
      prompt: 'test',
    })

    expect(useStudioAiStore.getState().templates).toHaveLength(2)
    expect(useStudioAiStore.getState().templates[0].id).toBe(2)
  })

  it('deleteTemplate should call API and remove from list', async () => {
    useStudioAiStore.setState({
      templates: [makeTemplate({ id: 1 }), makeTemplate({ id: 2 })],
    })
    vi.mocked(studioApi.deleteTemplate).mockResolvedValue({} as any)

    await useStudioAiStore.getState().deleteTemplate(1)

    expect(studioApi.deleteTemplate).toHaveBeenCalledWith(1)
    expect(useStudioAiStore.getState().templates).toHaveLength(1)
    expect(useStudioAiStore.getState().templates[0].id).toBe(2)
  })

  // ── loadFromGeneration ───────────────────────────────────────────────────

  it('loadFromGeneration should populate form fields from generation', () => {
    const gen = {
      id: 5,
      prompt: 'a cat',
      estilo: 'anime',
      aspect_ratio: '16:9',
    } as any

    useStudioAiStore.getState().loadFromGeneration(gen)

    const state = useStudioAiStore.getState()
    expect(state.selectedStyle).toBe('anime')
    expect(state.selectedRatio).toBe('16:9')
    expect(state.selectedImageId).toBe(5)
    expect(state.pendingPrompt).toBe('a cat')
    expect(state.activeTab).toBe('generate')
    expect(state.isOpen).toBe(true)
  })

  it('consumePendingPrompt should return and clear the prompt', () => {
    useStudioAiStore.setState({ pendingPrompt: 'test prompt' })

    const result = useStudioAiStore.getState().consumePendingPrompt()
    expect(result).toBe('test prompt')
    expect(useStudioAiStore.getState().pendingPrompt).toBeNull()

    // Second call returns null
    expect(useStudioAiStore.getState().consumePendingPrompt()).toBeNull()
  })

  // ── Canvas focus ─────────────────────────────────────────────────────────

  it('setActiveImage should update activeImageId and selectedImageId', () => {
    useStudioAiStore.getState().setActiveImage(7)

    const state = useStudioAiStore.getState()
    expect(state.activeImageId).toBe(7)
    expect(state.selectedImageId).toBe(7)
    expect(state.selectedImageIds.has(7)).toBe(true)
  })

  it('setActiveImage with null should clear selection', () => {
    useStudioAiStore.setState({ activeImageId: 5, selectedImageId: 5 })
    useStudioAiStore.getState().setActiveImage(null)

    expect(useStudioAiStore.getState().activeImageId).toBeNull()
    expect(useStudioAiStore.getState().selectedImageIds.size).toBe(0)
  })

  // ── Multi-selection ──────────────────────────────────────────────────────

  it('toggleImageSelection without modifiers should select single image', () => {
    useStudioAiStore.getState().toggleImageSelection(3, { ctrl: false, shift: false })

    expect(useStudioAiStore.getState().selectedImageId).toBe(3)
    expect(useStudioAiStore.getState().selectedImageIds).toEqual(new Set([3]))
  })

  it('toggleImageSelection with ctrl should toggle in/out', () => {
    useStudioAiStore.setState({ selectedImageIds: new Set([1, 2]) })

    // Add 3
    useStudioAiStore.getState().toggleImageSelection(3, { ctrl: true, shift: false })
    expect(useStudioAiStore.getState().selectedImageIds).toEqual(new Set([1, 2, 3]))

    // Remove 2
    useStudioAiStore.getState().toggleImageSelection(2, { ctrl: true, shift: false })
    expect(useStudioAiStore.getState().selectedImageIds).toEqual(new Set([1, 3]))
  })

  it('clearSelection should empty selectedImageIds', () => {
    useStudioAiStore.setState({ selectedImageIds: new Set([1, 2, 3]) })
    useStudioAiStore.getState().clearSelection()
    expect(useStudioAiStore.getState().selectedImageIds.size).toBe(0)
  })

  // ── Conversation management ──────────────────────────────────────────────

  it('loadConversations should call API and populate list', async () => {
    const convos = [
      { id: 1, titulo: 'Chat 1', creado_en: '', actualizado_en: '' },
      { id: 2, titulo: 'Chat 2', creado_en: '', actualizado_en: '' },
    ]
    vi.mocked(studioApi.listConversations).mockResolvedValue({ data: convos } as any)

    await useStudioAiStore.getState().loadConversations(10)

    expect(studioApi.listConversations).toHaveBeenCalledWith(10)
    expect(useStudioAiStore.getState().conversations).toEqual(convos)
  })

  it('switchConversation should load messages and set active', async () => {
    vi.mocked(studioApi.getConversation).mockResolvedValue({
      data: {
        id: 5,
        titulo: 'Test',
        mensajes: [
          { id: 1, rol: 'user', contenido: 'hello', creado_en: '2026-01-01' },
          { id: 2, rol: 'assistant', contenido: 'hi there', creado_en: '2026-01-01' },
        ],
      },
    } as any)

    await useStudioAiStore.getState().switchConversation(10, 5)

    expect(studioApi.getConversation).toHaveBeenCalledWith(10, 5)
    const state = useStudioAiStore.getState()
    expect(state.activeConversationId).toBe(5)
    expect(state.hubMessages).toHaveLength(2)
    expect(state.hubMessages[0].role).toBe('user')
    expect(state.hubMessages[0].text).toBe('hello')
    expect(state.hubMessages[1].role).toBe('assistant')
  })

  it('renameConversation should update title in local list', async () => {
    useStudioAiStore.setState({
      conversations: [{ id: 1, titulo: 'Old', creado_en: '', actualizado_en: '' }],
    })
    vi.mocked(studioApi.updateConversation).mockResolvedValue({} as any)

    await useStudioAiStore.getState().renameConversation(10, 1, 'New Title')

    expect(studioApi.updateConversation).toHaveBeenCalledWith(10, 1, { titulo: 'New Title' })
    expect(useStudioAiStore.getState().conversations[0].titulo).toBe('New Title')
  })

  it('removeConversation should delete and remove from list', async () => {
    useStudioAiStore.setState({
      conversations: [
        { id: 1, titulo: 'A', creado_en: '', actualizado_en: '' },
        { id: 2, titulo: 'B', creado_en: '', actualizado_en: '' },
      ],
      activeConversationId: 1,
      hubMessages: [{ id: 'x', role: 'user', text: 'hi', timestamp: '' }],
    })
    vi.mocked(studioApi.deleteConversation).mockResolvedValue({} as any)

    await useStudioAiStore.getState().removeConversation(10, 1)

    expect(studioApi.deleteConversation).toHaveBeenCalledWith(10, 1)
    expect(useStudioAiStore.getState().conversations).toHaveLength(1)
    expect(useStudioAiStore.getState().conversations[0].id).toBe(2)
    // Should clear active since we deleted the active conversation
    expect(useStudioAiStore.getState().activeConversationId).toBeNull()
    expect(useStudioAiStore.getState().hubMessages).toEqual([])
  })

  it('removeConversation should keep active if deleting a different one', async () => {
    useStudioAiStore.setState({
      conversations: [
        { id: 1, titulo: 'A', creado_en: '', actualizado_en: '' },
        { id: 2, titulo: 'B', creado_en: '', actualizado_en: '' },
      ],
      activeConversationId: 1,
      hubMessages: [{ id: 'x', role: 'user', text: 'hi', timestamp: '' }],
    })
    vi.mocked(studioApi.deleteConversation).mockResolvedValue({} as any)

    await useStudioAiStore.getState().removeConversation(10, 2)

    expect(useStudioAiStore.getState().activeConversationId).toBe(1)
    expect(useStudioAiStore.getState().hubMessages).toHaveLength(1) // unchanged
  })

  it('startNewChat should clear conversation state', () => {
    useStudioAiStore.setState({
      activeConversationId: 5,
      hubMessages: [{ id: '1', role: 'user', text: 'hi', timestamp: '' }],
      streamingText: 'partial...',
      isHubLoading: true,
    })

    useStudioAiStore.getState().startNewChat()

    const state = useStudioAiStore.getState()
    expect(state.activeConversationId).toBeNull()
    expect(state.hubMessages).toEqual([])
    expect(state.streamingText).toBe('')
    expect(state.isHubLoading).toBe(false)
  })

  // ── clearMessages ────────────────────────────────────────────────────────

  it('clearMessages should empty image-gen chat messages', () => {
    useStudioAiStore.setState({
      messages: [
        { id: '1', role: 'user', text: 'test', timestamp: '' },
        { id: '2', role: 'assistant', text: 'response', timestamp: '' },
      ],
    })

    useStudioAiStore.getState().clearMessages()

    expect(useStudioAiStore.getState().messages).toEqual([])
  })

  // ── loadModels ───────────────────────────────────────────────────────────

  it('loadModels should populate available models', async () => {
    const models = [
      { id: 'gemini-2.5-flash-image', name: 'Gemini Flash', api_type: 'gemini', max_batch: 4, supports_editing: true, aspect_ratios: ['1:1'], price_hint: '$0.01' },
    ]
    vi.mocked(studioApi.getModels).mockResolvedValue({ data: { models } } as any)

    await useStudioAiStore.getState().loadModels()

    expect(useStudioAiStore.getState().availableModels).toEqual(models)
  })

  it('loadModels should silently handle errors', async () => {
    vi.mocked(studioApi.getModels).mockRejectedValue(new Error('fail'))

    await useStudioAiStore.getState().loadModels()

    expect(useStudioAiStore.getState().availableModels).toEqual([])
  })

  // ── reset ────────────────────────────────────────────────────────────────

  it('reset should restore all state to defaults', () => {
    useStudioAiStore.setState({
      messages: [{ id: '1', role: 'user', text: 'hi', timestamp: '' }],
      selectedStyle: 'anime',
      selectedRatio: '16:9',
      selectedImageId: 5,
      isGenerating: true,
      negativePrompt: 'blurry',
      studioMode: 'video',
      hubMessages: [{ id: '2', role: 'assistant', text: 'ok', timestamp: '' }],
      activeConversationId: 3,
      conversations: [{ id: 3, titulo: 'T', creado_en: '', actualizado_en: '' }],
      activeImageId: 5,
      selectedImageIds: new Set([1, 2, 3]),
    })

    useStudioAiStore.getState().reset()

    const state = useStudioAiStore.getState()
    expect(state.messages).toEqual([])
    expect(state.selectedStyle).toBeNull()
    expect(state.selectedRatio).toBe('1:1')
    expect(state.selectedImageId).toBeNull()
    expect(state.isGenerating).toBe(false)
    expect(state.negativePrompt).toBe('')
    expect(state.studioMode).toBe('home')
    expect(state.hubMessages).toEqual([])
    expect(state.activeConversationId).toBeNull()
    expect(state.conversations).toEqual([])
    expect(state.activeImageId).toBeNull()
    expect(state.selectedImageIds.size).toBe(0)
  })
})

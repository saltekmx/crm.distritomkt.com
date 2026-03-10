import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStudioStore } from '../studioStore'
import { studioApi, type StudioGeneration } from '@/services/api'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/services/api', () => ({
  studioApi: {
    projectGenerations: vi.fn(),
    generateImage: vi.fn(),
    exportGeneration: vi.fn(),
    deleteGeneration: vi.fn(),
    toggleFavorite: vi.fn(),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGeneration(overrides: Partial<StudioGeneration> = {}): StudioGeneration {
  return {
    id: 1,
    proyecto_id: 10,
    tipo: 'image',
    prompt: 'A sunset over mountains',
    estilo: 'photorealistic',
    aspect_ratio: '1:1',
    estado: 'complete',
    url_salida: 'https://cdn.test/img.png',
    key_salida: 'img.png',
    mensaje_error: null,
    is_favorito: false,
    media_id_salida: null,
    tags: null,
    modelo: 'gemini-2.0-flash-exp',
    seed: null,
    output_format: 'png',
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('studioStore', () => {
  beforeEach(() => {
    useStudioStore.getState().reset()
    vi.clearAllMocks()
    localStorage.clear()
  })

  // ── Initial state ────────────────────────────────────────────────────────

  it('should have correct initial state', () => {
    const state = useStudioStore.getState()
    expect(state.activeMode).toBe('image-gen')
    expect(state.projectId).toBeNull()
    expect(state.generations).toEqual([])
    expect(state.isGenerating).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.versionMap).toEqual({})
  })

  // ── setMode ──────────────────────────────────────────────────────────────

  it('setMode should switch between modes', () => {
    useStudioStore.getState().setMode('quick-video')
    expect(useStudioStore.getState().activeMode).toBe('quick-video')

    useStudioStore.getState().setMode('campaign')
    expect(useStudioStore.getState().activeMode).toBe('campaign')

    useStudioStore.getState().setMode('image-gen')
    expect(useStudioStore.getState().activeMode).toBe('image-gen')
  })

  // ── setProjectId ─────────────────────────────────────────────────────────

  it('setProjectId should update projectId', () => {
    useStudioStore.getState().setProjectId(42)
    expect(useStudioStore.getState().projectId).toBe(42)
  })

  // ── loadGenerations ──────────────────────────────────────────────────────

  it('loadGenerations should call API and populate generations', async () => {
    const gens = [makeGeneration({ id: 1 }), makeGeneration({ id: 2 })]
    vi.mocked(studioApi.projectGenerations).mockResolvedValue({ data: gens } as any)

    await useStudioStore.getState().loadGenerations(10)

    expect(studioApi.projectGenerations).toHaveBeenCalledWith(10)
    expect(useStudioStore.getState().generations).toEqual(gens)
    expect(useStudioStore.getState().isLoading).toBe(false)
  })

  it('loadGenerations should handle API errors without crashing', async () => {
    vi.mocked(studioApi.projectGenerations).mockRejectedValue(new Error('network'))

    await useStudioStore.getState().loadGenerations(10)

    expect(useStudioStore.getState().generations).toEqual([])
    expect(useStudioStore.getState().isLoading).toBe(false)
  })

  // ── generateImage ────────────────────────────────────────────────────────

  it('generateImage should call API and prepend new generation', async () => {
    const existing = makeGeneration({ id: 1 })
    useStudioStore.setState({ generations: [existing] })
    const newGen = makeGeneration({ id: 2, prompt: 'New image' })
    vi.mocked(studioApi.generateImage).mockResolvedValue({ data: newGen } as any)

    await useStudioStore.getState().generateImage({
      project_id: 10,
      prompt: 'New image',
    })

    const gens = useStudioStore.getState().generations
    expect(gens).toHaveLength(2)
    expect(gens[0].id).toBe(2) // Prepended
    expect(gens[1].id).toBe(1)
    expect(useStudioStore.getState().isGenerating).toBe(false)
  })

  it('generateImage should show error toast on failure', async () => {
    const { toast } = await import('sonner')
    vi.mocked(studioApi.generateImage).mockRejectedValue(new Error('fail'))

    await useStudioStore.getState().generateImage({
      project_id: 10,
      prompt: 'Fail',
    })

    expect(toast.error).toHaveBeenCalledWith('Error al generar imagen')
    expect(useStudioStore.getState().isGenerating).toBe(false)
  })

  // ── exportToMedia ────────────────────────────────────────────────────────

  it('exportToMedia should call API and update generation media_id', async () => {
    useStudioStore.setState({
      generations: [makeGeneration({ id: 5, media_id_salida: null })],
    })
    vi.mocked(studioApi.exportGeneration).mockResolvedValue({
      data: { mensaje: 'OK', media_id: 99 },
    } as any)

    await useStudioStore.getState().exportToMedia(5)

    expect(studioApi.exportGeneration).toHaveBeenCalledWith(5)
    const gen = useStudioStore.getState().generations.find((g) => g.id === 5)
    expect(gen?.media_id_salida).toBe(99)
  })

  // ── deleteGeneration ─────────────────────────────────────────────────────

  it('deleteGeneration should call API and remove from state', async () => {
    useStudioStore.setState({
      generations: [makeGeneration({ id: 1 }), makeGeneration({ id: 2 })],
    })
    vi.mocked(studioApi.deleteGeneration).mockResolvedValue({} as any)

    await useStudioStore.getState().deleteGeneration(1)

    expect(studioApi.deleteGeneration).toHaveBeenCalledWith(1)
    const gens = useStudioStore.getState().generations
    expect(gens).toHaveLength(1)
    expect(gens[0].id).toBe(2)
  })

  it('deleteGeneration should show error toast on failure', async () => {
    const { toast } = await import('sonner')
    useStudioStore.setState({ generations: [makeGeneration({ id: 1 })] })
    vi.mocked(studioApi.deleteGeneration).mockRejectedValue(new Error('fail'))

    await useStudioStore.getState().deleteGeneration(1)

    expect(toast.error).toHaveBeenCalledWith('Error al eliminar')
    // Generation remains on error
    expect(useStudioStore.getState().generations).toHaveLength(1)
  })

  // ── Version chain helpers ────────────────────────────────────────────────

  it('addVersionLink should create a parent-child relationship', () => {
    useStudioStore.getState().addVersionLink(2, 1)

    expect(useStudioStore.getState().versionMap).toEqual({ 2: 1 })
    // Should persist to localStorage
    expect(JSON.parse(localStorage.getItem('studio-version-map')!)).toEqual({ '2': 1 })
  })

  it('getParent should return the parent ID or null', () => {
    useStudioStore.setState({ versionMap: { 2: 1, 3: 1 } })

    expect(useStudioStore.getState().getParent(2)).toBe(1)
    expect(useStudioStore.getState().getParent(1)).toBeNull()
    expect(useStudioStore.getState().getParent(99)).toBeNull()
  })

  it('getChildren should return child IDs for a parent', () => {
    useStudioStore.setState({ versionMap: { 2: 1, 3: 1, 4: 2 } })

    const children = useStudioStore.getState().getChildren(1)
    expect(children).toContain(2)
    expect(children).toContain(3)
    expect(children).not.toContain(4)
  })

  it('getRootAncestor should walk up to the root', () => {
    useStudioStore.setState({ versionMap: { 2: 1, 3: 2, 4: 3 } })

    expect(useStudioStore.getState().getRootAncestor(4)).toBe(1)
    expect(useStudioStore.getState().getRootAncestor(1)).toBe(1)
  })

  it('getVersionChain should return the full chain', () => {
    useStudioStore.setState({ versionMap: { 2: 1, 3: 2 } })

    const chain = useStudioStore.getState().getVersionChain(2)
    // Should include root (1), self (2), and child (3)
    expect(chain).toContain(1)
    expect(chain).toContain(2)
    expect(chain).toContain(3)
  })

  // ── reset ────────────────────────────────────────────────────────────────

  it('reset should clear all state', () => {
    useStudioStore.setState({
      activeMode: 'quick-video',
      projectId: 10,
      generations: [makeGeneration()],
      isGenerating: true,
      versionMap: { 2: 1 },
    })

    useStudioStore.getState().reset()

    const state = useStudioStore.getState()
    expect(state.activeMode).toBe('image-gen')
    expect(state.projectId).toBeNull()
    expect(state.generations).toEqual([])
    expect(state.isGenerating).toBe(false)
    expect(state.versionMap).toEqual({})
  })
})

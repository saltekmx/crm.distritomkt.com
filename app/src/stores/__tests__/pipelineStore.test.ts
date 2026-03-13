import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePipelineStore } from '../pipelineStore'
import { pipelineApi, type Pipeline, type PipelineScene } from '@/services/api'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/services/api', () => ({
  pipelineApi: {
    getByProject: vi.fn(),
    get: vi.fn(),
    start: vi.fn(),
    generate: vi.fn(),
    revise: vi.fn(),
    approveScene: vi.fn(),
    exportPipeline: vi.fn(),
    updateScene: vi.fn(),
    addScene: vi.fn(),
    deleteScene: vi.fn(),
    duplicateScene: vi.fn(),
    reorderScenes: vi.fn(),
    generateScene: vi.fn(),
    cancelPipeline: vi.fn(),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(overrides: Partial<PipelineScene> = {}): PipelineScene {
  return {
    id: 1,
    pipeline_id: 10,
    orden: 1,
    descripcion: 'Test scene',
    video_prompt: 'A cinematic shot',
    historial_prompts: [],
    reference_asset_id: null,
    video_url: null,
    thumbnail_url: null,
    duracion_seg: 5,
    aspect_ratio: '16:9',
    aprobado: false,
    estado: 'pending',
    actualizado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 10,
    proyecto_id: 1,
    estado: 'planned',
    brief_snapshot: 'Test brief',
    guia_estilo: null,
    escenas: [makeScene({ id: 1 }), makeScene({ id: 2, orden: 2 })],
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('pipelineStore', () => {
  beforeEach(() => {
    usePipelineStore.getState().reset()
    vi.clearAllMocks()
  })

  // ── Initial state ────────────────────────────────────────────────────────

  it('should have correct initial state', () => {
    const state = usePipelineStore.getState()
    expect(state.pipeline).toBeNull()
    expect(state.currentStage).toBe('idle')
    expect(state.activeSceneId).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.exportProgress).toBeNull()
    expect(state.exportedMediaIds).toEqual([])
  })

  // ── initPipeline ─────────────────────────────────────────────────────────

  it('initPipeline should fetch and set pipeline', async () => {
    const pipeline = makePipeline({ estado: 'planned' })
    vi.mocked(pipelineApi.getByProject).mockResolvedValue({ data: pipeline } as any)

    await usePipelineStore.getState().initPipeline(1)

    const state = usePipelineStore.getState()
    expect(pipelineApi.getByProject).toHaveBeenCalledWith(1)
    expect(state.pipeline).toEqual(pipeline)
    expect(state.currentStage).toBe('planned')
  })

  it('initPipeline should stay idle when API errors', async () => {
    vi.mocked(pipelineApi.getByProject).mockRejectedValue(new Error('404'))

    await usePipelineStore.getState().initPipeline(999)

    expect(usePipelineStore.getState().pipeline).toBeNull()
    expect(usePipelineStore.getState().currentStage).toBe('idle')
  })

  // ── startPipeline ────────────────────────────────────────────────────────

  it('startPipeline should call API and update state', async () => {
    const pipeline = makePipeline({ estado: 'planned' })
    vi.mocked(pipelineApi.start).mockResolvedValue({ data: pipeline } as any)

    await usePipelineStore.getState().startPipeline(1, 'override brief')

    expect(pipelineApi.start).toHaveBeenCalledWith({
      project_id: 1,
      brief_override: 'override brief',
      reference_image_urls: undefined,
    })
    const state = usePipelineStore.getState()
    expect(state.pipeline).toEqual(pipeline)
    expect(state.currentStage).toBe('planned')
    expect(state.isLoading).toBe(false)
  })

  it('startPipeline should handle errors gracefully', async () => {
    vi.mocked(pipelineApi.start).mockRejectedValue(new Error('LLM down'))

    await usePipelineStore.getState().startPipeline(1)

    const state = usePipelineStore.getState()
    expect(state.error).toBe('LLM down')
    expect(state.isLoading).toBe(false)
    expect(state.currentStage).toBe('idle')
  })

  // ── generateScenes ───────────────────────────────────────────────────────

  it('generateScenes should call API and set stage to generating', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.generate).mockResolvedValue({} as any)

    await usePipelineStore.getState().generateScenes([1, 2])

    expect(pipelineApi.generate).toHaveBeenCalledWith(10, {
      scene_ids: [1, 2],
      quality: 'vidu/q3',
    })
    expect(usePipelineStore.getState().currentStage).toBe('generating')
  })

  it('generateScenes should do nothing without a pipeline', async () => {
    await usePipelineStore.getState().generateScenes()
    expect(pipelineApi.generate).not.toHaveBeenCalled()
  })

  // ── approveScene ─────────────────────────────────────────────────────────

  it('approveScene should mark scene as approved in local state', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.approveScene).mockResolvedValue({} as any)

    await usePipelineStore.getState().approveScene(1)

    const scene = usePipelineStore.getState().pipeline!.escenas.find((s) => s.id === 1)
    expect(scene?.aprobado).toBe(true)
    expect(scene?.estado).toBe('approved')
  })

  // ── updateScene (local) ──────────────────────────────────────────────────

  it('updateScene should update a scene by ID locally', () => {
    usePipelineStore.setState({ pipeline: makePipeline() })

    usePipelineStore.getState().updateScene(1, { estado: 'complete', video_url: 'https://vid.mp4' })

    const scene = usePipelineStore.getState().pipeline!.escenas.find((s) => s.id === 1)
    expect(scene?.estado).toBe('complete')
    expect(scene?.video_url).toBe('https://vid.mp4')
  })

  it('updateScene should be safe for non-existent scene ID', () => {
    usePipelineStore.setState({ pipeline: makePipeline() })

    // Should not throw
    usePipelineStore.getState().updateScene(999, { estado: 'complete' })

    // Scenes unchanged
    expect(usePipelineStore.getState().pipeline!.escenas).toHaveLength(2)
  })

  it('updateScene should be safe when pipeline is null', () => {
    usePipelineStore.getState().updateScene(1, { estado: 'complete' })
    expect(usePipelineStore.getState().pipeline).toBeNull()
  })

  // ── updateSceneFromWS ────────────────────────────────────────────────────

  it('updateSceneFromWS should update scene from WebSocket data', () => {
    usePipelineStore.setState({ pipeline: makePipeline() })

    usePipelineStore.getState().updateSceneFromWS(2, {
      estado: 'complete',
      video_url: 'https://video.mp4',
    })

    const scene = usePipelineStore.getState().pipeline!.escenas.find((s) => s.id === 2)
    expect(scene?.estado).toBe('complete')
    expect(scene?.video_url).toBe('https://video.mp4')
  })

  // ── addScene ─────────────────────────────────────────────────────────────

  it('addScene should call API and append the new scene', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    const newScene = makeScene({ id: 3, orden: 3 })
    vi.mocked(pipelineApi.addScene).mockResolvedValue({ data: newScene } as any)

    await usePipelineStore.getState().addScene(10, { description: 'New scene' })

    expect(pipelineApi.addScene).toHaveBeenCalledWith(10, { description: 'New scene' })
    expect(usePipelineStore.getState().pipeline!.escenas).toHaveLength(3)
    expect(usePipelineStore.getState().pipeline!.escenas[2].id).toBe(3)
  })

  // ── deleteScene ──────────────────────────────────────────────────────────

  it('deleteScene should call API and remove from local state', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.deleteScene).mockResolvedValue({} as any)

    await usePipelineStore.getState().deleteScene(1)

    expect(pipelineApi.deleteScene).toHaveBeenCalledWith(1)
    const scenes = usePipelineStore.getState().pipeline!.escenas
    expect(scenes).toHaveLength(1)
    expect(scenes[0].id).toBe(2)
    // Verify order is recalculated
    expect(scenes[0].orden).toBe(1)
  })

  it('deleteScene should show toast on API error', async () => {
    const { toast } = await import('sonner')
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.deleteScene).mockRejectedValue(new Error('fail'))

    await usePipelineStore.getState().deleteScene(1)

    expect(toast.error).toHaveBeenCalledWith('Error al eliminar escena')
    // Scenes unchanged on error
    expect(usePipelineStore.getState().pipeline!.escenas).toHaveLength(2)
  })

  // ── duplicateScene ───────────────────────────────────────────────────────

  it('duplicateScene should call API and insert after original', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    const duped = makeScene({ id: 3, orden: 2 })
    vi.mocked(pipelineApi.duplicateScene).mockResolvedValue({ data: duped } as any)

    await usePipelineStore.getState().duplicateScene(1)

    expect(pipelineApi.duplicateScene).toHaveBeenCalledWith(1)
    const scenes = usePipelineStore.getState().pipeline!.escenas
    expect(scenes).toHaveLength(3)
    // Duplicated scene should be after scene 1
    expect(scenes[0].id).toBe(1)
    expect(scenes[1].id).toBe(3)
    expect(scenes[2].id).toBe(2)
    // Order recalculated
    expect(scenes.map((s) => s.orden)).toEqual([1, 2, 3])
  })

  // ── reorderScenes ────────────────────────────────────────────────────────

  it('reorderScenes should optimistically reorder and call API', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.reorderScenes).mockResolvedValue({} as any)

    await usePipelineStore.getState().reorderScenes([2, 1])

    const scenes = usePipelineStore.getState().pipeline!.escenas
    expect(scenes[0].id).toBe(2)
    expect(scenes[1].id).toBe(1)
    expect(scenes[0].orden).toBe(1)
    expect(scenes[1].orden).toBe(2)
    expect(pipelineApi.reorderScenes).toHaveBeenCalledWith(10, [2, 1])
  })

  // ── setActiveScene ───────────────────────────────────────────────────────

  it('setActiveScene should update activeSceneId', () => {
    usePipelineStore.getState().setActiveScene(42)
    expect(usePipelineStore.getState().activeSceneId).toBe(42)
  })

  // ── setStage / canGoToStage ──────────────────────────────────────────────

  it('setStage should update currentStage', () => {
    usePipelineStore.getState().setStage('review')
    expect(usePipelineStore.getState().currentStage).toBe('review')
  })

  it('canGoToStage should allow going back but not skipping forward', () => {
    usePipelineStore.setState({ pipeline: makePipeline(), currentStage: 'generating' })

    expect(usePipelineStore.getState().canGoToStage('planned')).toBe(true)
    expect(usePipelineStore.getState().canGoToStage('generating')).toBe(true)
    expect(usePipelineStore.getState().canGoToStage('review')).toBe(false)
  })

  it('canGoToStage should only allow idle when no pipeline exists', () => {
    expect(usePipelineStore.getState().canGoToStage('idle')).toBe(true)
    expect(usePipelineStore.getState().canGoToStage('planned')).toBe(false)
  })

  // ── setPipelineStatus ────────────────────────────────────────────────────

  it('setPipelineStatus should update estado and currentStage', () => {
    usePipelineStore.setState({ pipeline: makePipeline() })

    usePipelineStore.getState().setPipelineStatus('generating')

    expect(usePipelineStore.getState().pipeline!.estado).toBe('generating')
    expect(usePipelineStore.getState().currentStage).toBe('generating')
  })

  // ── export progress ──────────────────────────────────────────────────────

  it('setExportProgress should update exportProgress', () => {
    usePipelineStore.getState().setExportProgress({ step: 2, total: 5 })
    expect(usePipelineStore.getState().exportProgress).toEqual({ step: 2, total: 5 })
  })

  it('setExportComplete should set mediaIds and clear progress', () => {
    usePipelineStore.setState({ exportProgress: { step: 3, total: 5 }, isLoading: true })

    usePipelineStore.getState().setExportComplete([100, 101])

    const state = usePipelineStore.getState()
    expect(state.exportedMediaIds).toEqual([100, 101])
    expect(state.exportProgress).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  // ── revertPrompt ─────────────────────────────────────────────────────────

  it('revertPrompt should update scene prompt and status', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.updateScene).mockResolvedValue({} as any)

    await usePipelineStore.getState().revertPrompt(1, 'old prompt text')

    expect(pipelineApi.updateScene).toHaveBeenCalledWith(1, { video_prompt: 'old prompt text' })
    const scene = usePipelineStore.getState().pipeline!.escenas.find((s) => s.id === 1)
    expect(scene?.video_prompt).toBe('old prompt text')
    expect(scene?.estado).toBe('pending')
  })

  // ── generateSingleScene ──────────────────────────────────────────────────

  it('generateSingleScene should call API and update scene to generating', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.generateScene).mockResolvedValue({} as any)

    await usePipelineStore.getState().generateSingleScene(1, 'veo-3.1')

    expect(pipelineApi.generateScene).toHaveBeenCalledWith(10, 1, 'veo-3.1')
    const scene = usePipelineStore.getState().pipeline!.escenas.find((s) => s.id === 1)
    expect(scene?.estado).toBe('generating')
  })

  // ── cancelGeneration ─────────────────────────────────────────────────────

  it('cancelGeneration should call API and set stage to planned', async () => {
    const pipeline = makePipeline()
    usePipelineStore.setState({ pipeline, currentStage: 'generating' })
    vi.mocked(pipelineApi.cancelPipeline).mockResolvedValue({} as any)
    vi.mocked(pipelineApi.get).mockResolvedValue({ data: makePipeline({ estado: 'planned' }) } as any)

    await usePipelineStore.getState().cancelGeneration(10)

    expect(pipelineApi.cancelPipeline).toHaveBeenCalledWith(10)
    expect(usePipelineStore.getState().currentStage).toBe('planned')
    expect(usePipelineStore.getState().isLoading).toBe(false)
  })

  // ── exportPipeline ───────────────────────────────────────────────────────

  it('exportPipeline should call API and set stage to export', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.exportPipeline).mockResolvedValue({} as any)

    await usePipelineStore.getState().exportPipeline('mp4')

    expect(pipelineApi.exportPipeline).toHaveBeenCalledWith(10, { format: 'mp4' })
    expect(usePipelineStore.getState().currentStage).toBe('export')
    expect(usePipelineStore.getState().pipeline!.estado).toBe('exporting')
  })

  // ── setSceneReferenceAsset ───────────────────────────────────────────────

  it('setSceneReferenceAsset should update scene reference locally', async () => {
    usePipelineStore.setState({ pipeline: makePipeline() })
    vi.mocked(pipelineApi.updateScene).mockResolvedValue({} as any)

    await usePipelineStore.getState().setSceneReferenceAsset(1, 42)

    expect(pipelineApi.updateScene).toHaveBeenCalledWith(1, { reference_asset_id: 42 })
    const scene = usePipelineStore.getState().pipeline!.escenas.find((s) => s.id === 1)
    expect(scene?.reference_asset_id).toBe(42)
  })

  // ── reloadPipeline ───────────────────────────────────────────────────────

  it('reloadPipeline should refetch pipeline from API', async () => {
    const original = makePipeline({ estado: 'planned' })
    const updated = makePipeline({ estado: 'review' })
    usePipelineStore.setState({ pipeline: original })
    vi.mocked(pipelineApi.get).mockResolvedValue({ data: updated } as any)

    await usePipelineStore.getState().reloadPipeline()

    expect(pipelineApi.get).toHaveBeenCalledWith(10)
    expect(usePipelineStore.getState().pipeline!.estado).toBe('review')
    expect(usePipelineStore.getState().currentStage).toBe('review')
  })

  // ── reset ────────────────────────────────────────────────────────────────

  it('reset should clear all state back to initial', () => {
    usePipelineStore.setState({
      pipeline: makePipeline(),
      currentStage: 'review',
      activeSceneId: 5,
      isLoading: true,
      error: 'some error',
      exportProgress: { step: 1, total: 3 },
      exportedMediaIds: [1, 2],
    })

    usePipelineStore.getState().reset()

    const state = usePipelineStore.getState()
    expect(state.pipeline).toBeNull()
    expect(state.currentStage).toBe('idle')
    expect(state.activeSceneId).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.exportProgress).toBeNull()
    expect(state.exportedMediaIds).toEqual([])
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudioVideoPipeline } from '../StudioVideoPipeline'
import { usePipelineStore } from '@/stores/pipelineStore'
import type { Pipeline, PipelineScene } from '@/services/api'

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockToast, mockConnectionLostRef, mockGetByProject } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockConnectionLostRef: { value: false },
  mockGetByProject: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/hooks/usePipelineWebSocket', () => ({
  usePipelineWebSocket: () => ({ connectionLost: mockConnectionLostRef.value }),
}))

vi.mock('@/stores/studioStore', () => ({
  useStudioStore: (selector?: (s: { generations: never[] }) => unknown) => {
    const state = { generations: [] }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// Mock the API — getByProject is controllable per-test to drive initPipeline behavior
vi.mock('@/services/api', () => ({
  pipelineApi: {
    getByProject: (...args: unknown[]) => mockGetByProject(...args),
    start: vi.fn().mockResolvedValue({ data: {} }),
    listAssets: vi.fn().mockResolvedValue({ data: [] }),
    importAssetUrl: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(overrides: Partial<PipelineScene> = {}): PipelineScene {
  return {
    id: 1,
    pipeline_id: 100,
    orden: 1,
    descripcion: 'Test scene',
    video_prompt: 'A cinematic shot',
    historial_prompts: [],
    reference_asset_id: null,
    video_url: null,
    thumbnail_url: null,
    duracion_seg: 6,
    aspect_ratio: '16:9',
    aprobado: false,
    estado: 'pending',
    actualizado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 100,
    proyecto_id: 1,
    estado: 'draft',
    brief_snapshot: null,
    guia_estilo: null,
    escenas: [makeScene()],
    creado_en: '2026-01-01T00:00:00Z',
    actualizado_en: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('StudioVideoPipeline -- stage rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectionLostRef.value = false
    // Default: no existing pipeline (getByProject rejects) -> stays idle
    mockGetByProject.mockRejectedValue(new Error('no pipeline'))
    // Reset the store to idle defaults
    usePipelineStore.setState({
      pipeline: null,
      currentStage: 'idle',
      activeSceneId: null,
      isLoading: false,
      error: null,
      exportProgress: null,
      exportedMediaIds: [],
    })
  })

  it('renders idle stage when no pipeline', async () => {
    render(<StudioVideoPipeline projectId={1} />)

    // initPipeline runs, getByProject rejects, stays idle
    await waitFor(() => {
      expect(screen.getByText('Video Pipeline')).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText(/Describe el proyecto/)).toBeInTheDocument()
  })

  it('renders welcome screen when projectId is null', () => {
    render(<StudioVideoPipeline projectId={null} />)

    expect(screen.getByText('Video Pipeline')).toBeInTheDocument()
    expect(
      screen.getByText(/Selecciona un proyecto del panel izquierdo/),
    ).toBeInTheDocument()
  })

  it('renders brief stage when currentStage is brief', async () => {
    // getByProject returns a pipeline with estado='analyzing' -> toUIStage maps to 'brief'
    const pipeline = makePipeline({ estado: 'analyzing' })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Analizando brief con IA...')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/El agente Director esta creando el plan de escenas/),
    ).toBeInTheDocument()
  })

  it('renders planned stage when currentStage is planned', async () => {
    const pipeline = makePipeline({
      estado: 'planned',
      escenas: [
        makeScene({ id: 1, orden: 1, descripcion: 'Opening shot' }),
        makeScene({ id: 2, orden: 2, descripcion: 'Product reveal' }),
      ],
    })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    // The stepper should show "Planificado" as active
    await waitFor(() => {
      expect(screen.getByText('Planificado')).toBeInTheDocument()
    })
  })

  it('renders generating stage when currentStage is generating', async () => {
    const pipeline = makePipeline({
      estado: 'generating',
      escenas: [makeScene({ id: 1, estado: 'generating' })],
    })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      // Stepper label for generating stage
      const genLabels = screen.getAllByText('Generando')
      expect(genLabels.length).toBeGreaterThan(0)
    })
  })

  it('renders review stage when currentStage is review', async () => {
    const pipeline = makePipeline({
      estado: 'review',
      escenas: [
        makeScene({ id: 1, estado: 'complete', video_url: 'https://video.test/1.mp4' }),
      ],
    })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Revision')).toBeInTheDocument()
    })
  })

  it('renders export stage when currentStage is export', async () => {
    // 'approved', 'exporting', 'exported' all map to UIStage 'export'
    const pipeline = makePipeline({
      estado: 'exported',
      escenas: [makeScene({ id: 1, estado: 'approved', aprobado: true })],
    })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Exportar')).toBeInTheDocument()
    })
  })

  it('start pipeline button calls startPipeline', async () => {
    const user = userEvent.setup()
    // No existing pipeline -- stays idle
    mockGetByProject.mockRejectedValue(new Error('no pipeline'))

    render(<StudioVideoPipeline projectId={5} />)

    // Wait for idle stage to settle
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe el proyecto/)).toBeInTheDocument()
    })

    // Fill in the brief so the button becomes enabled
    const textarea = screen.getByPlaceholderText(/Describe el proyecto/)
    await user.type(textarea, 'Un video corporativo para la marca')

    const analyzeBtn = screen.getByText('Analizar Brief con IA')
    expect(analyzeBtn).not.toBeDisabled()

    // Spy on the store's startPipeline before clicking
    const startPipelineSpy = vi.fn()
    usePipelineStore.setState({ startPipeline: startPipelineSpy })

    await user.click(analyzeBtn)

    await waitFor(() => {
      expect(startPipelineSpy).toHaveBeenCalledWith(
        5,
        'Un video corporativo para la marca',
        undefined,
      )
    })
  })

  it('connection lost banner appears when connectionLost is true', async () => {
    mockConnectionLostRef.value = true
    const pipeline = makePipeline({ estado: 'generating' })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/Conexion perdida/)).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Las actualizaciones en tiempo real no estan disponibles/),
    ).toBeInTheDocument()
  })

  it('connection lost banner is hidden when connectionLost is false', async () => {
    mockConnectionLostRef.value = false
    const pipeline = makePipeline({ estado: 'generating' })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      // Wait for the generating stage to appear
      const genLabels = screen.getAllByText('Generando')
      expect(genLabels.length).toBeGreaterThan(0)
    })

    expect(screen.queryByText(/Conexion perdida/)).not.toBeInTheDocument()
  })

  it('stepper shows all stage labels', async () => {
    const pipeline = makePipeline({ estado: 'planned' })
    mockGetByProject.mockResolvedValue({ data: pipeline })

    render(<StudioVideoPipeline projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Planificado')).toBeInTheDocument()
    })

    expect(screen.getByText('Sin iniciar')).toBeInTheDocument()
    expect(screen.getByText('Analizando')).toBeInTheDocument()
    expect(screen.getByText('Planificado')).toBeInTheDocument()
    expect(screen.getByText('Generando')).toBeInTheDocument()
    expect(screen.getByText('Revision')).toBeInTheDocument()
    expect(screen.getByText('Exportar')).toBeInTheDocument()
  })
})

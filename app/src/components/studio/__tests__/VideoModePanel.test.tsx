import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoModePanel } from '../VideoModePanel'

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockToast,
  mockPipelineState,
  mockStudioState,
} = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockPipelineState: {
    pipelineVersions: [] as Array<{ id: number; estado: string; quality: string; brief_snapshot: string | null; total_escenas: number; escenas_completas: number; creado_en: string; actualizado_en: string }>,
    selectedPipelineId: null as number | null,
    isLoadingVersions: false,
    loadPipelineVersions: vi.fn(),
    selectPipeline: vi.fn(),
    createNewPipeline: vi.fn(),
  },
  mockStudioState: {
    generations: [] as Array<{ id: number; estado: string; url_salida: string | null; prompt: string }>,
  },
}))

vi.mock('@/services/api', () => ({
  pipelineApi: {},
}))

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/stores/pipelineStore', () => ({
  usePipelineStore: (selector?: (s: typeof mockPipelineState) => unknown) =>
    selector ? selector(mockPipelineState) : mockPipelineState,
}))

vi.mock('@/stores/studioStore', () => ({
  useStudioStore: (selector?: (s: typeof mockStudioState) => unknown) =>
    selector ? selector(mockStudioState) : mockStudioState,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const sampleVersions = [
  { id: 1, estado: 'planned', quality: 'veo-3.1-fast', brief_snapshot: 'Campaña verano con playa', total_escenas: 5, escenas_completas: 2, creado_en: '2026-03-10T10:00:00Z', actualizado_en: '2026-03-10T12:00:00Z' },
  { id: 2, estado: 'draft', quality: 'kling/v3', brief_snapshot: null, total_escenas: 0, escenas_completas: 0, creado_en: '2026-03-11T08:00:00Z', actualizado_en: '2026-03-11T08:00:00Z' },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VideoModePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPipelineState.pipelineVersions = []
    mockPipelineState.selectedPipelineId = null
    mockPipelineState.isLoadingVersions = false
    mockStudioState.generations = []
  })

  it('renders "Versiones" header', () => {
    render(<VideoModePanel projectId={1} />)
    expect(screen.getByText('Versiones')).toBeInTheDocument()
  })

  it('renders pipeline versions list', () => {
    mockPipelineState.pipelineVersions = sampleVersions
    render(<VideoModePanel projectId={1} />)

    expect(screen.getByText(/Campaña verano con playa/)).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
  })

  it('selects pipeline on click', async () => {
    const user = userEvent.setup()
    mockPipelineState.pipelineVersions = sampleVersions
    render(<VideoModePanel projectId={1} />)

    await user.click(screen.getByText(/Campaña verano con playa/))
    expect(mockPipelineState.selectPipeline).toHaveBeenCalledWith(1)
  })

  it('calls createNewPipeline on "Nueva version" click', async () => {
    const user = userEvent.setup()
    render(<VideoModePanel projectId={1} />)

    await user.click(screen.getByText('Nueva version'))
    expect(mockPipelineState.createNewPipeline).toHaveBeenCalled()
  })

  it('shows empty state when no versions', () => {
    mockPipelineState.pipelineVersions = []
    render(<VideoModePanel projectId={1} />)

    expect(screen.getByText('Sin pipelines aun')).toBeInTheDocument()
  })

  it('loads versions on mount', () => {
    render(<VideoModePanel projectId={42} />)

    expect(mockPipelineState.loadPipelineVersions).toHaveBeenCalledWith(42)
  })
})

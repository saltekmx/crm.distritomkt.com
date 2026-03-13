import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenesTab } from '../ScenesTab'
import { MAX_SCENES, STATUS_CONFIG } from '@/constants/pipeline'
import type { PipelineScene } from '@/services/api'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAddScene = vi.fn()
const mockDeleteScene = vi.fn()
const mockDuplicateScene = vi.fn()
const mockSetActiveScene = vi.fn()

function makeScene(overrides: Partial<PipelineScene> = {}): PipelineScene {
  return {
    id: 1,
    pipeline_id: 100,
    orden: 1,
    descripcion: 'Test scene',
    video_prompt: 'A prompt',
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

let mockStoreState: {
  pipeline: { id: number; escenas: PipelineScene[] } | null
  activeSceneId: number | null
  setActiveScene: typeof mockSetActiveScene
  addScene: typeof mockAddScene
  deleteScene: typeof mockDeleteScene
  duplicateScene: typeof mockDuplicateScene
}

vi.mock('@/stores/pipelineStore', () => ({
  usePipelineStore: () => mockStoreState,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ScenesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreState = {
      pipeline: {
        id: 100,
        escenas: [
          makeScene({ id: 1, orden: 1, descripcion: 'Intro scene', estado: 'pending' }),
          makeScene({ id: 2, orden: 2, descripcion: 'Middle scene', estado: 'generating' }),
          makeScene({ id: 3, orden: 3, descripcion: 'Final scene', estado: 'complete' }),
        ],
      },
      activeSceneId: null,
      setActiveScene: mockSetActiveScene,
      addScene: mockAddScene,
      deleteScene: mockDeleteScene,
      duplicateScene: mockDuplicateScene,
    }
  })

  it('renders scene list', () => {
    render(<ScenesTab />)

    expect(screen.getByText('3 escenas')).toBeInTheDocument()
    expect(screen.getByText('Escena 1')).toBeInTheDocument()
    expect(screen.getByText('Escena 2')).toBeInTheDocument()
    expect(screen.getByText('Escena 3')).toBeInTheDocument()
    expect(screen.getByText('Intro scene')).toBeInTheDocument()
    expect(screen.getByText('Middle scene')).toBeInTheDocument()
    expect(screen.getByText('Final scene')).toBeInTheDocument()
  })

  it('renders empty state when no pipeline', () => {
    mockStoreState.pipeline = null
    render(<ScenesTab />)

    expect(
      screen.getByText(/Inicia un pipeline desde el centro para ver escenas aqui/),
    ).toBeInTheDocument()
  })

  it('renders empty state when pipeline has no scenes', () => {
    mockStoreState.pipeline = { id: 100, escenas: [] }
    render(<ScenesTab />)

    // Should show "0 escenas" in the header but no scene items
    expect(screen.getByText('0 escenas')).toBeInTheDocument()
    expect(screen.queryByText(/Escena \d/)).not.toBeInTheDocument()
  })

  it('scene status badges show correct label from STATUS_CONFIG', () => {
    // Set scenes with each testable status
    mockStoreState.pipeline = {
      id: 100,
      escenas: [
        makeScene({ id: 1, orden: 1, estado: 'pending' }),
        makeScene({ id: 2, orden: 2, estado: 'generating' }),
        makeScene({ id: 3, orden: 3, estado: 'complete' }),
        makeScene({ id: 4, orden: 4, estado: 'failed' }),
        makeScene({ id: 5, orden: 5, estado: 'approved' }),
      ],
    }
    render(<ScenesTab />)

    expect(screen.getByText(STATUS_CONFIG.pending.label)).toBeInTheDocument()
    expect(screen.getByText(STATUS_CONFIG.generating.label)).toBeInTheDocument()
    expect(screen.getByText(STATUS_CONFIG.complete.label)).toBeInTheDocument()
    expect(screen.getByText(STATUS_CONFIG.failed.label)).toBeInTheDocument()
    expect(screen.getByText(STATUS_CONFIG.approved.label)).toBeInTheDocument()
  })

  it('delete scene requires confirmation then calls store action', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<ScenesTab />)

    // Find all delete buttons (they have title="Eliminar")
    const deleteBtns = screen.getAllByTitle('Eliminar')
    expect(deleteBtns.length).toBe(3)

    // First click sets confirmation state
    await user.click(deleteBtns[0])
    expect(mockDeleteScene).not.toHaveBeenCalled()

    // Now the title changes to "Confirmar"
    const confirmBtn = screen.getByTitle('Confirmar')
    await user.click(confirmBtn)

    expect(mockDeleteScene).toHaveBeenCalledWith(1)

    vi.useRealTimers()
  })

  it('duplicate scene calls store action', async () => {
    const user = userEvent.setup()
    render(<ScenesTab />)

    const dupBtns = screen.getAllByTitle('Duplicar')
    expect(dupBtns.length).toBe(3)

    await user.click(dupBtns[1])
    expect(mockDuplicateScene).toHaveBeenCalledWith(2)
  })

  it('max scenes limit hides add button', () => {
    // Fill to MAX_SCENES
    const scenes = Array.from({ length: MAX_SCENES }, (_, i) =>
      makeScene({ id: i + 1, orden: i + 1 }),
    )
    mockStoreState.pipeline = { id: 100, escenas: scenes }
    render(<ScenesTab />)

    // The add button (with title "Agregar escena") should not be present
    expect(screen.queryByTitle('Agregar escena')).not.toBeInTheDocument()
  })

  it('add button is visible when under max scenes', async () => {
    const user = userEvent.setup()
    // Default has 3 scenes, well under MAX_SCENES
    render(<ScenesTab />)

    const addBtn = screen.getByTitle('Agregar escena')
    expect(addBtn).toBeInTheDocument()

    await user.click(addBtn)
    expect(mockAddScene).toHaveBeenCalledWith(100, {
      description: '',
      video_prompt: '',
      duration_sec: 6,
      aspect_ratio: '16:9',
    })
  })

  it('clicking a scene calls setActiveScene', async () => {
    const user = userEvent.setup()
    render(<ScenesTab />)

    await user.click(screen.getByText('Escena 2'))
    expect(mockSetActiveScene).toHaveBeenCalledWith(2)
  })
})

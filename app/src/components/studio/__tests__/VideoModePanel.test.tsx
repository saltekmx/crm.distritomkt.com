import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VideoModePanel } from '../VideoModePanel'

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockProjectsList,
  mockProjectsCreate,
  mockClientsList,
  mockToast,
  mockSetSelectedVideoProjectId,
  mockAiState,
  mockStudioState,
} = vi.hoisted(() => ({
  mockProjectsList: vi.fn(),
  mockProjectsCreate: vi.fn(),
  mockClientsList: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockSetSelectedVideoProjectId: vi.fn(),
  mockAiState: {
    selectedVideoProjectId: null as number | null,
    setSelectedVideoProjectId: null as ReturnType<typeof vi.fn> | null,
  },
  mockStudioState: {
    generations: [] as Array<{ id: number; estado: string; url_salida: string | null; prompt: string }>,
  },
}))

vi.mock('@/services/api', () => ({
  projectsApi: {
    list: (...args: unknown[]) => mockProjectsList(...args),
    create: (...args: unknown[]) => mockProjectsCreate(...args),
  },
  pipelineApi: {},
  clientsApi: {
    list: (...args: unknown[]) => mockClientsList(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/stores/studioAiStore', () => ({
  useStudioAiStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      selectedVideoProjectId: mockAiState.selectedVideoProjectId,
      setSelectedVideoProjectId: mockAiState.setSelectedVideoProjectId,
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/stores/studioStore', () => ({
  useStudioStore: (selector?: (s: typeof mockStudioState) => unknown) =>
    selector ? selector(mockStudioState) : mockStudioState,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

const sampleProjects = {
  elementos: [
    { id: 1, nombre: 'Campaña Verano', tipo: 'servicios', cliente_nombre: 'Acme', status_operativo: 'activo' },
    { id: 2, nombre: 'Lanzamiento Producto', tipo: 'experiencias', cliente_nombre: 'Beta Corp', status_operativo: 'activo' },
  ],
  total: 2,
  pagina: 1,
  por_pagina: 50,
}

const sampleClients = {
  elementos: [
    { id: 10, nombre: 'Acme Inc' },
    { id: 20, nombre: 'Beta Corp' },
  ],
  total: 2,
  pagina: 1,
  por_pagina: 50,
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VideoModePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAiState.selectedVideoProjectId = null
    mockAiState.setSelectedVideoProjectId = mockSetSelectedVideoProjectId
    mockStudioState.generations = []
    mockProjectsList.mockResolvedValue({ data: sampleProjects })
    mockClientsList.mockResolvedValue({ data: sampleClients })
    mockProjectsCreate.mockResolvedValue({
      data: { id: 99, nombre: 'Nuevo Proyecto', tipo: 'servicios' },
    })
  })

  it('renders project list', async () => {
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(screen.getByText('Campaña Verano')).toBeInTheDocument()
    })
    expect(screen.getByText('Lanzamiento Producto')).toBeInTheDocument()
  })

  it('selects project on click', async () => {
    const user = userEvent.setup()
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(screen.getByText('Campaña Verano')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Campaña Verano'))
    expect(mockSetSelectedVideoProjectId).toHaveBeenCalledWith(1)
  })

  it('create project form shows on button click', async () => {
    const user = userEvent.setup()
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(screen.getByText('Crear Proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Crear Proyecto'))

    expect(screen.getByPlaceholderText('Nombre del proyecto')).toBeInTheDocument()
    expect(screen.getByText('Nuevo proyecto')).toBeInTheDocument()
  })

  it('create project validation prevents empty submission', async () => {
    const user = userEvent.setup()
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(screen.getByText('Crear Proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Crear Proyecto'))

    // Wait for clients to load
    await waitFor(() => {
      expect(mockClientsList).toHaveBeenCalled()
    })

    // The submit button should be disabled when name is empty
    const submitBtn = screen.getByRole('button', { name: /Crear$/i })
    expect(submitBtn).toBeDisabled()

    expect(mockProjectsCreate).not.toHaveBeenCalled()
  })

  it('create project calls API and closes form on success', async () => {
    const user = userEvent.setup()
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(screen.getByText('Crear Proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Crear Proyecto'))

    await waitFor(() => {
      expect(mockClientsList).toHaveBeenCalled()
    })

    const nameInput = screen.getByPlaceholderText('Nombre del proyecto')
    await user.type(nameInput, 'Nuevo Proyecto')

    const submitBtn = screen.getByRole('button', { name: /Crear$/i })
    expect(submitBtn).not.toBeDisabled()

    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockProjectsCreate).toHaveBeenCalledWith({
        cliente_id: 10,
        nombre: 'Nuevo Proyecto',
        tipo: 'servicios',
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith('Proyecto creado')
    expect(mockSetSelectedVideoProjectId).toHaveBeenCalledWith(99)

    // Form should close — "Crear Proyecto" button reappears
    await waitFor(() => {
      expect(screen.getByText('Crear Proyecto')).toBeInTheDocument()
    })
  })

  it('create project error shows toast and keeps form open', async () => {
    const user = userEvent.setup()
    mockProjectsCreate.mockRejectedValue({
      response: { data: { detail: 'Nombre duplicado' } },
    })

    render(<VideoModePanel />)

    await waitFor(() => {
      expect(screen.getByText('Crear Proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Crear Proyecto'))

    await waitFor(() => {
      expect(mockClientsList).toHaveBeenCalled()
    })

    const nameInput = screen.getByPlaceholderText('Nombre del proyecto')
    await user.type(nameInput, 'Duplicado')

    const submitBtn = screen.getByRole('button', { name: /Crear$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Nombre duplicado')
    })

    // Form should still be visible
    expect(screen.getByText('Nuevo proyecto')).toBeInTheDocument()
  })

  it('loads projects on mount', async () => {
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(mockProjectsList).toHaveBeenCalledWith({ limit: 50 })
    })
  })

  it('error state on load failure shows error toast', async () => {
    mockProjectsList.mockRejectedValue(new Error('Network'))
    render(<VideoModePanel />)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al cargar proyectos')
    })

    // Empty state shown
    await waitFor(() => {
      expect(screen.getByText('Sin proyectos')).toBeInTheDocument()
    })
  })
})

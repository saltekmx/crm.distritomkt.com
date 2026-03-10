import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssetsTab } from '../AssetsTab'

// ── Hoisted mocks (vi.mock factories are hoisted — variables must be too) ────

const {
  mockListAssets,
  mockUploadAsset,
  mockDeleteAsset,
  mockImportAssetUrl,
  mockToast,
  mockPipelineState,
  mockStudioState,
} = vi.hoisted(() => ({
  mockListAssets: vi.fn(),
  mockUploadAsset: vi.fn(),
  mockDeleteAsset: vi.fn(),
  mockImportAssetUrl: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockPipelineState: { pipeline: null as { id: number } | null },
  mockStudioState: {
    generations: [] as Array<{ id: number; estado: string; url_salida: string | null; prompt: string }>,
  },
}))

vi.mock('@/services/api', () => ({
  pipelineApi: {
    listAssets: (...args: unknown[]) => mockListAssets(...args),
    uploadAsset: (...args: unknown[]) => mockUploadAsset(...args),
    deleteAsset: (...args: unknown[]) => mockDeleteAsset(...args),
    importAssetUrl: (...args: unknown[]) => mockImportAssetUrl(...args),
  },
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

function renderAssets(pipelineId: number | null = null) {
  mockPipelineState.pipeline = pipelineId ? { id: pipelineId } : null
  return render(<AssetsTab projectId={1} />)
}

const sampleAssets = [
  { id: 10, url_archivo: 'https://img.test/a.png', nombre_archivo: 'a.png', tipo_asset: 'image', descripcion_ia: null, creado_en: '' },
  { id: 20, url_archivo: 'https://img.test/b.png', nombre_archivo: 'b.png', tipo_asset: 'image', descripcion_ia: null, creado_en: '' },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AssetsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPipelineState.pipeline = null
    mockStudioState.generations = []
    mockListAssets.mockResolvedValue({ data: [] })
    mockUploadAsset.mockResolvedValue({
      data: { id: 99, url_archivo: 'https://img.test/new.png', nombre_archivo: 'new.png', tipo_asset: 'image', descripcion_ia: null, creado_en: '' },
    })
    mockDeleteAsset.mockResolvedValue({})
  })

  it('renders loading state', () => {
    // Make listAssets hang so the loading spinner stays visible
    mockListAssets.mockReturnValue(new Promise(() => {}))
    renderAssets(1)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders error state', async () => {
    mockListAssets.mockRejectedValue(new Error('Network error'))
    renderAssets(1)

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar los assets')).toBeInTheDocument()
    })
    expect(mockToast.error).toHaveBeenCalledWith('Error al cargar assets')
  })

  it('renders empty state with zero assets', async () => {
    mockListAssets.mockResolvedValue({ data: [] })
    renderAssets(1)

    await waitFor(() => {
      expect(screen.getByText(/0 assets de referencia/)).toBeInTheDocument()
    })
    // The "Subidos" section should not appear when there are no assets
    expect(screen.queryByText('Subidos')).not.toBeInTheDocument()
  })

  it('renders asset list', async () => {
    mockListAssets.mockResolvedValue({ data: sampleAssets })
    renderAssets(1)

    await waitFor(() => {
      expect(screen.getByText(/2 assets de referencia/)).toBeInTheDocument()
    })
    expect(screen.getByText('Subidos')).toBeInTheDocument()

    // Each asset renders an image with the correct alt text
    const images = screen.getAllByRole('img')
    const assetImages = images.filter(
      (img) => img.getAttribute('alt') === 'a.png' || img.getAttribute('alt') === 'b.png',
    )
    expect(assetImages).toHaveLength(2)
  })

  it('upload triggers API call', async () => {
    const user = userEvent.setup()
    mockListAssets.mockResolvedValue({ data: [] })
    renderAssets(5)

    await waitFor(() => {
      expect(mockListAssets).toHaveBeenCalledWith(5)
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const file = new File(['pixel'], 'photo.png', { type: 'image/png' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockUploadAsset).toHaveBeenCalledWith(5, file)
    })
    expect(mockToast.success).toHaveBeenCalledWith('1 archivo(s) subido(s)')
  })

  it('remove asset calls API then updates UI', async () => {
    const user = userEvent.setup()
    mockListAssets.mockResolvedValue({ data: [sampleAssets[0]] })
    renderAssets(1)

    await waitFor(() => {
      expect(screen.getByText('Subidos')).toBeInTheDocument()
    })

    // Find the remove button inside the asset card (positioned absolutely)
    const removeBtns = document.querySelectorAll('button.absolute')
    expect(removeBtns.length).toBeGreaterThan(0)
    await user.click(removeBtns[0] as HTMLElement)

    await waitFor(() => {
      expect(mockDeleteAsset).toHaveBeenCalledWith(10)
    })
    // After successful removal the "Subidos" label disappears
    await waitFor(() => {
      expect(screen.queryByText('Subidos')).not.toBeInTheDocument()
    })
  })

  it('remove asset shows error toast on failure', async () => {
    mockListAssets.mockResolvedValue({ data: [sampleAssets[0]] })
    mockDeleteAsset.mockRejectedValue(new Error('Server error'))
    const user = userEvent.setup()
    renderAssets(1)

    await waitFor(() => {
      expect(screen.getByText('Subidos')).toBeInTheDocument()
    })

    const removeBtns = document.querySelectorAll('button.absolute')
    await user.click(removeBtns[0] as HTMLElement)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al eliminar asset')
    })
    // The asset should still be visible since delete failed
    // (the component only removes from state on success)
    expect(screen.getByText('Subidos')).toBeInTheDocument()
  })

  it('loads assets on mount when pipelineId is present', async () => {
    mockListAssets.mockResolvedValue({ data: sampleAssets })
    renderAssets(42)

    await waitFor(() => {
      expect(mockListAssets).toHaveBeenCalledWith(42)
    })
    await waitFor(() => {
      expect(screen.getByText(/2 assets de referencia/)).toBeInTheDocument()
    })
  })

  it('does not load assets when no pipeline', () => {
    renderAssets(null)
    expect(mockListAssets).not.toHaveBeenCalled()
    expect(screen.getByText(/0 assets de referencia/)).toBeInTheDocument()
  })
})

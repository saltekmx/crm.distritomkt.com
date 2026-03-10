import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'

// ── Mock WebSocket ───────────────────────────────────────────────────────────

type WSEventHandler = ((event: any) => void) | null

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  onopen: WSEventHandler = null
  onclose: WSEventHandler = null
  onmessage: WSEventHandler = null
  onerror: WSEventHandler = null
  close = vi.fn()
  send = vi.fn()
  readyState = 1 // OPEN

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  simulateOpen() {
    this.onopen?.({})
  }

  simulateMessage(data: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  simulateClose(code = 1000) {
    this.onclose?.({ code })
  }

  simulateError() {
    this.onerror?.({})
  }
}

// ── Hoisted mocks (available before vi.mock factory runs) ────────────────────

const {
  mockUpdateSceneFromWS,
  mockSetPipelineStatus,
  mockSetExportProgress,
  mockSetExportComplete,
  mockSetState,
  mockToastError,
} = vi.hoisted(() => ({
  mockUpdateSceneFromWS: vi.fn(),
  mockSetPipelineStatus: vi.fn(),
  mockSetExportProgress: vi.fn(),
  mockSetExportComplete: vi.fn(),
  mockSetState: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: mockToastError, info: vi.fn() },
}))

vi.mock('@/stores/pipelineStore', () => ({
  usePipelineStore: Object.assign(
    () => ({
      updateSceneFromWS: mockUpdateSceneFromWS,
      setPipelineStatus: mockSetPipelineStatus,
      setExportProgress: mockSetExportProgress,
      setExportComplete: mockSetExportComplete,
    }),
    { setState: mockSetState },
  ),
}))

// ── Import after mocks ───────────────────────────────────────────────────────

import { usePipelineWebSocket } from '../usePipelineWebSocket'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('usePipelineWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    MockWebSocket.instances = []
    ;(globalThis as any).WebSocket = MockWebSocket
    localStorage.setItem('token', 'test-jwt-token')
    ;(import.meta as any).env = { VITE_API_URL: 'http://localhost:8000' }
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    localStorage.clear()
  })

  it('should not connect when pipelineId is null', () => {
    renderHook(() => usePipelineWebSocket(null))
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('should connect with auth token in URL', () => {
    renderHook(() => usePipelineWebSocket(10))

    expect(MockWebSocket.instances).toHaveLength(1)
    const ws = MockWebSocket.instances[0]
    expect(ws.url).toContain('/api/v1/pipeline/ws/10')
    expect(ws.url).toMatch(/^ws:\/\//)
    expect(ws.url).toContain('token=test-jwt-token')
  })

  it('should set connectionLost when no token', () => {
    localStorage.removeItem('token')

    const { result } = renderHook(() => usePipelineWebSocket(10))

    expect(result.current.connectionLost).toBe(true)
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('should reset connectionLost on successful open', () => {
    const { result } = renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })

    expect(result.current.connectionLost).toBe(false)
  })

  // ── Message handling ─────────────────────────────────────────────────────

  it('should handle scene_complete message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'scene_complete',
        scene_id: 1,
        video_url: 'https://vid.mp4',
        thumbnail_url: 'https://thumb.jpg',
      })
    })

    expect(mockUpdateSceneFromWS).toHaveBeenCalledWith(1, {
      estado: 'complete',
      video_url: 'https://vid.mp4',
      thumbnail_url: 'https://thumb.jpg',
    })
  })

  it('should handle scene_failed message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'scene_failed',
        scene_id: 2,
      })
    })

    expect(mockUpdateSceneFromWS).toHaveBeenCalledWith(2, { estado: 'failed' })
  })

  it('should handle scene_status message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'scene_status',
        scene_id: 3,
        status: 'generating',
        elapsed_sec: 45,
      })
    })

    expect(mockUpdateSceneFromWS).toHaveBeenCalledWith(3, {
      estado: 'generating',
      elapsed_sec: 45,
    })
  })

  it('should handle pipeline_status message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'pipeline_status',
        status: 'review',
      })
    })

    expect(mockSetPipelineStatus).toHaveBeenCalledWith('review')
  })

  it('should handle export_progress message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'export_progress',
        step: 2,
        total: 5,
      })
    })

    expect(mockSetExportProgress).toHaveBeenCalledWith({ step: 2, total: 5 })
  })

  it('should handle export_complete message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'export_complete',
        media_ids: [100, 101],
      })
    })

    expect(mockSetPipelineStatus).toHaveBeenCalledWith('exported')
    expect(mockSetExportComplete).toHaveBeenCalledWith([100, 101])
  })

  it('should handle export_failed message', () => {
    renderHook(() => usePipelineWebSocket(10))

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
      MockWebSocket.instances[0].simulateMessage({
        type: 'export_failed',
        error: 'Timeout',
      })
    })

    expect(mockSetExportProgress).toHaveBeenCalledWith(null)
    expect(mockSetState).toHaveBeenCalledWith({ isLoading: false })
    expect(mockToastError).toHaveBeenCalledWith('Timeout')
  })

  // ── Reconnection ─────────────────────────────────────────────────────────

  it('should reconnect on close with exponential backoff', () => {
    renderHook(() => usePipelineWebSocket(10))
    expect(MockWebSocket.instances).toHaveLength(1)

    // Simulate close
    act(() => {
      MockWebSocket.instances[0].simulateClose()
    })

    // Advance past first reconnect delay (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(MockWebSocket.instances).toHaveLength(2)

    // Close again
    act(() => {
      MockWebSocket.instances[1].simulateClose()
    })

    // Second delay should be 2000ms (doubled)
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(MockWebSocket.instances).toHaveLength(2) // Not yet

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(MockWebSocket.instances).toHaveLength(3) // Now connected
  })

  it('should stop reconnecting after MAX_RETRIES (10) and set connectionLost', () => {
    const { result } = renderHook(() => usePipelineWebSocket(10))

    // Simulate 10 close events with timer advancement for reconnect
    for (let i = 0; i < 10; i++) {
      act(() => {
        const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
        ws.simulateClose()
      })
      act(() => {
        vi.advanceTimersByTime(60000)
      })
    }

    // 11th close should trigger connectionLost (retryCount === 10 === MAX_RETRIES)
    act(() => {
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      ws.simulateClose()
    })

    expect(result.current.connectionLost).toBe(true)
  })

  it('should close WebSocket on unmount', () => {
    const { unmount } = renderHook(() => usePipelineWebSocket(10))

    const ws = MockWebSocket.instances[0]

    unmount()

    expect(ws.close).toHaveBeenCalled()
    expect(ws.onclose).toBeNull()
  })

  it('should reset retry count on successful open', () => {
    const { result } = renderHook(() => usePipelineWebSocket(10))

    // Close and reconnect a few times
    for (let i = 0; i < 5; i++) {
      act(() => {
        MockWebSocket.instances[MockWebSocket.instances.length - 1].simulateClose()
      })
      act(() => {
        vi.advanceTimersByTime(60000)
      })
    }

    // Now open successfully -- should reset counter
    act(() => {
      MockWebSocket.instances[MockWebSocket.instances.length - 1].simulateOpen()
    })

    expect(result.current.connectionLost).toBe(false)

    // Close again -- should be able to reconnect (counter was reset)
    act(() => {
      MockWebSocket.instances[MockWebSocket.instances.length - 1].simulateClose()
    })
    act(() => {
      vi.advanceTimersByTime(1000) // Reset delay after open
    })

    // A new WS should have been created
    expect(MockWebSocket.instances.length).toBeGreaterThan(6)
  })
})

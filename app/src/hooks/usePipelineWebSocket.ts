import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/stores/pipelineStore'

export function usePipelineWebSocket(pipelineId: number | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const reconnectDelay = useRef(1000)
  const { updateSceneFromWS, setPipelineStatus, setExportProgress, setExportComplete } = usePipelineStore()

  useEffect(() => {
    if (!pipelineId) return

    function connect() {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const wsUrl = apiUrl.replace(/^http/, 'ws')
      const ws = new WebSocket(`${wsUrl}/api/v1/pipeline/ws/${pipelineId}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelay.current = 1000 // Reset on successful connect
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'scene_complete':
            updateSceneFromWS(msg.scene_id, {
              estado: 'complete',
              video_url: msg.video_url,
              thumbnail_url: msg.thumbnail_url,
            })
            break
          case 'scene_failed':
            updateSceneFromWS(msg.scene_id, { estado: 'failed' })
            break
          case 'scene_status':
            updateSceneFromWS(msg.scene_id, {
              estado: msg.status,
              elapsed_sec: msg.elapsed_sec,
            })
            break
          case 'pipeline_status':
            setPipelineStatus(msg.status)
            break
          case 'export_progress':
            setExportProgress({ step: msg.step, total: msg.total })
            break
          case 'export_complete':
            setPipelineStatus('exported')
            setExportComplete(msg.media_ids ?? [])
            break
          case 'export_failed':
            setExportProgress(null)
            usePipelineStore.setState({ isLoading: false })
            toast.error(msg.error ?? 'Error durante la exportación al CRM')
            break
        }
      }

      ws.onerror = () => {
        // Will trigger onclose
      }

      ws.onclose = () => {
        // Auto-reconnect with exponential backoff
        const delay = Math.min(reconnectDelay.current, 30000)
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = delay * 2
          connect()
        }, delay)
      }
    }

    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // Prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [pipelineId, updateSceneFromWS, setPipelineStatus, setExportProgress, setExportComplete])
}

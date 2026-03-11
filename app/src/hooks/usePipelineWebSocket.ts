import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/stores/pipelineStore'

const MAX_RETRIES = 10

export function usePipelineWebSocket(pipelineId: number | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const reconnectDelay = useRef(1000)
  const retryCount = useRef(0)
  const [connectionLost, setConnectionLost] = useState(false)
  const { updateSceneFromWS, setPipelineStatus, setExportProgress, setExportComplete } = usePipelineStore()

  useEffect(() => {
    if (!pipelineId) return

    function connect() {
      const token = localStorage.getItem('token')
      if (!token) {
        setConnectionLost(true)
        return
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const wsUrl = apiUrl.replace(/^http/, 'ws')
      const ws = new WebSocket(`${wsUrl}/api/v1/pipeline/ws/${pipelineId}?token=${encodeURIComponent(token)}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelay.current = 1000 // Reset on successful connect
        retryCount.current = 0
        setConnectionLost(false)
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'scene_complete': {
            updateSceneFromWS(msg.scene_id, {
              estado: 'complete',
              video_url: msg.video_url,
              thumbnail_url: msg.thumbnail_url,
            })
            const sceneOrder = usePipelineStore.getState().pipeline?.escenas.find(
              (s) => s.id === msg.scene_id
            )?.orden
            toast.success(`Escena ${sceneOrder ?? ''} completada`)
            break
          }
          case 'scene_failed': {
            updateSceneFromWS(msg.scene_id, { estado: 'failed' })
            const failedOrder = usePipelineStore.getState().pipeline?.escenas.find(
              (s) => s.id === msg.scene_id
            )?.orden
            toast.error(`Error en escena ${failedOrder ?? ''}`)
            break
          }
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
            toast.error(msg.error ?? 'Error durante la exportacion al CRM')
            break
        }
      }

      ws.onerror = () => {
        // Will trigger onclose
      }

      ws.onclose = () => {
        if (retryCount.current >= MAX_RETRIES) {
          setConnectionLost(true)
          return
        }

        // Auto-reconnect with exponential backoff, capped at 10 retries
        const delay = Math.min(reconnectDelay.current, 30000)
        retryCount.current += 1
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

  return { connectionLost }
}

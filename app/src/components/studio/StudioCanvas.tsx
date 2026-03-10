import {
  ImageIcon, ZoomIn, ZoomOut, RotateCcw, Maximize, Copy,
  Shuffle, Info, Grid3X3, Sun, Moon,
  Loader2, Eye, Link2, Download, ArrowUpRight,
  Plus, X, Palette, GitBranch, Repeat2, Image as ImageLucide,
  ArrowRight, ArrowLeft,
} from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { studioApi, type StudioGeneration } from '@/services/api'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioCanvasStore, type CanvasBg } from '@/stores/studioCanvasStore'
import { QuickControls } from './QuickControls'
import { CropOverlay } from './CropOverlay'

interface StudioCanvasProps {
  generation: StudioGeneration | null
  isGenerating: boolean
  onVariation?: (gen: StudioGeneration) => void
}

// ─── Color Palette Extractor ─────────────────────────────────────────────────

function extractColors(img: HTMLImageElement, count: number = 5): string[] {
  const canvas = document.createElement('canvas')
  const size = 100
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data

  // Simple k-means-ish: collect pixel colors and find dominant ones
  const buckets: Map<string, number> = new Map()
  for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
    const r = Math.round(data[i] / 32) * 32
    const g = Math.round(data[i + 1] / 32) * 32
    const b = Math.round(data[i + 2] / 32) * 32
    const key = `${r},${g},${b}`
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number)
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    })
}

// ─── Main Canvas Component ──────────────────────────────────────────────────

export function StudioCanvas({ generation, isGenerating, onVariation }: StudioCanvasProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Per-image canvas state from store
  const imageId = generation?.id ?? 0
  const canvasStore = useStudioCanvasStore()
  const imgState = canvasStore.getImageState(imageId)
  const { zoom, pan, bg } = imgState
  const isCropping = imgState.isCropping
  const setZoom = useCallback((v: number | ((prev: number) => number)) => canvasStore.setZoom(imageId, v), [canvasStore, imageId])
  const setPan = useCallback((v: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => canvasStore.setPan(imageId, v), [canvasStore, imageId])
  const setBg = useCallback((v: CanvasBg) => canvasStore.setBg(imageId, v), [canvasStore, imageId])
  const getTransformStyle = useCallback(() => canvasStore.getTransformStyle(imageId), [canvasStore, imageId])

  const describeImage = useStudioAiStore((s) => s.describeImage)
  const isDescribing = useStudioAiStore((s) => s.isDescribing)
  const upscaleImage = useStudioAiStore((s) => s.upscaleImage)
  const isUpscaling = useStudioAiStore((s) => s.isUpscaling)
  const outputFormat = useStudioAiStore((s) => s.outputFormat)
  const compareParentId = useStudioAiStore((s) => s.compareParentId)
  const setCompareParentId = useStudioAiStore((s) => s.setCompareParentId)
  const generations = useStudioStore((s) => s.generations)
  const selectedImageIds = useStudioAiStore((s) => s.selectedImageIds)
  const clearSelection = useStudioAiStore((s) => s.clearSelection)
  const setReferenceImageUrl = useStudioAiStore((s) => s.setReferenceImageUrl)

  // Reset info/colors when image changes (zoom/pan/edits are per-image in store)
  useEffect(() => {
    setShowInfo(false)
    setExtractedColors([])
  }, [generation?.id])

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Read current imageId via ref so keyboard/wheel handlers always target the right image
  const imageIdRef = useRef(imageId)
  imageIdRef.current = imageId

  // Keep isCropping ref in sync so keyboard/mouse handlers always see current value
  const isCroppingRef = useRef(isCropping)
  useEffect(() => { isCroppingRef.current = isCropping }, [isCropping])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      const id = imageIdRef.current
      const store = useStudioCanvasStore.getState()

      // Ctrl+Z / Ctrl+Shift+Z for undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          store.redo(id)
        } else {
          store.undo(id)
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Z') {
        e.preventDefault()
        store.redo(id)
        return
      }

      switch (e.key) {
        case '=':
        case '+':
          e.preventDefault()
          store.setZoom(id, (z) => Math.min(3, z + 0.25))
          break
        case '-':
          e.preventDefault()
          store.setZoom(id, (z) => Math.max(0.25, z - 0.25))
          break
        case '0':
          e.preventDefault()
          store.setZoom(id, 1)
          store.setPan(id, { x: 0, y: 0 })
          break
        case '1':
          e.preventDefault()
          store.setZoom(id, 1)
          store.setPan(id, { x: 0, y: 0 })
          break
        case '2':
          e.preventDefault()
          store.setZoom(id, 2)
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'i':
        case 'I':
          e.preventDefault()
          setShowInfo((s) => !s)
          break
        case 'b':
        case 'B': {
          e.preventDefault()
          const curBg = store.getImageState(id).bg
          store.setBg(id, curBg === 'dark' ? 'checker' : curBg === 'checker' ? 'light' : 'dark')
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const id = imageIdRef.current
      useStudioCanvasStore.getState().setZoom(id, (z) => Math.min(3, Math.max(0.25, z - e.deltaY * 0.001)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      canvasRef.current?.requestFullscreen()
    }
  }

  const handleCopyPrompt = () => {
    if (!generation?.prompt) return
    navigator.clipboard.writeText(generation.prompt)
    toast.success('Prompt copiado')
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || isCroppingRef.current) return
    isPanning.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    setPan((p) => ({
      x: p.x + e.clientX - lastMouse.current.x,
      y: p.y + e.clientY - lastMouse.current.y,
    }))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const hasImage = generation?.estado === 'complete' && generation?.url_salida

  // Compare view: find parent generation when compareParentId is set
  const compareParent = compareParentId ? generations.find((g) => g.id === compareParentId) ?? null : null
  const showCompare = !!(compareParent?.url_salida && hasImage)

  const bgStyles: Record<CanvasBg, string> = {
    dark: 'bg-zinc-950',
    checker: 'bg-zinc-900',
    light: 'bg-zinc-300',
  }

  return (
    <div className={cn('flex-1 flex flex-col relative overflow-hidden transition-colors duration-300', bgStyles[bg])}>
      {/* Canvas area */}
      <div
        ref={canvasRef}
        className={cn(
          'flex-1 flex items-center justify-center overflow-hidden',
          isCropping ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background pattern */}
        {bg === 'dark' && (
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}
        {bg === 'checker' && (
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          />
        )}

        {showCompare && generation ? (
          /* ── Compare View: Parent (left) + Child (right) ──────────── */
          <div
            className="flex items-center gap-6 px-8"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {/* Parent image */}
            <div className="relative flex flex-col items-center">
              <div className="relative rounded-lg overflow-hidden opacity-60">
                <img
                  src={compareParent?.url_salida ?? ''}
                  alt={compareParent?.prompt ?? ''}
                  className={cn(
                    'max-w-[30vw] max-h-[50vh] rounded-lg',
                    bg === 'dark' && 'shadow-2xl shadow-black/50',
                  )}
                  draggable={false}
                />
              </div>
              <span className="mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                Original #{compareParent?.id}
              </span>
            </div>

            {/* Connector line */}
            <div className="flex items-center shrink-0">
              <div className="w-12 h-0.5 bg-gradient-to-r from-violet-500/40 via-violet-500/70 to-violet-500/40 relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-500/50 border border-violet-400/40" />
              </div>
              <ArrowRight className="h-4 w-4 text-violet-400 -ml-1" />
            </div>

            {/* Child image (new version) */}
            <div className="relative flex flex-col items-center">
              <div className="relative rounded-lg overflow-hidden ring-2 ring-violet-500/40">
                <img
                  ref={imageRef}
                  src={generation.url_salida!}
                  alt={generation.prompt}
                  className={cn(
                    'max-w-[30vw] max-h-[50vh] rounded-lg',
                    bg === 'dark' && 'shadow-2xl shadow-black/50',
                  )}
                  style={{
                    ...getTransformStyle(),
                    transition: 'transform 0.15s ease-out, filter 0.15s ease-out',
                  }}
                  draggable={false}
                />
              </div>
              <span className="mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-300">
                Nueva version #{generation.id}
              </span>
            </div>
          </div>
        ) : hasImage ? (
          <div
            className="relative"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <img
              ref={imageRef}
              src={generation?.url_salida ?? ''}
              alt={generation?.prompt ?? ''}
              className={cn(
                'max-w-[70vw] max-h-[60vh] rounded-lg',
                bg === 'dark' && 'shadow-2xl shadow-black/50',
                bg === 'light' && 'shadow-xl shadow-black/20',
                isGenerating && 'studio-generating-pulse',
              )}
              style={{
                ...getTransformStyle(),
                transition: 'transform 0.15s ease-out, filter 0.15s ease-out',
              }}
              draggable={false}
            />
            {/* Generation overlay — animated blur/glow when creating a new version from this image */}
            {isGenerating && (
              <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                {/* Animated shimmer sweep */}
                <div className="absolute inset-0 studio-shimmer-sweep" />
                {/* Soft glow border */}
                <div className="absolute inset-0 rounded-lg ring-2 ring-violet-500/40 animate-pulse" />
                {/* Status pill */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-sm border border-violet-500/30 rounded-full px-4 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  <span className="text-xs text-violet-300 font-medium">Generando nueva version...</span>
                </div>
              </div>
            )}
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center animate-pulse">
              <ImageIcon className="h-10 w-10 text-violet-500/40" />
            </div>
            <p className={cn('text-sm', bg === 'light' ? 'text-zinc-500' : 'text-zinc-500')}>
              Generando imagen...
            </p>
            <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-violet-500/50 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-zinc-700" />
            </div>
            <p className={cn('text-sm max-w-xs', bg === 'light' ? 'text-zinc-500' : 'text-zinc-500')}>
              Usa el panel de AI o los controles para generar tu primera imagen
            </p>
          </div>
        )}
      </div>

      {/* Crop overlay */}
      {hasImage && isCropping && (
        <CropOverlay imageRef={imageRef} />
      )}

      {/* Image info overlay */}
      {hasImage && showInfo && (
        <ImageInfoOverlay generation={generation} />
      )}

      {/* Bottom toolbar: zoom + actions */}
      {hasImage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2 py-1 backdrop-blur-sm">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Alejar"
            title="Alejar (-)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] text-zinc-400 min-w-[40px] text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Acercar"
            title="Acercar (+)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          <button
            onClick={resetView}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Restablecer vista"
            title="Restablecer (0)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Pantalla completa"
            title="Pantalla completa (F)"
          >
            <Maximize className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Image actions */}
          <button
            onClick={handleCopyPrompt}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Copiar prompt"
            title="Copiar prompt"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {onVariation && generation && (
            <button
              onClick={() => onVariation(generation)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Generar variacion"
              title="Generar variacion"
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowInfo((s) => !s)}
            className={cn(
              'p-1 rounded transition-colors',
              showInfo ? 'text-violet-400' : 'text-zinc-400 hover:text-zinc-200',
            )}
            aria-label="Info de imagen"
            title="Info de imagen (I)"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!generation?.url_salida) return
              const result = await describeImage(generation.url_salida, generation.key_salida)
              if (result.suggested_prompt) {
                navigator.clipboard.writeText(result.suggested_prompt)
                useStudioAiStore.setState({ pendingPrompt: result.suggested_prompt })
                toast.success('Prompt sugerido cargado en el panel')
              }
            }}
            disabled={!generation?.url_salida || isDescribing}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Describir imagen con IA"
            title="Describir imagen con IA"
          >
            {isDescribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => {
              if (!generation?.url_salida) return
              navigator.clipboard.writeText(generation.url_salida)
              toast.success('URL copiada')
            }}
            disabled={!generation?.url_salida}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Copiar URL"
            title="Copiar URL"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (!generation?.url_salida) return
              const a = document.createElement('a')
              a.href = generation.url_salida
              a.download = `studio_${generation.id}.${outputFormat}`
              a.click()
            }}
            disabled={!generation?.url_salida}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Descargar imagen"
            title="Descargar imagen"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Upscale */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-zinc-500 mr-0.5">
              <ArrowUpRight className="h-3 w-3" />
            </span>
            <button
              onClick={() => upscaleImage(generation.id, 2)}
              disabled={isUpscaling}
              className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
              title="Escalar 2x"
            >
              2x
            </button>
            <button
              onClick={() => upscaleImage(generation.id, 4)}
              disabled={isUpscaling}
              className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
              title="Escalar 4x"
            >
              4x
            </button>
          </div>

          {/* Color palette */}
          <button
            onClick={() => {
              const img = imageRef.current
              if (!img) return
              const colors = extractColors(img)
              setExtractedColors(colors)
              const hex = colors.join(', ')
              navigator.clipboard.writeText(hex)
              toast.success('Paleta copiada: ' + hex)
            }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Extraer paleta de colores"
            title="Extraer paleta de colores"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Background toggle */}
          <button
            onClick={() => setBg(bg === 'dark' ? 'checker' : bg === 'checker' ? 'light' : 'dark')}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Cambiar fondo"
            title="Cambiar fondo (B)"
          >
            {bg === 'dark' ? <Moon className="h-3.5 w-3.5" /> :
             bg === 'checker' ? <Grid3X3 className="h-3.5 w-3.5" /> :
             <Sun className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* Back to dashboard button */}
      <button
        onClick={() => useStudioAiStore.getState().setActiveImage(null)}
        className="absolute top-4 left-4 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 transition-colors z-10"
        title="Volver al canvas"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">Canvas</span>
      </button>

      {/* Quick controls bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-4 py-2 backdrop-blur-sm">
        <QuickControls />
      </div>

      {/* Multi-selection bar */}
      {selectedImageIds.size > 1 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-violet-900/90 border border-violet-500/30 rounded-lg px-4 py-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs text-violet-200 font-medium">
            {selectedImageIds.size} imagenes seleccionadas
          </span>
          <div className="h-4 w-px bg-violet-500/30" />
          <button
            onClick={() => {
              const selected = useStudioAiStore.getState().getSelectedGenerations()
              const ids = selected.map((g) => g.id)
              studioApi.bulkDownload(ids).then(({ data }) => {
                const url = URL.createObjectURL(data)
                const a = document.createElement('a')
                a.href = url
                a.download = `studio_${Date.now()}.zip`
                a.click()
                URL.revokeObjectURL(url)
                toast.success(`${ids.length} imagenes descargadas`)
              }).catch(() => toast.error('Error al descargar'))
            }}
            className="text-[11px] text-violet-200 hover:text-white px-2 py-0.5 rounded hover:bg-violet-500/30 transition-colors"
          >
            Descargar
          </button>
          <button
            onClick={() => {
              // Use first selected image as reference for generation
              const selected = useStudioAiStore.getState().getSelectedGenerations()
              const urls = selected.map((g) => g.url_salida).filter(Boolean)
              if (urls[0]) {
                setReferenceImageUrl(urls[0]!)
                toast.success('Imagenes seleccionadas como referencia')
              }
            }}
            className="text-[11px] text-violet-200 hover:text-white px-2 py-0.5 rounded hover:bg-violet-500/30 transition-colors"
          >
            Usar como referencia
          </button>
          <button
            onClick={clearSelection}
            className="p-1 rounded text-violet-300 hover:text-white hover:bg-violet-500/30 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Prompt display */}
      {hasImage && generation.prompt && !showInfo && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 max-w-md">
          <p className="text-[11px] text-zinc-500 text-center truncate bg-zinc-900/80 px-3 py-1 rounded-full backdrop-blur-sm">
            {generation.prompt}
          </p>
        </div>
      )}

      {/* Compare view dismiss pill */}
      {showCompare && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => setCompareParentId(null)}
            className="flex items-center gap-2 bg-zinc-900/90 border border-violet-500/30 rounded-full px-4 py-2 backdrop-blur-sm hover:bg-zinc-800/90 transition-colors"
          >
            <span className="text-xs text-violet-300 font-medium">
              Comparando con #{compareParentId}
            </span>
            <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-200" />
          </button>
        </div>
      )}

      {/* Extracted color palette */}
      {extractedColors.length > 0 && (
        <div className="absolute bottom-14 right-4 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2 py-1.5 backdrop-blur-sm animate-in fade-in duration-200">
          {extractedColors.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                navigator.clipboard.writeText(color)
                toast.success(`Copiado: ${color}`)
              }}
              className="w-5 h-5 rounded-md border border-zinc-700 hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Keyboard shortcuts hint (bottom-right) */}
      <div className="absolute bottom-4 right-4 text-[10px] text-zinc-700 space-y-0.5 select-none pointer-events-none">
        <p>+/- Zoom | 0 Reset | F Full | I Info | B Fondo | Ctrl+Z Deshacer</p>
      </div>
    </div>
  )
}

// ─── Image Info Overlay ──────────────────────────────────────────────────────

function ImageInfoOverlay({ generation }: { generation: StudioGeneration }) {
  const { loadFromGeneration, setReferenceImageUrl, setActiveTab } = useStudioAiStore()
  const [tagInput, setTagInput] = useState('')
  const [localTags, setLocalTags] = useState<string[]>(generation.tags ?? [])

  // Sync when generation changes
  useEffect(() => {
    setLocalTags(generation.tags ?? [])
  }, [generation.id])

  const addTag = async () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || localTags.includes(tag)) { setTagInput(''); return }
    const newTags = [...localTags, tag]
    setLocalTags(newTags)
    setTagInput('')
    try {
      await studioApi.updateTags(generation.id, newTags)
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === generation.id ? { ...g, tags: newTags } : g
        ),
      }))
    } catch {
      setLocalTags(localTags) // revert
      toast.error('Error al agregar tag')
    }
  }

  const removeTag = async (tag: string) => {
    const newTags = localTags.filter((t) => t !== tag)
    setLocalTags(newTags)
    try {
      await studioApi.updateTags(generation.id, newTags)
      useStudioStore.setState((s) => ({
        generations: s.generations.map((g) =>
          g.id === generation.id ? { ...g, tags: newTags } : g
        ),
      }))
    } catch {
      setLocalTags(localTags)
      toast.error('Error al eliminar tag')
    }
  }

  const date = new Date(generation.creado_en + 'Z').toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })

  return (
    <div className="absolute top-16 right-4 w-72 bg-zinc-900/95 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Detalles</h4>

      <div className="space-y-2">
        <InfoRow label="Prompt" value={generation.prompt} multiline />
        {generation.estilo && <InfoRow label="Estilo" value={generation.estilo} />}
        <InfoRow label="Ratio" value={generation.aspect_ratio} />
        {generation.modelo && <InfoRow label="Modelo" value={generation.modelo} />}
        <InfoRow label="Estado" value={generation.estado === 'complete' ? 'Completado' : generation.estado} />
        <InfoRow label="Creado" value={date} />
        <InfoRow label="ID" value={`#${generation.id}`} />
        {generation.media_id_salida && (
          <InfoRow label="Media" value={`Exportado (#${generation.media_id_salida})`} />
        )}
      </div>

      {/* Iteration / Branching Actions */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-800">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Acciones</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              loadFromGeneration(generation)
              toast.success('Prompt cargado — edita y genera')
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium hover:bg-violet-500/20 transition-colors"
          >
            <Repeat2 className="h-3 w-3" />
            Iterar
          </button>
          <button
            onClick={() => {
              loadFromGeneration(generation)
              // Clear selectedImageId so it generates fresh (variation, not edit)
              setTimeout(() => {
                useStudioAiStore.setState({ selectedImageId: null })
              }, 50)
              toast.success('Parametros cargados — genera variacion')
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <GitBranch className="h-3 w-3" />
            Ramificar
          </button>
          <button
            onClick={() => {
              if (generation.url_salida) {
                setReferenceImageUrl(generation.url_salida)
                setActiveTab('generate')
                toast.success('Imagen establecida como referencia')
              }
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium hover:bg-amber-500/20 transition-colors"
          >
            <ImageLucide className="h-3 w-3" />
            Referencia
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(generation.prompt)
              toast.success('Prompt copiado')
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-700/50 border border-zinc-700 text-zinc-300 text-[11px] font-medium hover:bg-zinc-700 transition-colors"
          >
            <Copy className="h-3 w-3" />
            Copiar
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tags</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {localTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded group"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-violet-400/50 hover:text-violet-300 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1 mt-1.5">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Nuevo tag..."
            className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={addTag}
            disabled={!tagInput.trim()}
            className="px-1.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <p className={cn('text-xs text-zinc-300 mt-0.5', multiline ? 'leading-relaxed' : 'truncate')}>
        {value}
      </p>
    </div>
  )
}

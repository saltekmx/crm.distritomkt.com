import { useRef, useState, useEffect } from 'react'
import { X, Eraser, RotateCcw, Wand2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useStudioAiStore } from '@/stores/studioAiStore'

interface InpaintOverlayProps {
  generationId: number
  imageUrl: string
}

export function InpaintOverlay({ generationId, imageUrl }: InpaintOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(32)
  const [isErasing, setIsErasing] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [hasMask, setHasMask] = useState(false)

  const { setShowInpaintOverlay, inpaintGeneration, isGenerating, consumePendingPrompt } = useStudioAiStore()

  // Pre-fill prompt from agent suggestion
  useEffect(() => {
    const p = consumePendingPrompt()
    if (p) setPrompt(p)
  }, [consumePendingPrompt])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const paintDot = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over'
    ctx.fillStyle = isErasing ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.9)'
    ctx.fill()
  }

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasMask(true)
    paintDot(e)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    paintDot(e)
  }

  const stopDraw = () => setIsDrawing(false)

  const clearMask = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasMask(false)
  }

  const handleApply = async () => {
    if (!hasMask || !prompt.trim()) return
    const canvas = canvasRef.current
    if (!canvas) return
    const maskDataUrl = canvas.toDataURL('image/png')
    await inpaintGeneration(generationId, prompt.trim(), maskDataUrl)
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-zinc-950/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-100">Inpaint — Editar Region</span>
        </div>
        <button
          onClick={() => setShowInpaintOverlay(false)}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden p-4"
      >
        <div className="relative">
          <img
            src={imageUrl}
            alt="Source"
            className="max-w-full max-h-[55vh] object-contain rounded-lg"
          />
          {/* Mask canvas — overlaid on top */}
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="absolute inset-0 w-full h-full rounded-lg cursor-crosshair touch-none opacity-70"
            style={{ mixBlendMode: 'normal' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
        {/* Brush controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsErasing(false)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              !isErasing
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100',
            )}
          >
            <div className="w-3 h-3 rounded-full bg-current" />
            Pincel
          </button>
          <button
            onClick={() => setIsErasing(true)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
              isErasing
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100',
            )}
          >
            <Eraser className="h-3 w-3" />
            Borrador
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-zinc-500 w-6">{brushSize}</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={8}
              max={96}
              step={4}
              className="flex-1"
            />
          </div>
          <button
            onClick={clearMask}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Prompt input */}
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Que debe aparecer en la region pintada..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
          />
          <Button
            onClick={handleApply}
            disabled={!hasMask || !prompt.trim() || isGenerating}
            size="sm"
            className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Aplicar'
            )}
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          Pinta la region que quieres editar, luego describe que debe aparecer
        </p>
      </div>
    </div>
  )
}

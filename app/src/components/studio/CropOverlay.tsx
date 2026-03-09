import { Check, X } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  useStudioCanvasStore,
  type AspectPreset,
  type CropRect,
} from '@/stores/studioCanvasStore'
import { useStudioAiStore } from '@/stores/studioAiStore'

// ─── Types ───────────────────────────────────────────────────────────────────

type HandlePosition =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'

interface DragState {
  type: 'move' | HandlePosition
  startX: number
  startY: number
  startRect: CropRect
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HANDLE_SIZE = 10
const MIN_CROP = 30

const ASPECT_RATIOS: Record<AspectPreset, number | null> = {
  free: null,
  '1:1': 1,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
}

const HANDLES: { pos: HandlePosition; cursor: string }[] = [
  { pos: 'nw', cursor: 'nwse-resize' },
  { pos: 'n', cursor: 'ns-resize' },
  { pos: 'ne', cursor: 'nesw-resize' },
  { pos: 'e', cursor: 'ew-resize' },
  { pos: 'se', cursor: 'nwse-resize' },
  { pos: 's', cursor: 'ns-resize' },
  { pos: 'sw', cursor: 'nesw-resize' },
  { pos: 'w', cursor: 'ew-resize' },
]

// ─── Helper: get handle position as CSS ──────────────────────────────────────

function getHandleStyle(
  pos: HandlePosition,
  rect: CropRect,
): React.CSSProperties {
  const half = HANDLE_SIZE / 2

  const base: React.CSSProperties = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
  }

  switch (pos) {
    case 'nw':
      return { ...base, left: rect.x - half, top: rect.y - half }
    case 'n':
      return {
        ...base,
        left: rect.x + rect.w / 2 - half,
        top: rect.y - half,
      }
    case 'ne':
      return { ...base, left: rect.x + rect.w - half, top: rect.y - half }
    case 'e':
      return {
        ...base,
        left: rect.x + rect.w - half,
        top: rect.y + rect.h / 2 - half,
      }
    case 'se':
      return {
        ...base,
        left: rect.x + rect.w - half,
        top: rect.y + rect.h - half,
      }
    case 's':
      return {
        ...base,
        left: rect.x + rect.w / 2 - half,
        top: rect.y + rect.h - half,
      }
    case 'sw':
      return { ...base, left: rect.x - half, top: rect.y + rect.h - half }
    case 'w':
      return {
        ...base,
        left: rect.x - half,
        top: rect.y + rect.h / 2 - half,
      }
  }
}

// ─── Helper: constrain rect within bounds ────────────────────────────────────

function clampRect(
  rect: CropRect,
  bounds: { w: number; h: number },
): CropRect {
  let { x, y, w, h } = rect

  w = Math.max(MIN_CROP, Math.min(w, bounds.w))
  h = Math.max(MIN_CROP, Math.min(h, bounds.h))
  x = Math.max(0, Math.min(x, bounds.w - w))
  y = Math.max(0, Math.min(y, bounds.h - h))

  return { x, y, w, h }
}

// ─── Helper: enforce aspect ratio ────────────────────────────────────────────

function enforceAspect(
  rect: CropRect,
  ratio: number | null,
  bounds: { w: number; h: number },
): CropRect {
  if (!ratio) return rect

  let { x, y, w, h } = rect
  const currentRatio = w / h

  if (currentRatio > ratio) {
    // too wide, shrink width
    w = h * ratio
  } else {
    // too tall, shrink height
    h = w / ratio
  }

  return clampRect({ x, y, w, h }, bounds)
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CropOverlayProps {
  /** Ref to the image element being cropped */
  imageRef: React.RefObject<HTMLImageElement | null>
}

export function CropOverlay({ imageRef }: CropOverlayProps) {
  const imageId = useStudioAiStore((s) => s.selectedImageId) ?? 0
  const store = useStudioCanvasStore()
  const imgState = store.getImageState(imageId)

  const setCropping = useCallback((v: boolean) => store.setCropping(imageId, v), [store, imageId])
  const addEdit = useCallback((edit: { type: 'crop'; value: CropRect }) => store.addEdit(imageId, edit), [store, imageId])
  const setCropAspect = useCallback((preset: AspectPreset) => store.setCropAspect(imageId, preset), [store, imageId])
  const cropAspect = imgState.cropAspect

  const overlayRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)

  // Image bounds in overlay coordinates
  const [bounds, setBounds] = useState({ w: 400, h: 300 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 400, h: 300 })

  // Measure image position within the overlay
  useEffect(() => {
    const img = imageRef.current
    const overlay = overlayRef.current
    if (!img || !overlay) return

    const measure = () => {
      const imgBounds = img.getBoundingClientRect()
      const overlayBounds = overlay.getBoundingClientRect()

      const w = imgBounds.width
      const h = imgBounds.height
      const x = imgBounds.left - overlayBounds.left
      const y = imgBounds.top - overlayBounds.top

      setBounds({ w, h })
      setOffset({ x, y })

      // Initialize crop to full image with optional aspect ratio
      const aspect = ASPECT_RATIOS[cropAspect]
      const initial = enforceAspect({ x: 0, y: 0, w, h }, aspect, { w, h })
      setCropRect(initial)
    }

    // Small delay to ensure layout is settled
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [imageRef, cropAspect])

  // Update crop when aspect preset changes (from AdjustTab)
  useEffect(() => {
    const aspect = ASPECT_RATIOS[cropAspect]
    setCropRect((prev) => enforceAspect(prev, aspect, bounds))
  }, [cropAspect, bounds])

  // ── Drag handling ──

  const handlePointerDown = useCallback(
    (type: DragState['type'], e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

      dragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...cropRect },
      }
    },
    [cropRect],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return

      const { type, startX, startY, startRect } = dragRef.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const aspect = ASPECT_RATIOS[cropAspect]

      let newRect = { ...startRect }

      if (type === 'move') {
        newRect.x = startRect.x + dx
        newRect.y = startRect.y + dy
      } else {
        // Resize handle
        switch (type) {
          case 'nw':
            newRect.x = startRect.x + dx
            newRect.y = startRect.y + dy
            newRect.w = startRect.w - dx
            newRect.h = startRect.h - dy
            break
          case 'n':
            newRect.y = startRect.y + dy
            newRect.h = startRect.h - dy
            break
          case 'ne':
            newRect.y = startRect.y + dy
            newRect.w = startRect.w + dx
            newRect.h = startRect.h - dy
            break
          case 'e':
            newRect.w = startRect.w + dx
            break
          case 'se':
            newRect.w = startRect.w + dx
            newRect.h = startRect.h + dy
            break
          case 's':
            newRect.h = startRect.h + dy
            break
          case 'sw':
            newRect.x = startRect.x + dx
            newRect.w = startRect.w - dx
            newRect.h = startRect.h + dy
            break
          case 'w':
            newRect.x = startRect.x + dx
            newRect.w = startRect.w - dx
            break
        }

        if (aspect) {
          newRect = enforceAspect(newRect, aspect, bounds)
        }
      }

      setCropRect(clampRect(newRect, bounds))
    },
    [bounds, cropAspect],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // ── Actions ──

  const handleConfirm = useCallback(() => {
    // Normalize crop rect to percentages of image dimensions (0-100 range)
    const normalized: CropRect = {
      x: (cropRect.x / bounds.w) * 100,
      y: (cropRect.y / bounds.h) * 100,
      w: (cropRect.w / bounds.w) * 100,
      h: (cropRect.h / bounds.h) * 100,
    }
    addEdit({ type: 'crop', value: normalized })
    setCropping(false)
  }, [cropRect, bounds, addEdit, setCropping])

  const handleCancel = useCallback(() => {
    setCropping(false)
  }, [setCropping])

  // ── Aspect preset buttons for the overlay top bar ──

  const aspectPresets: { label: string; value: AspectPreset }[] = [
    { label: 'Libre', value: 'free' },
    { label: '1:1', value: '1:1' },
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
  ]

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-30"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Semi-transparent mask outside crop area */}
      <svg className="absolute" style={{ left: offset.x, top: offset.y, width: bounds.w, height: bounds.h }}>
        <defs>
          <mask id="crop-mask">
            <rect x={0} y={0} width={bounds.w} height={bounds.h} fill="white" />
            <rect
              x={cropRect.x}
              y={cropRect.y}
              width={cropRect.w}
              height={cropRect.h}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x={0}
          y={0}
          width={bounds.w}
          height={bounds.h}
          fill="rgba(0,0,0,0.6)"
          mask="url(#crop-mask)"
        />
      </svg>

      {/* Crop rectangle border */}
      <div
        className="absolute border-2 border-violet-400 pointer-events-none"
        style={{
          left: offset.x + cropRect.x,
          top: offset.y + cropRect.y,
          width: cropRect.w,
          height: cropRect.h,
        }}
      >
        {/* Rule-of-thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-violet-400/20" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-violet-400/20" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-violet-400/20" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-violet-400/20" />
        </div>
      </div>

      {/* Draggable move area (the crop center) */}
      <div
        className="absolute cursor-move"
        style={{
          left: offset.x + cropRect.x,
          top: offset.y + cropRect.y,
          width: cropRect.w,
          height: cropRect.h,
        }}
        onPointerDown={(e) => handlePointerDown('move', e)}
      />

      {/* 8 resize handles */}
      {HANDLES.map(({ pos, cursor }) => (
        <div
          key={pos}
          className="bg-white border-2 border-violet-500 rounded-sm"
          style={{
            ...getHandleStyle(pos, {
              x: offset.x + cropRect.x,
              y: offset.y + cropRect.y,
              w: cropRect.w,
              h: cropRect.h,
            }),
            cursor,
            zIndex: 1,
          }}
          onPointerDown={(e) => handlePointerDown(pos, e)}
        />
      ))}

      {/* Top bar: aspect presets */}
      <div
        className="absolute flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 rounded-lg px-2 py-1 backdrop-blur-sm"
        style={{
          left: offset.x + cropRect.x + cropRect.w / 2,
          top: offset.y + cropRect.y - 40,
          transform: 'translateX(-50%)',
        }}
      >
        {aspectPresets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setCropAspect(p.value)}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
              cropAspect === p.value
                ? 'bg-violet-500/20 text-violet-400'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bottom bar: confirm/cancel */}
      <div
        className="absolute flex items-center gap-2"
        style={{
          left: offset.x + cropRect.x + cropRect.w / 2,
          top: offset.y + cropRect.y + cropRect.h + 12,
          transform: 'translateX(-50%)',
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800/90 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium backdrop-blur-sm transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/90 border border-violet-500 text-white hover:bg-violet-500 text-xs font-medium backdrop-blur-sm transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          Aplicar
        </button>
      </div>

      {/* Dimensions label */}
      <div
        className="absolute text-[10px] font-mono text-violet-400/70 pointer-events-none"
        style={{
          left: offset.x + cropRect.x + cropRect.w / 2,
          top: offset.y + cropRect.y + cropRect.h + 52,
          transform: 'translateX(-50%)',
        }}
      >
        {Math.round(cropRect.w)} x {Math.round(cropRect.h)}
      </div>
    </div>
  )
}

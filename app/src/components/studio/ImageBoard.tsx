import { useRef, useState, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Loader2,
  ImageIcon,
  Expand,
  EyeOff,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioCanvasStore } from '@/stores/studioCanvasStore'
import { ImageDetailModal } from './ImageDetailModal'

const CARD_W = 200
const CARD_H = 236
const THUMB_H = 160

interface ImageBoardProps {
  projectId: number
}

interface DragState {
  imageId: number
  startBoardX: number
  startBoardY: number
  origX: number
  origY: number
  hasMoved: boolean
}

export function ImageBoard({ projectId: _projectId }: ImageBoardProps) {
  const { generations, versionMap, deleteGeneration } = useStudioStore()
  const { selectedImageId, setActiveImage, setSelectedImageId } = useStudioAiStore()
  const {
    dashboardZoom,
    dashboardPan,
    imagePositions,
    boardImageIds,
    setDashboardZoom,
    setDashboardPan,
    setImagePosition,
    autoArrangeImages,
    removeFromBoard,
  } = useStudioCanvasStore()

  // Only show images that have been explicitly placed on the board
  const boardGenerations = generations.filter((g) => boardImageIds.has(g.id))
  const boardIds = boardGenerations.map((g) => g.id)

  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Refs for values needed in event handlers (avoid stale closures)
  const panStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const zoomRef = useRef(dashboardZoom)
  const panRef = useRef(dashboardPan)

  useEffect(() => { zoomRef.current = dashboardZoom }, [dashboardZoom])
  useEffect(() => { panRef.current = dashboardPan }, [dashboardPan])

  // Space bar for pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        (e.target as HTMLElement)?.tagName !== 'INPUT' &&
        (e.target as HTMLElement)?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        setIsSpaceDown(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const screenToBoard = (screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const { pan, zoom } = { pan: panRef.current, zoom: zoomRef.current }
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const curZoom = zoomRef.current
    const curPan = panRef.current
    const newZoom = Math.min(3.0, Math.max(0.15, curZoom + delta * curZoom))

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const ratio = newZoom / curZoom
      setDashboardPan({
        x: mouseX - (mouseX - curPan.x) * ratio,
        y: mouseY - (mouseY - curPan.y) * ratio,
      })
    }
    setDashboardZoom(newZoom)
  }

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpaceDown) {
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      setDashboardPan({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.mouseX),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.mouseY),
      })
    }

    if (dragRef.current) {
      const board = screenToBoard(e.clientX, e.clientY)
      const dx = board.x - dragRef.current.startBoardX
      const dy = board.y - dragRef.current.startBoardY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.hasMoved = true
      }
      if (dragRef.current.hasMoved) {
        setImagePosition(dragRef.current.imageId, {
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        })
      }
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    panStartRef.current = null

    if (dragRef.current) {
      if (!dragRef.current.hasMoved) {
        setActiveImage(dragRef.current.imageId)
      }
      dragRef.current = null
      setDraggingId(null)
    }
  }

  const handleCardMouseDown = (e: React.MouseEvent, imageId: number) => {
    if (isSpaceDown || e.button === 1) return
    e.stopPropagation()
    const board = screenToBoard(e.clientX, e.clientY)
    const pos = useStudioCanvasStore.getState().imagePositions.get(imageId) ?? { x: 0, y: 0 }
    dragRef.current = {
      imageId,
      startBoardX: board.x,
      startBoardY: board.y,
      origX: pos.x,
      origY: pos.y,
      hasMoved: false,
    }
    setDraggingId(imageId)
  }

  const handleRemoveFromBoard = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    removeFromBoard(id)
    if (selectedImageId === id) setSelectedImageId(null)
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    deleteGeneration(id)
    removeFromBoard(id)
    if (selectedImageId === id) setSelectedImageId(null)
  }

  const handleAutoArrange = () => {
    autoArrangeImages(boardIds)
  }

  const handleFitAll = () => {
    if (boardIds.length === 0) {
      setDashboardPan({ x: 0, y: 0 })
      setDashboardZoom(1)
      return
    }
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    boardIds.forEach((id) => {
      const pos = useStudioCanvasStore.getState().imagePositions.get(id) ?? { x: 0, y: 0 }
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + CARD_W)
      maxY = Math.max(maxY, pos.y + CARD_H)
    })

    const padding = 60
    const worldW = maxX - minX + padding * 2
    const worldH = maxY - minY + padding * 2
    const newZoom = Math.min(3.0, Math.max(0.15, Math.min(rect.width / worldW, rect.height / worldH)))
    setDashboardZoom(newZoom)
    setDashboardPan({
      x: (rect.width - worldW * newZoom) / 2 - (minX - padding) * newZoom,
      y: (rect.height - worldH * newZoom) / 2 - (minY - padding) * newZoom,
    })
  }

  const isEmpty = boardGenerations.length === 0

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'w-full h-full relative overflow-hidden bg-zinc-950 select-none',
          isSpaceDown && !isPanning && 'cursor-grab',
          isPanning && 'cursor-grabbing',
        )}
        onWheel={handleWheel}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)',
            backgroundSize: `${24 * dashboardZoom}px ${24 * dashboardZoom}px`,
            backgroundPosition: `${dashboardPan.x % (24 * dashboardZoom)}px ${dashboardPan.y % (24 * dashboardZoom)}px`,
          }}
        />

        {/* World transform layer */}
        <div
          className="absolute"
          style={{
            transform: `translate(${dashboardPan.x}px, ${dashboardPan.y}px) scale(${dashboardZoom})`,
            transformOrigin: '0 0',
            width: 0,
            height: 0,
          }}
        >
          {/* SVG connector lines */}
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ top: 0, left: 0, width: 0, height: 0 }}
          >
            {Object.entries(versionMap).map(([childIdStr, parentId]) => {
              const childId = Number(childIdStr)
              // Only draw if both are on the board
              if (!boardImageIds.has(parentId) || !boardImageIds.has(childId)) return null
              const parentPos = imagePositions.get(parentId)
              const childPos = imagePositions.get(childId)
              if (!parentPos || !childPos) return null
              const x1 = parentPos.x + CARD_W
              const y1 = parentPos.y + CARD_H / 2
              const x2 = childPos.x
              const y2 = childPos.y + CARD_H / 2
              const cp = Math.abs(x2 - x1) * 0.5
              return (
                <path
                  key={`${parentId}-${childId}`}
                  d={`M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`}
                  stroke="#7c3aed"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                  strokeDasharray="5,4"
                  fill="none"
                />
              )
            })}
          </svg>

          {/* Image cards */}
          {boardGenerations.map((gen) => {
            const pos = imagePositions.get(gen.id) ?? { x: 0, y: 0 }
            const isSelected = gen.id === selectedImageId
            const isPending = gen.estado === 'pending' || gen.estado === 'generating'
            const isDragging = draggingId === gen.id
            const isHovered = hoveredId === gen.id && !draggingId && !isPanning

            return (
              <div
                key={gen.id}
                className={cn(
                  'absolute rounded-xl overflow-hidden bg-zinc-900 border transition-shadow',
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/20'
                    : 'border-zinc-800 hover:border-zinc-700',
                  isDragging && 'shadow-2xl shadow-black/40',
                )}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_W,
                  height: CARD_H,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: isDragging ? 100 : isSelected ? 10 : 1,
                }}
                onMouseDown={(e) => handleCardMouseDown(e, gen.id)}
                onMouseEnter={() => setHoveredId(gen.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Thumbnail */}
                <div className="relative bg-zinc-800" style={{ width: CARD_W, height: THUMB_H }}>
                  {gen.url_salida ? (
                    <img
                      src={gen.url_salida}
                      alt={gen.prompt}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isPending ? (
                        <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-zinc-600" />
                      )}
                    </div>
                  )}

                  {isPending && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" />
                  )}

                  {/* Hover action overlay */}
                  {isHovered && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col justify-between p-2">
                      {/* Top: quick actions */}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setExpandedId(gen.id) }}
                          className="p-1.5 rounded-lg bg-black/60 text-zinc-200 hover:text-white hover:bg-black/80 transition-all"
                          title="Ver detalles"
                        >
                          <Expand className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleRemoveFromBoard(e, gen.id)}
                          className="p-1.5 rounded-lg bg-black/60 text-zinc-200 hover:text-white hover:bg-black/80 transition-all"
                          title="Quitar del tablero"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleDelete(e, gen.id)}
                          className="p-1.5 rounded-lg bg-black/60 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Bottom: double-click hint */}
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setExpandedId(gen.id) }}
                        className="text-[10px] text-zinc-400 text-center w-full hover:text-zinc-200 transition-colors"
                      >
                        Ver detalles →
                      </button>
                    </div>
                  )}
                </div>

                {/* Info area */}
                <div className="px-2.5 py-2">
                  <p className="text-[11px] text-zinc-300 line-clamp-2 leading-tight">
                    {gen.prompt}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {gen.modelo && (
                      <span className="text-[9px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded shrink-0">
                        {gen.modelo.split('-').slice(0, 2).join('-')}
                      </span>
                    )}
                    {gen.aspect_ratio && (
                      <span className="text-[9px] text-zinc-600">{gen.aspect_ratio}</span>
                    )}
                    {gen.is_favorito && (
                      <span className="text-[9px] text-red-400 ml-auto">♥</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500 text-sm">Tablero vacio</p>
              <p className="text-zinc-600 text-xs mt-1">
                Genera una imagen o selecciona una de la Galeria
              </p>
            </div>
          </div>
        )}

        {/* Toolbar — top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-50">
          <div className="flex items-center gap-0.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg px-1.5 py-1">
            <button
              onClick={() => setDashboardZoom(Math.max(0.15, dashboardZoom - 0.1))}
              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Alejar"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-zinc-400 tabular-nums w-9 text-center">
              {Math.round(dashboardZoom * 100)}%
            </span>
            <button
              onClick={() => setDashboardZoom(Math.min(3.0, dashboardZoom + 0.1))}
              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Acercar"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={handleFitAll}
            className="p-1.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Ajustar todo"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleAutoArrange}
            className="p-1.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Auto organizar"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pan hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 pointer-events-none whitespace-nowrap">
          Pan: Espacio+arrastrar · Zoom: rueda del mouse · Hover para acciones
        </div>
      </div>

      {/* Image detail modal */}
      {expandedId !== null && (
        <ImageDetailModal
          generationId={expandedId}
          onClose={() => setExpandedId(null)}
        />
      )}
    </>
  )
}

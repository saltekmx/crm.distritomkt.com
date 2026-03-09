import { useRef, useCallback, useEffect, useState } from 'react'
import { ImageIcon, ZoomIn, ZoomOut, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'
import { useStudioCanvasStore } from '@/stores/studioCanvasStore'

export function StudioDashboard() {
  const generations = useStudioStore((s) => s.generations)
  const versionMap = useStudioStore((s) => s.versionMap)
  const selectedImageId = useStudioAiStore((s) => s.selectedImageId)
  const setSelectedImageId = useStudioAiStore((s) => s.setSelectedImageId)
  const setActiveImage = useStudioAiStore((s) => s.setActiveImage)
  const selectedImageIds = useStudioAiStore((s) => s.selectedImageIds)
  const toggleImageSelection = useStudioAiStore((s) => s.toggleImageSelection)

  const {
    dashboardZoom,
    dashboardPan,
    imagePositions,
    setDashboardZoom,
    setDashboardPan,
    setImagePosition,
    autoArrangeImages,
  } = useStudioCanvasStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [dragId, setDragId] = useState<number | null>(null)

  // All completed generations are shown on the canvas
  const completedIds = generations
    .filter((g) => g.estado === 'complete' && g.url_salida)
    .map((g) => g.id)

  // Auto-arrange on mount if no positions exist
  useEffect(() => {
    if (completedIds.length > 0 && imagePositions.size === 0) {
      autoArrangeImages(completedIds)
    }
  }, [completedIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-arrange when new generations appear that have no position
  useEffect(() => {
    const hasNew = completedIds.some((id) => !imagePositions.has(id))
    if (hasNew && completedIds.length > 0) {
      autoArrangeImages(completedIds)
    }
  }, [completedIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const store = useStudioCanvasStore.getState()
      const curZoom = store.dashboardZoom
      store.setDashboardZoom(Math.min(3, Math.max(0.2, curZoom - e.deltaY * 0.001)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-dashboard-card]')) return
    isPanning.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragId !== null) {
        const store = useStudioCanvasStore.getState()
        const pos = store.imagePositions.get(dragId) ?? { x: 0, y: 0 }
        const curZoom = store.dashboardZoom
        const dx = (e.clientX - lastMouse.current.x) / curZoom
        const dy = (e.clientY - lastMouse.current.y) / curZoom
        store.setImagePosition(dragId, { x: pos.x + dx, y: pos.y + dy })
        lastMouse.current = { x: e.clientX, y: e.clientY }
        return
      }
      if (!isPanning.current) return
      const store = useStudioCanvasStore.getState()
      const curPan = store.dashboardPan
      store.setDashboardPan({
        x: curPan.x + e.clientX - lastMouse.current.x,
        y: curPan.y + e.clientY - lastMouse.current.y,
      })
      lastMouse.current = { x: e.clientX, y: e.clientY }
    },
    [dragId],
  )

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
    setDragId(null)
  }, [])

  const handleCardMouseDown = useCallback(
    (id: number, e: React.MouseEvent) => {
      e.stopPropagation()
      if (e.ctrlKey || e.metaKey) {
        toggleImageSelection(id, { ctrl: true, shift: false })
        return
      }
      // Start drag + select this image
      setDragId(id)
      lastMouse.current = { x: e.clientX, y: e.clientY }
      setSelectedImageId(id)
    },
    [toggleImageSelection, setSelectedImageId],
  )

  const handleCardDoubleClick = useCallback(
    (id: number) => {
      // Enter focused single-image editor
      setActiveImage(id)
    },
    [setActiveImage],
  )

  // Build parent->children map for version lines
  const childrenMap = new Map<number, number[]>()
  for (const [childStr, parent] of Object.entries(versionMap)) {
    const child = Number(childStr)
    if (!completedIds.includes(child) || !completedIds.includes(parent)) continue
    const list = childrenMap.get(parent) ?? []
    list.push(child)
    childrenMap.set(parent, list)
  }

  if (completedIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
          <LayoutGrid className="h-8 w-8 text-zinc-700" />
        </div>
        <p className="text-sm text-zinc-500">
          Genera imagenes para verlas aqui en el canvas
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-zinc-950 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: `${24 * dashboardZoom}px ${24 * dashboardZoom}px`,
          backgroundPosition: `${dashboardPan.x}px ${dashboardPan.y}px`,
        }}
      />

      {/* Viewport */}
      <div
        className="absolute"
        style={{
          transform: `translate(${dashboardPan.x}px, ${dashboardPan.y}px) scale(${dashboardZoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Version chain SVG lines */}
        <svg className="absolute inset-0 w-[4000px] h-[4000px] pointer-events-none" style={{ overflow: 'visible' }}>
          {[...childrenMap.entries()].map(([parentId, children]) => {
            const parentPos = imagePositions.get(parentId)
            if (!parentPos) return null
            const px = parentPos.x + 120
            const py = parentPos.y + 140

            return children.map((childId) => {
              const childPos = imagePositions.get(childId)
              if (!childPos) return null
              const cx = childPos.x + 120
              const cy = childPos.y + 140

              const mx = (px + cx) / 2
              return (
                <path
                  key={`${parentId}-${childId}`}
                  d={`M ${px} ${py} C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`}
                  fill="none"
                  stroke="url(#version-gradient)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
              )
            })
          })}
          <defs>
            <linearGradient id="version-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Image cards */}
        {completedIds.map((id) => {
          const gen = generations.find((g) => g.id === id)
          const pos = imagePositions.get(id) ?? { x: 0, y: 0 }
          const isSelected = selectedImageId === id
          const isMultiSelected = selectedImageIds.has(id)
          const canvasState = useStudioCanvasStore.getState().getImageState(id)
          const hasEdits = canvasState.edits.length > 0

          return (
            <div
              key={id}
              data-dashboard-card
              className={cn(
                'absolute w-[240px] bg-zinc-900 border rounded-xl overflow-hidden shadow-lg transition-shadow hover:shadow-xl cursor-pointer select-none',
                isSelected
                  ? 'border-violet-500 ring-2 ring-violet-500/30'
                  : isMultiSelected
                    ? 'border-violet-400/60 ring-1 ring-violet-400/20'
                    : 'border-zinc-800 hover:border-zinc-700',
                dragId === id && 'opacity-80 shadow-2xl',
              )}
              style={{ left: pos.x, top: pos.y }}
              onMouseDown={(e) => handleCardMouseDown(id, e)}
              onDoubleClick={() => handleCardDoubleClick(id)}
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-zinc-800">
                {gen?.url_salida ? (
                  <img
                    src={gen.url_salida}
                    alt={gen.prompt ?? ''}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-zinc-700" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1">
                <p className="text-[11px] text-zinc-400 truncate">
                  {gen?.prompt || `Generacion #${id}`}
                </p>
                <div className="flex items-center gap-1">
                  {gen?.estilo && (
                    <span className="text-[9px] font-medium text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">
                      {gen.estilo}
                    </span>
                  )}
                  {hasEdits && (
                    <span className="text-[9px] font-medium text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                      Editado
                    </span>
                  )}
                  {gen?.is_favorito && (
                    <span className="text-[9px] font-medium text-red-300 bg-red-500/15 px-1.5 py-0.5 rounded">
                      Fav
                    </span>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              {isMultiSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">
                    {[...selectedImageIds].indexOf(id) + 1}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2 py-1 backdrop-blur-sm">
        <button
          onClick={() => setDashboardZoom(Math.max(0.2, dashboardZoom - 0.25))}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Alejar"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-[11px] text-zinc-400 min-w-[40px] text-center font-mono">
          {Math.round(dashboardZoom * 100)}%
        </span>
        <button
          onClick={() => setDashboardZoom(Math.min(3, dashboardZoom + 0.25))}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Acercar"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-zinc-700 mx-1" />
        <button
          onClick={() => autoArrangeImages(completedIds)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reorganizar"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 right-4 text-[10px] text-zinc-700 select-none pointer-events-none">
        <p>Click para seleccionar | Doble click para editar | Ctrl+click multi-seleccion</p>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Loader2, GitBranch, Repeat2, Copy, Image as ImageLucide,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { StudioGeneration } from '@/services/api'
import { GalleryImageCard } from '@/components/studio/GalleryImageCard'
import { useStudioAiStore } from '@/stores/studioAiStore'
import { useStudioStore } from '@/stores/studioStore'

interface StudioGalleryProps {
  generations: StudioGeneration[]
  onExport: (id: number) => void
  onDownload: (gen: StudioGeneration) => void
  onDelete: (id: number) => void
}

export function StudioGallery({ generations, onExport, onDownload, onDelete }: StudioGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const { selectedImageId, isGenerating } = useStudioAiStore()
  const versionMap = useStudioStore((s) => s.versionMap)

  // Find the selected image to show connection when generating
  const selectedGen = generations.find((g) => g.id === selectedImageId) ?? null
  const showGeneratingCard = isGenerating && selectedGen?.estado === 'complete'

  // Build version chains: group children after their parent
  // versionMap is childId → parentId
  const orderedItems = useMemo(() => {
    // Reverse map: parentId → [childIds]
    const childrenOf: Record<number, number[]> = {}
    for (const [childStr, parentId] of Object.entries(versionMap)) {
      const childId = Number(childStr)
      if (!childrenOf[parentId]) childrenOf[parentId] = []
      childrenOf[parentId].push(childId)
    }

    const childIds = new Set(Object.keys(versionMap).map(Number))
    const result: Array<{ gen: StudioGeneration; isChild: boolean }> = []
    const added = new Set<number>()

    for (const gen of generations) {
      if (added.has(gen.id)) continue
      // Skip if this is a child — it'll be added after its parent
      if (childIds.has(gen.id)) continue

      result.push({ gen, isChild: false })
      added.add(gen.id)

      // Add children of this generation
      const kids = childrenOf[gen.id]
      if (kids) {
        for (const kidId of kids) {
          const kidGen = generations.find((g) => g.id === kidId)
          if (kidGen && !added.has(kidId)) {
            result.push({ gen: kidGen, isChild: true })
            added.add(kidId)
          }
        }
      }
    }

    // Add any orphaned children (parent not in current list)
    for (const gen of generations) {
      if (!added.has(gen.id)) {
        result.push({ gen, isChild: childIds.has(gen.id) })
        added.add(gen.id)
      }
    }

    return result
  }, [generations, versionMap])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 300
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  // Auto-scroll to selected image
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (selectedImageId == null) return
    const el = cardRefs.current.get(selectedImageId)
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedImageId])

  if (generations.length === 0 && !showGeneratingCard) {
    return (
      <div className="border-t border-zinc-800 flex flex-col shrink-0">
        <div className="flex justify-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="px-3 py-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label={collapsed ? 'Expandir galeria' : 'Colapsar galeria'}
            title={collapsed ? 'Expandir galeria' : 'Colapsar galeria'}
          >
            {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        {!collapsed && (
          <div className="h-[160px] flex items-center justify-center">
            <p className="text-xs text-zinc-600">Las imagenes generadas apareceran aqui</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'border-t border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 transition-all',
      collapsed ? 'h-auto' : 'h-[180px]',
    )}>
      <div className="flex justify-center shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="px-3 py-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
          aria-label={collapsed ? 'Expandir galeria' : 'Colapsar galeria'}
          title={collapsed ? 'Expandir galeria' : 'Colapsar galeria'}
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center justify-between px-4 py-1 shrink-0">
            <span className="text-xs text-zinc-500 font-medium">
              Galeria ({generations.length})
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => scroll('left')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-3 scrollbar-thin"
          >
            <div className="flex gap-0 h-full items-end">
              {orderedItems.map(({ gen, isChild }) => {
                const isSource = showGeneratingCard && gen.id === selectedImageId
                return (
                  <div
                    key={gen.id}
                    ref={(el) => { if (el) cardRefs.current.set(gen.id, el); else cardRefs.current.delete(gen.id) }}
                    className="flex items-center shrink-0"
                  >
                    {/* Connector line before child cards */}
                    {isChild && (
                      <VersionConnector generation={generations.find((g) => g.id === versionMap[gen.id])!} />
                    )}
                    <div className="mx-1.5">
                      <GalleryImageCard
                        generation={gen}
                        onExport={() => onExport(gen.id)}
                        onDownload={() => onDownload(gen)}
                        onDelete={() => onDelete(gen.id)}
                      />
                    </div>
                    {/* Generating placeholder after source */}
                    {isSource && (
                      <>
                        <VersionConnector generation={gen} />
                        <div className="mx-1.5">
                          <GeneratingPlaceholder sourceGen={gen} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Version Connector (Figma-style with action popup) ───────────────────────

function VersionConnector({ generation }: { generation: StudioGeneration }) {
  const [hovered, setHovered] = useState(false)
  const { loadFromGeneration, setReferenceImageUrl, setActiveTab } = useStudioAiStore()

  return (
    <div
      className="flex items-center shrink-0 relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The line */}
      <div className="w-8 h-0.5 bg-gradient-to-r from-violet-500/30 via-violet-500/60 to-violet-500/30 relative">
        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-violet-500/50 border border-violet-400/40 transition-transform hover:scale-125" />
      </div>

      {/* Action popup on hover */}
      {hovered && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-1 bg-zinc-900/95 border border-zinc-700 rounded-lg p-1 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              loadFromGeneration(generation)
              toast.success('Prompt cargado para iterar')
            }}
            className="p-1.5 rounded hover:bg-violet-500/20 text-violet-400 transition-colors"
            title="Iterar"
          >
            <Repeat2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              loadFromGeneration(generation)
              setTimeout(() => useStudioAiStore.setState({ selectedImageId: null }), 50)
              toast.success('Ramificando...')
            }}
            className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
            title="Ramificar"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (generation.url_salida) {
                setReferenceImageUrl(generation.url_salida)
                setActiveTab('generate')
                toast.success('Imagen como referencia')
              }
            }}
            className="p-1.5 rounded hover:bg-amber-500/20 text-amber-400 transition-colors"
            title="Usar como referencia"
          >
            <ImageLucide className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(generation.prompt)
              toast.success('Prompt copiado')
            }}
            className="p-1.5 rounded hover:bg-zinc-600 text-zinc-400 transition-colors"
            title="Copiar prompt"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {/* Arrow pointing down */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900/95 border-b border-r border-zinc-700 rotate-45" />
        </div>
      )}
    </div>
  )
}

// ── Generating Placeholder Card ──────────────────────────────────────────────

function GeneratingPlaceholder({ sourceGen }: { sourceGen: StudioGeneration }) {
  return (
    <div className="shrink-0 w-[140px] animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 border-2 border-dashed border-violet-500/40 relative">
        {sourceGen.url_salida && (
          <img
            src={sourceGen.url_salida}
            alt=""
            className="w-full h-full object-cover opacity-30 blur-sm"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/60">
          <div className="studio-shimmer-sweep absolute inset-0 rounded-lg" />
          <Loader2 className="h-5 w-5 animate-spin text-violet-400 relative z-10" />
          <span className="text-[10px] text-violet-300 font-medium relative z-10">
            Generando...
          </span>
        </div>
      </div>
      <p className="text-[10px] text-violet-400/60 mt-1 truncate px-0.5">
        Nueva version
      </p>
    </div>
  )
}

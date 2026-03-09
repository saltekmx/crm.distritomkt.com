import { useState } from 'react'
import { ChevronDown, ChevronUp, ImageIcon, Video, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioGeneration } from '@/services/api'

interface StudioOutputGalleryProps {
  generations: StudioGeneration[]
}

export function StudioOutputGallery({ generations }: StudioOutputGalleryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (generations.length === 0) return null

  return (
    <div className="card-modern overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <h3 className="text-sm font-semibold">
          Galeria del Proyecto ({generations.length})
        </h3>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 pt-0 border-t border-border">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
            {generations.map((gen) => (
              <GalleryItem key={gen.id} generation={gen} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GalleryItem({ generation }: { generation: StudioGeneration }) {
  const isImage = generation.tipo === 'image'
  const isComplete = generation.estado === 'complete'
  const TypeIcon = isImage ? ImageIcon : Video

  const date = new Date(generation.creado_en + 'Z').toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Mexico_City',
  })

  return (
    <div className="group relative">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted/30 border border-border">
        {isComplete && generation.url_salida ? (
          <img
            src={generation.url_salida}
            alt={generation.prompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
      </div>
      {/* Badge */}
      <div className="absolute top-1 left-1">
        <span className={cn(
          'px-1.5 py-0.5 rounded text-[10px] font-medium',
          isImage ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
        )}>
          {isImage ? 'IMG' : 'VID'}
        </span>
      </div>
      {/* Export badge */}
      {generation.media_id_salida && (
        <div className="absolute top-1 right-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
            CRM
          </span>
        </div>
      )}
      {/* Date */}
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {date}
      </div>
    </div>
  )
}

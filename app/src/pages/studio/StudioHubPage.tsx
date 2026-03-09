import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { studioApi, type StudioGeneration } from '@/services/api'
import { ROUTES } from '@/lib/routes'

interface ProjectGroup {
  projectId: number
  generations: StudioGeneration[]
}

export default function StudioHubPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<ProjectGroup[]>([])
  const [loading, setLoading] = useState(true)

  const loadRecent = useCallback(async () => {
    try {
      const { data } = await studioApi.recent()
      // Group by project_id
      const map = new Map<number, StudioGeneration[]>()
      for (const gen of data) {
        const pid = gen.proyecto_id
        if (!map.has(pid)) map.set(pid, [])
        map.get(pid)!.push(gen)
      }
      setGroups(Array.from(map.entries()).map(([projectId, generations]) => ({ projectId, generations })))
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="icon-badge icon-badge-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Estudio</h1>
            <p className="text-sm text-muted-foreground">
              Centro de creacion de contenido con IA
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Comienza a crear</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Abre un proyecto para comenzar a crear contenido con IA
          </p>
          <Button onClick={() => navigate(ROUTES.PROJECTS)} variant="outline" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Ver Proyectos
          </Button>
        </div>
      ) : (
        /* Project cards */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <ProjectStudioCard
              key={group.projectId}
              projectId={group.projectId}
              generations={group.generations}
              onOpen={() => window.open(ROUTES.ESTUDIO_PROJECT(group.projectId), '_blank')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectStudioCard({
  projectId,
  generations,
  onOpen,
}: {
  projectId: number
  generations: StudioGeneration[]
  onOpen: () => void
}) {
  const completedImages = generations.filter((g) => g.estado === 'complete' && g.tipo === 'image')
  const latestImages = completedImages.slice(0, 4)

  return (
    <div className="card-modern overflow-hidden hover:border-primary/50 transition-all">
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 gap-0.5 bg-muted/20">
        {latestImages.map((gen) => (
          <div key={gen.id} className="aspect-square bg-muted/30">
            {gen.url_salida ? (
              <img src={gen.url_salida} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
          </div>
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: Math.max(0, 4 - latestImages.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Proyecto #{projectId}</p>
          <p className="text-xs text-muted-foreground">
            {generations.length} generacion{generations.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={onOpen}>
          Ir al Estudio
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

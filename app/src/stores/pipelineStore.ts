import { create } from 'zustand'
import { toast } from 'sonner'
import { pipelineApi, type Pipeline, type PipelineScene } from '@/services/api'

export type PipelineStatus =
  | 'draft' | 'analyzing' | 'planned' | 'generating'
  | 'review' | 'approved' | 'exporting' | 'exported'

export type UIStage = 'idle' | 'brief' | 'planned' | 'generating' | 'review' | 'export'

const stageOrder: UIStage[] = ['idle', 'brief', 'planned', 'generating', 'review', 'export']

function toUIStage(status: string | null): UIStage {
  if (!status) return 'idle'
  const map: Record<string, UIStage> = {
    draft: 'idle',
    analyzing: 'brief',
    planned: 'planned',
    generating: 'generating',
    review: 'review',
    approved: 'export',
    exporting: 'export',
    exported: 'export',
  }
  return map[status] ?? 'idle'
}

interface PipelineStore {
  pipeline: Pipeline | null
  currentStage: UIStage
  activeSceneId: number | null
  isLoading: boolean
  error: string | null
  exportProgress: { step: number; total: number } | null
  exportedMediaIds: number[]

  initPipeline: (projectId: number) => Promise<void>
  startPipeline: (projectId: number, briefOverride?: string, referenceImageUrls?: string[]) => Promise<void>
  generateScenes: (sceneIds?: number[], quality?: string) => Promise<void>
  submitRevision: (sceneId: number, feedback: string) => Promise<void>
  approveScene: (sceneId: number) => Promise<void>
  exportPipeline: (format?: string) => Promise<void>
  setActiveScene: (sceneId: number) => void
  setStage: (stage: UIStage) => void
  canGoToStage: (stage: UIStage) => boolean
  updateSceneFromWS: (sceneId: number, updates: Partial<PipelineScene>) => void
  setPipelineStatus: (status: string) => void
  setExportProgress: (progress: { step: number; total: number } | null) => void
  setExportComplete: (mediaIds: number[]) => void
  updateScene: (sceneId: number, updates: Partial<PipelineScene>) => void
  updateSceneRemote: (sceneId: number, data: Partial<{ description: string; veo_prompt: string; duration_sec: number; aspect_ratio: string }>) => Promise<void>
  updateSceneLocally: (sceneId: number, updates: Partial<PipelineScene>) => void
  revertPrompt: (sceneId: number, historicalPrompt: string) => Promise<void>
  addScene: (pipelineId: number, data: { description: string; veo_prompt?: string; duration_sec?: number; aspect_ratio?: string }) => Promise<void>
  deleteScene: (sceneId: number) => Promise<void>
  duplicateScene: (sceneId: number) => Promise<void>
  reorderScenes: (sceneIds: number[]) => Promise<void>
  generateSingleScene: (sceneId: number, quality?: string) => Promise<void>
  cancelGeneration: (pipelineId: number) => Promise<void>
  setSceneReferenceAsset: (sceneId: number, assetId: number | null) => Promise<void>
  reloadPipeline: () => Promise<void>
  reset: () => void
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  pipeline: null,
  currentStage: 'idle',
  activeSceneId: null,
  isLoading: false,
  error: null,
  exportProgress: null,
  exportedMediaIds: [],

  initPipeline: async (projectId) => {
    try {
      const { data } = await pipelineApi.getByProject(projectId)
      set({ pipeline: data, currentStage: toUIStage(data.estado) })
    } catch {
      // No existing pipeline — stay idle
    }
  },

  startPipeline: async (projectId, briefOverride, referenceImageUrls) => {
    set({ isLoading: true, currentStage: 'brief', error: null })
    try {
      const { data } = await pipelineApi.start({
        project_id: projectId,
        brief_override: briefOverride,
        reference_image_urls: referenceImageUrls?.length ? referenceImageUrls : undefined,
      })
      set({
        pipeline: data,
        currentStage: toUIStage(data.estado),
        isLoading: false,
      })
      toast.success('Brief analizado — plan de escenas listo')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar pipeline'
      set({ error: msg, isLoading: false, currentStage: 'idle' })
      toast.error('Error al analizar brief. Revisa la configuración del LLM.')
    }
  },

  generateScenes: async (sceneIds, quality = 'veo-3.1-fast') => {
    const { pipeline } = get()
    if (!pipeline) return
    set({ isLoading: true })
    try {
      await pipelineApi.generate(pipeline.id, { scene_ids: sceneIds ?? null, quality })
      set({ currentStage: 'generating', isLoading: false })
    } catch {
      set({ isLoading: false })
      toast.error('Error al generar escenas')
    }
  },

  submitRevision: async (sceneId, feedback) => {
    const { pipeline } = get()
    if (!pipeline) return
    await pipelineApi.revise(pipeline.id, { scene_id: sceneId, feedback, regenerate: true })
    get().updateSceneFromWS(sceneId, { estado: 'generating' })
  },

  approveScene: async (sceneId) => {
    await pipelineApi.approveScene(sceneId)
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            escenas: state.pipeline.escenas.map((s) =>
              s.id === sceneId ? { ...s, aprobado: true, estado: 'approved' as const } : s
            ),
          }
        : null,
    }))
  },

  exportPipeline: async (format = 'mp4') => {
    const { pipeline } = get()
    if (!pipeline) return
    set({ isLoading: true, exportProgress: null, exportedMediaIds: [], error: null })
    try {
      await pipelineApi.exportPipeline(pipeline.id, { format })
      set((state) => ({
        currentStage: 'export',
        pipeline: state.pipeline ? { ...state.pipeline, estado: 'exporting' } : null,
      }))
      toast.success('Exportación iniciada — los videos se enviarán al CRM')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al exportar pipeline'
      set({ isLoading: false, error: msg })
      toast.error('Error al iniciar la exportación')
    }
  },

  setActiveScene: (sceneId) => set({ activeSceneId: sceneId }),

  setStage: (stage) => set({ currentStage: stage }),

  canGoToStage: (stage) => {
    const { pipeline, currentStage } = get()
    const targetIdx = stageOrder.indexOf(stage)
    const currentIdx = stageOrder.indexOf(currentStage)
    // Can always go back to completed steps
    if (targetIdx <= currentIdx) return true
    // Can't skip forward unless pipeline data supports it
    if (!pipeline) return stage === 'idle'
    return false
  },

  updateSceneFromWS: (sceneId, updates) => {
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            escenas: state.pipeline.escenas.map((s) =>
              s.id === sceneId ? { ...s, ...updates } : s
            ),
          }
        : null,
    }))
  },

  setPipelineStatus: (status) => {
    set((state) => ({
      pipeline: state.pipeline ? { ...state.pipeline, estado: status } : null,
      currentStage: toUIStage(status),
    }))
  },

  setExportProgress: (progress) => {
    set({ exportProgress: progress })
  },

  setExportComplete: (mediaIds) => {
    set({
      exportedMediaIds: mediaIds,
      exportProgress: null,
      isLoading: false,
    })
    toast.success('Videos exportados al CRM exitosamente')
  },

  updateScene: (sceneId, updates) => {
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            escenas: state.pipeline.escenas.map((s) =>
              s.id === sceneId ? { ...s, ...updates } : s
            ),
          }
        : null,
    }))
  },

  updateSceneRemote: async (sceneId, data) => {
    try {
      await pipelineApi.updateScene(sceneId, data)
    } catch {
      toast.error('Error al guardar los cambios de la escena')
    }
  },

  updateSceneLocally: (sceneId, updates) => {
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            escenas: state.pipeline.escenas.map((s) =>
              s.id === sceneId ? { ...s, ...updates } : s
            ),
          }
        : null,
    }))
  },

  revertPrompt: async (sceneId, historicalPrompt) => {
    try {
      await pipelineApi.updateScene(sceneId, { veo_prompt: historicalPrompt })
      set((state) => ({
        pipeline: state.pipeline
          ? {
              ...state.pipeline,
              escenas: state.pipeline.escenas.map((s) =>
                s.id === sceneId
                  ? { ...s, veo_prompt: historicalPrompt, estado: 'pending' as const }
                  : s
              ),
            }
          : null,
      }))
      toast.success('Prompt restaurado')
    } catch {
      toast.error('Error al restaurar prompt')
    }
  },

  addScene: async (pipelineId, data) => {
    try {
      const { data: newScene } = await pipelineApi.addScene(pipelineId, data)
      set((state) => ({
        pipeline: state.pipeline
          ? { ...state.pipeline, escenas: [...state.pipeline.escenas, newScene] }
          : null,
      }))
      toast.success('Escena agregada')
    } catch {
      toast.error('Error al agregar escena')
    }
  },

  deleteScene: async (sceneId) => {
    try {
      await pipelineApi.deleteScene(sceneId)
      set((state) => ({
        pipeline: state.pipeline
          ? {
              ...state.pipeline,
              escenas: state.pipeline.escenas
                .filter((s) => s.id !== sceneId)
                .map((s, idx) => ({ ...s, orden: idx + 1 })),
            }
          : null,
      }))
      toast.success('Escena eliminada')
    } catch {
      toast.error('Error al eliminar escena')
    }
  },

  duplicateScene: async (sceneId) => {
    try {
      const { data: newScene } = await pipelineApi.duplicateScene(sceneId)
      set((state) => {
        if (!state.pipeline) return state
        const idx = state.pipeline.escenas.findIndex((s) => s.id === sceneId)
        const escenas = [...state.pipeline.escenas]
        escenas.splice(idx + 1, 0, newScene)
        return {
          pipeline: {
            ...state.pipeline,
            escenas: escenas.map((s, i) => ({ ...s, orden: i + 1 })),
          },
        }
      })
      toast.success('Escena duplicada')
    } catch {
      toast.error('Error al duplicar escena')
    }
  },

  reorderScenes: async (sceneIds) => {
    const { pipeline } = get()
    if (!pipeline) return
    // Optimistic: reorder locally first
    set((state) => {
      if (!state.pipeline) return state
      const sceneMap = new Map(state.pipeline.escenas.map((s) => [s.id, s]))
      const reordered = sceneIds
        .map((id, idx) => {
          const scene = sceneMap.get(id)
          return scene ? { ...scene, orden: idx + 1 } : null
        })
        .filter(Boolean) as PipelineScene[]
      return {
        pipeline: { ...state.pipeline, escenas: reordered },
      }
    })
    try {
      await pipelineApi.reorderScenes(pipeline.id, sceneIds)
    } catch {
      toast.error('Error al reordenar escenas')
      await get().reloadPipeline()
    }
  },

  generateSingleScene: async (sceneId, quality = 'veo-3.1-fast') => {
    const { pipeline } = get()
    if (!pipeline) return
    try {
      await pipelineApi.generateScene(pipeline.id, sceneId, quality)
      get().updateSceneFromWS(sceneId, { estado: 'generating' })
      toast.success('Generando escena...')
    } catch {
      toast.error('Error al generar escena')
    }
  },

  cancelGeneration: async (pipelineId) => {
    try {
      await pipelineApi.cancelPipeline(pipelineId)
      // Reload from server to get accurate state
      await get().reloadPipeline()
      set({ currentStage: 'planned', isLoading: false })
      toast.success('Generacion cancelada')
    } catch {
      toast.error('Error al cancelar generacion')
    }
  },

  setSceneReferenceAsset: async (sceneId, assetId) => {
    try {
      await pipelineApi.updateScene(sceneId, { reference_asset_id: assetId })
      set((state) => ({
        pipeline: state.pipeline
          ? {
              ...state.pipeline,
              escenas: state.pipeline.escenas.map((s) =>
                s.id === sceneId ? { ...s, reference_asset_id: assetId } : s,
              ),
            }
          : null,
      }))
    } catch {
      toast.error('Error al asignar imagen de referencia')
    }
  },

  reloadPipeline: async () => {
    const { pipeline } = get()
    if (!pipeline) return
    try {
      const { data } = await pipelineApi.get(pipeline.id)
      set({ pipeline: data, currentStage: toUIStage(data.estado) })
    } catch {
      // silently fail
    }
  },

  reset: () =>
    set({
      pipeline: null,
      currentStage: 'idle',
      activeSceneId: null,
      isLoading: false,
      error: null,
      exportProgress: null,
      exportedMediaIds: [],
    }),
}))

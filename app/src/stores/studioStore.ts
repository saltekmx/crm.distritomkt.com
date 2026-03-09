import { create } from 'zustand'
import { toast } from 'sonner'
import { studioApi, type StudioGeneration } from '@/services/api'

type StudioMode = 'image-gen' | 'quick-video' | 'image-to-video' | 'campaign'

interface StudioStore {
  activeMode: StudioMode
  projectId: number | null
  generations: StudioGeneration[]
  isGenerating: boolean
  isLoading: boolean
  /** Maps childId → parentId for version chain display */
  versionMap: Record<number, number>

  setMode: (mode: StudioMode) => void
  setProjectId: (id: number) => void
  loadGenerations: (projectId: number) => Promise<void>
  generateImage: (params: {
    project_id: number
    prompt: string
    style_preset?: string | null
    aspect_ratio?: string
  }) => Promise<void>
  exportToMedia: (generationId: number) => Promise<void>
  deleteGeneration: (generationId: number) => Promise<void>
  addVersionLink: (childId: number, parentId: number) => void
  reset: () => void

  // Version chain helpers
  getChildren: (parentId: number) => number[]
  getParent: (childId: number) => number | null
  getVersionChain: (imageId: number) => number[]
  getRootAncestor: (imageId: number) => number
}

const VERSION_MAP_KEY = 'studio-version-map'

function loadVersionMap(): Record<number, number> {
  try {
    const raw = localStorage.getItem(VERSION_MAP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveVersionMap(map: Record<number, number>) {
  localStorage.setItem(VERSION_MAP_KEY, JSON.stringify(map))
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  activeMode: 'image-gen',
  projectId: null,
  generations: [],
  isGenerating: false,
  isLoading: false,
  versionMap: loadVersionMap(),

  setMode: (mode) => set({ activeMode: mode }),

  setProjectId: (id) => set({ projectId: id }),

  loadGenerations: async (projectId) => {
    set({ isLoading: true })
    try {
      const { data } = await studioApi.projectGenerations(projectId)
      set({ generations: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  generateImage: async (params) => {
    set({ isGenerating: true })
    try {
      const { data } = await studioApi.generateImage(params)
      set((state) => ({
        generations: [data, ...state.generations],
        isGenerating: false,
      }))
      if (data.estado === 'complete') {
        toast.success('Imagen generada exitosamente')
      } else if (data.estado === 'failed') {
        toast.error(data.mensaje_error || 'Error al generar imagen')
      }
    } catch {
      set({ isGenerating: false })
      toast.error('Error al generar imagen')
    }
  },

  exportToMedia: async (generationId) => {
    try {
      const { data } = await studioApi.exportGeneration(generationId)
      toast.success(data.mensaje)
      // Update the generation in state
      set((state) => ({
        generations: state.generations.map((g) =>
          g.id === generationId ? { ...g, media_id_salida: data.media_id } : g
        ),
      }))
    } catch {
      toast.error('Error al exportar')
    }
  },

  addVersionLink: (childId, parentId) => {
    set((s) => {
      const updated = { ...s.versionMap, [childId]: parentId }
      saveVersionMap(updated)
      return { versionMap: updated }
    })
  },

  deleteGeneration: async (generationId) => {
    try {
      await studioApi.deleteGeneration(generationId)
      set((state) => ({
        generations: state.generations.filter((g) => g.id !== generationId),
      }))
      toast.success('Generacion eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  },

  // ── Version chain helpers ──────────────────────────────────────────────────

  getChildren: (parentId) => {
    const { versionMap } = get()
    return Object.entries(versionMap)
      .filter(([, parent]) => parent === parentId)
      .map(([child]) => Number(child))
  },

  getParent: (childId) => {
    return get().versionMap[childId] ?? null
  },

  getVersionChain: (imageId) => {
    const { versionMap } = get()
    // Walk up to root
    let cur = imageId
    const ancestors: number[] = []
    while (versionMap[cur]) {
      cur = versionMap[cur]
      ancestors.unshift(cur)
    }
    // Walk down from root
    const chain = [...ancestors, imageId]
    // Add children recursively
    const addChildren = (id: number) => {
      const children = Object.entries(versionMap)
        .filter(([, parent]) => parent === id)
        .map(([child]) => Number(child))
      for (const child of children) {
        if (!chain.includes(child)) {
          chain.push(child)
          addChildren(child)
        }
      }
    }
    addChildren(imageId)
    return chain
  },

  getRootAncestor: (imageId) => {
    const { versionMap } = get()
    let cur = imageId
    while (versionMap[cur]) {
      cur = versionMap[cur]
    }
    return cur
  },

  reset: () => {
    saveVersionMap({})
    set({
      activeMode: 'image-gen',
      projectId: null,
      generations: [],
      isGenerating: false,
      isLoading: false,
      versionMap: {},
    })
  },
}))

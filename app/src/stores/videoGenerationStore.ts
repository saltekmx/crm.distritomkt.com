import { create } from 'zustand'
import { videoGenApi, type StudioVideoGeneration } from '@/services/api'

export type VideoFeature = 'text2video' | 'image2video' | 'video2video' | 'motion' | 'realism'
export type VideoLeftTab = 'pipelines' | 'generate'

interface VideoGenerationState {
  generations: StudioVideoGeneration[]
  activeGenId: number | null
  isLoading: boolean
  isGenerating: boolean

  // Left-panel tab state (shared with StudioLayout via store)
  videoLeftTab: VideoLeftTab

  // Form state
  feature: VideoFeature
  prompt: string
  model: string
  durationSec: number
  aspectRatio: string
  sourceImageUrl: string | null
  sourceVideoUrl: string | null

  // Actions
  setVideoLeftTab: (tab: VideoLeftTab) => void
  setFeature: (f: VideoFeature) => void
  setPrompt: (p: string) => void
  setModel: (m: string) => void
  setDurationSec: (d: number) => void
  setAspectRatio: (a: string) => void
  setSourceImageUrl: (u: string | null) => void
  setSourceVideoUrl: (u: string | null) => void
  setActiveGen: (id: number | null) => void

  loadGenerations: (projectId: number) => Promise<void>
  generate: (projectId: number) => Promise<void>
  deleteGeneration: (genId: number) => Promise<void>
  toggleFavorite: (genId: number) => Promise<void>
  handleWsMessage: (msg: Record<string, unknown>) => void
}

export const useVideoGenerationStore = create<VideoGenerationState>((set, get) => ({
  generations: [],
  activeGenId: null,
  isLoading: false,
  isGenerating: false,

  videoLeftTab: 'pipelines',

  feature: 'text2video',
  prompt: '',
  model: 'vidu/q3',
  durationSec: 5,
  aspectRatio: '16:9',
  sourceImageUrl: null,
  sourceVideoUrl: null,

  setVideoLeftTab: (tab) => set({ videoLeftTab: tab }),
  setFeature: (f) => set({ feature: f }),
  setPrompt: (p) => set({ prompt: p }),
  setModel: (m) => set({ model: m }),
  setDurationSec: (d) => set({ durationSec: d }),
  setAspectRatio: (a) => set({ aspectRatio: a }),
  setSourceImageUrl: (u) => set({ sourceImageUrl: u }),
  setSourceVideoUrl: (u) => set({ sourceVideoUrl: u }),
  setActiveGen: (id) => set({ activeGenId: id }),

  loadGenerations: async (projectId) => {
    set({ isLoading: true })
    try {
      const { data } = await videoGenApi.list(projectId)
      set({ generations: data })
    } finally {
      set({ isLoading: false })
    }
  },

  generate: async (projectId) => {
    const s = get()
    set({ isGenerating: true })
    try {
      const { data } = await videoGenApi.generate({
        project_id: projectId,
        feature: s.feature,
        prompt: s.prompt,
        model: s.model,
        duration_sec: s.durationSec,
        aspect_ratio: s.aspectRatio,
        source_image_url: s.sourceImageUrl,
        source_video_url: s.sourceVideoUrl,
      })
      set((st) => ({ generations: [data, ...st.generations], activeGenId: data.id }))
    } finally {
      set({ isGenerating: false })
    }
  },

  deleteGeneration: async (genId) => {
    await videoGenApi.delete(genId)
    set((s) => ({ generations: s.generations.filter((g) => g.id !== genId) }))
  },

  toggleFavorite: async (genId) => {
    const { data } = await videoGenApi.toggleFavorite(genId)
    set((s) => ({
      generations: s.generations.map((g) =>
        g.id === genId ? { ...g, is_favorito: data.is_favorito } : g
      ),
    }))
  },

  handleWsMessage: (msg) => {
    if (msg.type === 'video_gen_complete') {
      set((s) => ({
        generations: s.generations.map((g) =>
          g.id === (msg.generation_id as number)
            ? {
                ...g,
                estado: 'complete' as const,
                url_video: msg.video_url as string,
                url_thumbnail: msg.thumbnail_url as string,
              }
            : g
        ),
      }))
    } else if (msg.type === 'video_gen_failed') {
      set((s) => ({
        generations: s.generations.map((g) =>
          g.id === (msg.generation_id as number)
            ? { ...g, estado: 'failed' as const, mensaje_error: msg.error as string }
            : g
        ),
      }))
    }
  },
}))

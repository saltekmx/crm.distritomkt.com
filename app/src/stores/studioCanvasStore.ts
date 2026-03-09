import type React from 'react'
import { create } from 'zustand'

// ─── Types ───────────────────────────────────────────────────────────────────

export type EditType =
  | 'flip-h'
  | 'flip-v'
  | 'rotate'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'crop'

export type CropRect = { x: number; y: number; w: number; h: number }

export type AspectPreset = 'free' | '1:1' | '16:9' | '9:16'

export type CanvasBg = 'dark' | 'checker' | 'light'

export interface CanvasEdit {
  type: EditType
  value: number | CropRect // number for angles/filter values, CropRect for crop
}

export type PanValue = { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })

// ─── Per-Image State ────────────────────────────────────────────────────────

export interface ImageCanvasState {
  edits: CanvasEdit[]
  undoneEdits: CanvasEdit[]
  isCropping: boolean
  cropAspect: AspectPreset
  zoom: number
  pan: { x: number; y: number }
  bg: CanvasBg
}

function createDefaultState(): ImageCanvasState {
  return {
    edits: [],
    undoneEdits: [],
    isCropping: false,
    cropAspect: 'free',
    zoom: 1,
    pan: { x: 0, y: 0 },
    bg: 'dark',
  }
}

// ─── Dashboard State ────────────────────────────────────────────────────────

interface DashboardState {
  dashboardZoom: number
  dashboardPan: { x: number; y: number }
  imagePositions: Map<number, { x: number; y: number }>
}

// ─── Store Interface ────────────────────────────────────────────────────────

interface StudioCanvasStore extends DashboardState {
  imageStates: Map<number, ImageCanvasState>

  getImageState: (imageId: number) => ImageCanvasState
  getTransformStyle: (imageId: number) => React.CSSProperties

  // All mutations take imageId as first param
  addEdit: (imageId: number, edit: CanvasEdit) => void
  undo: (imageId: number) => void
  redo: (imageId: number) => void
  canUndo: (imageId: number) => boolean
  canRedo: (imageId: number) => boolean
  setCropping: (imageId: number, v: boolean) => void
  setCropAspect: (imageId: number, preset: AspectPreset) => void
  resetEdits: (imageId: number) => void
  setZoom: (imageId: number, zoom: number | ((prev: number) => number)) => void
  setPan: (imageId: number, pan: PanValue) => void
  setBg: (imageId: number, bg: CanvasBg) => void

  removeImageState: (imageId: number) => void
  clearAll: () => void

  // Dashboard
  setDashboardZoom: (zoom: number) => void
  setDashboardPan: (pan: { x: number; y: number }) => void
  setImagePosition: (imageId: number, pos: { x: number; y: number }) => void
  autoArrangeImages: (imageIds: number[]) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a slider value in [-100, +100] to a CSS filter multiplier.
 * -100 -> 0.0, 0 -> 1.0, +100 -> 2.0
 */
function sliderToFilterValue(v: number): number {
  return 1 + v / 100
}

/**
 * Compute CSS properties from the current edit stack.
 */
function computeStyle(edits: CanvasEdit[]): React.CSSProperties {
  let scaleX = 1
  let scaleY = 1
  let rotation = 0
  let brightness: number | null = null
  let contrast: number | null = null
  let saturation: number | null = null

  for (const edit of edits) {
    switch (edit.type) {
      case 'flip-h':
        scaleX *= -1
        break
      case 'flip-v':
        scaleY *= -1
        break
      case 'rotate':
        rotation += edit.value as number
        break
      case 'brightness':
        brightness = edit.value as number
        break
      case 'contrast':
        contrast = edit.value as number
        break
      case 'saturation':
        saturation = edit.value as number
        break
      // crop is stored but not applied via CSS
    }
  }

  const transforms: string[] = []
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`)
  }
  if (rotation !== 0) {
    transforms.push(`rotate(${rotation}deg)`)
  }

  const filters: string[] = []
  if (brightness !== null && brightness !== 0) {
    filters.push(`brightness(${sliderToFilterValue(brightness)})`)
  }
  if (contrast !== null && contrast !== 0) {
    filters.push(`contrast(${sliderToFilterValue(contrast)})`)
  }
  if (saturation !== null && saturation !== 0) {
    filters.push(`saturate(${sliderToFilterValue(saturation)})`)
  }

  const style: React.CSSProperties = {}
  if (transforms.length > 0) {
    style.transform = transforms.join(' ')
  }
  if (filters.length > 0) {
    style.filter = filters.join(' ')
  }

  return style
}

/** Helper: update a single image's state within the Map */
function updateImageState(
  imageStates: Map<number, ImageCanvasState>,
  imageId: number,
  updater: (state: ImageCanvasState) => Partial<ImageCanvasState>,
): Map<number, ImageCanvasState> {
  const current = imageStates.get(imageId) ?? createDefaultState()
  const updated = { ...current, ...updater(current) }
  const next = new Map(imageStates)
  next.set(imageId, updated)
  return next
}

// ─── Zustand Store ──────────────────────────────────────────────────────────

export const useStudioCanvasStore = create<StudioCanvasStore>((set, get) => ({
  imageStates: new Map(),

  // Dashboard state
  dashboardZoom: 1,
  dashboardPan: { x: 0, y: 0 },
  imagePositions: new Map(),

  getImageState: (imageId) => {
    return get().imageStates.get(imageId) ?? createDefaultState()
  },

  getTransformStyle: (imageId) => {
    const state = get().imageStates.get(imageId) ?? createDefaultState()
    return computeStyle(state.edits)
  },

  addEdit: (imageId, edit) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, (state) => ({
        edits: [...state.edits, edit],
        undoneEdits: [],
      })),
    }))
  },

  undo: (imageId) => {
    const state = get().getImageState(imageId)
    if (state.edits.length === 0) return
    const last = state.edits[state.edits.length - 1]
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, (st) => ({
        edits: st.edits.slice(0, -1),
        undoneEdits: [...st.undoneEdits, last],
      })),
    }))
  },

  redo: (imageId) => {
    const state = get().getImageState(imageId)
    if (state.undoneEdits.length === 0) return
    const last = state.undoneEdits[state.undoneEdits.length - 1]
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, (st) => ({
        edits: [...st.edits, last],
        undoneEdits: st.undoneEdits.slice(0, -1),
      })),
    }))
  },

  canUndo: (imageId) => {
    const state = get().imageStates.get(imageId)
    return state ? state.edits.length > 0 : false
  },

  canRedo: (imageId) => {
    const state = get().imageStates.get(imageId)
    return state ? state.undoneEdits.length > 0 : false
  },

  setCropping: (imageId, v) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, () => ({ isCropping: v })),
    }))
  },

  setCropAspect: (imageId, preset) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, () => ({ cropAspect: preset })),
    }))
  },

  resetEdits: (imageId) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, () => ({
        edits: [],
        undoneEdits: [],
        isCropping: false,
        cropAspect: 'free' as AspectPreset,
      })),
    }))
  },

  setZoom: (imageId, zoom) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, (state) => ({
        zoom: typeof zoom === 'function' ? zoom(state.zoom) : zoom,
      })),
    }))
  },

  setPan: (imageId, pan) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, (state) => ({
        pan: typeof pan === 'function' ? pan(state.pan) : pan,
      })),
    }))
  },

  setBg: (imageId, bg) => {
    set((s) => ({
      imageStates: updateImageState(s.imageStates, imageId, () => ({ bg })),
    }))
  },

  removeImageState: (imageId) => {
    set((s) => {
      const next = new Map(s.imageStates)
      next.delete(imageId)
      return { imageStates: next }
    })
  },

  clearAll: () => {
    set({
      imageStates: new Map(),
      dashboardZoom: 1,
      dashboardPan: { x: 0, y: 0 },
      imagePositions: new Map(),
    })
  },

  // Dashboard
  setDashboardZoom: (zoom) => set({ dashboardZoom: zoom }),
  setDashboardPan: (pan) => set({ dashboardPan: pan }),

  setImagePosition: (imageId, pos) => {
    set((s) => {
      const next = new Map(s.imagePositions)
      next.set(imageId, pos)
      return { imagePositions: next }
    })
  },

  autoArrangeImages: (imageIds) => {
    const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(imageIds.length))))
    const cardW = 240
    const cardH = 280
    const gap = 40
    const next = new Map<number, { x: number; y: number }>()

    imageIds.forEach((id, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      next.set(id, {
        x: col * (cardW + gap),
        y: row * (cardH + gap),
      })
    })

    set({ imagePositions: next, dashboardZoom: 1, dashboardPan: { x: 40, y: 40 } })
  },
}))

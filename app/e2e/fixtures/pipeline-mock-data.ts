/**
 * Shared mock data for Video Pipeline E2E tests.
 *
 * Shapes mirror:
 *   - api.distritomkt.com/app/pipeline/ schemas
 *   - src/services/api.ts (Pipeline, PipelineScene, PipelineAsset)
 *   - src/constants/pipeline.ts (STATUS_CONFIG)
 */

// ---------------------------------------------------------------------------
// PipelineScene
// ---------------------------------------------------------------------------

export interface MockPipelineScene {
  id: number
  pipeline_id: number
  orden: number
  descripcion: string | null
  veo_prompt: string | null
  historial_prompts: Array<Record<string, unknown>>
  reference_asset_id: number | null
  video_url: string | null
  thumbnail_url: string | null
  duracion_seg: number
  aspect_ratio: string
  aprobado: boolean
  estado: 'pending' | 'generating' | 'complete' | 'failed' | 'approved'
  elapsed_sec?: number
  actualizado_en: string
}

const now = new Date().toISOString()

export function makeScene(overrides: Partial<MockPipelineScene> = {}): MockPipelineScene {
  return {
    id: 1,
    pipeline_id: 100,
    orden: 1,
    descripcion: 'Toma cinematica de apertura con logo animado',
    veo_prompt: 'Cinematic opening shot with animated logo, smooth camera pan, dramatic lighting',
    historial_prompts: [],
    reference_asset_id: null,
    video_url: null,
    thumbnail_url: null,
    duracion_seg: 6,
    aspect_ratio: '16:9',
    aprobado: false,
    estado: 'pending',
    actualizado_en: now,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface MockPipeline {
  id: number
  proyecto_id: number
  estado: string
  brief_snapshot: string | null
  guia_estilo: Record<string, unknown> | null
  escenas: MockPipelineScene[]
  creado_en: string
  actualizado_en: string
}

export function makePipeline(overrides: Partial<MockPipeline> = {}): MockPipeline {
  return {
    id: 100,
    proyecto_id: 1,
    estado: 'draft',
    brief_snapshot: null,
    guia_estilo: null,
    escenas: [makeScene()],
    creado_en: now,
    actualizado_en: now,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Pre-built pipeline states for each stage
// ---------------------------------------------------------------------------

/** Idle: no pipeline exists for the project */
export const PIPELINE_IDLE = null

/** Brief/analyzing: pipeline just started, AI is planning scenes */
export const PIPELINE_ANALYZING = makePipeline({
  estado: 'analyzing',
  brief_snapshot: 'Video corporativo para campainha de verano, tono moderno y dinamico',
  escenas: [],
})

/** Planned: AI has created a scene plan, ready for generation */
export const PIPELINE_PLANNED = makePipeline({
  estado: 'planned',
  brief_snapshot: 'Video corporativo para campainha de verano, tono moderno y dinamico',
  guia_estilo: {
    mood: 'Energico y moderno',
    palette: 'Colores vibrantes con acentos neon',
    pacing: 'Ritmo rapido con transiciones suaves',
  },
  escenas: [
    makeScene({
      id: 201,
      orden: 1,
      descripcion: 'Toma de apertura con logo animado sobre fondo degradado',
      veo_prompt: 'Cinematic opening shot, animated logo reveal on gradient background, smooth camera push-in, dramatic backlight, 4K quality',
      duracion_seg: 4,
      aspect_ratio: '16:9',
    }),
    makeScene({
      id: 202,
      orden: 2,
      descripcion: 'Producto hero shot con iluminacion de estudio',
      veo_prompt: 'Product hero shot, studio lighting with rim light, slow rotation, clean white background, commercial quality',
      duracion_seg: 6,
      aspect_ratio: '16:9',
    }),
    makeScene({
      id: 203,
      orden: 3,
      descripcion: 'Montaje de lifestyle mostrando el producto en uso',
      veo_prompt: 'Lifestyle montage, product in use, warm natural lighting, shallow depth of field, authentic feel, editorial style',
      duracion_seg: 8,
      aspect_ratio: '16:9',
    }),
    makeScene({
      id: 204,
      orden: 4,
      descripcion: 'Cierre con call to action y logo',
      veo_prompt: 'Closing shot with call-to-action text overlay, logo lockup, elegant fade out, brand colors, professional finish',
      duracion_seg: 4,
      aspect_ratio: '16:9',
    }),
  ],
})

/** Generating: some scenes pending, some generating, some complete */
export const PIPELINE_GENERATING = makePipeline({
  estado: 'generating',
  brief_snapshot: 'Video corporativo para campainha de verano',
  guia_estilo: {
    mood: 'Energico y moderno',
    palette: 'Colores vibrantes',
    pacing: 'Ritmo rapido',
  },
  escenas: [
    makeScene({
      id: 201,
      orden: 1,
      estado: 'complete',
      descripcion: 'Toma de apertura con logo animado',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+1',
      thumbnail_url: 'https://placehold.co/320x180?text=Scene+1',
      duracion_seg: 4,
    }),
    makeScene({
      id: 202,
      orden: 2,
      estado: 'generating',
      descripcion: 'Producto hero shot',
      elapsed_sec: 45,
      duracion_seg: 6,
    }),
    makeScene({
      id: 203,
      orden: 3,
      estado: 'pending',
      descripcion: 'Montaje de lifestyle',
      duracion_seg: 8,
    }),
    makeScene({
      id: 204,
      orden: 4,
      estado: 'failed',
      descripcion: 'Cierre con call to action',
      duracion_seg: 4,
    }),
  ],
})

/** Review: all scenes complete, waiting for approval */
export const PIPELINE_REVIEW = makePipeline({
  estado: 'review',
  brief_snapshot: 'Video corporativo para campainha de verano',
  guia_estilo: {
    mood: 'Energico y moderno',
    palette: 'Colores vibrantes',
    pacing: 'Ritmo rapido',
  },
  escenas: [
    makeScene({
      id: 201,
      orden: 1,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Toma de apertura con logo animado',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+1',
      thumbnail_url: 'https://placehold.co/320x180?text=Scene+1',
      duracion_seg: 4,
    }),
    makeScene({
      id: 202,
      orden: 2,
      estado: 'complete',
      aprobado: false,
      descripcion: 'Producto hero shot',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+2',
      thumbnail_url: 'https://placehold.co/320x180?text=Scene+2',
      duracion_seg: 6,
    }),
    makeScene({
      id: 203,
      orden: 3,
      estado: 'complete',
      aprobado: false,
      descripcion: 'Montaje de lifestyle',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+3',
      thumbnail_url: 'https://placehold.co/320x180?text=Scene+3',
      duracion_seg: 8,
    }),
  ],
})

/** Review: ALL scenes approved -- shows "Continuar a Exportar" */
export const PIPELINE_ALL_APPROVED = makePipeline({
  estado: 'review',
  brief_snapshot: 'Video corporativo para campainha de verano',
  escenas: [
    makeScene({
      id: 201,
      orden: 1,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Toma de apertura',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+1',
      duracion_seg: 4,
    }),
    makeScene({
      id: 202,
      orden: 2,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Producto hero shot',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+2',
      duracion_seg: 6,
    }),
  ],
})

/** Export (approved): ready to export */
export const PIPELINE_EXPORT_READY = makePipeline({
  estado: 'approved',
  brief_snapshot: 'Video corporativo para campainha de verano',
  escenas: [
    makeScene({
      id: 201,
      orden: 1,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Toma de apertura',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+1',
      duracion_seg: 4,
    }),
    makeScene({
      id: 202,
      orden: 2,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Producto hero shot',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+2',
      duracion_seg: 6,
    }),
  ],
})

/** Exported: pipeline fully exported */
export const PIPELINE_EXPORTED = makePipeline({
  estado: 'exported',
  brief_snapshot: 'Video corporativo para campainha de verano',
  escenas: [
    makeScene({
      id: 201,
      orden: 1,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Toma de apertura',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+1',
      duracion_seg: 4,
    }),
    makeScene({
      id: 202,
      orden: 2,
      estado: 'approved',
      aprobado: true,
      descripcion: 'Producto hero shot',
      video_url: 'https://placehold.co/1920x1080.mp4?text=Scene+2',
      duracion_seg: 6,
    }),
  ],
})

// ---------------------------------------------------------------------------
// PipelineAsset
// ---------------------------------------------------------------------------

export interface MockPipelineAsset {
  id: number
  url_archivo: string
  nombre_archivo: string | null
  tipo_asset: string
  descripcion_ia: string | null
  creado_en: string
}

export const MOCK_PIPELINE_ASSETS: MockPipelineAsset[] = [
  {
    id: 501,
    url_archivo: 'https://placehold.co/512x512?text=Asset+1',
    nombre_archivo: 'referencia-marca.png',
    tipo_asset: 'reference',
    descripcion_ia: 'Logo de la marca sobre fondo blanco',
    creado_en: now,
  },
  {
    id: 502,
    url_archivo: 'https://placehold.co/512x512?text=Asset+2',
    nombre_archivo: 'producto-hero.jpg',
    tipo_asset: 'reference',
    descripcion_ia: 'Foto de producto principal',
    creado_en: now,
  },
]

// ---------------------------------------------------------------------------
// Video Models (returned by GET /api/v1/pipeline/video-models)
// ---------------------------------------------------------------------------

export const MOCK_VIDEO_MODELS = [
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    description: 'Generacion rapida de video',
    max_duration: 8,
    supported_aspect_ratios: ['16:9', '9:16', '1:1', '4:5'],
  },
  {
    id: 'veo-3.1',
    name: 'Veo 3.1 HQ',
    description: 'Alta calidad, mas tiempo de generacion',
    max_duration: 8,
    supported_aspect_ratios: ['16:9', '9:16', '1:1', '4:5'],
  },
]

// ---------------------------------------------------------------------------
// WebSocket message builders
// ---------------------------------------------------------------------------

export function buildSceneCompleteMessage(sceneId: number, videoUrl: string) {
  return JSON.stringify({
    type: 'scene_complete',
    scene_id: sceneId,
    video_url: videoUrl,
    thumbnail_url: videoUrl.replace('.mp4', '.jpg'),
  })
}

export function buildSceneFailedMessage(sceneId: number) {
  return JSON.stringify({
    type: 'scene_failed',
    scene_id: sceneId,
    error: 'Generation failed due to content policy',
  })
}

export function buildSceneStatusMessage(sceneId: number, status: string, elapsedSec?: number) {
  return JSON.stringify({
    type: 'scene_status',
    scene_id: sceneId,
    status,
    elapsed_sec: elapsedSec ?? 0,
  })
}

export function buildPipelineStatusMessage(status: string) {
  return JSON.stringify({
    type: 'pipeline_status',
    status,
  })
}

export function buildExportProgressMessage(step: number, total: number) {
  return JSON.stringify({
    type: 'export_progress',
    step,
    total,
  })
}

export function buildExportCompleteMessage(mediaIds: number[]) {
  return JSON.stringify({
    type: 'export_complete',
    media_ids: mediaIds,
  })
}

export function buildExportFailedMessage(error: string) {
  return JSON.stringify({
    type: 'export_failed',
    error,
  })
}

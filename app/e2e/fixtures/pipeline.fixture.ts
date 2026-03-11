/**
 * Custom test fixture that extends the base Playwright test with Pipeline API mocking.
 *
 * Re-exports and extends the pipeline fixture from `./pipeline.ts`, providing
 * a single import point for spec files:
 *
 *   import { test, expect, makeScene, makePipeline } from '../fixtures/pipeline.fixture'
 *
 * This file adds:
 *   - WebSocket mock helper (intercept WS connections)
 *   - Convenience re-exports of all mock data factories and pre-built states
 *   - Type-safe fixtures for setPipelineState and pipelinePage
 *
 * Route mocking covers:
 *   GET  /pipeline/project/:id       -> returns mock pipeline
 *   POST /pipeline/                   -> returns created pipeline
 *   POST /pipeline/:id/generate       -> returns success
 *   PATCH /pipeline/scenes/:id        -> returns updated scene
 *   POST /pipeline/scenes/:id/approve -> returns approved scene
 *   POST /pipeline/:id/export         -> returns export result
 *
 * All route mocking logic is implemented in `./pipeline.ts`. This file acts
 * as a stable public API surface.
 */

// Re-export the test fixture and expect from the pipeline fixture module
export { test, expect } from './pipeline'
export type { PipelineFixtures } from './pipeline'

// Re-export mock data factories
export { makeScene, makePipeline } from './pipeline'
export { makeScene as createMockScene, makePipeline as createMockPipeline } from './pipeline-mock-data'

// Re-export pre-built pipeline states
export {
  PIPELINE_IDLE,
  PIPELINE_ANALYZING,
  PIPELINE_PLANNED,
  PIPELINE_GENERATING,
  PIPELINE_REVIEW,
  PIPELINE_ALL_APPROVED,
  PIPELINE_EXPORT_READY,
  PIPELINE_EXPORTED,
  MOCK_PIPELINE_ASSETS,
  MOCK_VIDEO_MODELS,
} from './pipeline-mock-data'

// Re-export mock data types
export type {
  MockPipeline,
  MockPipelineScene,
  MockPipelineAsset,
} from './pipeline-mock-data'

// Re-export WebSocket message builders
export {
  buildSceneCompleteMessage,
  buildSceneFailedMessage,
  buildSceneStatusMessage,
  buildPipelineStatusMessage,
  buildExportProgressMessage,
  buildExportCompleteMessage,
  buildExportFailedMessage,
} from './pipeline-mock-data'

// ---------------------------------------------------------------------------
// Mock data factory convenience wrappers (matching the interface names from
// the spec requirements)
// ---------------------------------------------------------------------------

import { makePipeline, makeScene } from './pipeline-mock-data'
import type { MockPipeline, MockPipelineScene } from './pipeline-mock-data'

/**
 * Create multiple mock scenes with sequential orden values.
 * Each scene gets a unique ID and incremental orden.
 */
export function createMockScenes(count: number): MockPipelineScene[] {
  const descriptions = [
    'Zapato emerge del vacio negro',
    'Camara orbita 180 grados alrededor del zapato',
    'Macro suela, pull back a hero shot',
    'Close-up de detalles del material',
    'Montaje lifestyle con modelo',
    'Cierre con logo y call to action',
    'Toma aerea de producto en contexto',
    'Transicion fluida entre variantes de color',
  ]

  return Array.from({ length: count }, (_, i) =>
    makeScene({
      id: 1000 + i + 1,
      orden: i + 1,
      descripcion: descriptions[i % descriptions.length],
      veo_prompt: `Cinematic shot ${i + 1}: ${descriptions[i % descriptions.length]}, professional lighting, 4K quality`,
      duracion_seg: [4, 6, 8][i % 3],
    })
  )
}

// ---------------------------------------------------------------------------
// Pre-built states matching the spec requirements
// ---------------------------------------------------------------------------

/** Pipeline with 3 scenes in planned state (zapato theme) */
export const PIPELINE_WITH_SCENES = makePipeline({
  estado: 'planned',
  brief_snapshot: 'Video comercial para zapato deportivo premium',
  guia_estilo: {
    mood: 'Moderno y atletico',
    palette: 'Negro, blanco, acento neon',
    pacing: 'Ritmo dinamico con pausas dramaticas',
  },
  escenas: [
    makeScene({
      id: 901,
      orden: 1,
      estado: 'pending',
      descripcion: 'Zapato emerge del vacio negro',
      veo_prompt: 'Shoe emerging from black void, dramatic reveal, volumetric lighting, slow motion, 4K',
      duracion_seg: 4,
    }),
    makeScene({
      id: 902,
      orden: 2,
      estado: 'pending',
      descripcion: 'Camara orbita 180 grados alrededor del zapato',
      veo_prompt: '180 degree orbit around shoe, studio lighting, seamless rotation, commercial quality',
      duracion_seg: 6,
    }),
    makeScene({
      id: 903,
      orden: 3,
      estado: 'pending',
      descripcion: 'Macro suela, pull back a hero shot',
      veo_prompt: 'Macro shot of sole texture, smooth pull back revealing full shoe hero shot, shallow DOF',
      duracion_seg: 8,
    }),
  ],
})

// ---------------------------------------------------------------------------
// WebSocket Mock Helper
// ---------------------------------------------------------------------------

import type { Page } from '@playwright/test'

/**
 * Helper to intercept WebSocket connections for pipeline real-time updates.
 *
 * Usage in tests:
 *   const wsMock = await interceptPipelineWebSocket(page)
 *   // WS connections to /pipeline/ws/* are now blocked
 *
 * Note: The pipeline fixture already blocks WS connections by default.
 * This helper is provided for tests that need explicit control.
 */
export async function interceptPipelineWebSocket(page: Page): Promise<void> {
  await page.route('**/pipeline/ws/**', async (route) => {
    await route.abort('connectionrefused')
  })
}

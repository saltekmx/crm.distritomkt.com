/**
 * Playwright fixture that extends the Studio fixture with Pipeline API mocking.
 *
 * Provides a `pipelinePage` fixture that:
 *   1. Mocks all pipeline REST API endpoints
 *   2. Intercepts WebSocket connections (prevents real connections)
 *   3. Navigates to Studio and switches to Video mode
 *   4. Exposes helpers for setting pipeline state mid-test
 *
 * Usage in spec files:
 *   import { test, expect } from '../fixtures/pipeline'
 *
 * Route patterns use `** /pipeline/...` to match any URL prefix (handles
 * both proxied `localhost:5174/api/v1/pipeline/...` and direct
 * `localhost:8000/api/v1/pipeline/...` URLs).
 */

import { test as studioTest, expect } from './studio'
import type { Page } from '@playwright/test'
import {
  type MockPipeline,
  type MockPipelineScene,
  PIPELINE_IDLE,
  PIPELINE_PLANNED,
  MOCK_PIPELINE_ASSETS,
  MOCK_VIDEO_MODELS,
  makeScene,
  makePipeline,
} from './pipeline-mock-data'

export { expect }

// Re-export mock data helpers for use in specs
export { makeScene, makePipeline } from './pipeline-mock-data'

export interface PipelineFixtures {
  /** Page navigated to Studio video mode with all pipeline APIs mocked */
  pipelinePage: Page
  /** Set the pipeline that GET /by-project/* returns. Call before navigation or use with reload. */
  setPipelineState: (pipeline: MockPipeline | null) => void
}

/**
 * Register a route handler for BOTH `/api/v1/pipeline/...` and `/pipeline/...`
 * URL variants to be resilient to different VITE_API_URL configurations.
 */
async function routePipeline(
  page: Page,
  suffix: string,
  handler: (route: import('@playwright/test').Route) => Promise<void>,
) {
  // Match with /api/v1/ prefix (direct API requests)
  await page.route(`**/api/v1/pipeline/${suffix}`, handler)
  // Match without /v1/ prefix (Vite proxy or alternative config)
  await page.route(`**/api/pipeline/${suffix}`, handler)
  // Match bare /pipeline/ (catch-all fallback)
  await page.route(`**/pipeline/${suffix}`, handler)
}

export const test = studioTest.extend<PipelineFixtures>({
  pipelinePage: async ({ studioPage: page }, use) => {
    // ── Mutable state that route handlers read ────────────────────────────
    let currentPipeline: MockPipeline | null = PIPELINE_IDLE

    // ── Pipeline REST API routes ──────────────────────────────────────────

    // GET /pipeline/video-models
    await routePipeline(page, 'video-models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VIDEO_MODELS),
      })
    })

    // GET /pipeline/by-project/*
    await routePipeline(page, 'by-project/*', async (route) => {
      if (currentPipeline === null) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentPipeline),
        })
      }
    })

    // POST /pipeline/start
    await routePipeline(page, 'start', async (route) => {
      const body = route.request().postDataJSON()
      const planned = makePipeline({
        ...PIPELINE_PLANNED,
        proyecto_id: body?.project_id ?? 1,
        brief_snapshot: body?.brief_override ?? 'Brief from test',
        estado: 'planned',
      })
      currentPipeline = planned
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(planned),
      })
    })

    // POST /pipeline/:id/scenes/:id/generate (single scene -- MUST register before bulk generate)
    await routePipeline(page, '*/scenes/*/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    // POST /pipeline/:id/generate (bulk)
    await routePipeline(page, '*/generate', async (route) => {
      // Skip if URL contains /scenes/ (already handled by the more specific route above)
      if (route.request().url().includes('/scenes/')) {
        await route.continue()
        return
      }
      if (currentPipeline) {
        currentPipeline = {
          ...currentPipeline,
          estado: 'generating',
          escenas: currentPipeline.escenas.map((s) => ({
            ...s,
            estado: s.estado === 'pending' ? 'generating' as const : s.estado,
          })),
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    // POST /pipeline/:id/revise
    await routePipeline(page, '*/revise', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    // PATCH /pipeline/scenes/:id/approve
    await routePipeline(page, 'scenes/*/approve', async (route) => {
      const url = route.request().url()
      const match = url.match(/\/scenes\/(\d+)\/approve/)
      const sceneId = match ? Number(match[1]) : null
      if (currentPipeline && sceneId) {
        currentPipeline = {
          ...currentPipeline,
          escenas: currentPipeline.escenas.map((s) =>
            s.id === sceneId ? { ...s, aprobado: true, estado: 'approved' as const } : s
          ),
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    // POST /pipeline/:id/export
    await routePipeline(page, '*/export', async (route) => {
      if (currentPipeline) {
        currentPipeline = { ...currentPipeline, estado: 'exporting' }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    // POST /pipeline/:id/cancel
    await routePipeline(page, '*/cancel', async (route) => {
      if (currentPipeline) {
        currentPipeline = {
          ...currentPipeline,
          estado: 'planned',
          escenas: currentPipeline.escenas.map((s) => ({
            ...s,
            estado: s.estado === 'generating' ? 'pending' as const : s.estado,
          })),
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentPipeline),
      })
    })

    // POST /pipeline/:id/scenes (add scene)
    await routePipeline(page, '*/scenes', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      // Skip if URL has more path segments after /scenes/ (not the add endpoint)
      const url = route.request().url()
      if (url.match(/\/scenes\/\d+/)) {
        await route.continue()
        return
      }
      const body = route.request().postDataJSON()
      const newScene = makeScene({
        id: Date.now(),
        pipeline_id: currentPipeline?.id ?? 100,
        orden: (currentPipeline?.escenas.length ?? 0) + 1,
        descripcion: body?.description ?? '',
        veo_prompt: body?.veo_prompt ?? '',
        duracion_seg: body?.duration_sec ?? 6,
        aspect_ratio: body?.aspect_ratio ?? '16:9',
      })
      if (currentPipeline) {
        currentPipeline = {
          ...currentPipeline,
          escenas: [...currentPipeline.escenas, newScene],
        }
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newScene),
      })
    })

    // PATCH/DELETE /pipeline/scenes/:id (update or delete scene)
    await routePipeline(page, 'scenes/*', async (route) => {
      const url = route.request().url()
      // Skip sub-resources (/approve, /duplicate, /generate, /references)
      if (url.match(/\/scenes\/\d+\/(approve|duplicate|generate|references)/)) {
        await route.continue()
        return
      }
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON()
        const match = url.match(/\/scenes\/(\d+)/)
        const sceneId = match ? Number(match[1]) : null
        let updatedScene: MockPipelineScene | null = null
        if (currentPipeline && sceneId) {
          currentPipeline = {
            ...currentPipeline,
            escenas: currentPipeline.escenas.map((s) => {
              if (s.id === sceneId) {
                const updated = {
                  ...s,
                  ...(body?.description != null ? { descripcion: body.description } : {}),
                  ...(body?.veo_prompt != null ? { veo_prompt: body.veo_prompt } : {}),
                  ...(body?.duration_sec != null ? { duracion_seg: body.duration_sec } : {}),
                  ...(body?.aspect_ratio != null ? { aspect_ratio: body.aspect_ratio } : {}),
                }
                updatedScene = updated
                return updated
              }
              return s
            }),
          }
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedScene ?? { ok: true }),
        })
      } else if (route.request().method() === 'DELETE') {
        const match = url.match(/\/scenes\/(\d+)/)
        const sceneId = match ? Number(match[1]) : null
        if (currentPipeline && sceneId) {
          currentPipeline = {
            ...currentPipeline,
            escenas: currentPipeline.escenas
              .filter((s) => s.id !== sceneId)
              .map((s, idx) => ({ ...s, orden: idx + 1 })),
          }
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
      } else {
        await route.continue()
      }
    })

    // POST /pipeline/scenes/:id/duplicate
    await routePipeline(page, 'scenes/*/duplicate', async (route) => {
      const url = route.request().url()
      const match = url.match(/\/scenes\/(\d+)\/duplicate/)
      const sceneId = match ? Number(match[1]) : null
      let newScene: MockPipelineScene | null = null
      if (currentPipeline && sceneId) {
        const original = currentPipeline.escenas.find((s) => s.id === sceneId)
        if (original) {
          newScene = {
            ...original,
            id: Date.now(),
            aprobado: false,
            estado: 'pending',
            video_url: null,
            thumbnail_url: null,
            orden: original.orden + 1,
          }
          const idx = currentPipeline.escenas.findIndex((s) => s.id === sceneId)
          const escenas = [...currentPipeline.escenas]
          escenas.splice(idx + 1, 0, newScene)
          currentPipeline = {
            ...currentPipeline,
            escenas: escenas.map((s, i) => ({ ...s, orden: i + 1 })),
          }
        }
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newScene ?? makeScene()),
      })
    })

    // PATCH /pipeline/:id/scenes/reorder
    await routePipeline(page, '*/scenes/reorder', async (route) => {
      const body = route.request().postDataJSON()
      if (currentPipeline && body?.scene_ids) {
        const sceneMap = new Map(currentPipeline.escenas.map((s) => [s.id, s]))
        const reordered = (body.scene_ids as number[])
          .map((id: number, idx: number) => {
            const scene = sceneMap.get(id)
            return scene ? { ...scene, orden: idx + 1 } : null
          })
          .filter(Boolean) as MockPipelineScene[]
        currentPipeline = { ...currentPipeline, escenas: reordered }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentPipeline?.escenas ?? []),
      })
    })

    // POST /pipeline/assets/upload
    await routePipeline(page, 'assets/upload*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PIPELINE_ASSETS[0]),
      })
    })

    // POST /pipeline/assets/import-url
    await routePipeline(page, 'assets/import-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PIPELINE_ASSETS[0]),
      })
    })

    // GET /pipeline/:id/assets
    await routePipeline(page, '*/assets', async (route) => {
      // Skip asset sub-resources
      if (route.request().url().includes('/assets/')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PIPELINE_ASSETS),
      })
    })

    // DELETE /pipeline/assets/:id
    await routePipeline(page, 'assets/*', async (route) => {
      // Skip upload and import-url (already handled above)
      if (route.request().url().includes('/upload') || route.request().url().includes('/import-url')) {
        await route.continue()
        return
      }
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
      } else {
        await route.continue()
      }
    })

    // Pipeline list
    await routePipeline(page, 'list', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // GET /pipeline/:id (single pipeline -- catch-all for numeric IDs)
    // Must be registered AFTER more specific routes so they take precedence
    await page.route(/\/pipeline\/\d+$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      if (currentPipeline === null) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentPipeline),
        })
      }
    })

    // Mock projects list for VideoModePanel
    await page.route('**/proyectos?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          elementos: [
            { id: 1, nombre: 'Proyecto Demo', tipo: 'servicios', cliente_nombre: 'Cliente Test' },
            { id: 2, nombre: 'Proyecto Beta', tipo: 'experiencias', cliente_nombre: 'Cliente Beta' },
          ],
          total: 2,
          pagina: 1,
          por_pagina: 50,
        }),
      })
    })

    // ── Block WebSocket connections (prevent real connections in tests) ──
    await page.route('**/pipeline/ws/**', async (route) => {
      // Abort WebSocket upgrade requests to prevent connection errors
      await route.abort('connectionrefused')
    })

    // ── Navigate to video mode ────────────────────────────────────────────
    // Studio is already loaded by the studioPage fixture at /proyectos/1/estudio
    // Click the Videos status card to enter video mode
    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Wait for video pipeline to render (either the welcome screen or the pipeline)
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    // Expose the state setter for tests
    const setPipelineState = (pipeline: MockPipeline | null) => {
      currentPipeline = pipeline
    }

    // Store the setter where tests can access it via the setPipelineState fixture
    ;(page as unknown as Record<string, unknown>)._setPipelineState = setPipelineState

    await use(page)
  },

  setPipelineState: async ({ pipelinePage: page }, use) => {
    const setter = (page as unknown as Record<string, unknown>)._setPipelineState as (p: MockPipeline | null) => void
    await use(setter ?? (() => {}))
  },
})

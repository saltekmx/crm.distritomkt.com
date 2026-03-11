/**
 * Playwright fixture that sets up API route mocking for all Studio endpoints.
 *
 * Usage in spec files:
 *   import { test, expect } from '../fixtures/studio'
 */

import { test as base, expect, type Page } from '@playwright/test'
import {
  MOCK_MODELS,
  MOCK_GENERATIONS,
  MOCK_TEMPLATES,
  MOCK_CONVERSATIONS,
  MOCK_CONVERSATION_DETAIL,
  MOCK_PROJECT,
  MOCK_PROMPT_HISTORY,
  PROMPT_HISTORY_KEY,
  buildMockSSEStream,
} from './mock-data'

export { expect }

export interface StudioFixtures {
  studioPage: Page
}

export const test = base.extend<StudioFixtures>({
  studioPage: async ({ page }, use) => {
    // GET /api/proyectos/:id
    await page.route('**/api/proyectos/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PROJECT),
        })
      } else {
        await route.continue()
      }
    })

    // GET /api/studio/models
    await page.route('**/api/studio/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: MOCK_MODELS }),
      })
    })

    // GET /api/studio/project/*/generations
    await page.route('**/api/studio/project/*/generations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GENERATIONS),
      })
    })

    // GET /api/studio/recent
    await page.route('**/api/studio/recent', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GENERATIONS),
      })
    })

    // POST /api/studio/image/generate
    await page.route('**/api/studio/image/generate', async (route) => {
      const body = route.request().postDataJSON()
      const newGen = {
        ...MOCK_GENERATIONS[0],
        id: Date.now(),
        prompt: body?.prompt ?? 'generated',
        estilo: body?.style_preset ?? null,
        aspect_ratio: body?.aspect_ratio ?? '1:1',
        modelo: body?.model ?? 'gemini-2.5-flash-image',
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newGen),
      })
    })

    // POST /api/studio/prompt/enhance
    await page.route('**/api/studio/prompt/enhance', async (route) => {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enhanced_prompt: `Enhanced: ${body?.prompt ?? 'prompt'}`,
        }),
      })
    })

    // GET/POST /api/studio/templates
    await page.route('**/api/studio/templates', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_TEMPLATES),
        })
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        const newTemplate = {
          id: Date.now(),
          nombre: body?.name ?? 'New Template',
          prompt: body?.prompt ?? '',
          negative_prompt: body?.negative_prompt ?? null,
          estilo: body?.style_preset ?? null,
          aspect_ratio: body?.aspect_ratio ?? '1:1',
          creado_por: 1,
          compartido: false,
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newTemplate),
        })
      } else {
        await route.continue()
      }
    })

    // DELETE /api/studio/templates/:id
    await page.route('**/api/studio/templates/*', async (route) => {
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

    // PATCH /api/studio/generations/:id/favorite
    await page.route('**/api/studio/generations/*/favorite', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ is_favorite: true }),
      })
    })

    // POST /api/studio/generations/:id/export
    await page.route('**/api/studio/generations/*/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mensaje: 'Exportado exitosamente', media_id: 99 }),
      })
    })

    // POST /api/studio/generations/:id/remove-bg
    await page.route('**/api/studio/generations/*/remove-bg', async (route) => {
      const newGen = {
        ...MOCK_GENERATIONS[0],
        id: Date.now(),
        prompt: 'Background removed',
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newGen),
      })
    })

    // POST /api/studio/generations/:id/upscale
    await page.route('**/api/studio/generations/*/upscale', async (route) => {
      const newGen = {
        ...MOCK_GENERATIONS[0],
        id: Date.now(),
        prompt: 'Upscaled image',
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newGen),
      })
    })

    // POST /api/studio/generations/:id/enhance
    await page.route('**/api/studio/generations/*/enhance', async (route) => {
      const newGen = {
        ...MOCK_GENERATIONS[0],
        id: Date.now(),
        prompt: 'Auto-enhanced image',
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(newGen),
      })
    })

    // POST /api/studio/generations/bulk-download
    await page.route('**/api/studio/generations/bulk-download', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/zip',
        body: Buffer.from('PK\x03\x04fake-zip-content'),
      })
    })

    // DELETE /api/studio/generations/:id
    await page.route('**/api/studio/generations/*', async (route) => {
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

    // PUT /api/studio/generations/:id/tags
    await page.route('**/api/studio/generations/*/tags', async (route) => {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tags: body?.tags ?? [] }),
      })
    })

    // POST /api/studio/describe-image
    await page.route('**/api/studio/describe-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          description: 'A beautiful product image',
          suggested_prompt: 'Suggested prompt from AI describe',
        }),
      })
    })

    // Conversations
    await page.route('**/api/studio/conversations/*', async (route) => {
      const url = route.request().url()
      if (route.request().method() === 'GET') {
        if (url.match(/\/conversations\/\d+\/\d+/)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_CONVERSATION_DETAIL),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_CONVERSATIONS),
          })
        }
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
      } else {
        await route.continue()
      }
    })

    // POST /api/studio/chat (SSE stream)
    await page.route('**/api/studio/chat', async (route) => {
      const sseBody = buildMockSSEStream(
        'Aqui tienes la imagen generada. Puedo hacer ajustes si lo necesitas.',
      )
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      })
    })

    // Seed localStorage with prompt history
    await page.addInitScript(
      ({ key, history }) => {
        localStorage.setItem(key, JSON.stringify(history))
      },
      { key: PROMPT_HISTORY_KEY, history: MOCK_PROMPT_HISTORY },
    )

    // Navigate to Studio
    await page.goto('/proyectos/1/estudio')

    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10_000 }).catch(() => {})

    await use(page)
  },
})

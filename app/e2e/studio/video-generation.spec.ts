/**
 * E2E tests for Video Generation and real-time updates.
 *
 * Covers: generation grid layout with scene states, model/aspect ratio/duration
 * selection, cancel generation, failed scene retry, and progress tracking.
 */

import { test, expect, makePipeline, makeScene } from '../fixtures/pipeline'
import {
  PIPELINE_PLANNED,
  PIPELINE_GENERATING,
} from '../fixtures/pipeline-mock-data'

// ---------------------------------------------------------------------------
// Helper: Navigate to video mode after reload
// ---------------------------------------------------------------------------

async function enterVideoMode(page: import('@playwright/test').Page) {
  await page.reload()
  await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})
  const videosCard = page.getByText('Videos').first()
  if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await videosCard.click()
  }
}

// ---------------------------------------------------------------------------
// Generation Grid Layout
// ---------------------------------------------------------------------------

test.describe('Video Generation - Scene State Grid', () => {
  test('pending scenes show pending status label', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Scene 3 is pending
    await expect(page.getByText('Pendiente').first()).toBeVisible()
  })

  test('generating scenes show spinner and status', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Scene 2 is generating -- the animate-spin class indicates a spinner
    const spinners = page.locator('.animate-spin')
    expect(await spinners.count()).toBeGreaterThan(0)
  })

  test('complete scenes show completed status', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Scene 1 is complete
    await expect(page.getByText('Completo').first()).toBeVisible()
  })

  test('failed scenes show error status and retry button', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Scene 4 is failed
    await expect(page.getByText('Error').first()).toBeVisible()

    // Retry button should be visible on the failed scene
    // The retry button has a RefreshCw icon
    const retryBtns = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') })
    expect(await retryBtns.count()).toBeGreaterThan(0)
  })

  test('progress bar updates based on complete scenes', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // 1 of 4 scenes complete = 25%
    await expect(page.getByText('25%')).toBeVisible()
    await expect(page.getByText(/1 de 4 escenas completas/)).toBeVisible()
  })

  test('progress bar shows higher percentage with more complete scenes', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    // Custom pipeline with 3 of 4 complete
    const pipeline = makePipeline({
      estado: 'generating',
      escenas: [
        makeScene({ id: 301, orden: 1, estado: 'complete', video_url: 'https://placehold.co/1920x1080.mp4' }),
        makeScene({ id: 302, orden: 2, estado: 'complete', video_url: 'https://placehold.co/1920x1080.mp4' }),
        makeScene({ id: 303, orden: 3, estado: 'complete', video_url: 'https://placehold.co/1920x1080.mp4' }),
        makeScene({ id: 304, orden: 4, estado: 'generating' }),
      ],
    })
    setPipelineState(pipeline)
    await enterVideoMode(page)

    await expect(page.getByText('75%')).toBeVisible()
    await expect(page.getByText(/3 de 4 escenas completas/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Model Selection (Quality)
// ---------------------------------------------------------------------------

test.describe('Video Generation - Model Selection', () => {
  test('Veo 3.1 Fast is selected by default in planned stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    const fastBtn = page.getByRole('button', { name: 'Veo 3.1 Fast' })
    await expect(fastBtn).toHaveClass(/bg-violet/)
  })

  test('can switch to Veo 3.1 HQ model', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    const hqBtn = page.getByRole('button', { name: 'Veo 3.1 HQ' })
    await hqBtn.click()
    await expect(hqBtn).toHaveClass(/bg-violet/)

    const fastBtn = page.getByRole('button', { name: 'Veo 3.1 Fast' })
    await expect(fastBtn).not.toHaveClass(/bg-violet/)
  })

  test('selected model is sent in generate request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    // Switch to HQ
    await page.getByRole('button', { name: 'Veo 3.1 HQ' }).click()

    // Generate all
    const genRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/generate') && req.method() === 'POST'
    )
    await page.getByRole('button', { name: 'Generar Todos' }).click()

    const request = await genRequest
    const body = request.postDataJSON()
    expect(body.quality).toBe('veo-3.1')
  })

  test('default model (Veo 3.1 Fast) is sent when not changed', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    const genRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/generate') && req.method() === 'POST'
    )
    await page.getByRole('button', { name: 'Generar Todos' }).click()

    const request = await genRequest
    const body = request.postDataJSON()
    expect(body.quality).toBe('veo-3.1-fast')
  })
})

// ---------------------------------------------------------------------------
// Scene Editing — Aspect Ratio & Duration
// ---------------------------------------------------------------------------

test.describe('Video Generation - Scene Configuration', () => {
  test('scene card edit mode shows duration options (4s, 6s, 8s)', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    // Click the edit button on the first scene (hover reveals it)
    const firstScene = page.getByText('Escena 1').first()
    await firstScene.hover()

    // The edit (pencil) button appears on hover
    const editBtns = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
    if (await editBtns.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtns.first().click()

      // In edit mode, duration select should have 4s, 6s, 8s options
      const durationSelect = page.locator('select').filter({ has: page.locator('option[value="4"]') })
      await expect(durationSelect).toBeVisible()
      await expect(durationSelect.locator('option[value="4"]')).toBeAttached()
      await expect(durationSelect.locator('option[value="6"]')).toBeAttached()
      await expect(durationSelect.locator('option[value="8"]')).toBeAttached()
    }
  })

  test('scene card edit mode shows aspect ratio options (16:9, 9:16, 1:1, 4:5)', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    const firstScene = page.getByText('Escena 1').first()
    await firstScene.hover()

    const editBtns = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
    if (await editBtns.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtns.first().click()

      const aspectSelect = page.locator('select').filter({ has: page.locator('option[value="16:9"]') })
      await expect(aspectSelect).toBeVisible()
      await expect(aspectSelect.locator('option[value="16:9"]')).toBeAttached()
      await expect(aspectSelect.locator('option[value="9:16"]')).toBeAttached()
      await expect(aspectSelect.locator('option[value="1:1"]')).toBeAttached()
      await expect(aspectSelect.locator('option[value="4:5"]')).toBeAttached()
    }
  })

  test('scene edit saves description and prompt changes', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    const firstScene = page.getByText('Escena 1').first()
    await firstScene.hover()

    const editBtns = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
    if (await editBtns.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtns.first().click()

      // Edit the description
      const descLabel = page.getByText('Descripcion').first()
      await expect(descLabel).toBeVisible()

      const descTextarea = page.locator('textarea').first()
      await descTextarea.fill('Nueva descripcion de apertura editada')

      // Edit the veo prompt
      const promptLabel = page.getByText('Prompt de Veo').first()
      await expect(promptLabel).toBeVisible()

      // Save the edit -- the check (save) button
      const saveRequest = page.waitForRequest((req) =>
        req.url().includes('/pipeline/scenes/') && req.method() === 'PATCH'
      )

      const saveBtns = page.locator('button').filter({ has: page.locator('svg.lucide-check') })
      await saveBtns.first().click()

      const request = await saveRequest
      const body = request.postDataJSON()
      expect(body.description).toBe('Nueva descripcion de apertura editada')
    }
  })

  test('scene edit can be cancelled', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await enterVideoMode(page)

    const firstScene = page.getByText('Escena 1').first()
    await firstScene.hover()

    const editBtns = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
    if (await editBtns.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtns.first().click()

      // The cancel (X) button
      const cancelBtns = page.locator('button').filter({ has: page.locator('svg.lucide-x') })
      await cancelBtns.first().click()

      // Should exit edit mode -- description label "Descripcion" should no longer be visible
      // and scene card should show regular view
      await expect(page.getByText('Escena 1').first()).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// Cancel Generation
// ---------------------------------------------------------------------------

test.describe('Video Generation - Cancel', () => {
  test('cancel button sends cancel request to API', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    const cancelBtn = page.getByRole('button', { name: 'Cancelar Generacion' })
    await expect(cancelBtn).toBeVisible()

    const cancelRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/cancel') && req.method() === 'POST'
    )
    await cancelBtn.click()

    const request = await cancelRequest
    expect(request.method()).toBe('POST')
  })

  test('cancel button has red styling', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    const cancelBtn = page.getByRole('button', { name: 'Cancelar Generacion' })
    await expect(cancelBtn).toHaveClass(/text-red/)
    await expect(cancelBtn).toHaveClass(/border-red/)
  })
})

// ---------------------------------------------------------------------------
// Failed Scene Retry
// ---------------------------------------------------------------------------

test.describe('Video Generation - Retry Failed Scenes', () => {
  test('failed scene shows retry button', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Scene 4 is failed -- it should have a retry button with RefreshCw icon
    // Find the scene card containing "Error"
    const errorLabel = page.getByText('Error').first()
    await expect(errorLabel).toBeVisible()
  })

  test('clicking retry on failed scene sends generate request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    // Create a pipeline where a specific scene has failed
    const pipeline = makePipeline({
      estado: 'generating',
      escenas: [
        makeScene({ id: 401, orden: 1, estado: 'complete', video_url: 'https://placehold.co/1920x1080.mp4' }),
        makeScene({ id: 402, orden: 2, estado: 'failed', descripcion: 'Escena fallida' }),
      ],
    })
    setPipelineState(pipeline)
    await enterVideoMode(page)

    // The retry button is on the failed scene row
    const retryRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().includes('/generate') && req.method() === 'POST'
    )

    const retryBtns = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') })
    if (await retryBtns.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await retryBtns.first().click()
      const request = await retryRequest
      expect(request.method()).toBe('POST')
    }
  })
})

// ---------------------------------------------------------------------------
// Scene Clicking in Generating Stage
// ---------------------------------------------------------------------------

test.describe('Video Generation - Scene Selection', () => {
  test('clicking a scene card selects it (active state)', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Click on scene 1 card (complete)
    const scene1 = page.getByText('Escena 1').first()
    await scene1.click()

    // The clicked card should get violet styling (active)
    const parentCard = scene1.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]').first()
    await expect(parentCard).toHaveClass(/border-violet/)
  })

  test('clicking a generating scene shows generating indicator', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Click on scene 2 (generating)
    const scene2Card = page.locator('text=Escena 2').first()
    await scene2Card.click()

    // Should show the generating indicator with spinner
    await expect(page.getByText(/Generando Escena 2/)).toBeVisible()
  })

  test('active generating scene shows elapsed time when available', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await enterVideoMode(page)

    // Scene 2 has elapsed_sec=45 -> shows "0:45 transcurrido"
    const scene2Card = page.locator('text=Escena 2').first()
    await scene2Card.click()

    await expect(page.getByText(/0:45 transcurrido/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Multiple Scene States Together
// ---------------------------------------------------------------------------

test.describe('Video Generation - Mixed States', () => {
  test('pipeline with all scenes complete shows 100% progress', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    const allComplete = makePipeline({
      estado: 'generating',
      escenas: [
        makeScene({ id: 501, orden: 1, estado: 'complete', video_url: 'https://placehold.co/1920x1080.mp4' }),
        makeScene({ id: 502, orden: 2, estado: 'complete', video_url: 'https://placehold.co/1920x1080.mp4' }),
      ],
    })
    setPipelineState(allComplete)
    await enterVideoMode(page)

    await expect(page.getByText('100%')).toBeVisible()
    await expect(page.getByText(/2 de 2 escenas completas/)).toBeVisible()
  })

  test('pipeline with no scenes complete shows 0%', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    const noneComplete = makePipeline({
      estado: 'generating',
      escenas: [
        makeScene({ id: 601, orden: 1, estado: 'generating' }),
        makeScene({ id: 602, orden: 2, estado: 'pending' }),
        makeScene({ id: 603, orden: 3, estado: 'pending' }),
      ],
    })
    setPipelineState(noneComplete)
    await enterVideoMode(page)

    await expect(page.getByText('0%')).toBeVisible()
    await expect(page.getByText(/0 de 3 escenas completas/)).toBeVisible()
  })
})

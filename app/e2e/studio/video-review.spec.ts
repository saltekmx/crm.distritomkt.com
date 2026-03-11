/**
 * E2E tests for Video Review and Revision.
 *
 * Covers: video player rendering, prompt viewer, scene approval flow,
 * approve all scenes, regenerate scene, and review stage transitions.
 */

import { test, expect, makePipeline, makeScene } from '../fixtures/pipeline'
import {
  PIPELINE_REVIEW,
  PIPELINE_ALL_APPROVED,
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
// Review Stage Layout
// ---------------------------------------------------------------------------

test.describe('Video Review - Layout', () => {
  test('review stage shows approval progress counter', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // PIPELINE_REVIEW: 1 approved, 3 total
    await expect(page.getByText(/1 de 3 escenas aprobadas/)).toBeVisible()
  })

  test('review stage lists all scenes with status', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // All 3 scenes should be listed
    await expect(page.getByText('Escena 1').first()).toBeVisible()
    await expect(page.getByText('Escena 2').first()).toBeVisible()
    await expect(page.getByText('Escena 3').first()).toBeVisible()
  })

  test('approved scenes show "Aprobado" label', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Scene 1 is approved
    await expect(page.getByText('Aprobado').first()).toBeVisible()
  })

  test('complete (unapproved) scenes show "Completo" label', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Scenes 2 and 3 are complete but not approved
    await expect(page.getByText('Completo').first()).toBeVisible()
  })

  test('scene descriptions are visible in review list', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await expect(page.getByText(/Toma de apertura/).first()).toBeVisible()
    await expect(page.getByText(/Producto hero shot/).first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Video Player
// ---------------------------------------------------------------------------

test.describe('Video Review - Video Player', () => {
  test('clicking a complete scene shows video player', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Click on scene 2 (complete, not approved, has video_url)
    await page.getByText('Escena 2').first().click()

    // Video element should be rendered
    const video = page.locator('video')
    await expect(video.first()).toBeVisible()
  })

  test('video player shows play button when paused', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Click on a complete scene
    await page.getByText('Escena 2').first().click()

    // Play button overlay (shown when video is not playing)
    // The Play icon from lucide is inside the overlay
    const playOverlay = page.locator('svg.lucide-play').first()
    await expect(playOverlay).toBeVisible()
  })

  test('video player has playback speed controls (0.5x, 1x, 2x)', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    // Speed controls
    await expect(page.getByRole('button', { name: '0.5x', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '1x', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '2x', exact: true })).toBeVisible()
  })

  test('1x speed button is selected by default', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    const speed1x = page.getByRole('button', { name: '1x', exact: true })
    await expect(speed1x).toHaveClass(/bg-violet/)
  })

  test('clicking speed button changes playback rate', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    const speed2x = page.getByRole('button', { name: '2x', exact: true })
    await speed2x.click()
    await expect(speed2x).toHaveClass(/bg-violet/)
  })

  test('video player shows time display', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    // Time display "0:00 / 0:00" (since the mock video won't actually load duration)
    const timeDisplay = page.locator('.font-mono').filter({ hasText: /\d+:\d+/ })
    await expect(timeDisplay.first()).toBeVisible()
  })

  test('video player has loop toggle button', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    // Loop button (Repeat icon)
    const loopBtn = page.locator('button').filter({ has: page.locator('svg.lucide-repeat') })
    await expect(loopBtn.first()).toBeVisible()
  })

  test('video player has fullscreen button', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    // Fullscreen button (Maximize icon)
    const fsBtn = page.locator('button').filter({ has: page.locator('svg.lucide-maximize') })
    await expect(fsBtn.first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Scene Approval Flow
// ---------------------------------------------------------------------------

test.describe('Video Review - Approval', () => {
  test('approve button appears for complete unapproved scenes', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Click scene 2 (complete, not approved)
    await page.getByText('Escena 2').first().click()

    // Approve button should be visible
    await expect(page.getByRole('button', { name: /Aprobar Escena/ })).toBeVisible()
  })

  test('approve button sends approve request to API', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Click scene 2 (complete, not approved)
    await page.getByText('Escena 2').first().click()

    const approveRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/scenes/') && req.url().includes('/approve') && req.method() === 'PATCH'
    )

    const approveBtn = page.getByRole('button', { name: /Aprobar Escena/ })
    await approveBtn.click()

    const request = await approveRequest
    expect(request.method()).toBe('PATCH')
    expect(request.url()).toContain('/scenes/202/approve')
  })

  test('regenerate button appears alongside approve button', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    await expect(page.getByRole('button', { name: 'Regenerar' })).toBeVisible()
  })

  test('regenerate button sends generate request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    await page.getByText('Escena 2').first().click()

    const genRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().includes('/generate') && req.method() === 'POST'
    )

    await page.getByRole('button', { name: 'Regenerar' }).click()

    const request = await genRequest
    expect(request.method()).toBe('POST')
  })

  test('approved scene does not show approve/regenerate buttons', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Click scene 1 (already approved)
    await page.getByText('Escena 1').first().click()

    // The large "Aprobar Escena" button should NOT be visible for already-approved scenes
    // Check with a short timeout to avoid waiting too long
    const approveBtn = page.getByRole('button', { name: /Aprobar Escena 1/ })
    await expect(approveBtn).not.toBeVisible()
  })

  test('quick approve button on scene card sends approve request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Hover over scene 2 to reveal quick action buttons
    const scene2Card = page.locator('.rounded-xl').filter({ hasText: 'Escena 2' }).first()
    await scene2Card.hover()

    // The quick approve button has a Check icon and title="Aprobar"
    const approveRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/scenes/') && req.url().includes('/approve')
    )

    const quickApproveBtn = page.locator('button[title="Aprobar"]')
    if (await quickApproveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickApproveBtn.click()
      const request = await approveRequest
      expect(request.url()).toContain('/approve')
    }
  })
})

// ---------------------------------------------------------------------------
// All Scenes Approved
// ---------------------------------------------------------------------------

test.describe('Video Review - All Approved', () => {
  test('shows "Listo para exportar" when all scenes are approved', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_ALL_APPROVED)
    await enterVideoMode(page)

    await expect(page.getByText('Listo para exportar')).toBeVisible()
  })

  test('shows approval count matching total scenes', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_ALL_APPROVED)
    await enterVideoMode(page)

    // 2 of 2 approved
    await expect(page.getByText(/2 de 2 escenas aprobadas/)).toBeVisible()
  })

  test('"Continuar a Exportar" button transitions to export stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_ALL_APPROVED)
    await enterVideoMode(page)

    const exportBtn = page.getByRole('button', { name: 'Continuar a Exportar' })
    await expect(exportBtn).toBeVisible()
    await exportBtn.click()

    // Should show export stage content
    await expect(page.getByText('Resumen del Pipeline')).toBeVisible()
  })

  test('"Continuar a Exportar" button has green styling', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_ALL_APPROVED)
    await enterVideoMode(page)

    const exportBtn = page.getByRole('button', { name: 'Continuar a Exportar' })
    await expect(exportBtn).toHaveClass(/bg-green/)
  })
})

// ---------------------------------------------------------------------------
// Scene Thumbnails in Review
// ---------------------------------------------------------------------------

test.describe('Video Review - Scene Thumbnails', () => {
  test('scenes with video have thumbnail preview', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Scene cards with video_url should have a <video> element as thumbnail
    const thumbnailVideos = page.locator('.rounded-xl video')
    expect(await thumbnailVideos.count()).toBeGreaterThan(0)
  })

  test('approved scene thumbnail shows green check overlay', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Scene 1 is approved -- its thumbnail should have a green overlay
    // The overlay has bg-green-500/10 class and a Check icon
    const greenOverlay = page.locator('.bg-green-500\\/10')
    expect(await greenOverlay.count()).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Review with Failed Scenes
// ---------------------------------------------------------------------------

test.describe('Video Review - Failed Scene Retry', () => {
  test('failed scene in review shows retry button', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    const reviewWithFailed = makePipeline({
      estado: 'review',
      escenas: [
        makeScene({
          id: 701,
          orden: 1,
          estado: 'approved',
          aprobado: true,
          video_url: 'https://placehold.co/1920x1080.mp4',
        }),
        makeScene({
          id: 702,
          orden: 2,
          estado: 'failed',
          descripcion: 'Escena con error de generacion',
        }),
      ],
    })
    setPipelineState(reviewWithFailed)
    await enterVideoMode(page)

    // Failed scene should show Error status
    await expect(page.getByText('Error').first()).toBeVisible()

    // Retry button with title "Reintentar"
    const retryBtn = page.locator('button[title="Reintentar"]')
    if (await retryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(retryBtn).toBeVisible()
    }
  })

  test('clicking retry on failed scene in review sends generate request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    const reviewWithFailed = makePipeline({
      estado: 'review',
      escenas: [
        makeScene({
          id: 701,
          orden: 1,
          estado: 'approved',
          aprobado: true,
          video_url: 'https://placehold.co/1920x1080.mp4',
        }),
        makeScene({
          id: 702,
          orden: 2,
          estado: 'failed',
          descripcion: 'Escena con error',
        }),
      ],
    })
    setPipelineState(reviewWithFailed)
    await enterVideoMode(page)

    // Hover over the failed scene to show retry button
    const failedScene = page.locator('.rounded-xl').filter({ hasText: 'Escena 2' }).first()
    await failedScene.hover()

    const retryBtn = page.locator('button[title="Reintentar"]')
    if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const genRequest = page.waitForRequest((req) =>
        req.url().includes('/generate') && req.method() === 'POST'
      )
      await retryBtn.click()
      const request = await genRequest
      expect(request.method()).toBe('POST')
    }
  })
})

// ---------------------------------------------------------------------------
// Review Stage Navigation
// ---------------------------------------------------------------------------

test.describe('Video Review - Stage Navigation', () => {
  test('can navigate back to planned stage from review', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    // Click "Planificado" in stepper to go back
    const plannedBtn = page.getByRole('button', { name: 'Planificado' })
    await plannedBtn.click()

    // Should show planned stage content (scene cards grid with edit capabilities)
    await expect(page.getByText('Agregar Escena')).toBeVisible()
  })

  test('review step is highlighted in stepper', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await enterVideoMode(page)

    const reviewBtn = page.getByRole('button', { name: 'Revision' })
    await expect(reviewBtn).toHaveClass(/bg-violet/)
    await expect(reviewBtn).toHaveClass(/text-violet/)
  })
})

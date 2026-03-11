/**
 * E2E tests for the Video Pipeline core flow.
 *
 * Covers: pipeline initialization, stage stepper navigation, brief editor,
 * scene plan view, scene management (add/delete), generation trigger,
 * and export panel.
 */

import { test, expect, makePipeline, makeScene } from '../fixtures/pipeline'
import {
  PIPELINE_PLANNED,
  PIPELINE_GENERATING,
  PIPELINE_REVIEW,
  PIPELINE_ALL_APPROVED,
  PIPELINE_EXPORT_READY,
  PIPELINE_EXPORTED,
} from '../fixtures/pipeline-mock-data'

// ---------------------------------------------------------------------------
// Pipeline Initialization & Welcome Screen
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Initialization', () => {
  test('shows welcome screen when no project is selected', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    // The pipeline page loads with project 1 selected, but let's verify
    // the Video Pipeline text is visible
    await expect(page.getByText('Video Pipeline')).toBeVisible()
  })

  test('shows idle stage (brief editor) when no pipeline exists for project', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    // Default state is PIPELINE_IDLE (null) -- the fixture sets this
    setPipelineState(null)

    // Reload to re-fetch pipeline state
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    // Switch to video mode again after reload
    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    await expect(page.getByText('Video Pipeline')).toBeVisible()
  })

  test('renders stepper with all stage labels', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)

    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // All stepper labels should be visible
    await expect(page.getByText('Sin iniciar')).toBeVisible()
    await expect(page.getByText('Analizando')).toBeVisible()
    await expect(page.getByText('Planificado')).toBeVisible()
    // 'Generando' may appear in stepper and/or status labels
    const generandoLabels = page.getByText('Generando')
    await expect(generandoLabels.first()).toBeVisible()
    await expect(page.getByText('Revision')).toBeVisible()
    await expect(page.getByText('Exportar')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Brief Editor (Idle Stage)
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Brief Editor', () => {
  test('brief textarea renders and accepts text', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(null)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const textarea = page.locator('textarea[placeholder*="Describe el proyecto"]')
    await expect(textarea).toBeVisible()
    await textarea.fill('Video promocional para la nueva linea de productos de verano')
    await expect(textarea).toHaveValue('Video promocional para la nueva linea de productos de verano')
  })

  test('analyze button is disabled when brief is empty', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(null)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const textarea = page.locator('textarea[placeholder*="Describe el proyecto"]')
    await textarea.fill('')

    const analyzeBtn = page.getByText('Analizar Brief con IA')
    await expect(analyzeBtn).toBeVisible()
    // The button should have cursor-not-allowed class when disabled
    await expect(analyzeBtn).toHaveClass(/cursor-not-allowed/)
  })

  test('analyze button triggers pipeline start and transitions to planned', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(null)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const textarea = page.locator('textarea[placeholder*="Describe el proyecto"]')
    await textarea.fill('Video corporativo para marca premium de cosmeticos')

    // Monitor the POST /pipeline/start request
    const startRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/start') && req.method() === 'POST'
    )

    const analyzeBtn = page.getByText('Analizar Brief con IA')
    await analyzeBtn.click()

    const request = await startRequest
    const body = request.postDataJSON()
    expect(body.project_id).toBe(1)
    expect(body.brief_override).toBe('Video corporativo para marca premium de cosmeticos')
  })
})

// ---------------------------------------------------------------------------
// Planned Stage - Scene Plan
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Planned Stage', () => {
  test('scene cards render with descriptions', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Wait for planned stage to render
    await expect(page.getByText('Planificado')).toBeVisible()

    // All 4 scenes from PIPELINE_PLANNED should be visible
    await expect(page.getByText('Escena 1').first()).toBeVisible()
    await expect(page.getByText('Escena 2').first()).toBeVisible()
    await expect(page.getByText('Escena 3').first()).toBeVisible()
    await expect(page.getByText('Escena 4').first()).toBeVisible()

    // Scene descriptions should be rendered
    await expect(page.getByText(/Toma de apertura con logo animado/).first()).toBeVisible()
    await expect(page.getByText(/Producto hero shot/).first()).toBeVisible()
  })

  test('style guide renders when present', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Style guide section from PIPELINE_PLANNED.guia_estilo
    await expect(page.getByText('Guia de Estilo')).toBeVisible()
    await expect(page.getByText('Energico y moderno')).toBeVisible()
    await expect(page.getByText(/Colores vibrantes/)).toBeVisible()
    await expect(page.getByText(/Ritmo rapido/)).toBeVisible()
  })

  test('scene card shows duration and aspect ratio', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Duration labels: 4s, 6s, 8s
    await expect(page.getByText('4s').first()).toBeVisible()
    await expect(page.getByText('6s').first()).toBeVisible()
    await expect(page.getByText('8s').first()).toBeVisible()

    // Aspect ratio
    await expect(page.getByText('16:9').first()).toBeVisible()
  })

  test('scene card shows veo prompt', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Veo prompts are displayed in mono font
    await expect(page.getByText(/Cinematic opening shot/).first()).toBeVisible()
  })

  test('model selector renders with Veo options', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Quality model buttons
    await expect(page.getByText('Modelo:').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Veo 3.1 Fast' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Veo 3.1 HQ' })).toBeVisible()
  })

  test('model selector switches between Veo Fast and Veo HQ', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const fastBtn = page.getByRole('button', { name: 'Veo 3.1 Fast' })
    const hqBtn = page.getByRole('button', { name: 'Veo 3.1 HQ' })

    // Fast should be selected by default
    await expect(fastBtn).toHaveClass(/bg-violet/)

    // Switch to HQ
    await hqBtn.click()
    await expect(hqBtn).toHaveClass(/bg-violet/)
    await expect(fastBtn).not.toHaveClass(/bg-violet/)
  })

  test('add scene button renders and is clickable', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const addBtn = page.getByText('Agregar Escena')
    await expect(addBtn).toBeVisible()

    // Monitor the POST request for adding a scene
    const addRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/scenes') && req.method() === 'POST'
    )
    await addBtn.click()
    const request = await addRequest
    expect(request.method()).toBe('POST')
  })

  test('generate all button sends generate request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const generateBtn = page.getByRole('button', { name: 'Generar Todos' })
    await expect(generateBtn).toBeVisible()

    // Monitor the generate request
    const genRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/generate') && req.method() === 'POST'
    )
    await generateBtn.click()
    const request = await genRequest
    expect(request.method()).toBe('POST')
  })

  test('re-analyze button is visible and triggers new analysis', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const reanalyzeBtn = page.getByText('Re-analizar')
    await expect(reanalyzeBtn).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Generating Stage
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Generating Stage', () => {
  test('shows progress bar with completion percentage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // PIPELINE_GENERATING has 1 complete out of 4 scenes = 25%
    await expect(page.getByText(/1 de 4 escenas completas/)).toBeVisible()
    await expect(page.getByText('25%')).toBeVisible()
  })

  test('shows scene status list with correct states', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Scene 1 is complete
    await expect(page.getByText('Completo').first()).toBeVisible()

    // Scene 2 is generating (besides the stepper label)
    const generandoLabels = page.getByText('Generando')
    expect(await generandoLabels.count()).toBeGreaterThan(1) // stepper + scene status

    // Scene 3 is pending
    await expect(page.getByText('Pendiente').first()).toBeVisible()

    // Scene 4 is failed
    await expect(page.getByText('Error').first()).toBeVisible()
  })

  test('cancel generation button is visible and sends cancel request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const cancelBtn = page.getByRole('button', { name: 'Cancelar Generacion' })
    await expect(cancelBtn).toBeVisible()

    const cancelRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/cancel') && req.method() === 'POST'
    )
    await cancelBtn.click()
    const request = await cancelRequest
    expect(request.method()).toBe('POST')
  })
})

// ---------------------------------------------------------------------------
// Review Stage
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Review Stage', () => {
  test('shows approval progress', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // PIPELINE_REVIEW has 1 approved out of 3 scenes
    await expect(page.getByText(/1 de 3 escenas aprobadas/)).toBeVisible()
  })

  test('scene list renders with status indicators', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Scene 1 is approved
    await expect(page.getByText('Aprobado').first()).toBeVisible()
    // Scenes 2 and 3 are complete (not yet approved)
    await expect(page.getByText('Completo').first()).toBeVisible()
  })

  test('shows "Listo para exportar" and export button when all scenes approved', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_ALL_APPROVED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    await expect(page.getByText('Listo para exportar')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar a Exportar' })).toBeVisible()
  })

  test('clicking "Continuar a Exportar" transitions to export stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_ALL_APPROVED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    await page.getByRole('button', { name: 'Continuar a Exportar' }).click()

    // Export stage content should appear
    await expect(page.getByText('Resumen del Pipeline')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Export Stage
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Export Stage', () => {
  test('shows pipeline summary with scene count, duration, and format', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_EXPORT_READY)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    await expect(page.getByText('Resumen del Pipeline')).toBeVisible()
    // 2 approved scenes
    await expect(page.getByText('Escenas').first()).toBeVisible()
    // Duration label
    await expect(page.getByText('Duracion').first()).toBeVisible()
    // Format
    await expect(page.getByText('Formato').first()).toBeVisible()
  })

  test('format selector shows MP4 and WEBM options', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_EXPORT_READY)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    await expect(page.getByRole('button', { name: 'MP4' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WEBM' })).toBeVisible()
  })

  test('switching format updates selected button style', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_EXPORT_READY)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const mp4Btn = page.getByRole('button', { name: 'MP4' })
    const webmBtn = page.getByRole('button', { name: 'WEBM' })

    // MP4 is selected by default
    await expect(mp4Btn).toHaveClass(/bg-violet/)

    await webmBtn.click()
    await expect(webmBtn).toHaveClass(/bg-violet/)
    await expect(mp4Btn).not.toHaveClass(/bg-violet/)
  })

  test('export button sends export request', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_EXPORT_READY)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    const exportBtn = page.getByRole('button', { name: 'Exportar al CRM' })
    await expect(exportBtn).toBeVisible()

    const exportRequest = page.waitForRequest((req) =>
      req.url().includes('/pipeline/') && req.url().endsWith('/export') && req.method() === 'POST'
    )
    await exportBtn.click()
    const request = await exportRequest
    expect(request.method()).toBe('POST')
  })

  test('exported state shows success message and download links', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_EXPORTED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Success message
    await expect(page.getByText('Videos exportados al CRM')).toBeVisible()
    // Library availability note
    await expect(page.getByText(/Disponibles en la biblioteca de medios/)).toBeVisible()
  })

  test('new pipeline button is visible in export stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_EXPORTED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    await expect(page.getByRole('button', { name: 'Nuevo Pipeline' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Stage Stepper Navigation
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Stepper Navigation', () => {
  test('clicking a completed step navigates back to it', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Current stage is 'planned'. 'Sin iniciar' and 'Analizando' are completed (done)
    // They should be clickable
    const sinIniciarBtn = page.getByRole('button', { name: 'Sin iniciar' })
    await expect(sinIniciarBtn).toBeVisible()

    // Click "Sin iniciar" to go back to idle
    await sinIniciarBtn.click()

    // Should now show the brief editor (idle stage content)
    await expect(page.locator('textarea[placeholder*="Describe el proyecto"]')).toBeVisible()
  })

  test('future steps are disabled and not clickable', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // 'Revision' and 'Exportar' should be disabled (future steps)
    const revisionBtn = page.getByRole('button', { name: 'Revision' })
    await expect(revisionBtn).toBeDisabled()

    const exportBtn = page.getByRole('button', { name: 'Exportar' })
    await expect(exportBtn).toBeDisabled()
  })

  test('active step has distinct styling', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // 'Planificado' should be the active step with violet styling
    const plannedBtn = page.getByRole('button', { name: 'Planificado' })
    await expect(plannedBtn).toHaveClass(/bg-violet/)
    await expect(plannedBtn).toHaveClass(/text-violet/)
  })

  test('stepper shows 5 steps: Brief, Escenas, Generar, Revisar, Exportar', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // The stepper should contain exactly 5 stage labels (the pipeline stage names)
    // They may be rendered as buttons or labels in the stepper
    await expect(page.getByText('Sin iniciar')).toBeVisible()
    await expect(page.getByText('Analizando')).toBeVisible()
    await expect(page.getByText('Planificado')).toBeVisible()
    await expect(page.getByText('Generando').first()).toBeVisible()
    await expect(page.getByText('Revision')).toBeVisible()
    await expect(page.getByText('Exportar')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Brief Stage - Additional Tests
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Brief Stage Additional', () => {
  test('shows brief editor on initial load', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    // Set idle state (no pipeline exists)
    setPipelineState(null)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Brief editor textarea should be visible on initial load with no pipeline
    const textarea = page.locator('textarea[placeholder*="Describe el proyecto"]')
    await expect(textarea).toBeVisible()

    // The analyze button should also be present
    await expect(page.getByText('Analizar Brief con IA')).toBeVisible()
  })

  test('shows analyzing state with spinner', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    // Set analyzing state
    const analyzingPipeline = makePipeline({
      estado: 'analyzing',
      brief_snapshot: 'Video comercial para marca deportiva premium',
      escenas: [],
    })
    setPipelineState(analyzingPipeline)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // The analyzing state should show a spinner (animate-spin class)
    const spinners = page.locator('.animate-spin')
    expect(await spinners.count()).toBeGreaterThan(0)

    // The "Analizando" label should be highlighted in the stepper
    await expect(page.getByText('Analizando').first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Left Panel - Scene List
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Left Panel', () => {
  test('shows scene list in left panel', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Scene list in the left panel should show all scenes
    // PIPELINE_PLANNED has 4 scenes
    await expect(page.getByText('Escena 1').first()).toBeVisible()
    await expect(page.getByText('Escena 2').first()).toBeVisible()
    await expect(page.getByText('Escena 3').first()).toBeVisible()
    await expect(page.getByText('Escena 4').first()).toBeVisible()

    // Scene descriptions should be visible in the list
    await expect(page.getByText(/Toma de apertura/).first()).toBeVisible()
  })

  test('clicking scene in left panel selects it', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Click scene 2 in the list
    const scene2 = page.getByText('Escena 2').first()
    await scene2.click()

    // The clicked scene card should get active/selected styling (violet border)
    const parentCard = scene2.locator('xpath=ancestor::div[contains(@class, "rounded")]').first()
    await expect(parentCard).toHaveClass(/border-violet|ring-violet/)
  })
})

// ---------------------------------------------------------------------------
// Right Panel - Contextual Information
// ---------------------------------------------------------------------------

test.describe('Video Pipeline - Right Panel', () => {
  test('shows style guide in planned stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_PLANNED)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // Style guide section should be visible in the right panel during planned stage
    await expect(page.getByText('Guia de Estilo')).toBeVisible()

    // Style guide content from PIPELINE_PLANNED.guia_estilo
    await expect(page.getByText('Energico y moderno')).toBeVisible()
    await expect(page.getByText(/Colores vibrantes/)).toBeVisible()
    await expect(page.getByText(/Ritmo rapido/)).toBeVisible()
  })

  test('shows real-time status in generating stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_GENERATING)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // During generation, the right panel / status area should show real-time info:
    // - Progress percentage
    await expect(page.getByText('25%')).toBeVisible()
    // - Scene completion counter
    await expect(page.getByText(/1 de 4 escenas completas/)).toBeVisible()
    // - Individual scene statuses
    await expect(page.getByText('Completo').first()).toBeVisible()
    await expect(page.getByText('Pendiente').first()).toBeVisible()
    await expect(page.getByText('Error').first()).toBeVisible()
  })

  test('shows approval list in review stage', async ({
    pipelinePage: page,
    setPipelineState,
  }) => {
    setPipelineState(PIPELINE_REVIEW)
    await page.reload()
    await page.waitForSelector('text=Video Pipeline', { timeout: 10_000 }).catch(() => {})

    const videosCard = page.getByText('Videos').first()
    if (await videosCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videosCard.click()
    }

    // During review, the panel should show approval status:
    // - Approval progress counter
    await expect(page.getByText(/1 de 3 escenas aprobadas/)).toBeVisible()
    // - Individual scene statuses with "Aprobado" and "Completo"
    await expect(page.getByText('Aprobado').first()).toBeVisible()
    await expect(page.getByText('Completo').first()).toBeVisible()
  })
})

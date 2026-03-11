import { test, expect } from '../fixtures/studio'

test.describe('Studio - Canvas & Editing', () => {
  test.beforeEach(async ({ studioPage: page }) => {
    const genButton = page.getByRole('button', { name: /Generar Imagenes/i })
    if (await genButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genButton.click()
    }

    // Click first generation card to open canvas
    const firstCard = page.locator('img[alt*="Foto de producto"]').first()
    if (await firstCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstCard.dblclick()
    }

    await page.locator('button[aria-label="Acercar"]').waitFor({ timeout: 5000 }).catch(() => {})
  })

  // Canvas Rendering
  test('canvas renders with the selected image', async ({ studioPage: page }) => {
    const canvasImage = page.locator('img[alt*="Foto de producto"]')
    await expect(canvasImage).toBeVisible()
  })

  // Zoom Controls
  test('zoom in button increases zoom level', async ({ studioPage: page }) => {
    const zoomIn = page.locator('button[aria-label="Acercar"]')
    await expect(page.getByText('100%')).toBeVisible()
    await zoomIn.click()
    await expect(page.getByText('125%')).toBeVisible()
  })

  test('zoom out button decreases zoom level', async ({ studioPage: page }) => {
    const zoomIn = page.locator('button[aria-label="Acercar"]')
    const zoomOut = page.locator('button[aria-label="Alejar"]')
    await zoomIn.click()
    await expect(page.getByText('125%')).toBeVisible()
    await zoomOut.click()
    await expect(page.getByText('100%')).toBeVisible()
  })

  test('keyboard + zooms in', async ({ studioPage: page }) => {
    await page.keyboard.press('+')
    await expect(page.getByText('125%')).toBeVisible()
  })

  test('keyboard - zooms out', async ({ studioPage: page }) => {
    await page.keyboard.press('+')
    await page.keyboard.press('-')
    await expect(page.getByText('100%')).toBeVisible()
  })

  test('keyboard 0 resets zoom', async ({ studioPage: page }) => {
    await page.keyboard.press('+')
    await page.keyboard.press('+')
    await page.keyboard.press('0')
    await expect(page.getByText('100%')).toBeVisible()
  })

  // Transform Buttons (AdjustTab)
  test('flip horizontal button is clickable', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const flipH = page.getByRole('button', { name: 'Flip H' })
    await expect(flipH).toBeVisible()
    await flipH.click()
  })

  test('flip vertical button is clickable', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const flipV = page.getByRole('button', { name: 'Flip V' })
    await expect(flipV).toBeVisible()
    await flipV.click()
  })

  test('rotate CW button is clickable', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const rotateCW = page.getByRole('button', { name: 'Rot +90' })
    await expect(rotateCW).toBeVisible()
    await rotateCW.click()
  })

  test('rotate CCW button is clickable', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const rotateCCW = page.getByRole('button', { name: 'Rot -90' })
    await expect(rotateCCW).toBeVisible()
    await rotateCCW.click()
  })

  // Adjustment Sliders
  test('brightness slider is visible', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    await expect(page.getByText('Brillo')).toBeVisible()
  })

  test('contrast slider is visible', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    await expect(page.getByText('Contraste')).toBeVisible()
  })

  test('saturation slider is visible', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    await expect(page.getByText('Saturacion')).toBeVisible()
  })

  // Undo / Redo
  test('undo button is initially disabled', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const undoBtn = page.getByRole('button', { name: /Deshacer/i })
    await expect(undoBtn).toBeVisible()
    await expect(undoBtn).toBeDisabled()
  })

  test('undo becomes enabled after an edit', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const flipH = page.getByRole('button', { name: 'Flip H' })
    await flipH.click()
    const undoBtn = page.getByRole('button', { name: /Deshacer/i })
    await expect(undoBtn).toBeEnabled()
  })

  test('undo reverts an edit and enables redo', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    await page.getByRole('button', { name: 'Flip H' }).click()
    await page.getByRole('button', { name: /Deshacer/i }).click()
    await expect(page.getByRole('button', { name: /Rehacer/i })).toBeEnabled()
  })

  // Crop Tool
  test('crop tool opens overlay', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const cropBtn = page.getByRole('button', { name: /Recortar imagen/i })
    await expect(cropBtn).toBeVisible()
    await cropBtn.click()
    await expect(page.getByRole('button', { name: /Aplicar/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cancelar/i })).toBeVisible()
  })

  // Reset All
  test('reset all edits button clears edit stack', async ({ studioPage: page }) => {
    const adjustTab = page.getByText('Ajustes').first()
    if (await adjustTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await adjustTab.click()
    }
    const resetBtn = page.getByRole('button', { name: /Restablecer todo/i })
    await expect(resetBtn).toBeDisabled()
    await page.getByRole('button', { name: 'Flip H' }).click()
    await expect(resetBtn).toBeEnabled()
    await resetBtn.click()
    await expect(page.getByRole('button', { name: /Deshacer/i })).toBeDisabled()
  })
})

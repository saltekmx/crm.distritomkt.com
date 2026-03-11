import { test, expect } from '../fixtures/studio'

test.describe('Studio - Prompt Templates', () => {
  test.beforeEach(async ({ studioPage: page }) => {
    const genButton = page.getByRole('button', { name: /Generar Imagenes/i })
    if (await genButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genButton.click()
    }
    await page.getByText('AI Generador').waitFor({ timeout: 5000 }).catch(() => {})
  })

  // Template Library
  test('template library opens when clicking Plantillas button', async ({ studioPage: page }) => {
    const plantillasBtn = page.getByRole('button', { name: /Plantillas/i })
    await expect(plantillasBtn).toBeVisible()
    await plantillasBtn.click()
    await expect(page.getByText('Producto E-commerce')).toBeVisible()
  })

  test('template library shows saved templates', async ({ studioPage: page }) => {
    await page.getByRole('button', { name: /Plantillas/i }).click()
    await expect(page.getByText('Producto E-commerce')).toBeVisible()
    await expect(page.getByText('Social Media Post')).toBeVisible()
  })

  // Load Template
  test('clicking a template fills the prompt input', async ({ studioPage: page }) => {
    await page.getByRole('button', { name: /Plantillas/i }).click()
    await page.getByText('Producto E-commerce').click()
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await expect(textarea).toHaveValue(/Professional product photo/)
  })

  // Save Template
  test('save template form opens when clicking Guardar', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('Mi nuevo prompt para guardar')
    const guardarBtn = page.getByRole('button', { name: /Guardar/i }).first()
    await expect(guardarBtn).toBeEnabled()
    await guardarBtn.click()
    await expect(page.getByText('Guardar como plantilla')).toBeVisible()
  })

  test('save template with name', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('Prompt para plantilla nueva')
    await page.getByRole('button', { name: /Guardar/i }).first().click()
    const nameInput = page.locator('input[placeholder*="Nombre de la plantilla"]')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Mi Plantilla')
    const saveFormBtn = page.locator('.rounded-lg.border')
      .filter({ hasText: 'Guardar como plantilla' })
      .getByRole('button', { name: /Guardar/i })
    await saveFormBtn.click()
    await expect(page.getByText('Guardar como plantilla')).not.toBeVisible()
  })

  // Prompt History
  test('prompt history opens and shows items', async ({ studioPage: page }) => {
    const historialBtn = page.getByRole('button', { name: /Historial/i })
    await expect(historialBtn).toBeVisible()
    await historialBtn.click()
    await expect(page.getByText('Foto de producto con fondo degradado')).toBeVisible()
    await expect(page.getByText('Logo minimalista en blanco y negro')).toBeVisible()
    await expect(page.getByText('Ilustracion para post de Instagram')).toBeVisible()
  })

  test('clicking a history item loads the prompt', async ({ studioPage: page }) => {
    await page.getByRole('button', { name: /Historial/i }).click()
    await page.getByText('Foto de producto con fondo degradado').click()
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await expect(textarea).toHaveValue('Foto de producto con fondo degradado')
  })

  // Guardar button disabled without input
  test('Guardar button is disabled when prompt is empty', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('')
    const guardarBtn = page.getByRole('button', { name: /Guardar/i }).first()
    await expect(guardarBtn).toBeDisabled()
  })

  // Prompt Builder
  test('prompt builder opens and has fields', async ({ studioPage: page }) => {
    const builderBtn = page.getByRole('button', { name: /Builder/i })
    await expect(builderBtn).toBeVisible()
    await builderBtn.click()
    const sujetoInput = page.locator('input[placeholder*="cafe latte"]')
    await expect(sujetoInput).toBeVisible()
  })
})

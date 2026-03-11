import { test, expect } from '../fixtures/studio'

test.describe('Studio - Image Generation', () => {
  test.beforeEach(async ({ studioPage: page }) => {
    const genButton = page.getByRole('button', { name: /Generar Imagenes/i })
    if (await genButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genButton.click()
    }
    await page.getByText('AI Generador').waitFor({ timeout: 5000 }).catch(() => {})
  })

  // Prompt Input
  test('prompt textarea renders and accepts text', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await expect(textarea).toBeVisible()
    await textarea.fill('Un gato espacial con casco de astronauta')
    await expect(textarea).toHaveValue('Un gato espacial con casco de astronauta')
  })

  test('multiline input with Shift+Enter', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.focus()
    await textarea.fill('Linea uno')
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('Linea dos')
    const value = await textarea.inputValue()
    expect(value).toContain('Linea uno')
    expect(value).toContain('Linea dos')
  })

  test('send button triggers generation', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('Un paisaje surrealista')
    const sendButton = page.locator('button[aria-label*="Enviar"]')
    await expect(sendButton).toBeEnabled()
    await sendButton.click()
    await expect(textarea).toHaveValue('')
  })

  test('Enter key sends prompt', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('Prueba de envio por Enter')
    await page.keyboard.press('Enter')
    await expect(textarea).toHaveValue('')
  })

  test('send button is disabled when input is empty', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('')
    const sendButton = page.locator('button[aria-label*="Enviar"]')
    await expect(sendButton).toBeDisabled()
  })

  // Model Selector
  test('model selector dropdown populates with available models', async ({ studioPage: page }) => {
    const modelSelect = page.locator('select').filter({ has: page.locator('option[value="gemini-2.5-flash-image"]') })
    await expect(modelSelect).toBeVisible()
    await expect(modelSelect.locator('option')).toHaveCount(3)
  })

  test('changing model updates the selected value', async ({ studioPage: page }) => {
    const modelSelect = page.locator('select').filter({ has: page.locator('option[value="imagen-3"]') })
    await modelSelect.selectOption('imagen-3')
    await expect(modelSelect).toHaveValue('imagen-3')
  })

  // Aspect Ratio
  test('aspect ratio buttons toggle correctly', async ({ studioPage: page }) => {
    const btn16_9 = page.getByRole('button', { name: '16:9', exact: true })
    await expect(btn16_9).toBeVisible()
    await btn16_9.click()
    await expect(btn16_9).toHaveClass(/bg-violet/)

    const btn1_1 = page.getByRole('button', { name: '1:1', exact: true })
    await btn1_1.click()
    await expect(btn1_1).toHaveClass(/bg-violet/)
    await expect(btn16_9).not.toHaveClass(/bg-violet/)
  })

  // Batch Size
  test('batch size buttons render for models that support batching', async ({ studioPage: page }) => {
    await expect(page.getByText('Lote')).toBeVisible()
    await expect(page.getByRole('button', { name: '1x', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '2x', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '4x', exact: true })).toBeVisible()
  })

  test('clicking batch size button activates it', async ({ studioPage: page }) => {
    const btn4x = page.getByRole('button', { name: '4x', exact: true })
    await btn4x.click()
    await expect(btn4x).toHaveClass(/bg-violet/)
  })

  // Output Format
  test('output format buttons render (PNG/JPG/WEBP)', async ({ studioPage: page }) => {
    await expect(page.getByText('Formato')).toBeVisible()
    await expect(page.getByRole('button', { name: 'PNG', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'JPG', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WEBP', exact: true })).toBeVisible()
  })

  // Negative Prompt
  test('negative prompt field expands via advanced options', async ({ studioPage: page }) => {
    const advancedToggle = page.getByText('Opciones avanzadas')
    await expect(advancedToggle).toBeVisible()
    await advancedToggle.click()
    await expect(page.getByText('Prompt negativo')).toBeVisible()
  })

  // Seed
  test('seed input and lock toggle exist and function', async ({ studioPage: page }) => {
    await expect(page.getByText('Seed')).toBeVisible()
    const seedInput = page.locator('input[type="number"][placeholder="Auto"]')
    await expect(seedInput).toBeVisible()
    await seedInput.fill('12345')
    await expect(seedInput).toHaveValue('12345')

    const lockButton = page.locator('button[title*="seed"]')
    await expect(lockButton).toBeVisible()
    await lockButton.click()
    await expect(lockButton).toHaveClass(/bg-violet/)
  })

  // AI Enhance
  test('AI enhance button exists', async ({ studioPage: page }) => {
    await expect(page.getByRole('button', { name: /Mejorar/i })).toBeVisible()
  })

  test('AI enhance triggers enhancement when prompt has text', async ({ studioPage: page }) => {
    const textarea = page.locator('textarea[placeholder*="Describe"]')
    await textarea.fill('Un gato durmiendo')
    const enhanceButton = page.getByRole('button', { name: /Mejorar/i })
    await enhanceButton.click()
    await expect(textarea).toHaveValue(/Enhanced:/)
  })

  // Cost Estimate
  test('cost estimate displays and updates with model change', async ({ studioPage: page }) => {
    await expect(page.getByText('$0.02')).toBeVisible()
    const modelSelect = page.locator('select').filter({ has: page.locator('option[value="imagen-3"]') })
    await modelSelect.selectOption('imagen-3')
    await expect(page.getByText('$0.04')).toBeVisible()
  })
})

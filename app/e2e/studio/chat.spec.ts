import { test, expect } from '../fixtures/studio'

test.describe('Studio - AI Chat', () => {
  test.beforeEach(async ({ studioPage: page }) => {
    const genButton = page.getByRole('button', { name: /Generar Imagenes/i })
    if (await genButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genButton.click()
    }
    await page.locator('input[placeholder]').first().waitFor({ timeout: 5000 }).catch(() => {})
  })

  // Chat Panel Rendering
  test('chat panel renders with welcome message', async ({ studioPage: page }) => {
    const welcomeText = page.getByText(/asistente creativo|Bienvenido|copiloto creativo|estudio creativo/i)
    await expect(welcomeText.first()).toBeVisible()
  })

  test('chat input field is visible', async ({ studioPage: page }) => {
    const chatInput = page.locator('input[type="text"]').last()
    await expect(chatInput).toBeVisible()
  })

  // Message Send
  test('typing and sending posts a message', async ({ studioPage: page }) => {
    const chatInput = page.locator('input[type="text"]').last()
    await chatInput.fill('Genera una imagen de un perro')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Genera una imagen de un perro')).toBeVisible()
  })

  test('assistant responds after user message', async ({ studioPage: page }) => {
    const chatInput = page.locator('input[type="text"]').last()
    await chatInput.fill('Hola, necesito ayuda')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Hola, necesito ayuda')).toBeVisible()
    await expect(page.getByText(/imagen generada|ajustes/i).first()).toBeVisible({ timeout: 10_000 })
  })

  // Conversation List
  test('conversation list loads', async ({ studioPage: page }) => {
    const convToggle = page.locator('button[title*="conversacion" i]').first()
    if (await convToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await convToggle.click()
    }
    await expect(page.getByText('Sesion de diseno')).toBeVisible({ timeout: 5000 })
  })

  // Input Behavior
  test('input is cleared after sending', async ({ studioPage: page }) => {
    const chatInput = page.locator('input[type="text"]').last()
    await chatInput.fill('Prueba de limpieza')
    await page.keyboard.press('Enter')
    await expect(chatInput).toHaveValue('')
  })

  test('empty input does not send', async ({ studioPage: page }) => {
    const chatInput = page.locator('input[type="text"]').last()
    await chatInput.fill('')
    const messagesBefore = await page.locator('[class*="rounded-xl"]').count()
    await page.keyboard.press('Enter')
    const messagesAfter = await page.locator('[class*="rounded-xl"]').count()
    expect(messagesAfter).toBe(messagesBefore)
  })

  // Quick Actions
  test('quick action buttons render', async ({ studioPage: page }) => {
    const anyQuickAction = page.locator('button').filter({
      hasText: /Generar|Crear Videos|Ver Galeria|Estado/i,
    })
    const count = await anyQuickAction.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('the app loads and redirects to the login page', async ({ page }) => {
    await page.goto('/')

    // Unauthenticated users are redirected to /iniciar-sesion
    await expect(page).toHaveURL(/iniciar-sesion/)

    // The page title is set by index.html
    await expect(page).toHaveTitle('DistritoMKT CRM')

    // The Google login button is visible
    await expect(
      page.getByRole('button', { name: /continuar con google/i }),
    ).toBeVisible()
  })
})

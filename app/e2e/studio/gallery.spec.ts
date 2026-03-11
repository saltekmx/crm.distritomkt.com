import { test, expect } from '../fixtures/studio'

test.describe('Studio - Gallery & Assets', () => {
  test.beforeEach(async ({ studioPage: page }) => {
    const genButton = page.getByRole('button', { name: /Generar Imagenes/i })
    if (await genButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await genButton.click()
    }

    const galleryTabBtn = page.getByText('Galeria').first()
    if (await galleryTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await galleryTabBtn.click()
    }
    await page.getByText('Galeria').first().waitFor({ timeout: 5000 }).catch(() => {})
  })

  // Gallery Rendering
  test('gallery tab renders thumbnails for completed generations', async ({ studioPage: page }) => {
    const galleryCards = page.locator('button').filter({ has: page.locator('.aspect-square') })
    await expect(galleryCards).toHaveCount(3)
  })

  // Search
  test('search filters by prompt text', async ({ studioPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('producto')
    await expect(page.getByText('(1)')).toBeVisible()
  })

  test('search with no results shows empty state', async ({ studioPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await searchInput.fill('xyznonexistent')
    await expect(page.getByText('Sin resultados')).toBeVisible()
  })

  // Filter Tabs
  test('filter tabs render (Todos/Favoritos/Exportados)', async ({ studioPage: page }) => {
    await expect(page.getByRole('button', { name: 'Todos', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Favoritos', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Exportados', exact: true })).toBeVisible()
  })

  test('favorites filter shows only favorited images', async ({ studioPage: page }) => {
    await page.getByRole('button', { name: 'Favoritos', exact: true }).click()
    await expect(page.getByText('(1)')).toBeVisible()
  })

  test('exported filter shows only exported images', async ({ studioPage: page }) => {
    await page.getByRole('button', { name: 'Exportados', exact: true }).click()
    await expect(page.getByText('(1)')).toBeVisible()
  })

  // Sort
  test('sort options are available', async ({ studioPage: page }) => {
    const sortSelect = page.locator('select').filter({ has: page.locator('option[value="recent"]') })
    await expect(sortSelect).toBeVisible()
    await expect(sortSelect.locator('option[value="recent"]')).toBeAttached()
    await expect(sortSelect.locator('option[value="oldest"]')).toBeAttached()
  })

  // Selection
  test('clicking an image selects it', async ({ studioPage: page }) => {
    const firstCard = page.locator('button').filter({ has: page.locator('.aspect-square') }).first()
    await firstCard.click()
    await expect(firstCard).toHaveClass(/border-violet/)
  })

  test('Ctrl+click enables multi-select', async ({ studioPage: page }) => {
    const cards = page.locator('button').filter({ has: page.locator('.aspect-square') })
    await cards.nth(0).click()
    await cards.nth(1).click({ modifiers: ['Control'] })
    await expect(page.getByText(/\d+ sel\./)).toBeVisible()
  })

  // Favorites
  test('favorite heart icon is visible on favorited card', async ({ studioPage: page }) => {
    const favoriteHeart = page.locator('.text-red-400').first()
    await expect(favoriteHeart).toBeVisible()
  })

  // Bulk Actions
  test('bulk select actions bar appears when items are selected', async ({ studioPage: page }) => {
    const selectBtn = page.getByRole('button', { name: /Seleccionar/i })
    if (await selectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectBtn.click()
    }
    await expect(page.getByText(/sel\./)).toBeVisible()
  })

  // Version Grouping
  test('version grouping toggle button exists', async ({ studioPage: page }) => {
    const versionToggle = page.locator('button[title="Agrupar por version"]')
    await expect(versionToggle).toBeVisible()
  })
})

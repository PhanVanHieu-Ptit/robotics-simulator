import { test, expect } from '@playwright/test'

/**
 * Golden-path smoke test.
 *
 * Verifies that the app loads, renders a 3D canvas, and can start
 * the simulation without crashing. Tests a minimal slice of the critical
 * path: startup → canvas present → no error boundary rendered.
 */
test('app loads and renders a 3D canvas', async ({ page }) => {
  await page.goto('/')

  // The Three.js canvas must be present — its absence means SceneRoot crashed.
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 10_000 })
})

test('no error boundary is shown on load', async ({ page }) => {
  await page.goto('/')

  // If ErrorBoundary triggers, "Something went wrong" appears.
  await expect(page.getByText('Something went wrong')).not.toBeVisible({ timeout: 5_000 })
})

test('Start button exists and is clickable', async ({ page }) => {
  await page.goto('/')

  // The simulation toolbar should render a Start button.
  const startBtn = page.getByRole('button', { name: /start/i })
  await expect(startBtn).toBeVisible({ timeout: 10_000 })
  await startBtn.click()

  // After clicking Start, the error boundary must still not appear.
  await expect(page.getByText('Something went wrong')).not.toBeVisible()
})

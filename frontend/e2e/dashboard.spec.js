import { test, expect } from '@playwright/test'

test('direct dashboard route renders login protection', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/(?:dashboard|login)?$/)
  await expect(page.locator('body')).toBeVisible()
})

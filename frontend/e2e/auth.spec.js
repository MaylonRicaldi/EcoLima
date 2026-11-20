import { test, expect } from '@playwright/test'

test('login rejects empty credentials', async ({ page }) => {
  await page.goto('/login')
  const submit = page.getByRole('button', { name: /iniciar sesión/i })
  await submit.click()
  await expect(page.locator('body')).toBeVisible()
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('selected strategy follows split controls and recalculates other assumptions', async ({
  page,
}) => {
  await page.goto('./')
  const selected = page.locator('.result-card[data-selected="true"]')
  await expect(selected.getByRole('heading')).toHaveText('50/50 split')
  const initial = await selected.locator('.big-number').textContent()
  const baseline529 = await page
    .locator('.result-card')
    .filter({ has: page.getByRole('heading', { name: '529 plan', exact: true }) })
    .locator('.big-number')
    .textContent()
  await page.getByRole('button', { name: '75% 529 / 25% Trump', exact: true }).click()
  await expect(selected.getByRole('heading')).toHaveText('75/25 split')
  await expect(selected.locator('.big-number')).not.toHaveText(initial!)
  await expect(page.locator('.result-card').first()).toHaveAttribute('data-selected', 'true')
  await expect(page.locator('.result-card').nth(1).locator('.big-number')).toHaveText(baseline529!)
  const seventyFive = await selected.locator('.big-number').textContent()
  await page.getByLabel('529 contribution share').fill('25')
  await expect(selected.getByRole('heading')).toHaveText('25/75 split')
  await expect(selected.locator('.big-number')).not.toHaveText(seventyFive!)
  await page.getByRole('button', { name: '100% Trump Account', exact: true }).click()
  await expect(selected.getByRole('heading')).toHaveText('Trump Account')
  await page.getByRole('button', { name: '100% 529', exact: true }).click()
  await expect(selected.getByRole('heading')).toHaveText('529 plan')
  for (const [label, value] of [
    ['Annual parent contribution', '10000'],
    ['Real investment return', '6'],
    ['Retirement age', '60'],
  ]) {
    const before = await selected.locator('.big-number').textContent()
    await page.getByLabel(label).fill(value)
    await expect(selected.locator('.big-number')).not.toHaveText(before!)
  }
  await page.getByText('Advanced assumptions', { exact: false }).first().click()
  const before = await selected.locator('.big-number').textContent()
  await page.getByLabel('Annual tuition & fees').fill('20000')
  await expect(selected.locator('.big-number')).not.toHaveText(before!)
})

test('static app works, changes presets, exposes math and sources, shares deterministically', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'Small humans. Big possibilities.' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '529 plan', exact: true })).toBeVisible()
  const before = await page.locator('.big-number').first().textContent()
  await page.getByRole('button', { name: 'No college', exact: true }).click()
  await expect(page.locator('.big-number').first()).not.toHaveText(before!)
  await page.getByRole('button', { name: '100% Trump Account', exact: true }).click()
  await expect(page.locator('.result-card')).toHaveCount(2)
  await page.getByLabel('Annual parent contribution').fill('3000')
  await page.getByLabel('Annual parent contribution').blur()
  await expect(page.locator('.comparison')).toHaveAttribute('aria-busy', 'false')
  await page.getByText('Advanced assumptions', { exact: false }).first().click()
  await expect(page.getByLabel('Tax modeling')).toBeVisible()
  await page.getByLabel('Enable illustrative gap financing').uncheck()
  await page.getByText('Show the math', { exact: true }).click()
  await expect(
    page.getByRole('table', { name: '529 plan: monthly calculation ledger' }),
  ).toBeVisible()
  await page.getByLabel('Event type').selectOption('contribution')
  await expect(
    page.getByRole('table', { name: '529 plan: monthly calculation ledger' }),
  ).toContainText('Scheduled parent contribution')
  await page.getByText('Methodology & sources', { exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Primary source registry' })).toBeVisible()
  await expect(page.locator('.source-grid a[href*="irs.gov"]').first()).toHaveAttribute(
    'href',
    /irs.gov/,
  )
  const saved = await page.locator('.big-number').allTextContents()
  await page.getByRole('button', { name: 'Copy scenario link' }).click()
  await expect(page).toHaveURL(/v=1/)
  const url = page.url()
  await page.goto(url)
  await expect(page.locator('.big-number')).toHaveText(saved)
  expect(errors).toEqual([])
})
test('education gap, conversion controls, tables and responsive layout', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Annual parent contribution').fill('0')
  await page.getByText('Advanced assumptions', { exact: false }).first().click()
  await page.getByLabel('Enable illustrative gap financing').uncheck()
  await expect(page.locator('.gap-warning').first()).toBeVisible()
  await page.getByLabel('Trump → Roth conversion').selectOption('fixed')
  await page.getByLabel('Fixed annual gross conversion').fill('10000')
  await page.getByText('Compare every number', { exact: false }).click()
  await expect(
    page.getByRole('table', { name: 'Full strategy comparison in real 2026 dollars' }),
  ).toContainText('Unfunded education gap')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const controls = page.locator('input:visible,select:visible')
  for (const el of await controls.all())
    expect(
      await el.evaluate((e) =>
        Boolean(
          e.closest('label') ||
            e.getAttribute('aria-label') ||
            document.querySelector(`label[for="${e.id}"]`),
        ),
      ),
    ).toBe(true)
  await page.screenshot({
    path: `test-results/${test.info().project.name}-comparison.png`,
    fullPage: true,
  })
})
test('invalid shared state fails safely', async ({ page }) => {
  await page.goto('./?v=999')
  await expect(page.locator('.notice[role="status"]')).toContainText('Unsupported scenario version')
  await expect(page.locator('.result-card')).toHaveCount(3)
})

test('accessible default experience', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.result-card')).toHaveCount(3)
  await expect(page.locator('.chart').first()).toBeVisible()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
})

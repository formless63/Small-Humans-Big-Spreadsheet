import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('selected strategy follows split controls and recalculates other assumptions', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
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
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
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
  await page.getByLabel('Ledger strategy').selectOption('529')
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
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
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
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
  await expect(page.locator('.result-card')).toHaveCount(3)
  await expect(page.locator('.chart').first()).toBeVisible()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
})

test('guided questions narrow choices and keep detailed controls on the same page', async ({
  page,
}) => {
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'What would you like this money to do?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Keep future options open', exact: false }).click()
  await expect(page.locator('.result-card').first()).toContainText('Parent-owned investments')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Annual family saving budget').fill('7000')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'No college', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Child’s earned-income Roth IRA', exact: false }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Cash / savings / CDs', exact: false }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Show my comparison', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your comparison is ready.' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
  await expect(page.getByLabel('Annual parent contribution')).toHaveValue('7000')
  await expect(page.getByLabel('Selected savings strategy')).toHaveValue('cash')
  await page.getByRole('button', { name: 'Copy scenario link' }).click()
  const saved = await page.locator('.big-number').allTextContents()
  await page.goto(page.url())
  await expect(page.locator('.big-number')).toHaveText(saved)
})

test('expanded strategies, aid, sensitivity and family controls produce visible results', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
  await page.getByLabel('Selected savings strategy').selectOption('brokerage')
  await expect(page.locator('.result-card').first()).toContainText('Parent-owned investments')
  await page.getByText('Investment risk & stress scenarios', { exact: true }).click()
  await page.getByLabel('Compare alternate returns, tuition, aid and tax rates').check()
  await expect(
    page.getByRole('table', { name: 'Selected-strategy sensitivity comparison' }),
  ).toContainText('Higher tuition')
  await page.getByText('Financial aid: ownership sensitivity', { exact: true }).click()
  await page.getByLabel('Aid modeling').selectOption('assetImpact')
  await page.getByText('Financial aid: what ownership changes', { exact: true }).click()
  await expect(
    page.getByRole('table', { name: 'Annual asset assessments and modeled aid response' }),
  ).toContainText('Parent-owned investments')
  await page.getByText('Multiple children & annual IRA basis review', { exact: true }).click()
  await page.getByLabel('Additional children’s birth dates (comma separated)').fill('2025-01-15')
  await page.getByLabel('Additional children’s birth dates (comma separated)').blur()
  await expect(page.getByRole('table', { name: 'Equal-budget family projections' })).toContainText(
    'Child 2',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('guided default meets accessibility checks', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Let’s build your plan.' })).toBeVisible()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
})

test('calculations stay local offline and use the latest edited values', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
  await expect(page.locator('.result-card')).toHaveCount(3)
  await expect(page.locator('.comparison')).toHaveAttribute('aria-busy', 'false')
  await context.setOffline(true)
  await page.getByLabel('Annual parent contribution').fill('6000')
  await page.getByLabel('Annual parent contribution').fill('8000')
  await expect(page.locator('.comparison')).toHaveAttribute('aria-busy', 'false')
  await page.getByText('Compare every number', { exact: false }).click()
  await expect(
    page.getByRole('table', { name: 'Full strategy comparison in real 2026 dollars' }),
  ).toContainText('$122,000')
  await expect(page.locator('[role="alert"]')).toHaveCount(0)
})

test('the math ledger follows the selected plan until an explicit reference is chosen', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
  await page.getByText('Show the math', { exact: true }).click()
  await expect(
    page.getByRole('table', { name: '50/50 split: monthly calculation ledger' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '75% 529 / 25% Trump', exact: true }).click()
  await expect(
    page.getByRole('table', { name: '75/25 split: monthly calculation ledger' }),
  ).toBeVisible()
  await page.getByLabel('Ledger strategy').selectOption('529')
  await page.getByRole('button', { name: '100% Trump Account', exact: true }).click()
  await expect(
    page.getByRole('table', { name: '529 plan: monthly calculation ledger' }),
  ).toBeVisible()
})

test('guided transfers, account makeup, year inspection and timing comparison share the same plan', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'Where the money lives—and where it goes' }),
  ).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Move money later', exact: false }).click()
  await expect(
    page.getByRole('heading', { name: 'Would you like to move savings into Roth later?' }),
  ).toBeVisible()
  await page.getByLabel('Trump → Roth conversion').selectOption('custom')
  await page.getByRole('button', { name: 'Add conversion year' }).click()
  await page.getByLabel('Gross amount', { exact: true }).fill('5000')
  await page.getByLabel('Enable eligible 529 → Roth rollovers', { exact: true }).check()
  await page.getByLabel('Start 529 rollover attempts at calendar age (0 = after school)').fill('18')
  await page.getByLabel('Compare transfer timing with the same starting mix').check()
  await expect(
    page.getByRole('table', { name: 'Transfer timing comparison for the selected mix' }),
  ).toContainText('Spread Trump conversions from age 18', { timeout: 20000 })
  await page.getByLabel('Inspect calendar year').selectOption('2042')
  await expect(
    page.getByRole('table', { name: '2042: transfers and eligibility checks' }),
  ).toContainText('Trump → Roth')
  await expect(
    page.getByRole('table', { name: '2042: transfers and eligibility checks' }),
  ).toContainText('compensation')
  const table = page.getByRole('table', { name: '2042: account balances and flows' })
  await expect(table).toContainText('Roth from transfers')
  const before = await table.textContent()
  await page.getByRole('checkbox', { name: 'Trump / traditional IRA', exact: true }).uncheck()
  await expect(table).toHaveText(before!)
  await page.getByText('Annual money flows and account balances', { exact: true }).click()
  await expect(page.getByRole('table', { name: 'Annual portfolio flow totals' })).toBeVisible()
  await page.getByRole('button', { name: 'Inspect year 2043', exact: true }).click()
  await expect(page.getByLabel('Inspect calendar year')).toHaveValue('2043')
  await page.getByRole('button', { name: 'Copy scenario link' }).click()
  const saved = await page.locator('.big-number').allTextContents()
  await page.goto(page.url())
  await expect(page.locator('.big-number')).toHaveText(saved)
  await page.getByRole('button', { name: 'Move money later', exact: false }).click()
  await expect(page.getByLabel('Trump → Roth conversion')).toHaveValue('custom')
  await expect(page.getByLabel('Gross amount', { exact: true })).toHaveValue('5000')
  await page.getByRole('button', { name: 'Edit all assumptions', exact: true }).click()
  await page.getByText('Advanced assumptions', { exact: false }).first().click()
  await expect(page.getByLabel('Trump → Roth conversion')).toHaveValue('custom')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

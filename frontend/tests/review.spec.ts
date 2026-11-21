import { expect, test, type Page } from '@playwright/test';
import { quoteRange, validateTasks, type Plan } from '../src/review';

const spring = '/api/plans/spring-market';
const assessment = (page: Page) => page.getByRole('region', { name: 'Deadline assessment' });
const firstTask = 'Book the main hall and the side room';

test('duration corrections change the live schedule, survive switches and reset', async ({ page, request }) => {
  const plan: Plan = await (await request.get(spring)).json();
  await page.goto('/');
  await expect(assessment(page)).toContainText('On track');
  const springButton = page.getByRole('button', { name: 'Spring Market', exact: true });
  await expect(springButton).toHaveAccessibleDescription('On track');
  await expect(page.getByRole('region', { name: 'Finding to check' })).toHaveCount(0);
  await expect(page.getByText(/Select a task name to edit it/)).toBeVisible();
  await expect(assessment(page)).toContainText(`Day ${plan.schedule!.end_day}`);
  await page.getByRole('button', { name: 'Edit task: ' + firstTask, exact: true }).click();
  const duration = page.getByLabel('Duration in days');
  await duration.fill('0');
  await page.getByRole('button', { name: 'Save and recalculate' }).click();
  await expect(duration).toBeFocused();
  await duration.fill('12');
  const posted = page.waitForResponse(r => r.url().endsWith('/api/schedule') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save and recalculate' }).click();
  const response = await posted;
  expect(response.request().postDataJSON().tasks[0].quote).toBe(plan.review.tasks[0].quote);
  const changed = await response.json();
  expect(changed.end_day).toBeGreaterThan(plan.schedule!.end_day!);
  await expect(assessment(page)).toContainText(`Day ${changed.end_day}`);
  await expect(assessment(page)).toContainText('At risk');
  await expect(springButton).toHaveAccessibleDescription('At risk');
  await expect(page.getByText('Edited in this tab', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Lantern Festival', exact: true }).click();
  await expect(assessment(page)).toContainText('7 days late');
  await expect(assessment(page)).toContainText('Ruth');
  await expect(springButton).toHaveAccessibleDescription('At risk');
  await page.getByRole('button', { name: 'Spring Market', exact: true }).click();
  await expect(assessment(page)).toContainText(`Day ${changed.end_day}`);
  await page.getByRole('button', { name: 'Reset to original review' }).click();
  await expect(assessment(page)).toContainText('On track');
  await expect(springButton).toHaveAccessibleDescription('On track');
  await expect(page.getByRole('button', { name: 'Reset to original review' })).toHaveCount(0);
  await expect(assessment(page)).toContainText(`Day ${plan.schedule!.end_day}`);
});

for (const width of [1360, 390]) {
  test(`Lantern highlights a source-backed finding beside the decision at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 844 });
    const plan: Plan = await (await request.get('/api/plans/lantern-festival')).json();
    await page.goto('/');
    if (width === 390) await page.getByRole('combobox', { name: 'Event plan' }).selectOption('lantern-festival');
    else {
      const button = page.getByRole('button', { name: 'Lantern Festival', exact: true });
      await expect(button).toHaveAccessibleDescription('Open to check');
      await button.click();
      await expect(button).toHaveAccessibleDescription('At risk');
    }
    await expect(assessment(page)).toContainText('7 days late');
    const summary = page.getByRole('region', { name: 'Finding to check' });
    await expect(summary.getByRole('heading')).toHaveText(plan.review.findings[0].title);
    await expect(summary).toContainText('From the saved review');
    await expect(summary.getByRole('heading')).toBeInViewport();
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(23);
    await expect(page.getByText(/Individual tasks may start earlier/)).toBeVisible();
    await summary.getByRole('button', { name: 'View in plan' }).click();
    await expect(page.locator('mark')).toHaveText(plan.review.findings[0].quote!);
    await page.keyboard.press('Escape');
    await summary.getByRole('button', { name: 'See all 3 findings' }).click();
    await expect(page.getByRole('button', { name: /Review findings/ })).toBeFocused();
    await expect(page.getByRole('article').getByRole('heading')).toHaveText(plan.review.findings.map(f => f.title));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('Harbour Run shows the actual loop and edits its prerequisites and findings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Harbour Run 5k' }).click();
  await expect(assessment(page)).toContainText('Cannot schedule');
  await expect(assessment(page)).toContainText('Get the course approved by the council');
  await expect(assessment(page)).toContainText('Take out the event insurance');
  const harbourButton = page.getByRole('button', { name: 'Harbour Run 5k' });
  await expect(harbourButton).toHaveAccessibleDescription('Cannot schedule');
  await expect(page.getByText(/Start and finish days are unavailable/)).toBeVisible();
  await expect(page.locator('td[data-label="Start"], td[data-label="Finish"]')).toHaveText(Array(24).fill('—'));
  await page.getByRole('button', { name: 'Edit task: Take out the event insurance' }).click();
  await page.getByRole('checkbox', { name: 'Get the course approved by the council', exact: true }).uncheck();
  await page.getByLabel('Assigned owner').fill('Joan');
  await page.getByLabel('Task name').fill('Confirm the policy');
  await page.getByRole('button', { name: 'Save and recalculate' }).click();
  await expect(assessment(page)).toContainText('On track');
  await expect(harbourButton).toHaveAccessibleDescription('On track');
  await expect(page.getByText(/Individual tasks may start earlier/)).toBeVisible();
  await page.getByRole('button', { name: /Review findings/ }).click();
  const first = page.locator('.finding').first();
  await first.getByRole('button', { name: 'View in plan' }).click();
  const passage = await page.locator('mark').innerText();
  await expect(page.locator('mark')).toBeInViewport();
  await page.keyboard.press('Escape');
  await first.getByRole('button', { name: 'Edit finding' }).click();
  await page.getByLabel('Finding title').fill('Committee confirmed insurance');
  await page.getByLabel('Explanation').fill('Nora checked the order with the committee.');
  await page.getByRole('button', { name: 'Save correction' }).click();
  await expect(first).toContainText('Committee confirmed insurance');
  await expect(page.getByRole('region', { name: 'Finding to check' }).getByRole('heading')).toHaveText('Committee confirmed insurance');
  await expect(page.getByRole('region', { name: 'Finding to check' })).toContainText('Finding edited in this tab');
  await first.getByRole('button', { name: 'View in plan' }).click();
  await expect(page.locator('mark')).toHaveText(passage);
});

test('a rejected correction displays the API error and can be retried', async ({ page }) => {
  await page.goto('/');
  await expect(assessment(page)).toContainText('On track');
  await page.getByRole('button', { name: 'Edit deadline' }).click();
  await page.getByLabel('Deadline day').fill('35');
  // Change one outgoing request so the real backend exercises strict input validation.
  await page.route('**/api/schedule', route => route.continue({
    postData: JSON.stringify({ ...route.request().postDataJSON(), deadline_day: null }),
  }), { times: 1 });
  const posted = page.waitForResponse(r => r.url().endsWith('/api/schedule'));
  await page.getByRole('button', { name: 'Save and recalculate' }).click();
  expect((await posted).status()).toBe(422);
  await expect(assessment(page)).toContainText('Check the task details and deadline');
  await expect(assessment(page)).not.toContainText('On track');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(assessment(page)).toContainText('On track');
});

test('missing deadline avoids scheduling until supplied; 503 hides all success and allows retry', async ({ page, request }) => {
  const plan: Plan = await (await request.get(spring)).json();
  plan.review.deadline_day = null;
  plan.schedule = null;
  await page.route('**' + spring, route => route.fulfill({ json: plan }));
  let posts = 0;
  await page.route('**/api/schedule', route => {
    posts++;
    expect(Number.isInteger(route.request().postDataJSON().deadline_day)).toBe(true);
    return posts === 1 ? route.fulfill({ status: 503 }) : route.continue();
  });
  await page.goto('/');
  await expect(assessment(page)).toContainText('Deadline not stated');
  expect(posts).toBe(0);
  await page.getByRole('button', { name: 'Edit deadline' }).click();
  await page.getByLabel('Deadline day').fill('20');
  await page.getByRole('button', { name: 'Save and recalculate' }).click();
  await expect(assessment(page)).toContainText('timed out');
  await expect(page.getByRole('button', { name: 'Spring Market', exact: true })).toHaveAccessibleDescription('Schedule unavailable');
  await expect(assessment(page)).not.toContainText('On track');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(assessment(page)).toContainText('On track');
  await page.getByRole('button', { name: 'Reset to original review' }).click();
  await expect(assessment(page)).toContainText('Deadline not stated');
  expect(posts).toBe(2);
});

test('mobile plan picker and task evidence use exact original whitespace and safe text', async ({ page, request }) => {
  const plan: Plan = await (await request.get(spring)).json();
  const passage = '<script>alert(1)</script>\n\t  Café';
  plan.text = 'Plan heading\n' + passage;
  plan.review.tasks[0].quote = '<script>alert(1)</script> Café';
  plan.review.findings = [{ title: 'Check staffing', detail: 'Confirm a second volunteer.', quote: null }];
  await page.route('**' + spring, route => route.fulfill({ json: plan }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Event plan' })).toBeVisible();
  const summary = page.getByRole('region', { name: 'Finding to check' });
  await expect(summary.getByRole('heading')).toHaveText('Check staffing');
  await expect(summary.getByRole('button', { name: 'View in plan' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Quote for ' + firstTask, exact: true }).click();
  await expect(page.locator('mark')).toHaveText(passage, { useInnerText: false });
  expect(await page.locator('mark').textContent()).toBe(passage);
  await expect(page.locator('dialog script')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: /Review findings/ }).click();
  await expect(page.getByText('No specific source quotation was provided.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Event plan' }).selectOption('lantern-festival');
  await expect(assessment(page)).toContainText('At risk');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty list and failed list fetch offer clear states', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/plans', route => ++attempts === 1 ? route.fulfill({ status: 500 }) : route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('HTTP 500');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('status')).toContainText('no event plans');
});

test('filters a sixty-task plan by owner and handles missing evidence', async ({ page, request }) => {
  const plan: Plan = await (await request.get(spring)).json();
  plan.review.tasks = Array.from({ length: 60 }, (_, i) => ({
    ...plan.review.tasks[0], id: String(i), name: `Task ${i + 1}`, owner: i === 59 ? null : 'Nora',
    quote: 'This sentence is absent.',
  }));
  plan.review.deadline_day = null;
  plan.schedule = null;
  await page.route('**' + spring, route => route.fulfill({ json: plan }));
  await page.goto('/');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(61);
  await page.getByRole('searchbox').fill('Unassigned');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Quote for Task 60' }).click();
  await expect(page.getByRole('dialog')).toContainText('could not be located');
  await expect(page.locator('mark')).toHaveCount(0);
});

test('a delayed schedule cannot replace a different plan', async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/schedule', async route => { await hold; await route.fulfill({ status: 503 }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit deadline' }).click();
  await page.getByLabel('Deadline day').fill('35');
  await page.getByRole('button', { name: 'Save and recalculate' }).click();
  await expect(assessment(page)).toContainText('Calculating');
  await page.getByRole('button', { name: 'Harbour Run 5k' }).click();
  await expect(assessment(page)).toContainText('Cannot schedule');
  await expect(page.getByRole('button', { name: 'Spring Market', exact: true })).toHaveAccessibleDescription('Open to check');
  release();
  await expect(assessment(page)).toContainText('Cannot schedule');
});

test('quoted ranges and scheduling limits follow the contracts', () => {
  expect(quoteRange('Café\u0085  open', 'Café open')).toEqual([0, 11]);
  expect(quoteRange(' One', 'one')).toBeNull();
  const task = { id: '1', name: 'Task', owner: null, quote: 'Task', depends_on: [], duration_days: 1 };
  expect(validateTasks(Array.from({ length: 60 }, (_, i) => ({ ...task, id: String(i) })))).toBeNull();
  expect(validateTasks(Array(61).fill(task))).toContain('60');
  expect(validateTasks([task, task])).toContain('unique');
  expect(validateTasks([{ ...task, depends_on: ['2'] }])).toContain('missing');
});

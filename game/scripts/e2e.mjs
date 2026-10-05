import { resolve } from 'node:path';
import { chromium } from 'playwright';

const url = process.env.E2E_URL || 'http://127.0.0.1:5173/';
const shot =
  process.env.SCRATCH_TUTORIAL ||
  resolve('scripts/e2e-phone.png');

const browser = await chromium.launch({ headless: true });
try {
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

if (!(await page.locator('text=ルナネコ式').count())) throw new Error('title missing');
if (!(await page.locator('#start').count())) throw new Error('はじめる missing');
await page.locator('#start').click();
await page.locator('.pick').first().click();
await page.locator('#name').fill('QA');
await page.locator('#go').click();
await page.waitForTimeout(250);

for (let i = 0; i < 12; i++) {
  if (!(await page.locator('#talk').count())) break;
  await page.locator('#talk').click();
  await page.waitForTimeout(80);
}

await page.locator('#go').filter({ hasText: 'バトル開始' }).click();
await page.waitForSelector('.screen.battle');
if (await page.locator('#vs-intro').count()) {
  await page.locator('#vs-intro').click();
  await page.locator('#vs-intro').waitFor({ state: 'detached' });
}
await page.waitForSelector('#tut-live', { timeout: 8000 });
if (!(await page.locator('#tut-live').count())) throw new Error('live tutorial missing on play screen');
if (!(await page.locator('#tut-live').getByText('たね').count())) throw new Error('tutorial missing たね');
if (!(await page.locator('.screen.battle').count())) throw new Error('tutorial is not the play screen');
await page.screenshot({ path: shot, fullPage: true });
await page.locator('#tut-skip').click();
await page.waitForTimeout(150);

await page.waitForTimeout(250);
if (await page.locator('#rules-btn').count()) {
  await page.locator('#rules-btn').click();
  await page.waitForTimeout(200);
  if (!(await page.locator('text=攻撃力').count())) throw new Error('rules overlay missing');
  await page.locator('.inspect-x').click();
}

const box = await page.locator('#app').boundingBox();
if (!box) throw new Error('app not laid out');
if (box.width < 300 || box.width > 500) throw new Error('not phone width: ' + box.width);
if (errors.length) throw new Error('page errors: ' + errors.join('; '));

console.log('e2e ok', { width: box.width, tutorial: true, shot });
} finally {
  await browser.close();
}

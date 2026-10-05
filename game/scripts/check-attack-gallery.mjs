import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const game = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.E2E_URL || 'http://127.0.0.1:5175/';
const galleryUrl = new URL('attack-gallery.html', base).href;
const output = resolve(game, '../studio/pdca/audit-2026-10-05');
mkdirSync(output, { recursive: true });
const report = { catalogCount: 0, viewports: [], voices: [] };
const browser = await chromium.launch({ headless: true });

function galleryCatalog(data) {
  return data.map(card => ({ ...card,
    art: card.art.startsWith('/') ? '.' + card.art : card.art,
    src: '.' + card.src,
    poster: '.' + card.poster,
  }));
}

function expectedIds(catalog, term = '', element = '') {
  const needle = term.trim().toLocaleLowerCase();
  return catalog.filter((card) => (!element || card.specialty === element)
    && (!needle || [card.id, card.name, card.skill].join(' ').toLocaleLowerCase().includes(needle)))
    .map((card) => card.id);
}

async function assertCards(page, catalog, term = '', element = '') {
  const expected = expectedIds(catalog, term, element);
  await page.waitForFunction(({ expected }) => {
    return [...document.querySelectorAll('.entry')].map((card) => card.dataset.id).join('|') === expected.join('|');
  }, { expected });
  const actual = await page.locator('.entry').evaluateAll((cards) => cards.map((card) => card.dataset.id));
  assert.deepEqual(actual, expected);
  assert.equal(await page.locator('#status').textContent(), expected.length + ' / ' + catalog.length + ' 体');
  assert.equal(await page.locator('.empty').count(), expected.length ? 0 : 1);
  return expected;
}

async function readyImage(image) {
  await image.evaluate((node) => new Promise((resolve, reject) => {
    if (node.complete) return node.naturalWidth ? resolve() : reject(new Error('Image failed: ' + node.src));
    node.addEventListener('load', resolve, { once: true });
    node.addEventListener('error', () => reject(new Error('Image failed: ' + node.src)), { once: true });
  }));
}

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Observe real HTMLAudioElement decoding/playback without mocking its media.
    await page.addInitScript(() => {
      const NativeAudio = window.Audio;
      window.__galleryAudio = [];
      window.Audio = function (...args) {
        const media = new NativeAudio(...args);
        const item = { media, pauseCalls: 0, playingEvents: 0, errors: [] };
        const pause = media.pause.bind(media);
        media.pause = () => { item.pauseCalls++; pause(); };
        media.addEventListener('playing', () => item.playingEvents++);
        media.addEventListener('error', () => item.errors.push(media.error?.code || 'unknown'));
        window.__galleryAudio.push(item);
        return media;
      };
      window.Audio.prototype = NativeAudio.prototype;
    });
    const [response] = await Promise.all([
      page.waitForResponse((response) => new URL(response.url()).pathname === new URL('attack-catalog.json', base).pathname),
      page.goto(galleryUrl, { waitUntil: 'networkidle' }),
    ]);
    assert.equal(response.status(), 200);
    const catalog = galleryCatalog(await response.json());
    assert.ok(catalog.length > 0, 'at least one reviewed motion must be registered');
    assert.equal(new Set(catalog.map((card) => card.id)).size, catalog.length);
    report.catalogCount = catalog.length;
    await assertCards(page, catalog);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');

    const card = catalog[0];
    for (const term of [card.id.toLocaleUpperCase(), card.name, card.skill]) {
      if (!term) continue;
      await page.locator('#search').fill(term);
      await assertCards(page, catalog, term);
    }
    await page.locator('#search').fill('');
    for (const element of ['flame', 'ice', 'nature', 'dark', 'rare']) {
      await page.locator('#element').selectOption(element);
      await assertCards(page, catalog, '', element);
    }
    await page.locator('#search').fill(card.id);
    await page.locator('#element').selectOption(card.specialty);
    await assertCards(page, catalog, card.id, card.specialty);
    const otherElement = ['flame', 'ice', 'nature', 'dark', 'rare'].find((element) => element !== card.specialty);
    await page.locator('#element').selectOption(otherElement);
    await assertCards(page, catalog, card.id, otherElement);
    await page.locator('#element').selectOption('');
    await page.locator('#search').fill('__missing_character_qa__');
    await assertCards(page, catalog, '__missing_character_qa__');

    await page.locator('#search').fill(card.id);
    await assertCards(page, catalog, card.id);
    const entry = page.locator('.entry').filter({ has: page.locator('b', { hasText: card.name }) }).first();
    const pose = entry.locator('.pose');
    await readyImage(pose);
    assert.equal(await pose.getAttribute('src'), card.poster);
    await entry.locator('.flip').click();
    assert.ok(await entry.evaluate((node) => node.classList.contains('reversed')));
    assert.ok((await pose.evaluate((node) => getComputedStyle(node).transform)).startsWith('matrix(-1,'));
    await entry.locator('.play').click();
    const firstPlay = await pose.getAttribute('src');
    assert.ok(firstPlay.startsWith(card.src + '?play='));
    await readyImage(pose);
    const gif = await page.request.get(new URL(firstPlay, base).href);
    assert.match((await gif.body()).subarray(0, 6).toString(), /^GIF8[79]a$/);
    await page.waitForTimeout(120);
    await page.screenshot({ path: resolve(output, 'attack-gallery-motion-' + viewport.width + '.png') });
    await page.waitForFunction(({ id, poster }) => document.querySelector('[data-id="' + id + '"] .pose')?.getAttribute('src') === poster,
      { id: card.id, poster: card.poster }, { timeout: card.durationMs + 3000 });
    await readyImage(pose);
    await entry.locator('.play').click();
    assert.notEqual(await pose.getAttribute('src'), firstPlay, 'repeated play restarts the GIF clock');
    await page.waitForFunction(({ id, poster }) => document.querySelector('[data-id="' + id + '"] .pose')?.getAttribute('src') === poster,
      { id: card.id, poster: card.poster }, { timeout: card.durationMs + 3000 });
    await entry.locator('.flip').click();
    assert.equal(await pose.evaluate((node) => getComputedStyle(node).transform), 'none');

    if (viewport.width === 1440) {
      for (const [index, id] of ['beg-luna-taunt', 'flame-2-taunt', 'mochi-fhe'].entries()) {
        await page.locator('[data-voice="' + id + '"]').click();
        await page.waitForFunction((index) => {
          const item = window.__galleryAudio[index];
          return item?.playingEvents > 0 && item.media.currentTime > .01;
        }, index, { timeout: 8000 });
        const result = await page.evaluate((index) => {
          const item = window.__galleryAudio[index];
          return { src: new URL(item.media.src).pathname, duration: item.media.duration, currentTime: item.media.currentTime,
            volume: item.media.volume, paused: item.media.paused, errors: item.errors, previousPauseCalls: index ? window.__galleryAudio[index - 1].pauseCalls : 0 };
        }, index);
        assert.equal(new URL(result.src, galleryUrl).href, new URL('audio/voices/' + id + '.wav', base).href);
        assert.ok(Number.isFinite(result.duration) && result.duration > 0);
        assert.equal(result.volume, .85);
        assert.deepEqual(result.errors, []);
        if (index) assert.ok(result.previousPauseCalls > 0, 'previous character voice is stopped');
        report.voices.push({ id, ...result });
      }
      await page.evaluate(() => window.__galleryAudio.forEach((item) => item.media.pause()));
    }
    await page.locator('#search').fill('');
    await assertCards(page, catalog);
    await page.screenshot({ path: resolve(output, 'attack-gallery-' + viewport.width + '.png') });
    assert.deepEqual(errors, []);
    report.viewports.push({ width: viewport.width, catalogCount: catalog.length, search: true, elementFilter: true, oneShot: true, repeat: true, enemyMirror: true, noOverflow: true });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const gifs = [], errors = [];
  page.on('request', (request) => { if (/\/art\/fx\/attacks\/.*\.gif/.test(request.url())) gifs.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  const [catalogResponse] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === new URL('attack-catalog.json', base).pathname),
    page.goto(galleryUrl, { waitUntil: 'networkidle' }),
  ]);
  const catalog = galleryCatalog(await catalogResponse.json());
  await assertCards(page, catalog);
  const card = catalog[0];
  await page.locator('#search').fill(card.id);
  await assertCards(page, catalog, card.id);
  const entry = page.locator('.entry').first(), pose = entry.locator('.pose');
  await readyImage(pose);
  await entry.locator('.flip').click();
  await entry.locator('.play').click();
  assert.equal(await pose.getAttribute('src'), card.poster);
  assert.match(await page.locator('#status').textContent(), /（静止画）$/);
  assert.ok((await pose.evaluate((node) => getComputedStyle(node).transform)).startsWith('matrix(-1,'));
  await page.waitForTimeout(card.durationMs + 250);
  assert.equal(await pose.getAttribute('src'), card.poster);
  assert.deepEqual(gifs, [], 'reduced motion does not request any GIF');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: resolve(output, 'attack-gallery-reduced-390.png') });
  report.reducedMotion = { catalogCount: catalog.length, staticPoster: true, noGifRequests: true, enemyMirror: true };
  await context.close();
  writeFileSync(resolve(output, 'attack-gallery-qa.json'), JSON.stringify(report, null, 2));
  console.log('attack gallery browser QA passed', report);
} finally {
  await browser.close();
}

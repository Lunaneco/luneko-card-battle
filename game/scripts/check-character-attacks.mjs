import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const game = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.E2E_URL || 'http://127.0.0.1:5175/';
const output = resolve(game, '../studio/pdca/audit-2026-10-05');
mkdirSync(output, { recursive: true });
const report = { passed: false, characters: 0, checkedAssets: 0, expected: [], scenarios: [] };
const browser = await chromium.launch({ headless: true });
try {
  const inventoryPage = await browser.newPage();
  await inventoryPage.goto(base, { waitUntil: 'networkidle' });
  const inventory = await inventoryPage.evaluate(async () => {
    const { beasts } = await import('/src/data/cards.ts');
    const { ATTACK_MOTIONS } = await import('/src/data/attackMotions.ts');
    const { prepareResolveDemo } = await import('/src/engine/battle.ts');
    const { cardArt } = await import('/src/ui/card.ts');
    const demo = prepareResolveDemo();
    return {
      ids: beasts().map((beast) => beast.id), motions: ATTACK_MOTIONS,
      expected: demo.lastCombat.beats.filter((beat) => beat.kind === 'hit').map((beat) => ({
        actor: beat.actor, cardId: demo.players[beat.actor].field.cardId, slot: beat.slot,
        art: cardArt(demo.players[beat.actor].field.cardId),
      })),
    };
  });
  assert.equal(inventory.ids.length, 170);
  assert.deepEqual(Object.keys(inventory.motions).sort(), inventory.ids.sort(), 'every beast must own a generated motion');
  assert.deepEqual(inventory.expected.map(({ art, ...beat }) => beat), [
    { actor: 1, cardId: 'windfeather', slot: 'cross' },
    { actor: 0, cardId: 'moonember', slot: 'circle' },
  ], 'frozen demo must show the enemy and then the player');
  report.characters = inventory.ids.length;
  report.expected = inventory.expected;
  // Vite can return HTML for a missing public asset with 200.
  for (const id of inventory.ids) {
    const motion = inventory.motions[id];
    for (const [kind, path] of [['gif', motion.src], ['png', motion.poster]]) {
      const response = await inventoryPage.request.get(new URL(path, base).href);
      assert.equal(response.status(), 200, id + ': ' + kind);
      const data = await response.body();
      if (kind === 'gif') assert.match(data.subarray(0, 6).toString(), /^GIF8[79]a$/, id + ': GIF signature');
      else assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], id + ': PNG signature');
      report.checkedAssets++;
    }
  }
  await inventoryPage.close();

  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const page = await context.newPage();
    const captureSession = await context.newCDPSession(page);
    const paths = [], errors = [];
    const scenario = { reducedMotion, paths, errors, observed: null, screenshots: [], screenshotEvidence: [] };
    report.scenarios.push(scenario);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/art/fx/attacks/') || path.startsWith('/art/fx/atk-')) paths.push(path);
    });
    // Install before boot. GIFs last 520 ms; reduced-motion beats advance after
    // 240 ms, so waiting for network-idle can miss the first attack entirely.
    await page.addInitScript(() => {
      const created = new WeakMap(), captured = new WeakMap();
      window.__attackMotionQa = { created: [], ready: [] };
      const observe = () => {
        for (const image of document.querySelectorAll('.fx-character-attack')) {
          if (!created.has(image)) {
            const entry = { cardId: image.dataset.character, slot: image.dataset.slot, createdAt: performance.now() };
            window.__attackMotionQa.created.push(entry);
            created.set(image, entry);
          }
          if (captured.has(image) || !image.classList.contains('ready')) continue;
          const mirrored = image.classList.contains('from-top');
          const fighter = document.querySelector('.clash-side.' + (mirrored ? 'you' : 'me'));
          const style = getComputedStyle(image), bounds = image.getBoundingClientRect();
          const record = {
            cardId: image.dataset.character, slot: image.dataset.slot, src: image.getAttribute('src'),
            actor: Number(fighter?.dataset.seat), fighterArt: fighter?.querySelector('.fighter-art img')?.getAttribute('src'),
            mirrored, still: image.classList.contains('still'), reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
            transform: style.transform, opacity: style.opacity,
            naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
            width: bounds.width, height: bounds.height, connected: image.isConnected,
            createdAt: created.get(image).createdAt, readyAt: performance.now(),
          };
          captured.set(image, record);
          window.__attackMotionQa.ready.push(record);
        }
      };
      new MutationObserver(observe).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'src'] });
    });
    try {
      await page.goto(new URL('?cinema=1', base).href, { waitUntil: 'domcontentloaded' });
      for (const [index, expected] of inventory.expected.entries()) {
        await page.waitForFunction((count) => window.__attackMotionQa.ready.length >= count, index + 1, { timeout: 12000 });
        const actor = await page.evaluate((index) => window.__attackMotionQa.ready[index], index);
        assert.equal(actor.cardId, expected.cardId, 'actual generated actor ID and attack order');
        assert.equal(actor.actor, expected.actor, 'motion belongs to the visible fighter seat');
        assert.equal(actor.slot, expected.slot, 'slot-specific FX accompany the correct attack');
        assert.equal(actor.fighterArt, expected.art, 'motion matches the current fighter portrait');
        assert.equal(actor.connected, true);
        assert.ok(actor.naturalWidth > 0 && actor.naturalHeight > 0 && actor.width > 0 && actor.height > 0);
        assert.equal(actor.opacity, '1', 'motion was visibly ready during its beat');
        assert.equal(actor.mirrored, expected.actor === 1);
        if (expected.actor === 1) assert.ok(actor.transform.startsWith('matrix(-1,'), actor.transform);
        else assert.ok(actor.transform.startsWith('matrix(1,'), actor.transform);
        assert.equal(actor.reduced, reducedMotion === 'reduce');
        assert.equal(actor.still, reducedMotion === 'reduce');
        const motion = inventory.motions[expected.cardId];
        if (reducedMotion === 'reduce') assert.equal(actor.src, motion.poster);
        else {
          assert.ok(actor.src.startsWith(motion.src + '?play='));
          assert.match(actor.src, /\.gif\?play=\d+$/);
        }
        // The observer records the exact live actor. Capture a screenshot while
        // that actor is also present, never substituting the next fighter.
        const liveBefore = await page.evaluate(() => ({
          cardId: document.querySelector('.fx-character-attack.ready')?.dataset.character,
          at: performance.now(),
        }));
        assert.equal(liveBefore.cardId, expected.cardId, 'screenshot begins during this actor beat');
        const screenshot = 'character-attack-' + reducedMotion + '-' + expected.cardId + '-390.png';
        // Page.captureScreenshot avoids Playwright's font-ready wait, which can
        // outlast a 240 ms reduced-motion beat and save the later KO screen.
        const capture = await captureSession.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const liveAfter = await page.evaluate(() => ({
          cardId: document.querySelector('.fx-character-attack.ready')?.dataset.character,
          at: performance.now(),
        }));
        assert.equal(liveAfter.cardId, expected.cardId, 'screenshot finishes during this actor beat');
        writeFileSync(resolve(output, screenshot), Buffer.from(capture.data, 'base64'));
        scenario.screenshots.push(screenshot);
        scenario.screenshotEvidence.push({ file: screenshot, liveBefore, liveAfter });
      }
      await page.waitForSelector('#combat-cinema.done', { timeout: 14000 });
      await page.waitForFunction(() => !document.querySelector('.fx-character-attack'), { timeout: 3000 });
      scenario.observed = await page.evaluate(() => window.__attackMotionQa);
      assert.equal(scenario.observed.ready.length, inventory.expected.length, 'both attacks captured exactly once');
      assert.deepEqual(scenario.observed.created.map((record) => record.cardId), inventory.expected.map((beat) => beat.cardId));
      for (const expected of inventory.expected) {
        const motion = inventory.motions[expected.cardId];
        assert.ok(paths.includes(reducedMotion === 'reduce' ? motion.poster : motion.src), expected.cardId + ': motion request');
      }
      assert.equal(paths.some((path) => path.endsWith('.mp4')), false, 'registered character motions replace attribute video');
      if (reducedMotion === 'reduce') assert.equal(paths.some((path) => path.endsWith('.gif')), false, 'reduced motion never requests GIF');
      assert.deepEqual(errors, []);
      scenario.cleanedUp = true;
      scenario.passed = true;
    } catch (error) {
      scenario.observed = await page.evaluate(() => window.__attackMotionQa).catch(() => null);
      scenario.failure = String(error);
      throw error;
    } finally {
      await context.close();
    }
  }
  report.passed = true;
  console.log('character attack browser QA passed', { characters: report.characters, assets: report.checkedAssets, scenarios: report.scenarios.length, output });
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  writeFileSync(resolve(output, 'character-attacks-qa.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

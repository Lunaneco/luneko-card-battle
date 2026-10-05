import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const game = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.E2E_URL || 'http://127.0.0.1:5175/';
const output = resolve(game, '../studio/pdca/audit-2026-10-05');
const reportPath = resolve(output, process.env.REAL_ATTACK_REPORT || 'real-attacks-qa.json');
mkdirSync(output, { recursive: true });
const report = { passed: false, scenarios: [] };
const browser = await chromium.launch({ headless: true });

async function newPlayer(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#start').click();
  await page.locator('.pick[data-id="moonember"]').click();
  await page.locator('#name').fill('実操作QA');
  await page.locator('#go').click();
  await page.locator('#talk').waitFor();
}
async function enterCpu(page) {
  // The normal title restart uses the save created by the actual onboarding UI.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#start').click();
  if (await page.locator('#login-ok').count()) {
    await page.locator('#login-ok').click();
    await page.locator('#login-overlay').waitFor({ state: 'detached' });
  }
  await page.locator('#online').click();
  await page.locator('#cpu').click();
}
async function enterStory(page) {
  await page.locator('#talk-skip').click();
  await page.locator('#go').click();
}
async function skipIntro(page) {
  await page.locator('#vs-intro').waitFor();
  await page.locator('#vs-intro').click();
  await page.locator('#vs-intro').waitFor({ state: 'detached' });
  if (await page.locator('#tut-skip').count()) await page.locator('#tut-skip').click();
}
async function playToResolve(page, scenario) {
  const submitted = new Set();
  for (let guard = 0; guard < 100; guard++) {
    const state = await page.evaluate(() => ({
      phase: document.querySelector('.phase-pill')?.textContent,
      cinema: !!document.querySelector('#combat-cinema'),
      buttons: [...document.querySelectorAll('#acts [data-act]')].map((node) => ({
        action: JSON.parse(node.getAttribute('data-act')), text: node.textContent,
      })),
      hand: [...document.querySelectorAll('#myhand .card[data-iid]')].map((node) => ({ id: node.dataset.id, iid: node.dataset.iid, level: node.querySelector('.lv')?.textContent?.trim() })),
    }));
    if (state.cinema) return;
    let selected;
    for (const type of ['mulligan', 'skipEvo', 'chooseAttack', 'playSupport']) {
      selected = state.buttons.find((button) => button.action.type === type &&
        (type !== 'mulligan' || !button.action.redraw) &&
        (type !== 'chooseAttack' || button.action.slot === scenario.slot) &&
        (type !== 'playSupport' || button.action.target === scenario.support));
      if (selected) break;
    }
    if (selected) {
      const signature = state.phase + ':' + JSON.stringify(selected.action);
      if (submitted.has(signature)) { await page.waitForTimeout(250); continue; }
      submitted.add(signature);
      scenario.inputs.push({ phase: state.phase, action: selected.action, at: Date.now() });
      await page.locator('#acts [data-act]').filter({ hasText: selected.text.trim() }).first().click();
      await page.waitForTimeout(120);
      continue;
    }
    if (/召喚|補充/.test(state.phase || '') && state.hand.length) {
      const summon = state.hand.find((card) => card.level === 'たね');
      if (summon) {
        scenario.inputs.push({ phase: state.phase, action: { type: 'summon', cardId: summon.id, instanceId: summon.iid }, at: Date.now() });
        await page.locator('#myhand .card[data-iid="' + summon.iid + '"]').click();
        await page.waitForTimeout(120);
        continue;
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error('Could not reach resolve through the normal action UI: ' + await page.locator('.screen.battle').textContent());
}

async function checkReplayAndSkip(page, context, scenario) {
  const oldCount = scenario.observed.motions.length;
  let oldCinemaCount = scenario.observed.cinemas.length;
  const opponent = await page.locator('.clash-side.you .cinema-who').evaluate((node) => [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent).join('').trim());
  await page.locator('#combat-cinema.done .clash-next').click();
  await page.locator('#giveup').click();
  await page.locator('#giveup-yes').click();
  await page.locator('#finale.shown').waitFor();
  await page.locator('#end').click();
  await page.locator('#next').click();
  await page.locator('#online').click();
  await page.locator('#cpu').click();
  await skipIntro(page);
  // Acknowledging the previous round may legitimately paint its completed
  // result once more. The new match starts after this navigation boundary.
  oldCinemaCount = await page.evaluate(() => window.__realAttackQa.cinemas.length);
  const replay = { slot: 'circle', support: 'none', inputs: [] };
  await playToResolve(page, replay);
  const replayOpponent = await page.locator('.clash-side.you .cinema-who').evaluate((node) => [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent).join('').trim());
  assert.equal(replayOpponent, opponent, 'the same CPU opponent can be fought again');
  await page.waitForFunction((oldCount) => window.__realAttackQa.motions.length > oldCount, oldCount, { timeout: 16000 });
  assert.equal(await page.locator('.fx-character-attack.ready').count(), 1, 'replay visibly starts a new character attack');
  const capture = await (await context.newCDPSession(page)).send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const shot = 'real-attack-cpu-replay-before-skip-390.png';
  writeFileSync(resolve(output, shot), Buffer.from(capture.data, 'base64'));
  // Explicit user skip while the actor is visible, rather than treating an
  // accidental render interruption as a successful fast-forward.
  await page.locator('#combat-cinema').click({ position: { x: 5, y: 5 } });
  await page.locator('#combat-cinema.done').waitFor();
  const immediateImages = await page.locator('.fx-character-attack').count();
  await page.waitForTimeout(1000);
  const delayedImages = await page.locator('.fx-character-attack').count();
  const observed = await page.evaluate(() => window.__realAttackQa);
  assert.equal(immediateImages, 0, 'explicit skip clears the actor immediately');
  assert.equal(delayedImages, 0, 'old GIF callbacks cannot revive a skipped attack');
  const replayCinemas = observed.cinemas.slice(oldCinemaCount);
  assert.equal(replayCinemas[0]?.changes[0]?.played, '0', 'replay begins its own cinema');
  assert.ok(observed.motions.length > oldCount);
  scenario.lifecycle = { sameOpponent: opponent, replayInputs: replay.inputs, replayCinemas, replayMotions: observed.motions.slice(oldCount), immediateImages, delayedImages, explicitSkip: true, screenshot: shot, passed: true };
}

try {
  const slots = (process.env.REAL_ATTACK_SLOTS || 'circle,triangle,cross').split(',');
  const modes = (process.env.REAL_ATTACK_MODES || 'cpu,story').split(',');
  for (const mode of modes) for (const [index, slot] of slots.entries()) {
    const scenario = { mode, slot, support: index === 1 ? 'deck' : 'none', inputs: [], paths: [], errors: [] };
    report.scenarios.push(scenario);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', (error) => scenario.errors.push(error.message));
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (/\/art\/fx\//.test(path)) scenario.paths.push(path);
    });
    await page.addInitScript(() => {
      const captured = new WeakSet(), cinemas = new WeakMap();
      let sequence = 0, lastPhase = '';
      window.__realAttackQa = { motions: [], cinemas: [], phases: [] };
      new MutationObserver(() => {
        const phase = document.querySelector('.phase-pill')?.textContent;
        if (phase && phase !== lastPhase) { lastPhase = phase; window.__realAttackQa.phases.push({ phase, at: performance.now() }); }
        const cine = document.querySelector('#combat-cinema');
        if (cine) {
          let entry = cinemas.get(cine);
          if (!entry) {
            entry = { id: ++sequence, createdAt: performance.now(), changes: [], actors: [...cine.querySelectorAll('.clash-side')].map((fighter) => ({
              seat: Number(fighter.dataset.seat),
              art: fighter.querySelector('.fighter-art img')?.getAttribute('src'),
              name: fighter.querySelector('.fighter-name')?.textContent,
              slot: fighter.querySelector('.cinema-cmd')?.className.match(/slot-(circle|triangle|cross)/)?.[1],
              dealt: Number(fighter.dataset.dealt),
            })) };
            cinemas.set(cine, entry); window.__realAttackQa.cinemas.push(entry);
          }
          const state = { className: cine.className, played: cine.dataset.played, banner: document.querySelector('#cinema-banner')?.textContent, at: performance.now() };
          const prev = entry.changes.at(-1);
          if (!prev || prev.className !== state.className || prev.banner !== state.banner) entry.changes.push(state);
        }
        for (const image of document.querySelectorAll('.fx-character-attack.ready')) {
          if (captured.has(image)) continue;
          captured.add(image);
          const style = getComputedStyle(image), bounds = image.getBoundingClientRect();
          window.__realAttackQa.motions.push({
            id: image.dataset.character, slot: image.dataset.slot, src: image.getAttribute('src'),
            mirrored: image.classList.contains('from-top'), opacity: style.opacity, transform: style.transform,
            naturalWidth: image.naturalWidth, width: bounds.width, height: bounds.height,
            at: performance.now(), cinemaId: cine ? cinemas.get(cine).id : null,
          });
        }
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'src'] });
    });
    try {
      await newPlayer(page);
      if (mode === 'cpu') await enterCpu(page);
      else await enterStory(page);
      await skipIntro(page);
      await playToResolve(page, scenario);
      await page.waitForSelector('#combat-cinema.done', { timeout: 16000 });
      await page.waitForTimeout(800);
      scenario.observed = await page.evaluate(() => window.__realAttackQa);
      scenario.fxHost = await page.evaluate(() => ({
        canvasConnected: !!document.getElementById('fx')?.isConnected,
        mediaHostConnected: !!document.getElementById('fx-vid')?.isConnected,
      }));
      const screenshot = 'real-attack-' + mode + '-' + slot + '-390.png';
      await page.screenshot({ path: resolve(output, screenshot) });
      scenario.screenshot = screenshot;
      assert.ok(scenario.observed.motions.some((motion) => motion.slot === slot && !motion.mirrored), mode + ' ' + slot + ': player attack must show its character GIF');
      const actors = scenario.observed.cinemas[0]?.actors || [];
      for (const actor of actors) {
        // Positive damage always represents an executed strike; zero-damage
        // special commands are exercised by the selected player assertion too.
        if (!(actor.dealt > 0)) continue;
        const id = actor.art?.match(/\/([^/]+)\.[a-z]+$/)?.[1];
        assert.ok(scenario.observed.motions.some((motion) => motion.id === id && motion.slot === actor.slot && motion.mirrored === (actor.seat === 1)), mode + ' ' + actor.name + ': executed enemy/player attack must show its own character GIF');
      }
      for (const motion of scenario.observed.motions) {
        assert.ok(motion.src.startsWith(new URL('art/fx/attacks/' + motion.id + '.gif', base).pathname + '?play='));
        assert.equal(motion.opacity, '1');
        assert.equal(motion.naturalWidth, 320);
        assert.ok(motion.width > 0 && motion.height > 0);
        assert.ok(motion.transform.startsWith(motion.mirrored ? 'matrix(-1,' : 'matrix(1,'));
      }
      assert.equal(scenario.paths.some((path) => path.endsWith('.mp4')), false);
      assert.deepEqual(scenario.errors, []);
      if (mode === 'cpu' && slot === 'circle' && process.env.REAL_ATTACK_LIFECYCLE !== '0') await checkReplayAndSkip(page, context, scenario);
      scenario.passed = true;
      console.log('real attack passed', { mode, slot, motions: scenario.observed.motions.length });
    } catch (error) {
      scenario.observed = await page.evaluate(() => window.__realAttackQa).catch(() => null);
      scenario.failure = String(error);
      throw error;
    } finally {
      await context.close();
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }
  }
  report.passed = true;
} finally {
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  await browser.close();
}

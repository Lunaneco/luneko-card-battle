/** Two isolated browser clients, real lobby/actions and a separate QA relay. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from 'playwright';
import { emptySave } from '../src/state/save';
import type { AttackSlot, MatchState } from '../src/engine/types';

const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = resolve(gameDir, '../studio/pdca/online-attack-routes.json');
const appUrl = process.env.ATTACK_QA_URL ?? 'http://127.0.0.1:5175/';
const wsUrl = process.env.ATTACK_QA_WS ?? 'ws://127.0.0.1:18787';
const url = `${appUrl}${appUrl.includes('?') ? '&' : '?'}ws=${encodeURIComponent(wsUrl)}`;
const results: object[] = [];
const errors: string[] = [];

async function clickAction(page: Page, type: string, extra?: [string, string | boolean]) {
  const selector = `[data-act*='"type":"${type}"']${extra ? `[data-act*='"${extra[0]}":${JSON.stringify(extra[1])}']` : ''}`;
  await page.locator(selector).first().click({ timeout: 5000 });
}

async function setup(page: Page, name: string, starter: string) {
  const save = emptySave(name, starter);
  save.flags.intro = true;
  save.flags.tutorialSeen = true;
  const now = new Date();
  save.lastLogin = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // tsx names nested callback functions with this helper; Playwright serializes
  // the callback without its Node module scope, so provide it in the test realm.
  await page.addInitScript('window.__name = (value) => value;');
  await page.addInitScript(({ initialSave }) => {
    localStorage.setItem('luneko-save-v2', JSON.stringify(initialSave));
    // Seed28 has both legal partner opening cards; no combat state is injected.
    Date.now = () => 28;
    (window as any).__attackQa = [];
    const tracked = new WeakMap<HTMLImageElement, any>();
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          const images = node.matches('.fx-character-attack') ? [node] : [...node.querySelectorAll('.fx-character-attack')];
          for (const element of images) {
            const image = element as HTMLImageElement;
            if (tracked.has(image)) continue;
            const record = { character: image.dataset.character, slot: image.dataset.slot, fromTop: image.classList.contains('from-top'),
              src: image.src, addedAt: performance.now(), loadedAt: null, removedAt: null, width: 0, height: 0, visible: false };
            tracked.set(image, record);
            (window as any).__attackQa.push(record);
            const loaded = () => {
              record.loadedAt = performance.now();
              record.width = image.naturalWidth;
              record.height = image.naturalHeight;
              setTimeout(() => {
                const box = image.getBoundingClientRect();
                record.visible = image.isConnected && image.classList.contains('ready') &&
                  Number(getComputedStyle(image).opacity) > 0 && box.width > 0 && box.height > 0;
              }, 80);
            };
            image.addEventListener('load', loaded, { once: true });
            if (image.complete && image.naturalWidth) loaded();
          }
        }
        for (const node of mutation.removedNodes) {
          if (!(node instanceof Element)) continue;
          const images = node.matches('.fx-character-attack') ? [node] : [...node.querySelectorAll('.fx-character-attack')];
          for (const element of images) {
            const record = tracked.get(element as HTMLImageElement);
            if (record) record.removedAt = performance.now();
          }
        }
      }
    });
    observer.observe(document, { subtree: true, childList: true });
  }, { initialSave: save });
  page.on('pageerror', err => errors.push(`${name}: ${err.message}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.locator('#start').click();
  await page.locator('#online').click();
}

const browser = await chromium.launch({ headless: true });
try {
  for (const [hostSlot, guestSlot, protectedSeat] of [
    ['circle', 'circle', 0], ['triangle', 'triangle', 1], ['cross', 'circle', null],
  ] as const) {
    const contexts = await Promise.all([browser.newContext({ viewport: { width: 390, height: 844 } }),
      browser.newContext({ viewport: { width: 390, height: 844 } })]);
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    const hostStates: MatchState[] = [];
    const guestStates: MatchState[] = [];
    pages[0]!.on('websocket', ws => ws.on('framesent', ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === 'state') hostStates.push(message.state);
    }));
    pages[1]!.on('websocket', ws => ws.on('framereceived', ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === 'state') guestStates.push(message.state);
    }));
    try {
      await Promise.all([setup(pages[0]!, 'QA host', 'moonember'), setup(pages[1]!, 'QA guest', 'windfeather')]);
      await pages[0]!.locator('#create').click();
      await pages[0]!.waitForFunction(() => document.querySelector('#ostatus')?.textContent?.includes('相手待ち'));
      const room = (await pages[0]!.locator('#ostatus').innerText()).match(/部屋 ([A-Z2-9]{4})/)?.[1];
      assert.ok(room);
      await pages[1]!.locator('#code').fill(room);
      await pages[1]!.locator('#join').click();
      await Promise.all(pages.map(page => page.waitForSelector('.screen.battle')));
      await Promise.all(pages.map(async page => {
        const intro = page.locator('#vs-intro');
        if (await intro.count()) { await intro.click(); await intro.waitFor({ state: 'detached' }); }
      }));
      await Promise.all(pages.map(page => clickAction(page, 'mulligan', ['redraw', false])));
      await Promise.all(pages.map((page, index) => page.locator(`#myhand .card[data-id="${index === 0 ? 'moonember' : 'windfeather'}"]`).click()));
      await pages[0]!.waitForTimeout(100);
      const initial = hostStates.at(-1)!;
      const active = initial.active;
      await clickAction(pages[active]!, 'mulligan', ['redraw', false]);
      await clickAction(pages[active]!, 'skipEvo');
      await Promise.all([pages[0]!.locator(`.atk.${hostSlot}`).click(), pages[1]!.locator(`.atk.${guestSlot}`).click()]);
      await Promise.all(pages.map(page => clickAction(page, 'playSupport', ['target', 'none'])));
      await Promise.all(pages.map(page => page.waitForSelector('#combat-cinema')));
      const hostResolve = hostStates.find(state => state.phase === 'resolve')!;
      const guestResolve = guestStates.find(state => state.phase === 'resolve')!;
      assert.ok(hostResolve?.lastCombat && guestResolve?.lastCombat, 'both clients received actual resolved battle');
      assert.deepEqual(guestResolve.events, hostResolve.events, 'attack events synchronize exactly');
      assert.deepEqual(guestResolve.lastCombat.beats, hostResolve.lastCombat.beats, 'attack snapshots synchronize exactly');
      const attacks = hostResolve.events.filter(event => event.type === 'attack');
      assert.equal(attacks.length, 2);
      assert.deepEqual(hostResolve.lastCombat.slots, [hostSlot, guestSlot]);
      if (hostSlot === 'cross') assert.equal(attacks.find(event => event.actor === 1)?.outcome, 'zero');

      let preservedDuringPeerAck: boolean | null = null;
      let peerAckTimeline: object | null = null;
      if (protectedSeat !== null) {
        const protectedPage = pages[protectedSeat]!;
        const skippingPage = pages[protectedSeat === 0 ? 1 : 0]!;
        const ready = await protectedPage.waitForFunction(() => document.querySelector('.fx-character-attack.ready'),
          undefined, { polling: 'raf' });
        const liveImage = ready.asElement();
        assert.ok(liveImage);
        const liveCinema = await protectedPage.locator('#combat-cinema').elementHandle();
        assert.ok(liveCinema);
        const beforePeerAck = await protectedPage.evaluate(() => ({ at: performance.now(),
          cinema: document.querySelector('#combat-cinema')?.className, playback: (window as any).__attackQa }));
        // These are normal UI skip/next taps on the other client. Its state
        // update must not repaint the peer's still-playing attack cinema.
        await skippingPage.locator('#combat-cinema').click({ position: { x: 8, y: 8 }, force: true });
        await skippingPage.locator('.clash-next').click({ force: true });
        await protectedPage.waitForTimeout(100);
        const afterPeerAck = await protectedPage.evaluate(() => ({ at: performance.now(),
          cinema: document.querySelector('#combat-cinema')?.className, playback: (window as any).__attackQa }));
        const imageStillConnected = await liveImage.evaluate(image => image.isConnected && image.classList.contains('ready'));
        const sameCinemaConnected = await liveCinema.evaluate(cinema => cinema.isConnected);
        const imageRecord = afterPeerAck.playback[0];
        const endedNormally = imageRecord.removedAt !== null && imageRecord.loadedAt !== null &&
          imageRecord.removedAt - imageRecord.loadedAt >= 480;
        preservedDuringPeerAck = sameCinemaConnected && (imageStillConnected || endedNormally);
        peerAckTimeline = { beforePeerAck, afterPeerAck, imageStillConnected, sameCinemaConnected, endedNormally };
        if (!preservedDuringPeerAck) results.push({ hostSlot, guestSlot, protectedSeat, beforePeerAck,
          afterPeerAck: await protectedPage.evaluate(() => ({ at: performance.now(),
            cinema: document.querySelector('#combat-cinema')?.className, playback: (window as any).__attackQa })),
          hostPhase: hostStates.at(-1)?.phase, guestPhase: guestStates.at(-1)?.phase, passed: false });
        assert.equal(preservedDuringPeerAck, true, `seat${protectedSeat}: peer acknowledgement removed live GIF`);
      }
      const checkingSeats = protectedSeat === null ? [0, 1] : [protectedSeat];
      await Promise.all(checkingSeats.map(seat => pages[seat]!.waitForSelector('#combat-cinema.done', { timeout: 20000 })));
      const playback = await Promise.all(pages.map(page => page.evaluate(() => (window as any).__attackQa)));
      for (const seat of checkingSeats) {
        const actual = playback[seat];
        const expected = attacks.filter(event => event.outcome !== 'interrupted');
        assert.equal(actual.length, expected.length, `seat${seat}: every executable attack has one image`);
        assert.deepEqual(actual.map((image: any) => [image.character, image.slot]), expected.map(event => [event.cardId, event.slot]));
        for (const image of actual) {
          assert.ok(image.src.includes(`/art/fx/attacks/${image.character}.gif?play=`));
          assert.equal(image.width, 320);
          assert.equal(image.height, 320);
          assert.equal(image.visible, true);
          assert.ok(image.loadedAt !== null && image.removedAt !== null);
          assert.ok(image.removedAt - image.loadedAt >= 480, `seat${seat}: GIF was truncated before its 520ms duration`);
        }
      }
      const screenshots: string[] = [];
      for (const seat of checkingSeats) {
        const file = resolve(dirname(reportPath), `online-${hostSlot}-seat${seat}.png`);
        await pages[seat]!.screenshot({ path: file });
        screenshots.push(file);
      }
      results.push({ hostSlot, guestSlot, protectedSeat, room, synchronizedAttackEvents: attacks,
        preservedDuringPeerAck, peerAckTimeline, checkingSeats, playback, screenshots, passed: true });
    } finally { await Promise.all(contexts.map(context => context.close())); }
  }
  assert.equal(errors.length, 0, `browser errors: ${errors.join('; ')}`);
} catch (err) {
  errors.push(err instanceof Error ? err.stack ?? err.message : String(err));
} finally {
  await browser.close();
  mkdirSync(dirname(reportPath), { recursive: true });
  const passed = results.length === 3 && errors.length === 0;
  writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), passed, url, wsUrl,
    method: 'isolated valid saves + deterministic shuffle; lobby and all battle actions by real UI taps; no injected match state',
    results, errors }, null, 2)}\n`);
  console.log(JSON.stringify({ passed, combats: results.length, peerAckChecks: results.filter((row: any) => row.preservedDuringPeerAck).length,
    report: reportPath, errors }, null, 2));
  process.exitCode = passed ? 0 : 1;
}

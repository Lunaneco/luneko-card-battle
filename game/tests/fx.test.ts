import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const GAME_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
import {
  ATTACK_SLOTS,
  ATTACK_SPECS,
  FX_PLATES,
  attackVideoHtml,
  attackVideoPairs,
  attackVideoSrc,
  fxHudHtml,
  spawnAttack,
  spawnBattleStart,
  spawnEvolve,
  spawnHeal,
  spawnKo,
  spawnMoonGarb,
  spawnSpecial,
} from '../src/fx/battlefield';

describe('battle field fx', () => {
  it('circle is a layered beam burst', () => {
    const b = spawnAttack(390, 844, 'circle', 'flame', false);
    const kinds = new Set(b.parts.map((p) => p.kind));
    assert.ok(b.parts.length >= 40, `circle parts ${b.parts.length}`);
    assert.ok(kinds.has('beam') && kinds.has('core') && kinds.has('shock'));
    assert.ok(b.shake >= 16 && b.flash >= 0.5);
  });

  it('triangle is multi-slash with impact', () => {
    const b = spawnAttack(390, 844, 'triangle', 'nature', true);
    const kinds = new Set(b.parts.map((p) => p.kind));
    assert.ok(b.parts.filter((p) => p.kind === 'slash').length >= 20);
    assert.ok(kinds.has('star') && kinds.has('shock'));
  });

  it('cross is a seal with hex and runes', () => {
    const b = spawnAttack(390, 844, 'cross', 'dark', false);
    const kinds = new Set(b.parts.map((p) => p.kind));
    assert.ok(kinds.has('hex') && kinds.has('rune'));
    assert.ok(b.parts.length >= 20);
  });

  it('heal and ko and evolve spawn visibly', () => {
    assert.ok(spawnHeal(390, 844).length >= 20);
    assert.ok(spawnKo(390, 844, false).parts.length >= 40);
    assert.ok(spawnEvolve(390, 844, false).parts.some((p) => p.kind === 'beam'));
  });

  it('special attacks have distinct bursts', () => {
    const kinds = ['firstStrike', 'counter', 'drain', 'suicide', 'jam', 'zero'] as const;
    for (const k of kinds) {
      const b = spawnSpecial(390, 844, k, false);
      assert.ok(b.parts.length >= 8, `${k} thin ${b.parts.length}`);
      assert.ok(b.flash > 0.2, `${k} no flash`);
    }
    assert.ok(spawnSpecial(390, 844, 'firstStrike', true).parts.some((p) => p.kind === 'star'));
    assert.ok(spawnSpecial(390, 844, 'counter', false).parts.some((p) => p.kind === 'ring'));
    assert.ok(spawnSpecial(390, 844, 'suicide', false).shake >= 16);
  });

  it('paints impact plates on attack / ko / evolve / start', () => {
    const flame = spawnAttack(390, 844, 'circle', 'flame', false);
    assert.equal(flame.plate, 'flame');
    assert.ok((flame.plateScale ?? 0) > 1);
    assert.equal(spawnAttack(390, 844, 'triangle', 'ice', true).plate, 'ice');
    assert.equal(spawnKo(390, 844, false).plate, 'ko');
    assert.equal(spawnEvolve(390, 844, true).plate, 'evolve');
    assert.equal(spawnMoonGarb(390, 844, false).plate, 'moon');
    assert.equal(spawnBattleStart(390, 844).plate, 'moon');
    const hud = fxHudHtml();
    assert.ok(hud.includes('id="fx-hud"') && hud.includes('fx-stamp'));
  });

  it('keeps the attack canvas above the resolve recap', () => {
    const css = readFileSync(join(GAME_ROOT, 'src/styles/app.css'), 'utf8');
    const fxZ = css.match(/\.fx\s*\{[^}]*z-index:\s*(\d+)/);
    const cinemaZ = css.match(/\.combat-cinema\s*\{[^}]*z-index:\s*(\d+)/);
    assert.ok(fxZ && cinemaZ, 'missing fx or cinema z-index');
    assert.ok(Number(fxZ[1]) > Number(cinemaZ[1]), `fx ${fxZ[1]} should sit above cinema ${cinemaZ[1]}`);
    assert.ok(!/^\s*background:\s*#070b18\s*;/m.test(css.match(/\.combat-cinema\s*\{[^}]+\}/)?.[0] ?? ''), 'cinema must not be an opaque wall');
  });

  it('ships painted fx plates on disk', () => {
    for (const src of Object.values(FX_PLATES)) {
      const file = join(GAME_ROOT, 'public', src.replace(/^\//, ''));
      assert.ok(existsSync(file), file);
      assert.ok(statSync(file).size > 80000, `${file} too small`);
    }
  });

  it('looks up a video URL for every slot × specialty pair', () => {
    const pairs = attackVideoPairs();
    assert.equal(pairs.length, 15);
    assert.equal(ATTACK_SLOTS.length * ATTACK_SPECS.length, 15);
    const seen = new Set<string>();
    for (const { slot, spec } of pairs) {
      const src = attackVideoSrc(slot, spec);
      assert.equal(src, `/art/fx/atk-${slot}-${spec}.mp4`);
      assert.equal(seen.has(src), false, `dup ${src}`);
      seen.add(src);
      const file = join(GAME_ROOT, 'public', src.replace(/^\//, ''));
      assert.equal(existsSync(file), true, `missing ${file}`);
      assert.ok(statSync(file).size > 80000, `${file} too small ${statSync(file).size}`);
    }
  });

  it('hit helper emits a muted video for flame-○ and a different pair', () => {
    const flame = attackVideoHtml('circle', 'flame', false);
    assert.match(flame, /<video\b/);
    assert.match(flame, /\bmuted\b/);
    assert.ok(!flame.includes('controls'));
    assert.ok(flame.includes(attackVideoSrc('circle', 'flame')));
    assert.ok(flame.includes('data-slot="circle"') && flame.includes('data-spec="flame"'));
    const dark = attackVideoHtml('cross', 'dark', true);
    assert.match(dark, /<video\b/);
    assert.match(dark, /\bmuted\b/);
    assert.ok(dark.includes(attackVideoSrc('cross', 'dark')));
    assert.ok(dark.includes('from-top'));
    assert.ok(fxHudHtml().includes('id="fx-vid"'));
    const css = readFileSync(join(GAME_ROOT, 'src/styles/app.css'), 'utf8');
    const vidZ = css.match(/\.fx-vid\s*\{[^}]*z-index:\s*(\d+)/);
    const cinemaZ = css.match(/\.combat-cinema\s*\{[^}]*z-index:\s*(\d+)/);
    assert.ok(vidZ && cinemaZ, 'missing fx-vid or cinema z-index');
    assert.ok(Number(vidZ[1]) > Number(cinemaZ[1]), `fx-vid ${vidZ[1]} should sit above cinema ${cinemaZ[1]}`);
  });
});

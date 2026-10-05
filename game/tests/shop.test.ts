import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID, options } from '../src/data/cards';
import { effectSignature } from '../src/data/optionPower';
import { isExclusive, isSeven } from '../src/data/rarity';
import { buyPack, goldForLoss, goldForWin, openPack, PACKS, xpForLoss } from '../src/data/shop';
import { SeededRng } from '../src/engine/rng';
import { addGold, emptySave } from '../src/state/save';

describe('gold rewards', () => {
  it('starts a new save with pocket gold', () => {
    const s = emptySave('QA', 'moonember');
    assert.ok(s.gold >= PACKS[0]!.price, `gold ${s.gold} < seed pack`);
  });

  it('pays more for a boss than a tutorial', () => {
    const tut = goldForWin('story', 'tutorial', 25);
    const boss = goldForWin('story', 'boss', 80);
    const cpu = goldForWin('cpu');
    assert.ok(boss > tut, `${boss} !> ${tut}`);
    assert.ok(tut > cpu);
    assert.ok(goldForWin('online') > cpu);
  });

  it('pays consolation gold and XP on a loss', () => {
    const lose = goldForLoss('story', 'tutorial', 25);
    const win = goldForWin('story', 'tutorial', 25);
    assert.ok(lose >= 40, String(lose));
    assert.ok(lose < win);
    assert.ok(xpForLoss(25) >= 8);
    assert.ok(xpForLoss(25) < 25);
  });
});

describe('card shop packs', () => {
  it('every pack lists a price and opens 5 real cards', () => {
    for (const p of PACKS) {
      assert.ok(p.price > 0, p.id);
      const rng = new SeededRng(11);
      const cards = openPack(p.id, () => rng.next());
      assert.equal(cards.length, p.count, p.id);
      for (const id of cards) assert.ok(CARD_BY_ID[id], id);
    }
  });

  it('buyPack spends gold and grants cards', () => {
    const s = emptySave('QA', 'moonember');
    const before = s.gold;
    const owned = { ...s.cards };
    const r = buyPack(s, 'seed', () => 0.2);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(s.gold, before - 120);
    assert.equal(r.cards.length, 5);
    for (const id of r.cards) {
      assert.ok((s.cards[id] ?? 0) >= (owned[id] ?? 0));
    }
  });

  it('buyPack refuses when broke', () => {
    const s = emptySave('QA', 'moonember');
    s.gold = 10;
    const r = buyPack(s, 'premium', () => 0.3);
    assert.equal(r.ok, false);
    assert.equal(s.gold, 10);
  });

  it('ships a pack for every specialty and those beasts match the color', () => {
    const color = PACKS.filter((p) => p.spec);
    assert.equal(color.length, 5);
    assert.ok(PACKS.some((p) => p.id === 'flame'));
    for (const p of color) {
      const rng = new SeededRng(44);
      const cards = openPack(p.id, () => rng.next());
      assert.equal(cards.length, 5, p.id);
      const beasts = cards.map((id) => CARD_BY_ID[id]).filter((c) => c?.kind === 'beast');
      assert.ok(beasts.length >= 1, p.id);
      for (const c of beasts) {
        if (c.kind === 'beast') assert.equal(c.specialty, p.spec, `${p.id} rolled ${c.id}`);
      }
    }
  });

  it('premium pack can yield a 2進化', () => {
    let found = false;
    for (let seed = 1; seed < 240 && !found; seed++) {
      const rng = new SeededRng(seed);
      const cards = openPack('premium', () => rng.next());
      found = cards.some((id) => {
        const c = CARD_BY_ID[id];
        return c?.kind === 'beast' && c.level === 'APEX';
      });
    }
    assert.equal(found, true);
  });

  it('shop option pool has no exclusive and no clone signatures', () => {
    const seen = new Map<string, string>();
    for (const c of options()) {
      if (isExclusive(c.id) || isSeven(c.id)) continue;
      const sig = effectSignature(c);
      const other = seen.get(sig);
      assert.equal(other, undefined, `shop clone ${c.id} / ${other}`);
      seen.set(sig, c.id);
    }
    for (const p of PACKS) {
      const rng = new SeededRng(3);
      for (const id of openPack(p.id, () => rng.next())) {
        assert.equal(isExclusive(id), false, id);
        assert.equal(isSeven(id), false, id);
      }
    }
  });
});

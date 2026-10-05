import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { CARD_BY_ID, options, starterDeck, getCard } from '../src/data/cards';
import { LEGACY_CARD_IDS, remapCardId } from '../src/data/legacyIds';
import { effectFamily, effectSignature, familyPower } from '../src/data/optionPower';
import { copyCapOf, isExclusive } from '../src/data/rarity';
import { openPack, PACKS } from '../src/data/shop';
import { validateDeck } from '../src/engine/battle';
import { SeededRng } from '../src/engine/rng';
import { emptySave, migrateSave } from '../src/state/save';
import type { OptionCard } from '../src/engine/types';
import { cardArt, optionCategory, OPTION_CAT_COLOR } from '../src/ui/card';
import type { OptionCard } from '../src/engine/types';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function resolvedFile(art: string): string {
  return join(publicDir, art.replace(/^\//, ''));
}

function artStem(art: string): string {
  return (art.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
}

describe('option item portraits', () => {
  it('every option resolves to its own existing unique illustration', () => {
    const pool = options();
    assert.ok(pool.length >= 40, `option pool too small: ${pool.length}`);
    const ids = new Set(pool.map((c) => c.id));
    const seen = new Map<string, string>();
    for (const c of pool) {
      const art = cardArt(c);
      assert.notEqual(art, '/art/ui/cardback.jpg', `${c.id} still on shared cardback`);
      assert.ok(/\.(jpg|jpeg|png)$/i.test(art), `${c.id} not a painted file: ${art}`);
      const owner = seen.get(art);
      assert.equal(owner, undefined, `${c.id} shares ${art} with ${owner}`);
      seen.set(art, c.id);
      assert.equal(existsSync(resolvedFile(art)), true, `${c.id} missing ${art}`);
      const stem = artStem(art);
      if (ids.has(stem)) assert.equal(stem, c.id, `${c.id} points at ${art}`);
    }
  });

  it('no two options share identical portrait bytes', () => {
    const byHash = new Map<string, string>();
    for (const c of options()) {
      const art = cardArt(c);
      const hash = createHash('sha256').update(readFileSync(resolvedFile(art))).digest('hex');
      const other = byHash.get(hash);
      assert.equal(other, undefined, `${c.id} same bytes as ${other}`);
      byHash.set(hash, c.id);
    }
  });

  it('rejects stripe-placeholder portraits that are too small to be a painted item', () => {
    for (const c of options()) {
      const n = statSync(resolvedFile(cardArt(c))).size;
      assert.ok(n >= 80000, `${c.id} looks like a placeholder (${n} bytes)`);
    }
  });
});

describe('option category colors', () => {
  it('maps heal and attack to different families and colors', () => {
    assert.equal(optionCategory('floppy'), 'heal');
    assert.equal(optionCategory('miniHeal'), 'heal');
    assert.equal(optionCategory('atkchip'), 'attack');
    assert.equal(optionCategory('honeyAtk'), 'attack');
    assert.equal(optionCategory('speedEvo'), 'evolve');
    assert.equal(optionCategory('firstChip'), 'first');
    assert.equal(optionCategory('dataCopy'), 'hand');
    assert.equal(optionCategory('defO'), 'jam');
    const heal = OPTION_CAT_COLOR[optionCategory('floppy')!];
    const atk = OPTION_CAT_COLOR[optionCategory('atkchip')!];
    const evo = OPTION_CAT_COLOR[optionCategory('speedEvo')!];
    assert.notEqual(heal, atk);
    assert.notEqual(evo, heal);
    assert.notEqual(evo, atk);
  });

  it('evolution items are never classified as heal or attack', () => {
    for (const c of options()) {
      const cat = optionCategory(c);
      assert.ok(cat, c.id);
      if (c.optionType === 'evolution') {
        assert.equal(cat, 'evolve', c.id);
      }
    }
  });
});

describe('option catalog roles', () => {
  it('does not ship two commons with the same effect signature', () => {
    const seen = new Map<string, string>();
    for (const c of options()) {
      if (isExclusive(c.id)) continue;
      const sig = effectSignature(c);
      const other = seen.get(sig);
      assert.equal(other, undefined, `${c.id} clones ${other} (${sig})`);
      seen.set(sig, c.id);
    }
  });

  it('makes each exclusive option strictly stronger than the best common of that family', () => {
    const pool = options();
    const commons = pool.filter((c) => !isExclusive(c.id));
    let compared = 0;
    for (const ex of pool.filter((c) => isExclusive(c.id))) {
      const fam = effectFamily(ex);
      const peers = commons.filter((c) => effectFamily(c) === fam);
      if (!peers.length) continue;
      compared += 1;
      const best = Math.max(...peers.map(familyPower));
      assert.ok(
        familyPower(ex) > best,
        `${ex.id} family ${fam} power ${familyPower(ex)} <= common ${best}`,
      );
    }
    assert.ok(compared >= 8, `too few exclusive-vs-common families: ${compared}`);
  });

  it('fails if an exclusive heal is not above the strongest common heal', () => {
    const heals = options().filter((c) => c.effect.kind === 'heal');
    const commonCap = Math.max(
      ...heals.filter((c) => !isExclusive(c.id)).map((c) => (c.effect.kind === 'heal' ? c.effect.amount : 0)),
    );
    assert.ok(commonCap >= 500, `common heal cap collapsed: ${commonCap}`);
    for (const c of heals) {
      if (!isExclusive(c.id) || c.effect.kind !== 'heal') continue;
      assert.ok(c.effect.amount > commonCap, `${c.id} heal ${c.effect.amount} <= common ${commonCap}`);
    }
  });

  it('keeps starters legal 30 and shop packs free of exclusives', () => {
    for (const id of ['moonember', 'windfeather', 'shellwhite']) {
      const deck = starterDeck(id);
      assert.equal(deck.length, 30, id);
      assert.equal(validateDeck(deck), null, `${id}: ${validateDeck(deck)}`);
      for (const cardId of deck) {
        assert.ok(getCard(cardId), cardId);
        assert.equal(isExclusive(cardId), false, `${id} starter has exclusive ${cardId}`);
      }
    }
    for (const pack of PACKS) {
      const rng = new SeededRng(91 + pack.id.length);
      for (let i = 0; i < 40; i++) {
        for (const id of openPack(pack.id, () => rng.next())) {
          assert.equal(isExclusive(id), false, `${pack.id} rolled ${id}`);
        }
      }
    }
  });
});

function stubOption(id: string, effect: OptionCard['effect']): OptionCard {
  return {
    id,
    no: 0,
    name: id,
    kind: 'option',
    optionType: 'battle',
    effect,
    fusionValue: 1,
    resultValue: 1,
    text: id,
  };
}

describe('dropped clone remaps', () => {
  it('points every legacy option id at a remaining shipped card', () => {
    for (const [from, to] of Object.entries(LEGACY_CARD_IDS)) {
      assert.equal(CARD_BY_ID[from], undefined, `${from} still in catalog`);
      assert.ok(CARD_BY_ID[to], `${from} remaps to missing ${to}`);
      assert.equal(remapCardId(from), to);
    }
    assert.equal(CARD_BY_ID.primeMeat, undefined);
    assert.equal(remapCardId('primeMeat'), 'dropHeal');
  });

  it('merges a dropped clone onto the kept card and respects copy caps', () => {
    const s = emptySave('QA', 'moonember');
    const before = s.cards.defO ?? 0;
    s.cards.circleKiller = 3;
    s.decks[0] = ['circleKiller', 'circleKiller', 'defO', 'defO', 'defO', 'defO'];
    migrateSave(s);
    assert.equal(s.cards.circleKiller, undefined);
    assert.equal(s.cards.defO, Math.min(7, before + 3));
    assert.equal(s.decks[0]!.filter((id) => id === 'defO').length, copyCapOf('defO'));
    assert.ok(!s.decks[0]!.includes('circleKiller'));
  });

  it('would treat two ○封じ commons as the same signature', () => {
    const a = stubOption('keep', { kind: 'zeroSlot', slot: 'circle' });
    const b = stubOption('clone', { kind: 'zeroSlot', slot: 'circle' });
    assert.equal(effectSignature(a), effectSignature(b));
    assert.equal(effectFamily(a), effectFamily(b));
  });

  it('would rank an exclusive heal of 480 at or below a 600 common', () => {
    const exclusive = stubOption('weak-heal', { kind: 'heal', amount: 480 });
    const common = stubOption('shop-heal', { kind: 'heal', amount: 600 });
    assert.ok(familyPower(exclusive) <= familyPower(common));
  });
});

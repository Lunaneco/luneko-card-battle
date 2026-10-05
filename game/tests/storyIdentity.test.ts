import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID } from '../src/data/cards';
import { isSeven } from '../src/data/rarity';
import { STORY } from '../src/data/story';
import { colorShare } from '../src/data/storyPressure';
import { vsIntroHtml } from '../src/ui/vsIntro';
import type { Specialty } from '../src/engine/types';

function beasts(ids: string[]) {
  return ids.map((id) => CARD_BY_ID[id]).filter((c): c is NonNullable<typeof c> => !!c && c.kind === 'beast');
}

function options(ids: string[]) {
  return ids.map((id) => CARD_BY_ID[id]).filter((c): c is NonNullable<typeof c> => !!c && c.kind === 'option');
}

function copies(ids: string[], id: string): number {
  return ids.filter((x) => x === id).length;
}

describe('story enemy deck identity', () => {
  it('labels every fight with a specialty and a player-facing trait', () => {
    for (const n of STORY) {
      assert.ok(n.battle.spec, `${n.id} missing spec`);
      assert.ok(n.battle.deckTrait.length >= 8, `${n.id} trait too short`);
      assert.equal(n.battle.deck.length, 30, `${n.id} not 30`);
    }
  });

  it('keeps non-mix fights on one printed color', () => {
    for (const n of STORY) {
      if (n.battle.spec === 'mix') continue;
      const share = colorShare(n.battle.deck, n.battle.spec);
      assert.ok(share >= 0.72, `${n.id} ${n.battle.spec} share ${(share * 100).toFixed(0)}% < 72%`);
    }
  });

  it('keeps the tutorial flame-heavy and ice-free', () => {
    const tut = STORY.find((n) => n.id === 'tut-mochi')!;
    assert.equal(tut.battle.spec, 'flame');
    assert.ok(colorShare(tut.battle.deck, 'flame') >= 0.7);
    assert.equal(
      beasts(tut.battle.deck).filter((c) => c.specialty === 'ice').length,
      0,
    );
  });

  it('makes the climax a mixed cheat deck with sevens', () => {
    const zero = STORY.find((n) => n.id === 'tower-zero')!;
    assert.equal(zero.battle.spec, 'mix');
    const specs = new Set(beasts(zero.battle.deck).map((c) => c.specialty));
    assert.ok(specs.size >= 3, `zero specs ${[...specs].join(',')}`);
    const sevens = zero.battle.deck.filter((id) => isSeven(id));
    assert.ok(sevens.includes('wild7') && sevens.includes('holy7') && sevens.includes('dark7'));
  });

  it('never puts 月装 forms into a story deck', () => {
    for (const n of STORY) {
      const moon = beasts(n.battle.deck).filter((c) => c.level === 'MOON');
      assert.equal(moon.length, 0, `${n.id} has 月装 ${moon.map((c) => c.id).join(',')}`);
    }
  });

  it('respects copy caps inside CPU decks', () => {
    for (const n of STORY) {
      const seen = new Set(n.battle.deck);
      for (const id of seen) {
        const c = CARD_BY_ID[id]!;
        const nCopy = copies(n.battle.deck, id);
        if (c.kind === 'beast' && c.isPartner) assert.ok(nCopy <= 1, `${n.id} partner ${id} x${nCopy}`);
        if (c.kind === 'beast' && c.level === 'APEX') assert.ok(nCopy <= 2, `${n.id} APEX ${id} x${nCopy}`);
        if (isSeven(id)) assert.ok(nCopy <= 1, `${n.id} seven ${id} x${nCopy}`);
      }
    }
  });

  it('keeps セブンズ on bosses, the climax, or postgame extras', () => {
    for (const n of STORY) {
      const sevens = n.battle.deck.filter((id) => isSeven(id));
      if (!sevens.length) continue;
      const ok = n.battle.ai === 'boss' || n.battle.ai === 'scripted' || n.id.startsWith('extra-');
      assert.ok(ok, `${n.id} (${n.battle.ai}) has sevens ${sevens.join(',')}`);
    }
  });

  it('gives signature tools to each role', () => {
    const byId = Object.fromEntries(STORY.map((n) => [n.id, n.battle.deck]));
    const flame1 = byId['flame-1']!;
    assert.ok(options(flame1).filter((c) => c.effect.kind === 'atkAll' || c.effect.kind === 'atkSlot').length >= 3);
    assert.ok(beasts(flame1).filter((c) => [c.circle.effect, c.triangle.effect, c.cross.effect].includes('firstStrike')).length >= 2);

    const ice1 = byId['ice-1']!;
    assert.ok(beasts(ice1).filter((c) => c.support.kind === 'heal').length >= 6);
    assert.ok(options(ice1).filter((c) => c.effect.kind === 'heal' || c.effect.kind === 'fullHeal').length >= 2);

    const bloom1 = byId['bloom-1']!;
    assert.ok(copies(bloom1, 'speedEvo') >= 2);
    assert.ok(beasts(bloom1).filter((c) => c.level === 'III').length >= 4);

    const tsuki = byId['flame-2']!;
    const jam = options(tsuki).filter((c) =>
      ['zeroSlot', 'jamOptions', 'hackPartnerBottom', 'discardBothHands'].includes(c.effect.kind),
    );
    assert.ok(jam.length >= 3, `flame-2 jam tools ${jam.map((c) => c.id).join(',')}`);

    const junk1 = byId['junk-1']!;
    const flatten =
      beasts(junk1).filter((c) => c.support.kind === 'setBothHp').length +
      options(junk1).filter((c) => c.effect.kind === 'setBothHp').length;
    assert.ok(flatten >= 4, `junk-1 flatten ${flatten}`);

    const junk2 = byId['junk-2']!;
    const mill = options(junk2).filter((c) => c.effect.kind === 'draw' || c.effect.kind === 'discardBothHands');
    assert.ok(mill.length >= 3, `junk-2 mill ${mill.map((c) => c.id).join(',')}`);

    const bloom2 = byId['bloom-2']!;
    assert.ok(copies(bloom2, 'roseSeduce') >= 1);
    assert.ok(beasts(bloom2).some((c) => c.id === 'thornbloom'));

    const dark1 = byId['dark-1']!;
    const avgEvo =
      beasts(dark1).reduce((s, c) => s + c.evoCost, 0) / Math.max(1, beasts(dark1).length);
    assert.ok(avgEvo >= 20, `dark-1 avg evoCost ${avgEvo}`);

    assert.ok(copies(byId['dark-2']!, 'dark7') === 1);
    assert.ok(copies(byId['steep-1']!, 'grand7') === 1);
  });

  it('prints the trait on the VS intro', () => {
    const html = vsIntroHtml({
      youName: '灰拳',
      youFace: '/art/characters/ashfist_bust.jpg',
      meName: 'QA',
      meFace: '/art/partners/moonember.jpg',
      youRole: '後攻',
      meRole: '先攻',
      city: 'アッシュコート',
      stage: '/art/stages/flame.jpg',
      trait: '火炎アグロ。HPは薄い。先に殴る。',
    });
    assert.ok(html.includes('vs-trait'));
    assert.ok(html.includes('火炎アグロ'));
  });
});

describe('story identity vs printed spec type', () => {
  it('uses only legal specialty ids', () => {
    const legal: Array<Specialty | 'mix'> = ['flame', 'ice', 'nature', 'dark', 'rare', 'mix'];
    for (const n of STORY) {
      assert.ok(legal.includes(n.battle.spec), `${n.id} spec ${n.battle.spec}`);
    }
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID, getCard, starterDeck } from '../src/data/cards';
import { copyCapOf } from '../src/data/rarity';
import { isPartnerSeed, partnerSeedCount, validateDeck } from '../src/engine/battle';
import { kindOfCard, SUGGEST_QUOTA, suggestDeck } from '../src/engine/suggestDeck';
import { emptySave } from '../src/state/save';
import { deckScreenHtml } from '../src/ui/deckView';

describe('suggested decks', () => {
  it('builds a legal 30 from the starter pile for every color', () => {
    const s = emptySave('QA', 'moonember');
    for (const spec of ['flame', 'ice', 'nature', 'dark', 'rare'] as const) {
      const rec = suggestDeck(s.cards, spec, s.starter);
      assert.equal(rec.deck.length, 30, spec);
      assert.equal(validateDeck(rec.deck), null, `${spec}: ${validateDeck(rec.deck)}`);
      assert.ok(partnerSeedCount(rec.deck) <= 1, spec);
      assert.ok(!rec.deck.some((id) => getCard(id).kind === 'beast' && getCard(id).level === 'MOON'));
      const used: Record<string, number> = {};
      for (const id of rec.deck) {
        used[id] = (used[id] ?? 0) + 1;
        assert.ok((s.cards[id] ?? 0) >= used[id]!, `${spec} over-owned ${id}`);
        assert.ok(used[id]! <= copyCapOf(id), `${spec} over-cap ${id}`);
      }
    }
  });

  it('keeps たね / 1進化 / 2進化 / どうぐ near the quota', () => {
    const s = emptySave('QA', 'moonember');
    const rec = suggestDeck(s.cards, 'flame', 'moonember');
    assert.ok(rec.mix.seed >= 6 && rec.mix.seed <= 12, JSON.stringify(rec.mix));
    assert.ok(rec.mix.evo1 >= 6 && rec.mix.evo1 <= 12, JSON.stringify(rec.mix));
    assert.ok(rec.mix.item >= 8 && rec.mix.item <= 14, JSON.stringify(rec.mix));
    assert.equal(rec.mix.seed + rec.mix.evo1 + rec.mix.evo2 + rec.mix.item, 30);
    assert.ok(rec.mix.evo2 <= SUGGEST_QUOTA.evo2 + 2);
  });

  it('puts flame beasts first when asking for 火炎', () => {
    const s = emptySave('QA', 'moonember');
    const flame = suggestDeck(s.cards, 'flame', 'moonember');
    const ice = suggestDeck(s.cards, 'ice', 'moonember');
    assert.ok(flame.colorBeasts >= ice.colorBeasts);
    assert.ok(flame.deck.includes('moonember'));
    assert.ok(isPartnerSeed('moonember'));
    const flameBeasts = flame.deck.filter((id) => {
      const c = getCard(id);
      return c.kind === 'beast' && c.specialty === 'flame';
    }).length;
    assert.ok(flameBeasts >= 8, String(flameBeasts));
  });

  it('does not pull another color line to pad 2進化', () => {
    const s = emptySave('QA', 'moonember');
    s.cards.fangpup = 4;
    s.cards.frostwolf = 3;
    s.cards.steelfrost = 2;
    s.cards.moonfang = 1;
    const rec = suggestDeck(s.cards, 'flame', 'moonember');
    assert.ok(!rec.deck.includes('steelfrost'), rec.deck.join(','));
    assert.ok(!rec.deck.includes('fangpup'), rec.deck.join(','));
  });

  it('prefers ice beasts when the pile has them', () => {
    const s = emptySave('QA', 'moonember');
    s.cards.fangpup = 4;
    s.cards.frostwolf = 4;
    s.cards.steelfrost = 2;
    s.cards.sesame = 3;
    s.cards.onehorn = 2;
    const rec = suggestDeck(s.cards, 'ice', 'moonember');
    assert.ok(rec.colorBeasts >= 8, String(rec.colorBeasts));
    assert.ok(rec.deck.includes('fangpup') || rec.deck.includes('frostwolf'));
    assert.ok(rec.mix.evo2 >= 1, JSON.stringify(rec.mix));
  });

  it('mixes item families instead of one type', () => {
    const rec = suggestDeck(emptySave('QA', 'moonember').cards, 'flame', 'moonember');
    const fams = new Set<string>();
    for (const id of rec.deck) {
      const c = CARD_BY_ID[id];
      if (c?.kind === 'option') fams.add(c.optionType);
    }
    assert.ok(fams.has('battle'));
    assert.ok(fams.has('evolution'));
  });

  it('never invents cards or a second partner', () => {
    const owned = { moonember: 1, windfeather: 1, floppy: 4, atkchip: 4, ennya: 4 };
    const rec = suggestDeck(owned, 'flame', 'moonember');
    assert.ok(rec.deck.length < 30);
    assert.equal(partnerSeedCount(rec.deck), 1);
    assert.ok(rec.deck.every((id) => (owned[id] ?? 0) > 0));
  });

  it('prints suggest chips on the deck screen', () => {
    const html = deckScreenHtml(emptySave('QA', 'moonember'), 0);
    assert.ok(html.includes('data-suggest="flame"'));
    assert.ok(html.includes('data-suggest="ice"'));
    assert.ok(html.includes('おすすめ'));
  });

  it('kind helper hides moon-garb', () => {
    assert.equal(kindOfCard(getCard('moonsaddle')), null);
    assert.equal(kindOfCard(getCard('moonember')), 'seed');
    assert.equal(kindOfCard(getCard('moondrake')), 'evo1');
    assert.equal(kindOfCard(getCard('floppy')), 'item');
    assert.equal(starterDeck('moonember').length, 30);
  });
});

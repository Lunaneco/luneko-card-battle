import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { starterDeck } from '../src/data/cards';
import { emptySave } from '../src/state/save';
import { compareCards, deckScreenHtml, safeCard, slideTrack } from '../src/ui/deckView';
import { getCard } from '../src/data/cards';

describe('deck screen', () => {
  it('renders a count, tray, and owned picker', () => {
    const s = emptySave('QA', 'moonember');
    const html = deckScreenHtml(s, 0, 'all');
    assert.ok(html.includes('30/30'), html.slice(0, 400));
    assert.ok(html.includes('deck-count'));
    assert.ok(html.includes('deck-slide'));
    assert.ok(html.includes('deck-slide-track'));
    assert.ok(html.includes('名前でさがす'));
    assert.ok(html.includes('編成'));
    assert.ok((html.match(/deck-slide-track/g) ?? []).length >= 2);
    assert.ok(!html.includes('help-fab'));
  });

  it('lays owned and deck cards in a 2-row slide track', () => {
    assert.match(slideTrack('ab', 1), /repeat\(1,76px\)/);
    assert.match(slideTrack('abcd', 4), /repeat\(2,76px\)/);
    assert.match(slideTrack('x'.repeat(5), 5), /repeat\(3,76px\)/);
  });

  it('stacks copies in the tray when the deck is short', () => {
    const s = emptySave('QA', 'moonember');
    s.decks[2] = ['moonember', 'moonember'];
    const html = deckScreenHtml(s, 2, 'all');
    assert.ok(html.includes('2/30'));
    assert.ok(html.includes('data-rm-id="moonember"'));
    assert.ok(html.includes('×2'));
  });

  it('safeCard does not throw on junk ids', () => {
    assert.equal(safeCard('not-a-card'), null);
    assert.equal(safeCard('moonember')?.name, 'ムーンエンバー');
  });

  it('sorts partners and seeds before options', () => {
    const a = getCard('moonember');
    const b = getCard('floppy');
    const c = getCard('ennya');
    assert.ok(compareCards(a, b) < 0);
    assert.ok(compareCards(a, c) < 0);
  });

  it('orders たね then 1進化 then 2進化 then どうぐ', () => {
    const seed = getCard('ennya');
    const evo1 = getCard('moondrake');
    const evo2 = getCard('moonfang');
    const item = getCard('floppy');
    assert.equal(seed.level, 'III');
    assert.equal(evo1.level, 'IV');
    assert.equal(evo2.level, 'APEX');
    assert.equal(item.kind, 'option');
    assert.ok(compareCards(seed, evo1) < 0);
    assert.ok(compareCards(evo1, evo2) < 0);
    assert.ok(compareCards(evo2, item) < 0);
  });

  it('renders tray and owned in たね → 1進化 → 2進化 → どうぐ', () => {
    const s = emptySave('QA', 'moonember');
    const html = deckScreenHtml(s, 0, 'all');
    const rank = (id: string) => {
      const c = getCard(id);
      if (c.kind === 'option') return 3;
      if (c.level === 'III') return 0;
      if (c.level === 'IV') return 1;
      if (c.level === 'APEX') return 2;
      return 4;
    };
    const ids = (attr: string) => [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))].map((m) => m[1]!);
    for (const list of [ids('data-rm-id'), ids('data-add')]) {
      assert.ok(list.length > 3, list.join(','));
      for (let i = 1; i < list.length; i++) {
        assert.ok(rank(list[i - 1]!) <= rank(list[i]!), `${list[i - 1]} before ${list[i]}`);
      }
    }
  });

  it('filters the owned pool by color', () => {
    const s = emptySave('QA', 'moonember');
    s.cards.fangpup = 1;
    const flame = deckScreenHtml(s, 0, 'all', 'flame');
    assert.ok(flame.includes('data-add="moonember"'));
    assert.ok(!flame.includes('data-add="fangpup"'));
    const ice = deckScreenHtml(s, 0, 'all', 'ice');
    assert.ok(ice.includes('data-add="fangpup"'));
    assert.ok(!ice.includes('data-add="moonember"'));
  });

  it('hides moon-garb cards from the deck pool', () => {
    const s = emptySave('QA', 'moonember');
    s.cards.moonsaddle = 1;
    const html = deckScreenHtml(s, 0, 'all');
    assert.ok(!html.includes('data-add="moonsaddle"'), html);
  });

  it('starter decks stay legal', () => {
    const s = emptySave('QA', 'moonember');
    s.decks[0] = starterDeck('moonember');
    const html = deckScreenHtml(s, 0, 'all');
    assert.ok(html.includes('このデックで戦える'));
    assert.ok(html.includes('パートナーは1体まで'));
  });

  it('tells the player to long-press for card text', () => {
    const s = emptySave('QA', 'moonember');
    const html = deckScreenHtml(s, 0, 'all');
    assert.equal((html.match(/長押しで説明/g) ?? []).length, 2);
    assert.ok(html.includes('data-add="moonember"'));
    assert.ok(html.includes('data-rm-id="moonember"'));
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCard } from '../src/data/cards';
import { emptySave } from '../src/state/save';
import { cardHtml, fieldHtml } from '../src/ui/card';
import { collectionScreenHtml } from '../src/ui/collectionView';
import { PHASE_JA } from '../src/ui/copy';
import { inspectHtml } from '../src/ui/inspect';

describe('battle card names', () => {
  it('always prints the monster name, including tiny opponent-hand size', () => {
    const tiny = cardHtml(getCard('ennya'), { size: 'tiny' });
    assert.ok(tiny.includes('エンニャ'), tiny);
    assert.ok(tiny.includes('cname'), 'name plate missing');
    assert.ok(tiny.includes('data-name="エンニャ"'));
    const long = cardHtml(getCard('moonflareking'));
    assert.ok(long.includes('ムーンフレアキング'), long);
    assert.ok(long.includes('火炎'));
  });

  it('field plate repeats the monster name under the card', () => {
    const html = fieldHtml(
      {
        instanceId: 'x',
        cardId: 'moonember',
        name: 'ムーンエンバー',
        specialty: 'flame',
        level: 'III',
        hp: 680,
        maxHp: 680,
        circle: { power: 380, effect: 'none' },
        triangle: { power: 280, effect: 'none' },
        cross: { power: 180, effect: 'none' },
        support: { kind: 'none' },
        skillName: '月炎息',
        abnormal: false,
        garbed: false,
        isPartner: true,
        partnerLine: 'moonember',
        lineId: 'moonember',
      },
      true,
      '先攻',
    );
    assert.ok(html.includes('field-name'));
    assert.ok(html.includes('field-order first'));
    assert.ok(html.includes('先攻'));
    assert.equal((html.match(/ムーンエンバー/g) ?? []).length >= 2, true);
  });

  it('has Japanese phase labels for the battle HUD', () => {
    assert.equal(PHASE_JA.attack, '攻撃');
    assert.equal(PHASE_JA.evo, '進化');
    assert.equal(PHASE_JA.summon, '召喚');
  });

  it('adds rarity sparkle on 月印 / 希少 / 秘蔵, not 並', () => {
    const common = cardHtml(getCard('ennya'));
    assert.ok(common.includes('rarity-common'));
    assert.ok(!common.includes('class="foil"'), common);
    const moon = cardHtml(getCard('moonember'));
    assert.ok(moon.includes('rarity-uncommon'));
    assert.ok(moon.includes('class="foil"'));
    assert.ok(moon.includes('data-rarity="uncommon"'));
    const apex = cardHtml(getCard('moonflareking'));
    assert.ok(apex.includes('rarity-rare'));
    assert.ok(apex.includes('class="foil"'));
    const secret = cardHtml(getCard('ashcrown'));
    assert.ok(secret.includes('rarity-secret'));
    assert.ok(secret.includes('data-rarity="secret"'));
    assert.ok(secret.includes('foil-holo') && secret.includes('foil-spec'), secret);
  });

  it('opens a large tiltable card on the deck inspect', () => {
    const html = inspectHtml(getCard('moonember'), 'deck');
    assert.ok(html.includes('deck-inspect-stage'));
    assert.ok(html.includes('card hero') || html.includes('hero'));
    assert.ok(html.includes('foil-holo'));
    assert.ok(html.includes('foil-glare'));
    assert.ok(html.includes('スワイプでカードを動かす'));
    const sheet = inspectHtml(getCard('moonember'));
    assert.ok(!sheet.includes('deck-inspect-stage'));
    assert.ok(sheet.includes('月装'));
  });

  it('lets collection cards open the same large inspect', () => {
    const html = collectionScreenHtml(emptySave('QA', 'moonember'), 'owned');
    assert.ok(html.includes('data-inspect="moonember"'), html);
    assert.ok(html.includes('カードをタップして大きく見る'));
  });

  it('keeps i-badges off field and tiny cards', () => {
    const field = fieldHtml(
      {
        instanceId: 'x',
        cardId: 'moonember',
        name: 'ムーンエンバー',
        specialty: 'flame',
        level: 'III',
        hp: 680,
        maxHp: 680,
        circle: { power: 380, effect: 'none' },
        triangle: { power: 280, effect: 'none' },
        cross: { power: 180, effect: 'none' },
        support: { kind: 'none' },
        skillName: '月炎息',
        abnormal: false,
        garbed: false,
        isPartner: true,
        partnerLine: 'moonember',
        lineId: 'moonember',
      },
      true,
    );
    assert.ok(!field.includes('class="info"'), field);
    const tiny = cardHtml(getCard('ennya'), { size: 'tiny', hideInfo: true });
    assert.ok(!tiny.includes('class="info"'), tiny);
    const shop = cardHtml(getCard('ennya'));
    assert.ok(shop.includes('data-inspect="ennya"'), shop);
  });
});

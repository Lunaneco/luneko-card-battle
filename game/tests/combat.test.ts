import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCard, starterDeck } from '../src/data/cards';
import { advanceCpu } from '../src/engine/ai';
import { createMatch, flipCombatSupport, legalActions, prepareResolveDemo, resolveLockedCombat, submit } from '../src/engine/battle';
import type { FieldBeast } from '../src/engine/types';
import { cinemaBannerText, powerMath, resolveBoardHtml, resolveRecapText } from '../src/ui/battleHud';

function stubField(id: string, first = false): FieldBeast {
  return {
    instanceId: id,
    cardId: id,
    name: id,
    specialty: 'flame',
    level: 'III',
    hp: 800,
    maxHp: 800,
    circle: { power: 300, effect: 'none' },
    triangle: { power: 200, effect: 'none' },
    cross: { power: 150, effect: first ? 'firstStrike' : 'none' },
    support: { kind: 'none' },
    isPartner: false,
    garbed: false,
    abnormal: false,
    skillName: 'x',
  };
}

describe('deck-top support reveal', () => {
  it('flips the top card once and names it', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].deck.unshift({ instanceId: 'top1', cardId: 'floppy' });
    s.players[0].chosenSupport = 'deck';
    const before = s.players[0].deck.length;
    const first = flipCombatSupport(s, 0);
    const again = flipCombatSupport(s, 0);
    assert.equal(first?.cardId, 'floppy');
    assert.equal(first?.fromDeck, true);
    assert.equal(again?.cardId, 'floppy');
    assert.equal(s.players[0].deck.length, before - 1);
    assert.ok(s.log.some((l) => l.includes('きずぐすり') && l.includes('山札')));
  });
});

describe('resolve recap', () => {
  it('shows the flipped deck card and 先制 on the board text', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stubField('a', true);
    s.players[1].field = stubField('b', false);
    s.players[0].chosenAttack = 'cross';
    s.players[1].chosenAttack = 'triangle';
    s.players[0].deck.unshift({ instanceId: 'top2', cardId: 'atkchip' });
    s.players[0].chosenSupport = 'deck';
    s.players[1].chosenSupport = 'none';
    resolveLockedCombat(s);
    assert.equal(s.phase, 'resolve');
    assert.equal(s.lastCombat?.supports[0]?.cardId, 'atkchip');
    assert.equal(s.lastCombat?.supports[0]?.fromDeck, true);
    assert.ok(s.lastCombat?.effectLabels[0].includes('先制'));
    const recap = resolveRecapText(s);
    assert.ok(recap.includes('山札の上'), recap);
    assert.ok(recap.includes('力の月粉'), recap);
    assert.ok(recap.includes('先制'), recap);
    const board = resolveBoardHtml(s, 0);
    assert.ok(board.includes('combat-cinema'), board);
    assert.ok(board.includes('力の月粉'), board);
    assert.ok(board.includes('山札の上'), board);
    assert.ok(board.includes('do-flip'), board);
    assert.ok(board.includes('先制'), board);
    const flip = s.lastCombat?.beats.find((b) => b.kind === 'flip' && b.fromDeck);
    assert.equal(flip?.body, '力の月粉');
    assert.ok(cinemaBannerText(flip!).includes('力の月粉'));
    assert.ok(cinemaBannerText(flip!).includes('いちかばちか'));
  });
});

describe('arena cinema demo', () => {
  it('flips both deck tops with names and first-strike', () => {
    const s = prepareResolveDemo(7);
    assert.equal(s.phase, 'resolve');
    assert.equal(s.lastCombat?.supports[0]?.cardId, 'atkchip');
    assert.equal(s.lastCombat?.supports[1]?.cardId, 'floppy');
    assert.equal(s.lastCombat?.supports[0]?.fromDeck, true);
    assert.ok(s.lastCombat?.effectLabels[1].includes('先制'));
    const html = resolveBoardHtml(s, 0);
    assert.ok(html.includes('力の月粉'), html);
    assert.ok(html.includes('きずぐすり'), html);
    assert.ok(html.includes('いちかばちか') || html.includes('山札の上'), html);
    assert.ok((html.match(/data-from-deck="1"/g) ?? []).length >= 2);
    assert.ok(s.lastCombat?.beats.some((b) => b.kind === 'special' && b.title === '先制'));
  });
});

describe('printed combat numbers', () => {
  it('attack power is the damage; support adds; weakness is ×1.5', () => {
    const s = prepareResolveDemo(7);
    const lc = s.lastCombat!;
    assert.equal(lc.basePowers[0], 380);
    assert.equal(lc.bonuses[0], 150);
    assert.equal(lc.powers[0], 530);
    assert.equal(lc.damages[0], 795);
    assert.equal(lc.weakHits[0], true);
    assert.equal(lc.damages[1], 160);
    assert.equal(lc.weakHits[1], false);
    assert.equal(s.players[1].field!.hp, 0);
    assert.equal(s.players[0].field!.hp, 680 - 160);
    assert.equal(powerMath(lc, 0), '380+150=530');
    const html = resolveBoardHtml(s, 0);
    assert.ok(html.includes('380+150=530'), html);
    assert.ok(html.includes('与ダメージ 795'), html);
    assert.ok(html.includes('弱点'), html);
  });

  it('exclusive counter attacks second and still deals own power', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stubField('a', false);
    s.players[1].field = stubField('b', false);
    s.players[0].field.hp = 800;
    s.players[1].field.hp = 800;
    s.players[0].field.circle = { power: 300, effect: 'none' };
    s.players[1].field.cross = { power: 150, effect: 'counter' };
    s.players[0].chosenAttack = 'circle';
    s.players[1].chosenAttack = 'cross';
    s.players[0].chosenSupport = 'none';
    s.players[1].chosenSupport = 'none';
    s.active = 0;
    resolveLockedCombat(s);
    assert.equal(s.lastCombat?.hitFirst, 0);
    assert.equal(s.lastCombat?.damages[0], 300);
    assert.equal(s.lastCombat?.damages[1], 150);
    assert.equal(s.players[1].field!.hp, 500);
    assert.equal(s.players[0].field!.hp, 650);
  });

  it('suicide sets power to remaining HP minus 10', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stubField('a', false);
    s.players[1].field = stubField('b', false);
    s.players[0].field.hp = 410;
    s.players[0].field.maxHp = 800;
    s.players[1].field.hp = 350;
    s.players[0].field.cross = { power: 50, effect: 'suicide' };
    s.players[0].chosenAttack = 'cross';
    s.players[1].chosenAttack = 'triangle';
    s.players[0].chosenSupport = 'none';
    s.players[1].chosenSupport = 'none';
    resolveLockedCombat(s);
    assert.equal(s.lastCombat?.powers[0], 400);
    assert.equal(s.lastCombat?.damages[0], 400);
    assert.equal(s.players[0].field!.hp, 10);
    assert.equal(s.players[1].field!.hp, 0);
  });

  it('zero after support makes that command deal 0', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stubField('a', false);
    s.players[1].field = stubField('b', false);
    s.players[0].field.circle = { power: 300, effect: 'none' };
    s.players[1].field.cross = { power: 100, effect: 'zeroCircle' };
    s.players[0].chosenAttack = 'circle';
    s.players[1].chosenAttack = 'cross';
    s.players[0].deck.unshift({ instanceId: 'z1', cardId: 'atkchip' });
    s.players[0].chosenSupport = 'deck';
    s.players[1].chosenSupport = 'none';
    resolveLockedCombat(s);
    assert.equal(s.lastCombat?.powers[0], 0);
    assert.equal(s.lastCombat?.damages[0], 0);
    assert.equal(s.players[1].field!.hp, s.players[1].field!.maxHp);
  });

  it('applies exclusive option riders from the shipped effect object', () => {
    const frost = getCard('frostkeep');
    assert.equal(frost.kind, 'option');
    assert.equal(frost.effect.kind, 'heal');
    const sHeal = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    sHeal.players[0].field = stubField('a', false);
    sHeal.players[1].field = stubField('b', false);
    sHeal.players[0].field.hp = 200;
    sHeal.players[1].field.triangle = { power: 0, effect: 'none' };
    sHeal.players[0].chosenAttack = 'circle';
    sHeal.players[1].chosenAttack = 'triangle';
    sHeal.players[0].deck.unshift({ instanceId: 'h1', cardId: 'frostkeep' });
    sHeal.players[0].chosenSupport = 'deck';
    sHeal.players[1].chosenSupport = 'none';
    resolveLockedCombat(sHeal);
    assert.equal(sHeal.players[0].field!.hp, Math.min(800, 200 + frost.effect.amount));

    const sHoly = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    sHoly.players[0].field = stubField('a', false);
    sHoly.players[1].field = stubField('b', false);
    sHoly.players[0].field.hp = 120;
    sHoly.players[1].field.triangle = { power: 0, effect: 'none' };
    sHoly.players[0].chosenAttack = 'circle';
    sHoly.players[1].chosenAttack = 'triangle';
    sHoly.players[0].deck.unshift({ instanceId: 'h2', cardId: 'holy7' });
    sHoly.players[0].chosenSupport = 'deck';
    sHoly.players[1].chosenSupport = 'none';
    resolveLockedCombat(sHoly);
    assert.equal(sHoly.players[0].field!.hp, 800);
    assert.equal(sHoly.lastCombat?.first[0], true);

    const sRev = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    sRev.players[0].field = stubField('a', false);
    sRev.players[1].field = stubField('b', false);
    sRev.players[0].chosenAttack = 'circle';
    sRev.players[1].chosenAttack = 'triangle';
    sRev.players[0].deck.unshift({ instanceId: 'h3', cardId: 'reverse7' });
    sRev.players[0].chosenSupport = 'deck';
    sRev.players[1].chosenSupport = 'none';
    resolveLockedCombat(sRev);
    assert.equal(sRev.lastCombat?.powers[1], 0);
    assert.equal(sRev.lastCombat?.damages[1], 0);

    const sMist = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    sMist.players[0].field = stubField('a', false);
    sMist.players[1].field = stubField('b', false);
    sMist.players[0].chosenAttack = 'triangle';
    sMist.players[1].chosenAttack = 'circle';
    sMist.players[0].deck.unshift({ instanceId: 'h4', cardId: 'misty7' });
    sMist.players[0].chosenSupport = 'deck';
    sMist.players[1].chosenSupport = 'none';
    resolveLockedCombat(sMist);
    assert.equal(sMist.lastCombat?.powers[1], 0);

    const sGrand = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    sGrand.players[0].field = stubField('a', false);
    sGrand.players[1].field = stubField('b', false);
    const handBefore = sGrand.players[1].hand.length;
    sGrand.players[0].chosenAttack = 'circle';
    sGrand.players[1].chosenAttack = 'triangle';
    sGrand.players[0].deck.unshift({ instanceId: 'h5', cardId: 'grand7' });
    sGrand.players[0].chosenSupport = 'deck';
    sGrand.players[1].chosenSupport = 'none';
    resolveLockedCombat(sGrand);
    const grand = getCard('grand7');
    assert.equal(grand.kind, 'option');
    assert.equal(grand.effect.kind, 'atkAll');
    assert.equal(sGrand.lastCombat?.bonuses[0], grand.effect.amount);
    assert.equal(sGrand.players[1].hand.length, handBefore - 1);
  });
});

describe('combat does not freeze after resolve', () => {
  it('CPU waits for human 次へ then takes the next turn', () => {
    const s0 = prepareResolveDemo(7);
    assert.equal(s0.phase, 'resolve');
    assert.equal(advanceCpu(s0, 0, 1, 'normal'), null);
    const locked = submit(s0, 0, { type: 'ackResolve' });
    assert.equal(locked.phase, 'resolve');
    assert.equal(legalActions(locked, 0).length, 0);
    let s = advanceCpu(locked, 0, 1, 'normal');
    assert.ok(s, 'CPU must ack after human');
    assert.ok(s.phase === 'turnDraw' || s.phase === 'postKo' || s.phase === 'gameOver', s.phase);
    if (s.phase === 'gameOver') return;
    let guard = 0;
    while (s.waitingOn.includes(1) && s.phase !== 'gameOver' && guard++ < 12) {
      const n = advanceCpu(s, 0, 1, 'normal');
      if (!n) break;
      s = n;
    }
    assert.notEqual(s.phase, 'resolve');
    assert.ok(s.waitingOn.includes(0) || s.phase === 'gameOver', `human cannot act in ${s.phase}`);
  });
});

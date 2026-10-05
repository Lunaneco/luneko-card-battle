import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { starterDeck } from '../src/data/cards';
import { createMatch, resolveLockedCombat } from '../src/engine/battle';
import { evaluateYaku, isFeverNumber, yakuXp } from '../src/engine/yaku';
import type { FieldBeast } from '../src/engine/types';

function stub(id: string, extra: Partial<FieldBeast> = {}): FieldBeast {
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
    cross: { power: 150, effect: 'none' },
    support: { kind: 'none' },
    isPartner: false,
    garbed: false,
    abnormal: false,
    skillName: 'x',
    ...extra,
  };
}

describe('fever numbers', () => {
  it('matches Luneko rules ぞろ目', () => {
    assert.equal(isFeverNumber(1110), true);
    assert.equal(isFeverNumber(2220), true);
    assert.equal(isFeverNumber(1111), true);
    assert.equal(isFeverNumber(530), false);
    assert.equal(isFeverNumber(680), false);
  });
});

describe('yaku from how you win', () => {
  it('awards とりかえなし・無敗・オール○ on a clean sweep', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['ルナ', 'ホーク'], {}, 3, 0);
    s.players[0].field = stub('moonember', { isPartner: true, partnerLine: 'moonember', circle: { power: 900, effect: 'none' } });
    s.players[1].field = stub('b', { hp: 200, maxHp: 200, level: 'APEX' });
    s.players[0].chosenAttack = 'circle';
    s.players[1].chosenAttack = 'triangle';
    s.players[0].chosenSupport = 'none';
    s.players[1].chosenSupport = 'none';
    s.players[0].kos = 2;
    resolveLockedCombat(s);
    s.winner = 0;
    s.phase = 'gameOver';
    const yaku = evaluateYaku(s, 0, 'ルナ');
    const names = yaku.map((y) => y.name);
    assert.ok(names.includes('とりかえなし勝利'), names.join(','));
    assert.ok(names.includes('無敗勝利'), names.join(','));
    assert.ok(names.includes('オール○攻撃勝利'), names.join(','));
    assert.ok(names.includes('オール援助なし勝利'), names.join(','));
    assert.ok(names.includes('レベル完キラー'), names.join(','));
    assert.ok(names.includes('パートナー勝利'), names.join(','));
    assert.ok(names.includes('ラッキーネーム'), names.join(','));
    assert.ok(yakuXp(yaku) >= 1 + 3 + 3 + 5 + 3 + 1 + 1);
  });

  it('finishing いちかばちか is not awarded with オールいちかばちか', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stub('a', { circle: { power: 900, effect: 'none' } });
    s.players[1].field = stub('b', { hp: 100, maxHp: 100 });
    s.players[0].deck.unshift({ instanceId: 't', cardId: 'atkchip' });
    s.players[0].chosenAttack = 'circle';
    s.players[1].chosenAttack = 'triangle';
    s.players[0].chosenSupport = 'deck';
    s.players[1].chosenSupport = 'none';
    s.players[0].kos = 2;
    resolveLockedCombat(s);
    s.winner = 0;
    s.phase = 'gameOver';
    const names = evaluateYaku(s, 0, 'A').map((y) => y.name);
    assert.ok(names.includes('オールいちかばちか勝利'), names.join(','));
    assert.equal(names.includes('とどめのいちかばちか勝利'), false);
  });

  it('just kill when damage equals remaining HP', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stub('a', { circle: { power: 300, effect: 'none' } });
    s.players[1].field = stub('b', { hp: 300, maxHp: 300 });
    s.players[0].chosenAttack = 'circle';
    s.players[1].chosenAttack = 'triangle';
    s.players[0].chosenSupport = 'none';
    s.players[1].chosenSupport = 'none';
    s.players[0].kos = 2;
    resolveLockedCombat(s);
    s.winner = 0;
    s.phase = 'gameOver';
    const names = evaluateYaku(s, 0, 'A').map((y) => y.name);
    assert.ok(names.includes('とどめのジャスト攻撃'), names.join(','));
  });
});

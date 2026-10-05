import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID, starterDeck } from '../src/data/cards';
import { SEVEN_DROPS, SEVEN_IDS, exclusiveFightId, isExclusive, isSeven } from '../src/data/rarity';
import { openPack } from '../src/data/shop';
import { STORY } from '../src/data/story';
import { mixPower } from '../src/data/storyPressure';
import { pickAi } from '../src/engine/ai';
import { createMatch, legalActions, submit, tossFirst } from '../src/engine/battle';
import { SeededRng } from '../src/engine/rng';
import type { FieldBeast, MatchState } from '../src/engine/types';
import { emptySave } from '../src/state/save';

const SHELLS = ['embershell', 'bloomshell', 'dawnshell', 'thickshell', 'shadeshell', 'lampshell', 'cleftshell', 'thundershell', 'clearshell'];

function stubPartner(over: Partial<FieldBeast> = {}): FieldBeast {
  return {
    instanceId: 'f',
    cardId: 'moonember',
    name: '月炎仔',
    specialty: 'flame',
    level: 'III',
    hp: 800,
    maxHp: 800,
    circle: { power: 300, effect: 'none' },
    triangle: { power: 250, effect: 'none' },
    cross: { power: 200, effect: 'none' },
    support: { kind: 'none' },
    isPartner: true,
    partnerLine: 'moonember',
    garbed: false,
    abnormal: false,
    skillName: 'x',
    ...over,
  };
}

function evoState(forbid: [boolean, boolean]): MatchState {
  const s = createMatch(
    [starterDeck('moonember'), starterDeck('windfeather')],
    ['人', 'CPU'],
    { ownedShells: SHELLS, forbidMoonGarb: forbid },
    1,
  );
  s.phase = 'evo';
  s.active = 1;
  s.waitingOn = [1];
  s.players[0].field = stubPartner({ instanceId: 'a' });
  s.players[1].field = stubPartner({ instanceId: 'b', cardId: 'windfeather', partnerLine: 'windfeather', specialty: 'nature' });
  return s;
}

function playOut(s: MatchState, p0: 'normal' | 'tutorial', p1: 'normal' | 'rival' | 'boss' | 'scripted' | 'tutorial'): MatchState {
  let cur = s;
  let guard = 0;
  while (cur.phase !== 'gameOver' && guard++ < 2000) {
    const waiting = cur.waitingOn.slice();
    if (!waiting.length) break;
    for (const p of waiting) {
      if (!cur.waitingOn.includes(p)) continue;
      const act = pickAi(cur, p, p === 0 ? p0 : p1);
      if (!act) break;
      cur = submit(cur, p, act);
    }
  }
  return cur;
}

describe('CPU cannot 月装', () => {
  it('legalActions hides moonGarb for a forbidden seat and submit is a no-op', () => {
    const blocked = evoState([false, true]);
    assert.equal(
      legalActions(blocked, 1).some((a) => a.type === 'moonGarb'),
      false,
    );
    const before = blocked.players[1].field?.cardId;
    const next = submit(blocked, 1, { type: 'moonGarb', cardId: 'dawnwing' });
    assert.equal(next.players[1].field?.cardId, before);
    assert.equal(next.players[1].field?.garbed, false);
  });

  it('human seat still 月装s when CPU is forbidden', () => {
    const s = evoState([false, true]);
    s.active = 0;
    s.waitingOn = [0];
    assert.equal(
      legalActions(s, 0).some((a) => a.type === 'moonGarb'),
      true,
    );
    const after = submit(s, 0, { type: 'moonGarb', cardId: 'moonsaddle' });
    assert.equal(after.players[0].field?.garbed, true);
    assert.equal(after.players[0].field?.cardId, 'moonsaddle');
  });

  it('pickAi never chooses moonGarb for the CPU seat', () => {
    const s = evoState([false, true]);
    const act = pickAi(s, 1, 'boss');
    assert.notEqual(act?.type, 'moonGarb');
  });
});

describe('極月札 are boss / hidden-boss spoils', () => {
  it('lists all seven, each in that fight deck and reward', () => {
    assert.equal(SEVEN_IDS.length, 7);
    for (const drop of SEVEN_DROPS) {
      assert.equal(isSeven(drop.id), true);
      assert.equal(isExclusive(drop.id), true);
      assert.equal(exclusiveFightId(drop.id), drop.fightId);
      const node = STORY.find((n) => n.id === drop.fightId);
      assert.ok(node, drop.fightId);
      const extra = node!.id.startsWith('extra-');
      const bossy = node!.battle.ai === 'boss' || node!.battle.ai === 'scripted';
      assert.ok(extra || bossy, `${drop.id} drops from ${node!.id} (${node!.battle.ai})`);
      assert.ok(node!.battle.deck.includes(drop.id), `${drop.id} missing from ${drop.fightId} deck`);
      assert.ok(node!.battle.reward.includes(drop.id), `${drop.id} missing from ${drop.fightId} reward`);
    }
  });

  it('never rewards a seven from a regular story duel', () => {
    for (const n of STORY) {
      for (const id of n.battle.reward) {
        if (!isSeven(id)) continue;
        const extra = n.id.startsWith('extra-');
        const bossy = n.battle.ai === 'boss' || n.battle.ai === 'scripted';
        assert.ok(extra || bossy, `${n.id} rewards ${id}`);
      }
    }
  });

  it('keeps sevens out of shop packs and starter', () => {
    const banned = new Set<string>(SEVEN_IDS);
    const save = emptySave('QA', 'moonember');
    for (const id of SEVEN_IDS) {
      assert.equal(save.cards[id] ?? 0, 0, `starter owns ${id}`);
      assert.ok(!starterDeck('moonember').includes(id));
    }
    for (const pack of ['seed', 'city', 'premium'] as const) {
      for (let seed = 1; seed <= 80; seed++) {
        const rng = new SeededRng(seed * 19 + pack.length);
        for (const id of openPack(pack, () => rng.next())) {
          assert.equal(banned.has(id), false, `pack ${pack} rolled ${id}`);
        }
      }
    }
  });
});

describe('CPU cheat decks ignore the save pile', () => {
  it('deals sevens from a late boss even when the save owns none', () => {
    const save = emptySave('QA', 'moonember');
    assert.equal(save.cards.wild7 ?? 0, 0);
    const node = STORY.find((n) => n.id === 'tower-zero')!;
    assert.ok(node.battle.deck.includes('wild7'));
    const match = createMatch(
      [save.decks[0]!, node.battle.deck.filter((id) => CARD_BY_ID[id])],
      [save.playerName, node.battle.opponentName],
      { forbidMoonGarb: [false, true] },
      9,
    );
    const cpu = [...match.players[1].deck, ...match.players[1].hand].map((c) => c.cardId);
    assert.ok(cpu.includes('wild7'), `cpu pile ${cpu.join(',')}`);
    assert.ok(cpu.includes('holy7'));
    assert.ok(cpu.includes('dark7'));
  });
});

describe('post-tutorial mix vs starter', () => {
  it('keeps the tutorial weaker than the real starter and rivals stronger', () => {
    const starter = mixPower(starterDeck('moonember'));
    const tut = mixPower(STORY.find((n) => n.id === 'tut-mochi')!.battle.deck);
    assert.ok(tut < starter, `tut ${tut} !< starter ${starter}`);
    for (const n of STORY) {
      if (n.id === 'tut-mochi') continue;
      if (n.battle.ai !== 'rival' && n.battle.ai !== 'boss' && n.battle.ai !== 'scripted') continue;
      const p = mixPower(n.battle.deck);
      assert.ok(p > starter, `${n.id} mix ${p} !> starter ${starter}`);
    }
  });

  it('testplay: starter usually beats tutorial, a late boss can beat starter', () => {
    const tut = STORY.find((n) => n.id === 'tut-mochi')!;
    const venom = STORY.find((n) => n.id === 'tower-venom')!;
    let tutWins = 0;
    let bossWins = 0;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const tutSeed = 11 + i * 97;
      const a = playOut(
        createMatch(
          [starterDeck('moonember'), tut.battle.deck],
          ['P', 'もち'],
          { forbidMoonGarb: [false, true], ownedShells: SHELLS },
          tutSeed,
          tossFirst(tutSeed),
        ),
        'normal',
        'tutorial',
      );
      if (a.winner === 0) tutWins += 1;
      const bossSeed = 23 + i * 89;
      const b = playOut(
        createMatch(
          [starterDeck('moonember'), venom.battle.deck],
          ['P', '毒'],
          { forbidMoonGarb: [false, true], ownedShells: SHELLS },
          bossSeed,
          tossFirst(bossSeed),
        ),
        'normal',
        'boss',
      );
      if (b.winner === 1) bossWins += 1;
    }
    assert.ok(tutWins >= 7, `starter vs tut wins ${tutWins}/${n}`);
    assert.ok(bossWins >= 1, `venom vs starter cpu wins ${bossWins}/${n}`);
  });
});

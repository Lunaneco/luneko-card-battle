import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARDS, getCard, starterDeck, STARTER_PARTNERS } from '../src/data/cards';
import { matchupText } from '../src/data/lines';
import { evaluateMission } from '../src/data/missions';
import { STORY } from '../src/data/story';
import { pickAi } from '../src/engine/ai';
import { createMatch, submit, validateDeck } from '../src/engine/battle';
import { createStoryMatch } from '../src/engine/storyMatch';
import { SUGGEST_QUOTA, SUGGEST_SPECS, suggestDeck } from '../src/engine/suggestDeck';
import type { FieldBeast, MatchState } from '../src/engine/types';
import { supportText } from '../src/ui/card';

function field(overrides: Partial<FieldBeast> = {}): FieldBeast {
  return { instanceId: 'f', cardId: 'ennya', name: 'test', specialty: 'flame', level: 'III',
    hp: 1000, maxHp: 1000, circle: { power: 300, effect: 'none' },
    triangle: { power: 200, effect: 'none' }, cross: { power: 100, effect: 'none' },
    support: { kind: 'none' }, isPartner: false, garbed: false, abnormal: false, skillName: 'test', ...overrides };
}
function state(phase: 'attack' | 'support' | 'evo' = 'attack'): MatchState {
  const s = createMatch([starterDeck('moonember'), starterDeck('moonember')], ['P', 'CPU'], {}, 17, 0);
  s.phase = phase;
  s.waitingOn = [1];
  s.players[0].field = field();
  s.players[1].field = field({ instanceId: 'cpu' });
  s.players.forEach(p => { p.hand = []; p.chosenAttack = 'circle'; });
  return s;
}

describe('audit: AI decisions match actual combat rules', () => {
  it('uses a weak-point first strike to finish before taking a fatal hit', () => {
    const s = state();
    s.players[0].field = field({ hp: 280, specialty: 'flame',
      circle: { power: 400, effect: 'none' }, triangle: { power: 400, effect: 'none' }, cross: { power: 400, effect: 'none' } });
    s.players[1].field = field({ hp: 100, specialty: 'ice', cross: { power: 200, effect: 'firstStrike' } });
    assert.deepEqual(pickAi(s, 1, 'boss'), { type: 'chooseAttack', slot: 'cross' });
  });

  it('does not spam low-damage first strike against a healthy opponent', () => {
    const s = state();
    s.players[1].field!.cross = { power: 100, effect: 'firstStrike' };
    assert.deepEqual(pickAi(s, 1, 'boss'), { type: 'chooseAttack', slot: 'circle' });
  });

  it('does not mistake counter for damage prevention', () => {
    const s = state();
    s.active = 1;
    s.players[0].field!.hp = 250;
    s.players[1].field!.hp = 200;
    s.players[1].field!.cross = { power: 100, effect: 'counter' };
    assert.deepEqual(pickAi(s, 1, 'boss'), { type: 'chooseAttack', slot: 'circle' });
  });

  it('uses matching slot support and conserves a nonmatching one', () => {
    const s = state('support');
    s.players[1].hand = [{ cardId: 'pluginT', instanceId: 'wrong' }, { cardId: 'pluginO', instanceId: 'right' }];
    assert.deepEqual(pickAi(s, 1, 'rival'), { type: 'playSupport', target: 'right' });
    s.players[1].hand.pop();
    assert.deepEqual(pickAi(s, 1, 'rival'), { type: 'playSupport', target: 'none' });
  });

  it('does not lower both HP into a guaranteed enemy first hit', () => {
    const s = state('support');
    s.players[0].field = field({ circle: { power: 400, effect: 'none' }, triangle: { power: 400, effect: 'none' }, cross: { power: 400, effect: 'none' } });
    s.players[1].hand = [{ cardId: 'toyCore', instanceId: 'flatten' }];
    assert.deepEqual(pickAi(s, 1, 'boss'), { type: 'playSupport', target: 'none' });
  });

  it('charges excess IV cards while retaining one affordable evolution', () => {
    const s = state('evo');
    s.active = 1;
    s.players[1].field = field({ cardId: 'shadehand', specialty: 'dark' });
    s.players[1].hand = ['spiritcat', 'ironcat', 'nightsteward'].map(cardId => ({ cardId, instanceId: cardId }));
    const act = pickAi(s, 1, 'rival');
    assert.equal(act?.type, 'charge');
    const next = submit(s, 1, act!);
    assert.equal(next.players[1].pow, 10);
    assert.ok(next.players[1].hand.some(c => c.cardId === 'spiritcat'));
  });

  it('uses a leap evolution with an APEX target even without an IV target', () => {
    const s = state('evo');
    s.active = 1;
    s.players[1].field = field({ cardId: 'shadehand', specialty: 'dark' });
    s.players[1].pow = 30;
    s.players[1].hand = ['warpEvo', 'venomcrown'].map(cardId => ({ cardId, instanceId: cardId }));
    const act = pickAi(s, 1, 'boss');
    assert.deepEqual(act, { type: 'evoOption', instanceId: 'warpEvo' });
    assert.equal(submit(s, 1, act!).players[1].field?.cardId, 'venomcrown');
  });

  it('does not consume a leap tool without a target or download into a weaker stage', () => {
    const s = state('evo');
    s.active = 1;
    s.players[1].hand = [{ cardId: 'warpEvo', instanceId: 'warp' }];
    assert.deepEqual(pickAi(s, 1, 'boss'), { type: 'skipEvo' });
    s.players[1].field = field({ cardId: 'ashfist', level: 'IV' });
    s.players[1].hand = ['downloader', 'ennya'].map(cardId => ({ cardId, instanceId: cardId }));
    assert.notEqual(pickAi(s, 1, 'boss')?.type, 'evoOption');
  });

  it('never changes its decision from hidden commands, support, or deck order; never mutates the match', () => {
    for (const phase of ['attack', 'support'] as const) {
      const s = state(phase);
      s.players[1].hand = [{ cardId: 'pluginO', instanceId: 'boost' }];
      const before = structuredClone(s);
      const expected = pickAi(s, 1, 'boss');
      assert.deepEqual(s, before);
      s.players[0].chosenAttack = 'cross';
      s.players[0].chosenSupport = 'deck';
      s.players.forEach(p => p.deck.reverse());
      assert.deepEqual(pickAi(s, 1, 'boss'), expected);
    }
  });

  it('finishes the equal-drain story matchup rather than looping after both decks empty', () => {
    const node = STORY.find(n => n.id === 'ice-1')!;
    let s = createStoryMatch(node, starterDeck('shellwhite'), 'P', 2921);
    for (let step = 0; s.phase !== 'gameOver' && step < 900; step++) {
      for (const p of s.waitingOn.slice()) {
        if (!s.waitingOn.includes(p)) continue;
        const act = pickAi(s, p, p === 0 ? 'normal' : node.battle.ai)!;
        s = submit(s, p, act);
      }
    }
    assert.equal(s.phase, 'gameOver');
    assert.ok(s.turn < 100, `equal drain still stalled at turn ${s.turn}`);
  });
});

describe('audit: evolution achievements require a transformation', () => {
  it('does not award a progress mission for evolution fuel alone', () => {
    const s = state('evo');
    s.active = 1;
    s.players[1].hand = [{ cardId: 'speedEvo', instanceId: 'fuel' }];
    const next = submit(s, 1, { type: 'evoOption', instanceId: 'fuel' });
    assert.ok(next.players[1].pow > 0);
    next.winner = 1;
    assert.equal(evaluateMission('evolve', next, 1), false);
    assert.equal(evaluateMission('noevo', next, 1), true);
  });

  it('does not count a leap without a target, but counts a successful leap', () => {
    const s = state('evo');
    s.active = 1;
    s.players[1].field = field({ cardId: 'shadehand', specialty: 'dark' });
    s.players[1].hand = [{ cardId: 'warpEvo', instanceId: 'leap' }];
    assert.equal(submit(s, 1, { type: 'evoOption', instanceId: 'leap' }).stats.evolved[1], false);
    s.players[1].pow = 30;
    s.players[1].hand.push({ cardId: 'venomcrown', instanceId: 'target' });
    const next = submit(s, 1, { type: 'evoOption', instanceId: 'leap' });
    next.winner = 1;
    assert.equal(next.players[1].field?.cardId, 'venomcrown');
    assert.equal(evaluateMission('evolve', next, 1), true);
  });
});

describe('audit: story and deck integrity', () => {
  const zero = STORY.find(n => n.id === 'tower-zero')!;
  it('ships repeatable boss openings without creating or deleting any card', () => {
    for (const starter of STARTER_PARTNERS) for (const seed of [1, 97, 239]) {
      const s = createStoryMatch(zero, starterDeck(starter), 'P', seed);
      assert.deepEqual(s.players[1].hand.map(c => c.cardId), ['littleshade', 'nightsteward', 'wild7', 'samehand']);
      assert.deepEqual(s.players[1].deck.slice(0, 4).map(c => c.cardId), ['hacking', 'errorfang', 'holy7', 'dark7']);
      assert.ok(s.players[0].deck.slice(-2).some(c => c.cardId === starter));
      assert.ok(!s.players[0].hand.some(c => c.cardId === starter));
      for (const p of s.players) {
        const all = [...p.hand, ...p.deck];
        assert.equal(new Set(all.map(c => c.instanceId)).size, 30);
        assert.deepEqual(all.map(c => c.cardId).sort(), [...(p.id === 0 ? starterDeck(starter) : zero.battle.deck)].sort());
      }
    }
  });

  it('keeps ordinary story fights free of the climax rules', () => {
    for (const n of STORY.filter(n => !n.battle.cheat)) {
      assert.equal(createStoryMatch(n, starterDeck('moonember'), 'P', 1).flags.cheat, undefined);
    }
  });

  it('keeps the player growth bonus off an enemy using the same partner', () => {
    const node = STORY.find(n => n.id === 'sky-1')!;
    let s = createStoryMatch(node, starterDeck('moonember'), 'P', 3, {
      partnerGrowth: { moonember: { hp: 200, circle: 80, triangle: 60, cross: 40 } },
    });
    s.phase = 'summon';
    s.players[0].hand = [{ cardId: 'moonember', instanceId: 'human-partner' }];
    s.players[1].hand = [{ cardId: 'moonember', instanceId: 'enemy-partner' }];
    s = submit(s, 0, { type: 'summon', instanceId: 'human-partner' });
    s = submit(s, 1, { type: 'summon', instanceId: 'enemy-partner' });
    assert.equal(s.players[0].field?.hp, 880);
    assert.equal(s.players[1].field?.hp, 680);
    assert.equal(s.players[0].field?.circle.power, 460);
    assert.equal(s.players[1].field?.circle.power, 380);
  });

  it('does not invent cards when an opening requests unavailable IDs', () => {
    const deck = starterDeck('moonember');
    const s = createMatch([deck, deck], ['A', 'B'], { cheat: { forceHand: ['missing', 'samehand'], forceTop: ['missing'] } });
    assert.deepEqual([...s.players[1].hand, ...s.players[1].deck].map(c => c.cardId).sort(), [...deck].sort());
  });

  it('awards actual usable cards rather than a shell ID or a 月装 form', () => {
    for (const node of STORY) for (const id of node.battle.reward) {
      const c = getCard(id);
      assert.ok(c.kind === 'option' || c.level !== 'MOON', `${node.id}: ${id}`);
    }
  });

  it('keeps recommended decks at the target mix with evolution fuel in a full collection', () => {
    const owned = Object.fromEntries(CARDS.map(c => [c.id, 4]));
    for (const spec of SUGGEST_SPECS) {
      const rec = suggestDeck(owned, spec);
      assert.equal(validateDeck(rec.deck), null);
      assert.deepEqual(rec.mix, SUGGEST_QUOTA);
      assert.ok(rec.deck.filter(id => { const c = getCard(id); return c.kind === 'option' && c.optionType === 'evolution'; }).length >= 2);
    }
  });

  it('shows both directions of the dark / rare matchup and Japanese attack symbols', () => {
    assert.equal(matchupText('dark', 'rare').kind, 'both');
    assert.equal(matchupText('rare', 'dark').kind, 'both');
    assert.equal(matchupText('flame', 'nature').kind, 'up');
    assert.equal(matchupText('flame', 'ice').kind, 'down');
    assert.ok(supportText(getCard('flarecat')).includes('○'));
    assert.ok(!supportText(getCard('flarecat')).includes('circle'));
  });
});

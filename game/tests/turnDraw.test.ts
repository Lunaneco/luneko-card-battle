import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID, getCard } from '../src/data/cards';
import { nextFormId } from '../src/data/lines';
import { STORY } from '../src/data/story';
import { pickAi } from '../src/engine/ai';
import { createMatch, legalActions, submit } from '../src/engine/battle';
import type { Action, MatchState } from '../src/engine/types';

function iceDeck(): string[] {
  const ids = ['fangpup', 'sesame', 'penguin', 'tadpole', 'jellpup', 'frostwolf', 'onehorn'];
  const out: string[] = [];
  for (const id of ids) {
    for (let n = 0; n < 4; n++) out.push(id);
  }
  return out.slice(0, 30);
}

function keep(s: MatchState, p: 0 | 1): MatchState {
  return submit(s, p, { type: 'mulligan', redraw: false });
}

function summonFirst(s: MatchState, p: 0 | 1): MatchState {
  const act = legalActions(s, p).find((a) => a.type === 'summon');
  assert.ok(act, `no summon in ${s.phase} for ${p}`);
  return submit(s, p, act!);
}

function skipCombat(s: MatchState): MatchState {
  let cur = s;
  if (cur.phase === 'turnDraw') cur = keep(cur, cur.active);
  if (cur.phase === 'evo') cur = submit(cur, cur.active, { type: 'skipEvo' });
  if (cur.phase === 'attack') {
    cur = submit(cur, 0, { type: 'chooseAttack', slot: 'triangle' });
    cur = submit(cur, 1, { type: 'chooseAttack', slot: 'triangle' });
  }
  if (cur.phase === 'support') {
    cur = submit(cur, 0, { type: 'playSupport', target: 'none' });
    cur = submit(cur, 1, { type: 'playSupport', target: 'none' });
  }
  if (cur.phase === 'resolve') {
    cur = submit(cur, 0, { type: 'ackResolve' });
    cur = submit(cur, 1, { type: 'ackResolve' });
  }
  return cur;
}

function openToFirstTurnDraw(): MatchState {
  let s = createMatch([iceDeck(), iceDeck()], ['A', 'B'], {}, 11, 0);
  assert.equal(s.players[0].hand.length, 4);
  assert.equal(s.players[1].hand.length, 4);
  s = keep(s, 0);
  s = keep(s, 1);
  s = summonFirst(s, 0);
  s = summonFirst(s, 1);
  assert.equal(s.phase, 'turnDraw');
  assert.equal(s.active, 0);
  return s;
}

describe('own-turn draw is +1 from 山札', () => {
  it('after opening 4, an own-turn draw at 4 yields 5 and 山札 −1 for the active seat only', () => {
    let s = openToFirstTurnDraw();
    assert.equal(s.players[0].hand.length, 4, 'first own-turn after summon is 3+1');
    assert.equal(s.players[1].hand.length, 3, 'inactive seat does not draw');
    s = skipCombat(s);
    assert.equal(s.phase, 'turnDraw');
    assert.equal(s.active, 1);
    const p1Hand = s.players[1].hand.length;
    const p1Deck = s.players[1].deck.length;
    const p0Hand = s.players[0].hand.length;
    const p0Deck = s.players[0].deck.length;
    assert.equal(p1Hand, 4, 'seat 1 summoned then drew 1');
    assert.equal(p0Hand, 4);
    s = skipCombat(s);
    assert.equal(s.phase, 'turnDraw');
    assert.equal(s.active, 0);
    assert.equal(s.players[0].hand.length, 5, `hand ${s.players[0].hand.length} should be 5 not topped to 4`);
    assert.equal(s.players[0].deck.length, p0Deck - 1);
    assert.equal(s.players[1].hand.length, p1Hand, 'inactive seat must not draw');
    assert.equal(s.players[1].deck.length, p1Deck);
  });

  it('a seat that spent down to 2 draws 1 (hand 3), not enough to return to 4', () => {
    let s = openToFirstTurnDraw();
    s = keep(s, 0);
    assert.equal(s.phase, 'evo');
    const beasts = s.players[0].hand.filter((c) => getCard(c.cardId).kind === 'beast');
    assert.ok(beasts.length >= 2, beasts.map((c) => c.cardId).join(','));
    s = submit(s, 0, { type: 'charge', instanceId: beasts[0]!.instanceId });
    s = submit(s, 0, { type: 'charge', instanceId: beasts[1]!.instanceId });
    assert.equal(s.players[0].hand.length, 2);
    s = skipCombat(s);
    assert.equal(s.phase, 'turnDraw');
    assert.equal(s.active, 1);
    s = skipCombat(s);
    assert.equal(s.phase, 'turnDraw');
    assert.equal(s.active, 0);
    assert.equal(s.players[0].hand.length, 3, `spent to 2 then drew 1, got ${s.players[0].hand.length}`);
    assert.notEqual(s.players[0].hand.length, 4);
  });
});

describe('redraw is opening-only', () => {
  it('lets the opening seat redraw, then forbids redraw after the hand is kept', () => {
    let s = createMatch([iceDeck(), iceDeck()], ['A', 'B'], {}, 11, 0);
    assert.equal(s.phase, 'mulligan');
    const open = legalActions(s, 0);
    assert.ok(open.some((a) => a.type === 'mulligan' && a.redraw), 'opening must offer 引き直す');
    const before = s.players[0].hand.map((c) => c.cardId).join(',');
    s = submit(s, 0, { type: 'mulligan', redraw: true });
    assert.equal(s.phase, 'mulligan');
    assert.notEqual(s.players[0].hand.map((c) => c.cardId).join(','), before);

    s = keep(s, 0);
    s = keep(s, 1);
    s = summonFirst(s, 0);
    s = summonFirst(s, 1);
    assert.equal(s.phase, 'turnDraw');
    const acts = legalActions(s, s.active);
    assert.ok(acts.some((a) => a.type === 'mulligan' && a.redraw === false));
    assert.ok(!acts.some((a) => a.type === 'mulligan' && a.redraw), 'own-turn draw must not offer 引き直す');
    const ids = s.players[s.active].hand.map((c) => c.instanceId).join(',');
    const rejected = submit(s, s.active, { type: 'mulligan', redraw: true });
    assert.equal(rejected.phase, 'turnDraw');
    assert.equal(rejected.players[s.active].hand.map((c) => c.instanceId).join(','), ids);
    assert.equal(rejected.stats.redraws[s.active], s.stats.redraws[s.active]);
  });
});

describe('CPU evolves instead of charging the next-stage card', () => {
  function evoSnap(over: { pow: number; hand: { instanceId: string; cardId: string }[] }): MatchState {
    const s = createMatch([iceDeck(), iceDeck()], ['人', 'CPU'], {}, 4, 0);
    s.phase = 'evo';
    s.active = 1;
    s.waitingOn = [1];
    s.players[1].field = {
      instanceId: 'cpu-field',
      cardId: 'ennya',
      name: '火芽',
      specialty: 'flame',
      level: 'III',
      hp: 540,
      maxHp: 540,
      circle: { power: 360, effect: 'none' },
      triangle: { power: 250, effect: 'none' },
      cross: { power: 150, effect: 'none' },
      support: { kind: 'none' },
      abnormal: false,
      skillName: '火芽息',
    };
    s.players[0].field = {
      instanceId: 'p-field',
      cardId: 'fangpup',
      name: '牙仔',
      specialty: 'ice',
      level: 'III',
      hp: 820,
      maxHp: 820,
      circle: { power: 260, effect: 'none' },
      triangle: { power: 230, effect: 'none' },
      cross: { power: 180, effect: 'none' },
      support: { kind: 'none' },
      abnormal: false,
      skillName: '牙火',
    };
    s.players[1].pow = over.pow;
    s.players[1].hand = over.hand;
    return s;
  }

  it('pickAi takes evolve when the next-stage beast is legal', () => {
    const s = evoSnap({
      pow: 30,
      hand: [
        { instanceId: 'evo1', cardId: 'ashflare' },
        { instanceId: 'ch1', cardId: 'ennya' },
      ],
    });
    const legal = legalActions(s, 1);
    assert.ok(legal.some((a) => a.type === 'evolve' && a.instanceId === 'evo1'), JSON.stringify(legal));
    const act = pickAi(s, 1, 'normal') as Action;
    assert.equal(act.type, 'evolve');
    assert.equal(act.type === 'evolve' ? act.instanceId : '', 'evo1');
  });

  it('pickAi charges a non-evolve beast, never the next-stage card, never skipEvo when a charge remains', () => {
    const s = evoSnap({
      pow: 0,
      hand: [
        { instanceId: 'evo1', cardId: 'ashflare' },
        { instanceId: 'ch1', cardId: 'ennya' },
      ],
    });
    const act = pickAi(s, 1, 'boss') as Action;
    assert.equal(act.type, 'charge');
    assert.equal(act.type === 'charge' ? act.instanceId : '', 'ch1');
  });

  it('pickAi skips rather than charging the only legal-line next-stage card', () => {
    const s = evoSnap({
      pow: 0,
      hand: [{ instanceId: 'evo1', cardId: 'ashflare' }],
    });
    const act = pickAi(s, 1, 'rival') as Action;
    assert.equal(act.type, 'skipEvo');
  });
});

describe('story CPU decks carry next stages', () => {
  it('non-tutorial fights include the next form of each たね in the CPU deck', () => {
    const missing: string[] = [];
    for (const n of STORY) {
      if (n.id === 'tut-mochi') continue;
      const have = new Set(n.battle.deck);
      for (const id of have) {
        const c = CARD_BY_ID[id];
        if (!c || c.kind !== 'beast' || c.level !== 'III') continue;
        const next = nextFormId(id);
        if (next && CARD_BY_ID[next] && !have.has(next)) missing.push(`${n.id}:${id}→${next}`);
      }
    }
    assert.equal(missing.length, 0, missing.join('\n'));
  });
});

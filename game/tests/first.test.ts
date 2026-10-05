import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { starterDeck } from '../src/data/cards';
import { createMatch, firstStrikeFromField, hitOrder, legalActions, tossFirst, submit } from '../src/engine/battle';
import type { FieldBeast } from '../src/engine/types';
import { fieldFirstHud, fieldOrderHudHtml, fieldRole, fieldSeatBadge, roleBadgeHtml } from '../src/ui/battleHud';

function stubField(id: string, first = false): FieldBeast {
  return {
    instanceId: id,
    cardId: id,
    name: id,
    specialty: 'flame',
    level: 'III',
    hp: 500,
    maxHp: 500,
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

describe('match first player', () => {
  it('assigns 先攻 from createMatch first argument', () => {
    const a = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    assert.equal(a.firstPlayer, 0);
    assert.equal(a.active, 0);
    const b = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 1);
    assert.equal(b.firstPlayer, 1);
    assert.equal(b.active, 1);
  });

  it('tosses 先攻 from the seed the same way twice', () => {
    assert.equal(tossFirst(42), tossFirst(42));
    const lands = new Set<0 | 1>();
    for (let i = 1; i <= 40; i++) lands.add(tossFirst(i));
    assert.ok(lands.has(0) && lands.has(1));
  });
});

describe('hit order', () => {
  it('follows the turn first player when nobody has exclusive firstStrike', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.active = 1;
    assert.deepEqual(hitOrder(s, [false, false]), [1, 0]);
    s.active = 0;
    assert.deepEqual(hitOrder(s, [false, false]), [0, 1]);
  });

  it('starts with the exclusive firstStrike side', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.active = 0;
    assert.deepEqual(hitOrder(s, [false, true]), [1, 0]);
    assert.deepEqual(hitOrder(s, [true, false]), [0, 1]);
    assert.deepEqual(hitOrder(s, [true, true]), [0, 1]);
  });

  it('exclusive counter goes second', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.active = 0;
    assert.deepEqual(hitOrder(s, [false, false], [true, false]), [1, 0]);
    assert.deepEqual(hitOrder(s, [false, false], [false, true]), [0, 1]);
    assert.deepEqual(hitOrder(s, [true, false], [false, true]), [0, 1]);
    assert.deepEqual(hitOrder(s, [false, false], [true, true]), [0, 1]);
  });

  it('reads firstStrike from the locked attack slot', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[0].field = stubField('a', true);
    s.players[1].field = stubField('b', false);
    s.players[0].chosenAttack = 'cross';
    s.players[1].chosenAttack = 'triangle';
    assert.deepEqual(firstStrikeFromField(s), [true, false]);
    assert.deepEqual(hitOrder(s), [0, 1]);
  });
});

describe('field HUD roles', () => {
  it('shows 先攻 and 後攻 for the current turn attacker', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 1);
    assert.equal(fieldSeatBadge(s, 1), '先攻');
    assert.equal(fieldSeatBadge(s, 0), '後攻');
    const hud = fieldFirstHud(s);
    assert.ok(hud.includes('先攻'), hud);
    assert.ok(hud.includes('後攻'), hud);
    assert.ok(hud.includes('B'));
    assert.ok(hud.includes('A'));
    const order = fieldOrderHudHtml(s, 0);
    assert.ok(order.includes('攻撃順'), order);
    assert.ok(order.includes('自分') && order.includes('相手'), order);
    assert.ok(order.includes('先攻') && order.includes('後攻'), order);
    assert.match(roleBadgeHtml(s, 1), /role-badge first/);
    assert.match(roleBadgeHtml(s, 0), /role-badge second/);
  });

  it('adds 先制 when that side uniquely has firstStrike', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.players[1].field = stubField('b', true);
    s.players[0].field = stubField('a', false);
    s.players[1].chosenAttack = 'cross';
    s.players[0].chosenAttack = 'circle';
    assert.ok(fieldSeatBadge(s, 1).includes('先制'));
    assert.ok(fieldSeatBadge(s, 1).includes('後攻'));
    assert.equal(fieldSeatBadge(s, 0).includes('先制'), false);
    assert.match(roleBadgeHtml(s, 1), /先制/);
    s.phase = 'attack';
    const now = fieldOrderHudHtml(s, 0);
    assert.ok(now.includes('相手が先制'), now);
  });

  it('swaps 先攻 each time the turn player changes', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    assert.equal(fieldRole(s, 0), '先攻');
    assert.equal(fieldRole(s, 1), '後攻');
    s.active = 1;
    assert.equal(fieldRole(s, 1), '先攻');
    assert.equal(fieldRole(s, 0), '後攻');
    const order = fieldOrderHudHtml(s, 0);
    assert.ok(order.includes('相手・先攻'), order);
    assert.ok(order.includes('自分・後攻'), order);
  });

  it('passes 先攻 to the other seat after a resolved combat', () => {
    const d = starterDeck('moonember');
    let s = createMatch([d, starterDeck('windfeather')], ['A', 'B'], {}, 7, 0);
    s = submit(s, 0, { type: 'mulligan', redraw: false });
    s = submit(s, 1, { type: 'mulligan', redraw: false });
    const pick = (seat: 0 | 1) => legalActions(s, seat).find((a) => a.type === 'summon')!;
    s = submit(s, 0, pick(0));
    s = submit(s, 1, pick(1));
    if (s.phase === 'turnDraw') s = submit(s, 0, { type: 'mulligan', redraw: false });
    if (s.phase === 'evo') s = submit(s, 0, { type: 'skipEvo' });
    assert.equal(s.active, 0);
    assert.equal(fieldRole(s, 0), '先攻');
    if (s.phase === 'attack') {
      s = submit(s, 0, { type: 'chooseAttack', slot: 'circle' });
      if (s.waitingOn.includes(1)) s = submit(s, 1, { type: 'chooseAttack', slot: 'circle' });
    }
    if (s.phase === 'support') {
      s = submit(s, 0, { type: 'playSupport', target: 'none' });
      if (s.waitingOn.includes(1)) s = submit(s, 1, { type: 'playSupport', target: 'none' });
    }
    if (s.phase === 'resolve') {
      s = submit(s, 0, { type: 'ackResolve' });
      s = submit(s, 1, { type: 'ackResolve' });
    }
    if (s.phase === 'postKo') {
      for (const seat of s.waitingOn.slice()) {
        const a = legalActions(s, seat).find((x) => x.type === 'summon');
        if (a) s = submit(s, seat, a);
      }
    }
    assert.ok(s.turn >= 2 || s.phase === 'gameOver', `phase ${s.phase} turn ${s.turn}`);
    if (s.phase !== 'gameOver') {
      assert.equal(s.active, 1);
      assert.equal(fieldRole(s, 1), '先攻');
      assert.equal(fieldRole(s, 0), '後攻');
    }
  });
});

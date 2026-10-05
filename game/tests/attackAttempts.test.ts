import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { beasts, starterDeck } from '../src/data/cards';
import { createMatch, resolveLockedCombat, submit } from '../src/engine/battle';
import { EFFECT_JA, type FieldBeast, type MatchState } from '../src/engine/types';

function field(cardId: string): FieldBeast {
  return {
    instanceId: `field-${cardId}`, cardId, name: cardId, specialty: 'flame', level: 'III',
    hp: 800, maxHp: 800,
    circle: { power: 100, effect: 'none' },
    triangle: { power: 80, effect: 'none' },
    cross: { power: 50, effect: 'none' },
    support: { kind: 'none' }, isPartner: false, garbed: false, abnormal: false,
    skillName: `${cardId} の必殺技`,
  };
}

function combat(): MatchState {
  const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
  s.players[0].field = field('moonember');
  s.players[1].field = field('windfeather');
  s.players[0].chosenAttack = 'circle';
  s.players[1].chosenAttack = 'triangle';
  s.players[0].chosenSupport = 'none';
  s.players[1].chosenSupport = 'none';
  s.events = [];
  return s;
}

function attackBeats(s: MatchState) {
  return s.lastCombat!.beats.filter(b => b.kind === 'hit' || b.kind === 'attack');
}

function attackEvents(s: MatchState) {
  return s.events.filter(e => e.type === 'attack');
}

describe('every locked command has a frozen attack result', () => {
  for (const actor of [0, 1] as const) {
    for (const slot of ['circle', 'triangle', 'cross'] as const) {
      it(`records seat ${actor} ${slot} independently of damage events`, () => {
        const s = combat();
        s.players[actor].chosenAttack = slot;
        resolveLockedCombat(s);
        const beats = attackBeats(s);
        const events = attackEvents(s);
        assert.equal(beats.length, 2);
        assert.equal(events.length, 2);
        assert.deepEqual(events.map(e => e.actor), beats.map(b => b.actor));
        const beat = beats.find(b => b.actor === actor)!;
        const event = events.find(e => e.actor === actor)!;
        const source = s.players[actor].field!;
        assert.equal(beat.kind, 'hit', 'positive damage retains the existing hit beat');
        assert.equal(beat.outcome, 'hit');
        assert.equal(beat.cardId, source.cardId);
        assert.equal(beat.specialty, source.specialty);
        assert.equal(beat.slot, slot);
        assert.equal(beat.skill, slot === 'circle' ? source.skillName : slot === 'triangle' ? '通常' : '特殊');
        assert.equal(beat.amount, s.lastCombat!.damages[actor]);
        for (const key of ['cardId', 'specialty', 'slot', 'skill', 'outcome', 'amount'] as const) {
          assert.equal(event[key], beat[key], key);
        }
        assert.equal(event.attacker, actor);
        const damage = s.events.find(e => e.type === 'damage' && e.attacker === actor)!;
        assert.equal(damage.actor, actor === 0 ? 1 : 0, 'damage actor remains the target');
        assert.equal(damage.amount, beat.amount);
        assert.ok(s.events.indexOf(event) < s.events.indexOf(damage));
      });
    }
  }

  for (const slot of ['circle', 'triangle', 'cross'] as const) {
    it(`retains a printed zero ${slot} with its attacker and skill`, () => {
      const s = combat();
      s.players[0].chosenAttack = slot;
      s.players[0].field![slot].power = 0;
      resolveLockedCombat(s);
      const beat = attackBeats(s).find(b => b.actor === 0)!;
      const event = attackEvents(s).find(e => e.actor === 0)!;
      const miss = s.events.find(e => e.type === 'miss')!;
      assert.equal(beat.kind, 'attack');
      assert.equal(beat.outcome, 'zero');
      assert.equal(beat.amount, 0);
      assert.equal(event.outcome, 'zero');
      assert.equal(event.slot, slot);
      assert.equal(miss.actor, 1);
      assert.equal(miss.attacker, 0);
      assert.equal(miss.cardId, 'moonember');
      assert.equal(miss.specialty, 'flame');
      assert.equal(miss.slot, slot);
      assert.equal(miss.skill, beat.skill);
      assert.equal(miss.outcome, 'zero');
      assert.equal(s.players[1].field!.hp, 800);
      assert.ok(!s.events.some(e => e.type === 'damage' && e.attacker === 0));
    });
  }

  it('keeps both zero-damage commands when neither side deals damage', () => {
    const s = combat();
    s.players[0].field!.circle.power = 0;
    s.players[1].field!.triangle.power = 0;
    resolveLockedCombat(s);
    assert.deepEqual(attackBeats(s).map(b => b.outcome), ['zero', 'zero']);
    assert.deepEqual(attackEvents(s).map(e => e.outcome), ['zero', 'zero']);
    assert.deepEqual(s.lastCombat!.hpAfter, [800, 800]);
    assert.equal(s.events.filter(e => e.type === 'damage').length, 0);
  });

  it('keeps the weakness cue on the independent attack event', () => {
    const s = combat();
    s.players[1].field!.specialty = 'nature';
    resolveLockedCombat(s);
    const event = attackEvents(s).find(e => e.actor === 0)!;
    assert.equal(event.amount, 150);
    assert.match(event.text, /弱点/);
    assert.equal(s.lastCombat!.weakHits[0], true);
    assert.equal(s.players[1].field!.hp, 650);
  });

  it('keeps a zeroed command after support and the special that zeroed it', () => {
    const s = combat();
    s.players[0].field!.circle.power = 300;
    s.players[1].field!.cross = { power: 100, effect: 'zeroCircle' };
    s.players[1].chosenAttack = 'cross';
    s.players[0].deck.unshift({ instanceId: 'buff', cardId: 'atkchip' });
    s.players[0].chosenSupport = 'deck';
    resolveLockedCombat(s);
    assert.equal(s.lastCombat!.basePowers[0], 300);
    assert.equal(s.lastCombat!.bonuses[0], 150);
    assert.equal(s.lastCombat!.powers[0], 0);
    assert.equal(attackBeats(s).find(b => b.actor === 0)!.outcome, 'zero');
    const zeroing = attackBeats(s).find(b => b.actor === 1)!;
    assert.equal(zeroing.skill, EFFECT_JA.zeroCircle);
    assert.equal(zeroing.cardId, 'windfeather');
    assert.equal(zeroing.outcome, 'hit');
    assert.deepEqual(s.lastCombat!.hpAfter, [700, 800]);
  });

  it('records a shielded command even though it cannot hit', () => {
    const s = combat();
    const shield = beasts().find(b => b.support.kind === 'shield' && b.support.slot === 'circle')!;
    assert.ok(shield);
    s.players[1].hand.push({ instanceId: 'shield', cardId: shield.id });
    s.players[1].chosenSupport = { instanceId: 'shield', cardId: shield.id };
    resolveLockedCombat(s);
    assert.equal(attackBeats(s).find(b => b.actor === 0)!.outcome, 'zero');
    assert.equal(s.players[1].field!.hp, 800);
    assert.ok(s.events.some(e => e.type === 'shield'));
  });

  for (const slot of ['circle', 'triangle', 'cross'] as const) {
    it(`records ${slot} when a support option zeroes all three slots`, () => {
      const s = combat();
      s.players[0].chosenAttack = slot;
      s.players[1].deck.unshift({ instanceId: 'zero-all', cardId: 'reverse7' });
      s.players[1].chosenSupport = 'deck';
      resolveLockedCombat(s);
      assert.equal(attackBeats(s).find(b => b.actor === 0)!.outcome, 'zero');
      assert.equal(attackEvents(s).find(e => e.actor === 0)!.slot, slot);
      assert.equal(s.lastCombat!.damages[0], 0);
    });
  }

  it('records draining attacks without changing their damage or healing', () => {
    const s = combat();
    s.players[0].chosenAttack = 'cross';
    s.players[0].field!.cross = { power: 100, effect: 'drain' };
    s.players[0].field!.hp = 300;
    s.players[1].field!.triangle.power = 50;
    resolveLockedCombat(s);
    const beat = attackBeats(s).find(b => b.actor === 0)!;
    assert.equal(beat.skill, EFFECT_JA.drain);
    assert.equal(beat.outcome, 'hit');
    assert.equal(beat.amount, 100);
    assert.deepEqual(s.lastCombat!.hpAfter, [350, 700]);
    assert.equal(s.events.filter(e => e.type === 'drain').length, 1);
    assert.equal(attackEvents(s).filter(e => e.actor === 0).length, 1);
  });

  it('records counter in the original second-attack order', () => {
    const s = combat();
    s.players[0].chosenAttack = 'cross';
    s.players[0].field!.cross = { power: 150, effect: 'counter' };
    s.players[1].field!.triangle.power = 300;
    resolveLockedCombat(s);
    assert.equal(s.lastCombat!.hitFirst, 1);
    assert.deepEqual(attackBeats(s).map(b => b.actor), [1, 0]);
    assert.deepEqual(attackEvents(s).map(e => e.actor), [1, 0]);
    assert.equal(attackBeats(s)[1]!.skill, EFFECT_JA.counter);
    assert.deepEqual(s.lastCombat!.hpAfter, [500, 650]);
  });

  it('records suicide and the defeated opponent without inventing a return hit', () => {
    const s = combat();
    s.players[0].chosenAttack = 'cross';
    s.players[0].field!.cross = { power: 50, effect: 'suicide' };
    s.players[0].field!.hp = 410;
    s.players[1].field!.hp = 350;
    resolveLockedCombat(s);
    const beats = attackBeats(s);
    assert.equal(beats[0]!.skill, EFFECT_JA.suicide);
    assert.equal(beats[0]!.amount, 400);
    assert.equal(beats[1]!.outcome, 'interrupted');
    assert.deepEqual(s.lastCombat!.hpAfter, [10, 0]);
    assert.deepEqual(s.lastCombat!.damages, [400, 0]);
    assert.equal(s.events.filter(e => e.type === 'damage').length, 1);
  });

  it('retains a zero-power suicide attempt at 10 HP', () => {
    const s = combat();
    s.players[0].chosenAttack = 'cross';
    s.players[0].field!.cross.effect = 'suicide';
    s.players[0].field!.hp = 10;
    s.players[1].field!.triangle.power = 0;
    resolveLockedCombat(s);
    assert.equal(attackBeats(s)[0]!.outcome, 'zero');
    assert.equal(attackBeats(s)[0]!.skill, EFFECT_JA.suicide);
    assert.deepEqual(s.lastCombat!.hpAfter, [10, 800]);
  });

  it('distinguishes first-strike interruption and preserves identity after KO removal', () => {
    const s = combat();
    s.players[0].field!.hp = 80;
    s.players[1].chosenAttack = 'cross';
    s.players[1].field!.cross = { power: 100, effect: 'firstStrike' };
    resolveLockedCombat(s);
    assert.equal(s.lastCombat!.hitFirst, 1);
    const beats = attackBeats(s);
    assert.deepEqual(beats.map(b => b.outcome), ['hit', 'interrupted']);
    assert.deepEqual(beats.map(b => b.actor), [1, 0]);
    assert.equal(beats[1]!.kind, 'attack');
    assert.equal(beats[1]!.cardId, 'moonember');
    assert.equal(beats[1]!.slot, 'circle');
    assert.equal(beats[1]!.skill, 'moonember の必殺技');
    assert.equal(beats[1]!.amount, 0);
    assert.deepEqual(s.lastCombat!.hpAfter, [0, 800]);
    assert.equal(s.events.filter(e => e.type === 'damage').length, 1);
    assert.equal(s.events.filter(e => e.type === 'miss').length, 0);
    const after = submit(submit(s, 0, { type: 'ackResolve' }), 1, { type: 'ackResolve' });
    assert.equal(after.players[0].field, null);
    const frozen = attackBeats(after).find(b => b.actor === 0)!;
    assert.equal(frozen.cardId, 'moonember');
    assert.equal(frozen.specialty, 'flame');
    assert.equal(frozen.skill, 'moonember の必殺技');
  });

  it('keeps a prepared suicide interrupted by an enemy first strike', () => {
    const s = combat();
    s.players[0].chosenAttack = 'cross';
    s.players[0].field!.cross.effect = 'suicide';
    s.players[0].field!.hp = 410;
    s.players[1].chosenAttack = 'cross';
    s.players[1].field!.cross = { power: 100, effect: 'firstStrike' };
    resolveLockedCombat(s);
    assert.equal(s.lastCombat!.powers[0], 400);
    const cancelled = attackBeats(s).find(b => b.actor === 0)!;
    assert.equal(cancelled.outcome, 'interrupted');
    assert.equal(cancelled.skill, EFFECT_JA.suicide);
    assert.equal(cancelled.amount, 0);
    assert.deepEqual(s.lastCombat!.hpAfter, [0, 800]);
  });

  it('emits attack attempts through the ordinary attack/support submit flow', () => {
    let s = combat();
    s.phase = 'attack';
    s.waitingOn = [0, 1];
    s.players[0].chosenAttack = null;
    s.players[1].chosenAttack = null;
    s.players[0].field!.triangle.power = 0;
    s = submit(s, 0, { type: 'chooseAttack', slot: 'triangle' });
    s = submit(s, 1, { type: 'chooseAttack', slot: 'cross' });
    s = submit(s, 0, { type: 'playSupport', target: 'none' });
    s = submit(s, 1, { type: 'playSupport', target: 'none' });
    assert.equal(s.phase, 'resolve');
    assert.deepEqual(attackBeats(s).map(b => b.outcome), ['zero', 'hit']);
    assert.deepEqual(attackEvents(s).map(e => e.slot), ['triangle', 'cross']);
    assert.equal(attackEvents(s).length, 2);
  });
});

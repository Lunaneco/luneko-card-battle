import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARDS, CARD_BY_ID, beasts, getCard, starterDeck } from '../src/data/cards';
import { cardArt } from '../src/ui/card';
import { EVOLVE_LINES, WEAKNESS_MULT, nextFormId } from '../src/data/lines';
import { SET2_BEASTS, SET2_GRANT, SET2_LINES, SET2_OPTIONS } from '../src/data/set2';
import { emptySave } from '../src/state/save';
import { canMoonGarb, createMatch, hitDamage, isLegalLineEvolve, legalActions, submit, validateDeck } from '../src/engine/battle';
import type { Action, FieldBeast } from '../src/engine/types';

function stubField(over: Partial<FieldBeast>): FieldBeast {
  return {
    instanceId: 'f',
    cardId: 'moonember',
    name: 'x',
    specialty: 'flame',
    level: 'III',
    hp: 1,
    maxHp: 1,
    circle: { power: 1, effect: 'none' },
    triangle: { power: 1, effect: 'none' },
    cross: { power: 1, effect: 'none' },
    support: { kind: 'none' },
    isPartner: true,
    partnerLine: 'moonember',
    garbed: false,
    abnormal: false,
    skillName: 'x',
    ...over,
  };
}

describe('same-specialty evolve', () => {
  it('same color one stage up is legal, even another character', () => {
    assert.equal(nextFormId('ennya'), 'ashflare');
    assert.equal(isLegalLineEvolve('ennya', 'ashflare', 30, false), true);
    assert.equal(isLegalLineEvolve('ennya', 'ashfist', 80, false), true);
    assert.equal(isLegalLineEvolve('ennya', 'moonflareking', 80, false), false);
  });

  it('rejects a different color', () => {
    assert.equal(isLegalLineEvolve('moonember', 'ashflare', 99, false), true);
    assert.equal(isLegalLineEvolve('moonember', 'shellbolt', 99, false), false);
    assert.equal(isLegalLineEvolve('moonember', 'moondrake', 30, false), true);
  });

  it('moon garb is only legal on the partner seed', () => {
    assert.equal(canMoonGarb(stubField({ isPartner: true, level: 'III', partnerLine: 'moonember' })), true);
    assert.equal(canMoonGarb(stubField({ isPartner: true, level: 'IV', partnerLine: 'moonember' })), false);
    assert.equal(canMoonGarb(stubField({ isPartner: false, partnerLine: undefined })), false);
    assert.equal(isLegalLineEvolve('ennya', 'moonsaddle', 99, false), false);
  });

  it('moon garb still legal on partner body', () => {
    let found = false;
    for (let seed = 1; seed < 80 && !found; seed++) {
      let s = createMatch(
        [starterDeck('moonember'), starterDeck('windfeather')],
        ['A', 'B'],
        { ownedShells: ['embershell'] },
        seed,
      );
      s = submit(s, 0, { type: 'mulligan', redraw: false });
      s = submit(s, 1, { type: 'mulligan', redraw: false });
      const luna = s.players[0].hand.find((c) => c.cardId === 'moonember');
      if (!luna || s.phase !== 'summon') continue;
      s = submit(s, 0, { type: 'summon', instanceId: luna.instanceId });
      const other = s.players[1].hand.find((c) => getCard(c.cardId).kind === 'beast');
      if (!other) continue;
      s = submit(s, 1, { type: 'summon', instanceId: other.instanceId });
      if (s.phase === 'turnDraw') s = submit(s, s.active, { type: 'mulligan', redraw: false });
      if (s.phase !== 'evo' || s.active !== 0) continue;
      const armor = legalActions(s, 0).find((a): a is Extract<Action, { type: 'moonGarb' }> => a.type === 'moonGarb');
      if (!armor) continue;
      s = submit(s, 0, armor);
      assert.equal(s.players[0].field?.garbed, true);
      assert.equal(s.players[0].field?.cardId, 'moonsaddle');
      found = true;
    }
    assert.equal(found, true);
  });

  it('rejects moon garb from a wild or evolved body', () => {
    let s = createMatch(
      [starterDeck('moonember'), starterDeck('windfeather')],
      ['A', 'B'],
      { ownedShells: ['embershell'] },
      1,
    );
    s.phase = 'evo';
    s.active = 0;
    s.waitingOn = [0];
    s.players[0].field = {
      instanceId: 'f',
      cardId: 'ennya',
      name: '火芽',
      specialty: 'flame',
      level: 'III',
      hp: 500,
      maxHp: 500,
      circle: { power: 200, effect: 'none' },
      triangle: { power: 180, effect: 'none' },
      cross: { power: 160, effect: 'none' },
      support: { kind: 'none' },
      isPartner: false,
      garbed: false,
      abnormal: false,
      skillName: 'x',
    };
    assert.equal(
      legalActions(s, 0).some((a) => a.type === 'moonGarb'),
      false,
    );
    const before = s.players[0].field.cardId;
    s = submit(s, 0, { type: 'moonGarb', cardId: 'moonsaddle' });
    assert.equal(s.players[0].field?.cardId, before);
    s.players[0].field = {
      ...s.players[0].field!,
      cardId: 'moondrake',
      isPartner: true,
      partnerLine: 'moonember',
      level: 'IV',
    };
    assert.equal(
      legalActions(s, 0).some((a) => a.type === 'moonGarb'),
      false,
    );
  });

  it('keeps moon-garb cards out of the deck and off the summon line', () => {
    const deck = [...starterDeck('moonember')];
    deck[0] = 'moonsaddle';
    assert.match(validateDeck(deck) ?? '', /月装/);
    let s = createMatch(
      [starterDeck('moonember'), starterDeck('windfeather')],
      ['A', 'B'],
      { ownedShells: ['embershell'] },
      1,
    );
    s.phase = 'summon';
    s.waitingOn = [0];
    s.players[0].hand = [{ instanceId: 'arm', cardId: 'moonsaddle' }];
    assert.equal(
      legalActions(s, 0).some((a) => a.type === 'summon'),
      false,
    );
    s = submit(s, 0, { type: 'summon', instanceId: 'arm' });
    assert.equal(s.players[0].field, null);
    assert.equal(s.players[0].hand[0]?.cardId, 'moonsaddle');
  });
});

describe('weakness', () => {
  it('multiplies 1.5 when the defender is weak to the attacker', () => {
    assert.equal(hitDamage(200, 'ice', 'flame'), 300);
    assert.equal(hitDamage(200, 'flame', 'flame'), 200);
    assert.equal(hitDamage(530, 'flame', 'nature'), 795);
    assert.equal(hitDamage(200, 'nature', 'ice'), 300);
    assert.equal(hitDamage(200, 'nature', 'dark'), 200);
    assert.equal(hitDamage(200, 'dark', 'rare'), 300);
    assert.equal(hitDamage(200, 'rare', 'dark'), 300);
    assert.equal(hitDamage(200, 'rare', 'nature'), 200);
    assert.equal(hitDamage(200, 'nature', 'rare'), 200);
    assert.equal(hitDamage(200, 'flame', 'ice'), 200);
    assert.equal(WEAKNESS_MULT, 1.5);
  });
});

describe('natural items', () => {
  it('heal/buff options have natural names and heal through resolver', () => {
    const potion = getCard('floppy');
    assert.equal(potion.kind, 'option');
    if (potion.kind !== 'option') return;
    assert.equal(potion.name, 'きずぐすり');
    assert.ok(!potion.name.includes('フロッピー'));
    assert.equal(potion.effect.kind, 'heal');

    const plus = getCard('atkchip');
    assert.equal(plus.kind, 'option');
    if (plus.kind === 'option') assert.equal(plus.name, '力の月粉');

    let healed = false;
    for (let seed = 1; seed < 60 && !healed; seed++) {
      let s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, seed);
      s = submit(s, 0, { type: 'mulligan', redraw: false });
      s = submit(s, 1, { type: 'mulligan', redraw: false });
      const b0 = s.players[0].hand.find((c) => getCard(c.cardId).kind === 'beast');
      const b1 = s.players[1].hand.find((c) => getCard(c.cardId).kind === 'beast');
      const heal = s.players[0].hand.find((c) => c.cardId === 'floppy');
      if (!b0 || !b1 || !heal) continue;
      s = submit(s, 0, { type: 'summon', instanceId: b0.instanceId });
      s = submit(s, 1, { type: 'summon', instanceId: b1.instanceId });
      if (s.phase === 'turnDraw') s = submit(s, s.active, { type: 'mulligan', redraw: false });
      if (s.phase === 'evo' && s.active === 0) s = submit(s, 0, { type: 'skipEvo' });
      if (s.phase === 'evo') s = submit(s, s.active, { type: 'skipEvo' });
      if (s.phase !== 'attack' || !s.waitingOn.includes(0)) continue;
      s = submit(s, 0, { type: 'chooseAttack', slot: 'triangle' });
      if (s.phase === 'attack') s = submit(s, 1, { type: 'chooseAttack', slot: 'triangle' });
      if (s.phase !== 'support' || !s.players[0].field) continue;
      s.players[0].field.hp = 80;
      const still = s.players[0].hand.find((c) => c.cardId === 'floppy');
      if (!still) continue;
      s = submit(s, 0, { type: 'playSupport', target: still.instanceId });
      if (s.phase === 'support') s = submit(s, 1, { type: 'playSupport', target: 'none' });
      if ((s.players[0].field?.hp ?? 0) > 80) healed = true;
    }
    assert.equal(healed, true);
  });

  it('no player-facing フロッピー in card names or texts', () => {
    for (const c of CARDS) {
      const blob = c.kind === 'option' ? `${c.name}${c.text}` : c.name;
      assert.ok(!blob.includes('フロッピー'), c.id);
    }
  });
});

describe('set2 expansion', () => {
  it('registers unique new cards in the main pool', () => {
    const ids = CARDS.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const c of [...SET2_BEASTS, ...SET2_OPTIONS]) {
      assert.ok(CARD_BY_ID[c.id], `missing ${c.id}`);
    }
    assert.ok(CARDS.length >= 190, `pool too small: ${CARDS.length}`);
  });

  it('foxfire evolves only along its own line', () => {
    assert.equal(nextFormId('foxfire'), 'foxblaze');
    assert.equal(nextFormId('foxblaze'), 'foxnova');
    assert.equal(isLegalLineEvolve('foxfire', 'foxblaze', 30, false), true);
    assert.equal(isLegalLineEvolve('foxfire', 'ennya', 80, false), false);
    assert.equal(isLegalLineEvolve('foxfire', 'ashflare', 80, false), true);
  });

  it('completes leftover two-stage lines', () => {
    assert.equal(nextFormId('waxcat'), 'tyrantail');
    assert.equal(nextFormId('tyrantail'), 'tyrantking');
    assert.equal(nextFormId('tadpole'), 'snowlump');
    assert.equal(nextFormId('snowlump'), 'blizzardon');
    assert.equal(nextFormId('margin'), 'beastking');
    assert.equal(nextFormId('beastking'), 'lionheart');
    assert.equal(nextFormId('gobflame'), 'gobblaze');
    assert.equal(nextFormId('jellpup'), 'betajelly');
  });

  it('every expansion line stage exists and is unique', () => {
    const seen = new Set<string>();
    for (const stages of SET2_LINES) {
      assert.ok(stages.length >= 2, stages.join('>'));
      for (const id of stages) {
        assert.ok(CARD_BY_ID[id], `line missing card ${id}`);
        assert.equal(seen.has(id), false, `duplicate line member ${id}`);
        seen.add(id);
      }
    }
    assert.ok(EVOLVE_LINES.length >= 40, `too few lines: ${EVOLVE_LINES.length}`);
  });

  it('no two beasts share a portrait file', () => {
    const seen = new Map<string, string>();
    for (const c of beasts()) {
      const art = cardArt(c);
      const owner = seen.get(art);
      assert.equal(owner, undefined, `${c.id} shares ${art} with ${owner}`);
      seen.set(art, c.id);
    }
  });

  it('new games do not dump the extra-line grant', () => {
    const save = emptySave('QA', 'moonember');
    const starter = new Set(starterDeck('moonember'));
    for (const id of SET2_GRANT) {
      if (starter.has(id)) continue;
      assert.equal(save.cards[id] ?? 0, 0, `new save was pre-granted ${id}`);
    }
    assert.ok(save.decks[0]!.includes('foxfire'));
    assert.equal(save.decks[0]!.length, 30);
    assert.equal(save.decks[1]!.length, 0);
    assert.equal(save.decks[2]!.length, 0);
  });
});

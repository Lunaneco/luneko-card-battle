import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exclusiveIdsOnFight } from '../src/data/rarity';
import { CITY_ACT, STORY } from '../src/data/story';
import { deckMix, mixPower, storyPressure } from '../src/data/storyPressure';
import { createMatch } from '../src/engine/battle';
import { pickAi } from '../src/engine/ai';
import { starterDeck } from '../src/data/cards';

describe('story fight pressure', () => {
  it('keeps tutorial only on the opening node and scripted on the tower climax', () => {
    assert.equal(STORY[0]?.id, 'tut-mochi');
    assert.equal(STORY[0]?.battle.ai, 'tutorial');
    for (const n of STORY.slice(1)) {
      assert.notEqual(n.battle.ai, 'tutorial', `${n.id} still tutorial`);
    }
    const zero = STORY.find((n) => n.id === 'tower-zero');
    assert.ok(zero);
    assert.equal(zero!.battle.ai, 'scripted');
    assert.ok(zero!.battle.cheat);
    assert.ok(exclusiveIdsOnFight('tower-zero').includes('errorfang'));
    assert.ok(exclusiveIdsOnFight('tower-zero').includes('samehand'));
  });

  it('scores tut-mochi below late-act and tower fights on the shipped STORY list', () => {
    const tut = STORY.find((n) => n.id === 'tut-mochi')!;
    const venom = STORY.find((n) => n.id === 'tower-venom')!;
    const zero = STORY.find((n) => n.id === 'tower-zero')!;
    const tutP = storyPressure(tut);
    const late = STORY.filter((n) => CITY_ACT[n.city]?.act === 5);
    assert.ok(late.length >= 2);
    for (const n of late) {
      assert.ok(storyPressure(n) > tutP, `${n.id} ${storyPressure(n)} !> tut ${tutP}`);
    }
    assert.ok(storyPressure(venom) > tutP);
    assert.ok(storyPressure(zero) > storyPressure(venom));
    const act1 = STORY.filter((n) => CITY_ACT[n.city]?.act === 1);
    const act3 = STORY.filter((n) => CITY_ACT[n.city]?.act === 3);
    const mean = (nodes: typeof STORY) => nodes.reduce((s, n) => s + storyPressure(n), 0) / nodes.length;
    assert.ok(mean(act1) < mean(act3), `act1 ${mean(act1)} !< act3 ${mean(act3)}`);
    assert.ok(mean(act3) < mean(late), `act3 ${mean(act3)} !< late ${mean(late)}`);
  });

  it('gives late boss decks a stronger beast mix than the tutorial pad-deck', () => {
    const tut = deckMix(STORY.find((n) => n.id === 'tut-mochi')!.battle.deck);
    const zero = deckMix(STORY.find((n) => n.id === 'tower-zero')!.battle.deck);
    const venom = deckMix(STORY.find((n) => n.id === 'tower-venom')!.battle.deck);
    assert.ok(zero.perfect > tut.perfect, `zero perfect ${zero.perfect} !> tut ${tut.perfect}`);
    assert.ok(venom.perfect > tut.perfect);
    assert.ok(zero.avgCircle > tut.avgCircle);
    assert.ok(tut.iii > zero.iii);
  });

  it('lets pickAi use the climax script on a real match', () => {
    const node = STORY.find((n) => n.id === 'tower-zero')!;
    const s = createMatch([starterDeck('moonember'), node.battle.deck], ['A', 'B'], {}, 3, 0);
    s.phase = 'attack';
    s.waitingOn = [1];
    s.turn = 1;
    s.players[0].field = {
      instanceId: 'a',
      cardId: 'moonember',
      name: 'x',
      specialty: 'flame',
      level: 'III',
      hp: 400,
      maxHp: 400,
      circle: { power: 200, effect: 'none' },
      triangle: { power: 180, effect: 'none' },
      cross: { power: 160, effect: 'none' },
      support: { kind: 'none' },
      isPartner: true,
      garbed: false,
      abnormal: false,
      skillName: 'x',
    };
    s.players[1].field = { ...s.players[0].field!, instanceId: 'b', cardId: 'twinpole' };
    const act = pickAi(s, 1, node.battle.ai, node.battle.script);
    assert.equal(act?.type, 'chooseAttack');
    if (act?.type === 'chooseAttack') assert.equal(act.slot, node.battle.script![0]);
  });

  it('puts rival / boss / scripted mix above the real starter deck', () => {
    const starter = mixPower(starterDeck('moonember'));
    const tut = mixPower(STORY[0]!.battle.deck);
    assert.ok(tut < starter, `tut ${tut} !< starter ${starter}`);
    for (const n of STORY.slice(1)) {
      if (n.battle.ai === 'normal') continue;
      const p = mixPower(n.battle.deck);
      assert.ok(p > starter, `${n.id} ${p} !> starter ${starter}`);
    }
  });

  it('keeps normal fights below the weakest rival mix', () => {
    const rivalMix = STORY.filter((n) => n.battle.ai === 'rival').map((n) => mixPower(n.battle.deck));
    const floor = Math.min(...rivalMix);
    assert.ok(rivalMix.length >= 3);
    const ice = STORY.find((n) => n.id === 'ice-1')!;
    assert.equal(ice.battle.ai, 'rival');
    for (const n of STORY) {
      if (n.battle.ai !== 'normal') continue;
      const p = mixPower(n.battle.deck);
      assert.ok(p < floor, `${n.id} mix ${p} !< weakest rival ${floor}`);
    }
    const bloom1 = mixPower(STORY.find((n) => n.id === 'bloom-1')!.battle.deck);
    const flame2 = mixPower(STORY.find((n) => n.id === 'flame-2')!.battle.deck);
    assert.ok(bloom1 * 2 >= flame2, `bloom-1 ${bloom1} is a valley after flame-2 ${flame2}`);
  });
});

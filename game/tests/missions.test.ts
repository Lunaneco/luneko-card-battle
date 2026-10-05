import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID } from '../src/data/cards';
import { exclusiveIds, isExclusive } from '../src/data/rarity';
import {
  evaluateMission,
  lastMissionRewards,
  missionKey,
  settleStoryLoot,
  storyLoot,
} from '../src/data/missions';
import { STORY } from '../src/data/story';
import { createMatch } from '../src/engine/battle';
import { starterDeck } from '../src/data/cards';

describe('story missions', () => {
  it('gives every story fight 3 missions and a unique last reward', () => {
    for (const n of STORY) {
      const loot = storyLoot(n.id);
      assert.equal(loot.missions.length, 3, n.id);
      assert.ok(loot.missions[0]!.kind === 'win', `${n.id} first mission is not win`);
      assert.notEqual(loot.missions[2]!.kind, 'win', `${n.id} last mission is too easy`);
      assert.ok(loot.missions[2]!.reward.length >= 1, `${n.id} last has no reward`);
      for (const id of loot.missions[2]!.reward) {
        assert.ok(CARD_BY_ID[id], `${n.id} missing ${id}`);
        assert.equal(isExclusive(id), true, `${n.id} last reward ${id} is not unique`);
      }
      assert.ok(loot.drop.length >= 1, `${n.id} has no drop pool`);
    }
  });

  it('puts every exclusive on some last mission', () => {
    const last = new Set(STORY.flatMap((n) => lastMissionRewards(n.id)));
    for (const id of exclusiveIds()) {
      assert.ok(last.has(id), `${id} is not a last-mission reward`);
    }
  });

  it('claims a win mission only once', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.winner = 0;
    s.players[1].kos = 0;
    s.stats.redraws = [0, 0];
    const first = settleStoryLoot('tut-mochi', s, 0, [], [], () => 0);
    assert.equal(first.missions[0]!.newly, true);
    assert.ok(first.first.length > 0);
    const claimed = [missionKey('tut-mochi', 0)];
    const again = settleStoryLoot('tut-mochi', s, 0, ['tut-mochi'], claimed, () => 0);
    assert.equal(again.missions[0]!.newly, false);
    assert.equal(again.missions[0]!.already, true);
    assert.equal(again.first.length, 0);
    assert.ok(again.drop.length === 1);
  });

  it('rejects shutout when the player lost a body', () => {
    const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
    s.winner = 0;
    s.players[1].kos = 1;
    assert.equal(evaluateMission('win', s, 0), true);
    assert.equal(evaluateMission('shutout', s, 0), false);
    assert.equal(evaluateMission('perfect', s, 0), false);
  });
});

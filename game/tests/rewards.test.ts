import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BADGES, badgeForFight, claimLogin, ownedBadges, recordResult, streakBonus } from '../src/data/rewards';
import { STORY } from '../src/data/story';
import { emptySave } from '../src/state/save';

describe('court badges', () => {
  it('awards eight badges on real main-story fights before the tower', () => {
    assert.equal(BADGES.length, 8);
    const ids = STORY.map((n) => n.id);
    const towerAt = ids.indexOf('tower-venom');
    for (const b of BADGES) {
      const at = ids.indexOf(b.fightId);
      assert.ok(at >= 0 && at < towerAt, `${b.id} on ${b.fightId}`);
    }
    assert.equal(badgeForFight('flame-1')?.id, 'ash');
    assert.equal(ownedBadges(['beg-luna', 'flame-2']).length, 1);
  });

  it('names each badge in that fight’s after-talk', () => {
    for (const b of BADGES) {
      const n = STORY.find((x) => x.id === b.fightId)!;
      const blob = n.after.map((l) => l.text).join('');
      assert.ok(blob.includes(b.name), `${b.fightId} never hands over ${b.name}`);
    }
  });
});

describe('win streak', () => {
  it('pays a small capped bonus and resets on a loss', () => {
    assert.equal(streakBonus(1), 0);
    assert.equal(streakBonus(2), 20);
    assert.equal(streakBonus(99), 100);
    const s = emptySave('QA', 'moonember');
    const g0 = s.gold;
    recordResult(s, true);
    const r = recordResult(s, true);
    assert.equal(r.streak, 2);
    assert.equal(s.gold, g0 + 20);
    recordResult(s, false);
    assert.equal(s.streak, 0);
    assert.equal(s.bestStreak, 2);
  });
});

describe('login calendar', () => {
  it('claims once per day, advances on consecutive days, restarts after a gap', () => {
    const s = emptySave('QA', 'moonember');
    const g0 = s.gold;
    const d1 = claimLogin(s, new Date(2026, 9, 5, 9), () => 0.5);
    assert.equal(d1?.day, 1);
    assert.equal(s.gold, g0 + 100);
    assert.equal(claimLogin(s, new Date(2026, 9, 5, 22), () => 0.5), null);
    assert.equal(claimLogin(s, new Date(2026, 9, 6, 8), () => 0.5)?.day, 2);
    const d3 = claimLogin(s, new Date(2026, 9, 7, 8), () => 0.5);
    assert.equal(d3?.day, 3);
    assert.equal(d3?.cards.length, 5);
    assert.equal(claimLogin(s, new Date(2026, 9, 10, 8), () => 0.5)?.day, 1);
  });
});

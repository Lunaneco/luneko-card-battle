import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { starterDeck } from '../src/data/cards';
import { createMatch, submit } from '../src/engine/battle';
import {
  RANK_AUTO_ATK,
  RANK_AUTO_HP,
  RANK_BONUS_AMOUNT,
  RANK_CHOICES,
  applyRankChoice,
  autoGrowthForRank,
  rankPickButtonsHtml,
  rankPickLabel,
  bonusRanksBetween,
  pendingBonusRanks,
  sumBonuses,
  totalGrowth,
  xpNeeded,
} from '../src/engine/rank';
import { chooseRankBonus, emptySave, grantXp, partnerGrowth } from '../src/state/save';

describe('partner rank bonuses', () => {
  it('fires 19 times from rank 1 to 99 (every 5 ranks through 95)', () => {
    const ranks = bonusRanksBetween(1, 99);
    assert.equal(ranks.length, 19);
    assert.equal(ranks[0], 5);
    assert.equal(ranks[18], 95);
  });

  it('uses the original XP table', () => {
    assert.equal(xpNeeded(1), 8);
    assert.equal(xpNeeded(2), 7);
    assert.equal(xpNeeded(3), 9);
    assert.equal(xpNeeded(98), 199);
    assert.equal(xpNeeded(99), 0);
  });

  it('lets the player pick HP or an attack slot', () => {
    const hp = applyRankChoice([], 5, 'hp').gained;
    const o = applyRankChoice(hp ? [hp] : [], 10, 'circle').gained;
    assert.equal(hp?.stat, 'hp');
    assert.equal(o?.stat, 'circle');
    const sum = sumBonuses([hp!, o!]);
    assert.equal(sum.hp, RANK_BONUS_AMOUNT);
    assert.equal(sum.circle, RANK_BONUS_AMOUNT);
    assert.equal(sum.triangle, 0);
  });

  it('grantXp leaves the 5-rank bonus pending until chosen', () => {
    const save = emptySave('QA', 'moonember');
    save.partners.moonember = {
      id: 'moonember',
      rank: 4,
      xp: 7,
      xpToNext: xpNeeded(4),
      bonuses: [],
    };
    const ev = grantXp(save, 20);
    assert.ok(save.partners.moonember!.rank >= 5);
    assert.deepEqual(ev[0]?.pendingRanks, pendingBonusRanks(save.partners.moonember!.rank, []));
    assert.equal(save.partners.moonember!.bonuses?.length ?? 0, 0);
    const gained = chooseRankBonus(save, 'moonember', 'hp');
    assert.equal(gained?.stat, 'hp');
    assert.equal(gained?.atRank, 5);
    const s = createMatch(
      [starterDeck('moonember'), starterDeck('windfeather')],
      ['A', 'B'],
      { partnerGrowth: { moonember: sumBonuses(save.partners.moonember!.bonuses) } },
      3,
      0,
    );
    s.players[0].hand = [{ instanceId: 'p', cardId: 'moonember' }];
    s.phase = 'summon';
    s.waitingOn = [0];
    const next = submit(s, 0, { type: 'summon', instanceId: 'p' });
    assert.equal(next.players[0].field?.maxHp, 680 + 10);
    assert.equal(next.players[0].field?.circle.power, 380);
  });

  it('raises HP and all attacks on every rank', () => {
    assert.deepEqual(autoGrowthForRank(1), { hp: 0, circle: 0, triangle: 0, cross: 0 });
    assert.deepEqual(autoGrowthForRank(2), { hp: 2, circle: 1, triangle: 1, cross: 1 });
    assert.deepEqual(autoGrowthForRank(6), { hp: 10, circle: 5, triangle: 5, cross: 5 });
    const g = totalGrowth(6, [{ atRank: 5, stat: 'hp', amount: 10 }]);
    assert.equal(g.hp, 20);
    assert.equal(g.circle, 5);
    const save = emptySave('QA', 'moonember');
    save.partners.moonember!.rank = 2;
    const live = partnerGrowth(save).moonember!;
    const s = createMatch(
      [starterDeck('moonember'), starterDeck('windfeather')],
      ['A', 'B'],
      { partnerGrowth: { moonember: live } },
      3,
      0,
    );
    s.players[0].hand = [{ instanceId: 'p', cardId: 'moonember' }];
    s.phase = 'summon';
    s.waitingOn = [0];
    const next = submit(s, 0, { type: 'summon', instanceId: 'p' });
    assert.equal(next.players[0].field?.maxHp, 682);
    assert.equal(next.players[0].field?.circle.power, 381);
  });

  it('circle pick raises only circle', () => {
    const save = emptySave('QA', 'moonember');
    save.partners.moonember = { id: 'moonember', rank: 5, xp: 0, xpToNext: xpNeeded(5), bonuses: [] };
    chooseRankBonus(save, 'moonember', 'circle');
    const g = sumBonuses(save.partners.moonember!.bonuses);
    assert.equal(g.circle, RANK_BONUS_AMOUNT);
    assert.equal(g.hp, 0);
    const s = createMatch(
      [starterDeck('moonember'), starterDeck('windfeather')],
      ['A', 'B'],
      { partnerGrowth: { moonember: g } },
      3,
      0,
    );
    s.players[0].hand = [{ instanceId: 'p', cardId: 'moonember' }];
    s.phase = 'summon';
    s.waitingOn = [0];
    const next = submit(s, 0, { type: 'summon', instanceId: 'p' });
    assert.equal(next.players[0].field?.circle.power, 390);
    assert.equal(next.players[0].field?.triangle.power, 280);
    assert.equal(next.players[0].field?.maxHp, 680);
  });

  it('keeps every-rank auto at HP+2 and ○△×+1', () => {
    assert.equal(RANK_AUTO_HP, 2);
    assert.equal(RANK_AUTO_ATK, 1);
    assert.equal(RANK_BONUS_AMOUNT, 10);
    const g = autoGrowthForRank(10);
    assert.equal(g.hp, 18);
    assert.equal(g.circle, 9);
  });

  it('prints the same bonus amount the pick actually grants', () => {
    const gained = applyRankChoice([], 5, 'hp').gained;
    assert.equal(gained?.amount, RANK_BONUS_AMOUNT);
    const cinema = rankPickButtonsHtml();
    const partner = rankPickButtonsHtml({ choose: 'moonember', sm: true });
    for (const html of [cinema, partner]) {
      for (const st of RANK_CHOICES) {
        assert.ok(html.includes(rankPickLabel(st)), html);
      }
      assert.ok(html.includes(`+${RANK_BONUS_AMOUNT}`));
      if (RANK_BONUS_AMOUNT !== 10) assert.ok(!html.includes('+10'), html);
    }
    assert.ok(partner.includes('data-choose="moonember"'));
  });
});

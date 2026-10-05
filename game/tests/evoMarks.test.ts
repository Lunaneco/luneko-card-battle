import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCard } from '../src/data/cards';
import { cardHtml } from '../src/ui/card';
import { evoCoach, markForEvo } from '../src/ui/evoMarks';
import type { FieldBeast } from '../src/engine/types';

function field(id: string): FieldBeast {
  const c = getCard(id);
  if (c.kind !== 'beast') throw new Error(id);
  return {
    instanceId: 'f',
    cardId: c.id,
    name: c.name,
    specialty: c.specialty,
    level: c.level,
    hp: c.hp,
    maxHp: c.hp,
    circle: c.circle,
    triangle: c.triangle,
    cross: c.cross,
    support: c.support,
    isPartner: !!c.isPartner,
    partnerLine: c.partnerLine,
    garbed: false,
    abnormal: false,
    skillName: c.skillName,
  };
}

describe('evolve vs charge marks', () => {
  it('marks a same-color next stage as evolvable when points are enough', () => {
    const m = markForEvo(field('moonember'), 40, 'ashflare');
    assert.equal(m?.kind, 'evolve');
    assert.equal(m?.canEvolve, true);
    assert.equal(m?.canCharge, true);
    assert.match(m?.label ?? '', /進化/);
  });

  it('marks the same card as short on points when POW is too low', () => {
    const m = markForEvo(field('moonember'), 0, 'ashflare');
    assert.equal(m?.kind, 'needPow');
    assert.equal(m?.canEvolve, false);
    assert.match(m?.label ?? '', /P不足/);
  });

  it('marks a different color as charge-only', () => {
    const m = markForEvo(field('moonember'), 99, 'needswing');
    assert.equal(m?.kind, 'charge');
    assert.equal(m?.canEvolve, false);
    assert.match(m?.label ?? '', /P\+/);
  });

  it('marks evolution items separately and ignores battle items', () => {
    assert.equal(markForEvo(field('moonember'), 0, 'speedEvo')?.kind, 'item');
    assert.equal(markForEvo(field('moonember'), 0, 'floppy'), null);
  });

  it('prints both 進化できる and a P chip on evolvable cards', () => {
    const html = cardHtml(getCard('ashflare'), {
      evoKind: 'evolve',
      evoLabel: '進化できる',
      chargeLabel: 'P+20',
      chargeIid: 'x',
    });
    assert.ok(html.includes('can-evo'));
    assert.ok(html.includes('進化できる'));
    assert.ok(html.includes('data-charge="x"'));
    assert.ok(html.includes('P+20'));
    const pow = cardHtml(getCard('needswing'), { evoKind: 'charge', evoLabel: 'P+20' });
    assert.ok(pow.includes('for-pow'));
    assert.ok(pow.includes('P+20'));
    assert.ok(!pow.includes('data-charge'));
  });

  it('coaches the current hand state', () => {
    assert.match(evoCoach(true, false), /金枠/);
    assert.match(evoCoach(false, true), /ポイント不足/);
    assert.match(evoCoach(false, false), /進化できるカードがない/);
  });
});

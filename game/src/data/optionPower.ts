import type { OptionCard, OptionEffect } from '../engine/types';

function extraBits(e: OptionEffect): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if ('discardOpp' in e && e.discardOpp) o.discardOpp = e.discardOpp;
  if ('firstStrike' in e && e.firstStrike) o.firstStrike = true;
  if ('allSlots' in e && e.allSlots) o.allSlots = true;
  if ('zeroSlot' in e && e.zeroSlot) o.zeroSlot = e.zeroSlot;
  if ('atkAll' in e && e.atkAll) o.atkAll = e.atkAll;
  if ('redraw' in e && e.redraw) o.redraw = e.redraw;
  return o;
}

/** Comparable combat signature from the shipped effect object. */
export function effectSignature(c: OptionCard): string {
  const e = c.effect;
  const extra = extraBits(e);
  const body: Record<string, unknown> = { kind: e.kind, ...extra };
  if ('amount' in e) body.amount = e.amount;
  if ('slot' in e) body.slot = e.slot;
  return JSON.stringify(body);
}

/** Family used to rank exclusives against commons of the same role. */
export function effectFamily(c: OptionCard): string {
  const e = c.effect;
  if (e.kind === 'atkSlot') return `atkSlot:${e.slot}`;
  if (e.kind === 'zeroSlot' && !e.allSlots) return `zeroSlot:${e.slot}`;
  return e.kind;
}

/**
 * Higher is strictly more useful inside a family.
 * setBothHp uses negative amount (lower HP set finishes fatter enemies).
 */
export function familyPower(c: OptionCard): number {
  const e = c.effect;
  switch (e.kind) {
    case 'heal':
      return e.amount;
    case 'atkAll':
      return e.amount + (e.discardOpp ?? 0) * 80;
    case 'atkSlot':
      return e.amount;
    case 'addPow':
      return e.amount;
    case 'setBothHp':
      return -e.amount;
    case 'draw':
      return e.amount;
    case 'fullHeal':
      return 1 + (e.firstStrike ? 1 : 0);
    case 'zeroSlot':
      return e.allSlots ? 3 : 1;
    case 'jamOptions':
      return 1 + (e.zeroSlot ? 1 : 0) + (e.firstStrike ? 1 : 0);
    case 'firstStrike':
      return 1 + (e.atkAll ?? 0);
    case 'discardBothHands':
      return 1 + (e.redraw ?? 0);
    default:
      return 1;
  }
}

export function optionGrantsFirstStrike(c: OptionCard): boolean {
  const e = c.effect;
  if (e.kind === 'firstStrike') return true;
  if (e.kind === 'fullHeal' && e.firstStrike) return true;
  if (e.kind === 'jamOptions' && e.firstStrike) return true;
  return false;
}

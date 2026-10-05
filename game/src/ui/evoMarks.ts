import { getCard } from '../data/cards';
import { isLegalLineEvolve } from '../engine/battle';
import type { FieldBeast } from '../engine/types';

export type EvoMarkKind = 'evolve' | 'needPow' | 'charge' | 'item';

export interface EvoMark {
  kind: EvoMarkKind;
  label: string;
  chargeLabel: string;
  canEvolve: boolean;
  canCharge: boolean;
}

/** How this hand card can be used in the evolve phase. */
export function markForEvo(field: FieldBeast | null, pow: number, cardId: string): EvoMark | null {
  let card;
  try {
    card = getCard(cardId);
  } catch {
    return null;
  }
  if (card.kind === 'option') {
    if (card.optionType !== 'evolution') return null;
    return { kind: 'item', label: '進化どうぐ', chargeLabel: '', canEvolve: false, canCharge: false };
  }
  const dp = card.dp;
  const chargeLabel = `P+${dp}`;
  if (!field || card.level === 'MOON') {
    return { kind: 'charge', label: chargeLabel, chargeLabel, canEvolve: false, canCharge: true };
  }
  const ready = isLegalLineEvolve(field.cardId, card.id, pow, field.garbed);
  if (ready) {
    return { kind: 'evolve', label: '進化できる', chargeLabel, canEvolve: true, canCharge: true };
  }
  const would = isLegalLineEvolve(field.cardId, card.id, 999, field.garbed);
  if (would) {
    return {
      kind: 'needPow',
      label: `P不足 ${card.evoCost}`,
      chargeLabel,
      canEvolve: false,
      canCharge: true,
    };
  }
  return { kind: 'charge', label: chargeLabel, chargeLabel, canEvolve: false, canCharge: true };
}

export function evoCoach(hasEvolve: boolean, hasNeed: boolean): string {
  if (hasEvolve) return '金枠は進化。カード下のPは進化ポイント。';
  if (hasNeed) return '色は合うけどポイント不足。灰のPでポイントをためよう。';
  return '今は進化できるカードがない。灰のPでポイントをためるか、進化を終える。';
}

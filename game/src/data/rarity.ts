import { CARD_BY_ID, getCard } from './cards';
import { STORY } from './story';
import type { CardDef } from '../engine/types';

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'secret';

export const RARITY_JA: Record<CardRarity, string> = {
  common: '並',
  uncommon: '月印',
  rare: '希少',
  secret: '秘蔵',
};

export const SEVEN_IDS = ['wild7', 'holy7', 'dark7', 'grand7', 'misty7', 'speed7', 'reverse7'] as const;

/** Boss / hidden-boss spoils. Enemy may already play them. Never shop / starter. */
export const SEVEN_DROPS: { id: (typeof SEVEN_IDS)[number]; fightId: string }[] = [
  { id: 'dark7', fightId: 'dark-2' },
  { id: 'holy7', fightId: 'extra-sera' },
  { id: 'wild7', fightId: 'tower-zero' },
  { id: 'reverse7', fightId: 'extra-tsuki' },
  { id: 'misty7', fightId: 'extra-pino' },
  { id: 'grand7', fightId: 'extra-giga' },
  { id: 'speed7', fightId: 'extra-plot' },
];

/** Fight-only cards. Never shop / starter. copyCap 1. */
export const EXCLUSIVE_DROPS: { id: string; fightId: string }[] = [
  { id: 'mochimemo', fightId: 'tut-mochi' },
  { id: 'gardenshears', fightId: 'beg-luna' },
  { id: 'ashcrown', fightId: 'flame-1' },
  { id: 'rosethorn', fightId: 'bloom-2' },
  { id: 'deepkeep', fightId: 'ice-2' },
  { id: 'toykings', fightId: 'junk-1' },
  { id: 'lampwing', fightId: 'sky-1' },
  { id: 'errorfang', fightId: 'tower-zero' },
  { id: 'samehand', fightId: 'tower-zero' },
  { id: 'blankfang', fightId: 'extra-tsuki' },
  { id: 'rivalmark', fightId: 'flame-2' },
  { id: 'speedpetal', fightId: 'bloom-1' },
  { id: 'frostkeep', fightId: 'ice-1' },
  { id: 'gearcog', fightId: 'junk-2' },
  { id: 'nightseal', fightId: 'dark-1' },
  { id: 'lampcut', fightId: 'sky-2' },
  { id: 'slopeash', fightId: 'steep-1' },
  { id: 'venomdrop', fightId: 'tower-venom' },
  { id: 'nevermelt', fightId: 'extra-yuki' },
  ...SEVEN_DROPS,
];

const EXCLUSIVE_BY_ID = Object.fromEntries(EXCLUSIVE_DROPS.map((e) => [e.id, e.fightId]));

const HARD_CAP: Record<string, number> = Object.fromEntries(SEVEN_IDS.map((id) => [id, 1]));

export function isSeven(id: string): boolean {
  return (SEVEN_IDS as readonly string[]).includes(id);
}

export function exclusiveIds(): string[] {
  return EXCLUSIVE_DROPS.map((e) => e.id);
}

export function isExclusive(id: string): boolean {
  return id in EXCLUSIVE_BY_ID;
}

export function exclusiveFightId(id: string): string | undefined {
  return EXCLUSIVE_BY_ID[id];
}

export function exclusiveFightTitle(id: string): string {
  const fight = exclusiveFightId(id);
  if (!fight) return '';
  const node = STORY.find((n) => n.id === fight || n.battle.id === fight);
  return node ? `${node.title}（${node.battle.opponentName}）` : fight;
}

export function rarityOf(id: string): CardRarity {
  if (isExclusive(id)) return 'secret';
  let c: CardDef | undefined;
  try {
    c = getCard(id);
  } catch {
    c = CARD_BY_ID[id];
  }
  if (!c) return 'common';
  if (c.kind === 'option') {
    if (c.id.endsWith('7') || c.name.includes('極月札')) return 'rare';
    return 'common';
  }
  if (c.level === 'APEX') return 'rare';
  if (c.level === 'IV' || c.isPartner) return 'uncommon';
  return 'common';
}

/** Raisable partner line (たね / 進化 / 月装). One copy. */
export function isPartnerCard(id: string): boolean {
  try {
    const c = getCard(id);
    return c.kind === 'beast' && !!c.isPartner;
  } catch {
    return false;
  }
}

export function copyCapOf(id: string): number {
  if (isExclusive(id)) return 1;
  if (isPartnerCard(id)) return 1;
  if (HARD_CAP[id]) return HARD_CAP[id]!;
  try {
    const c = getCard(id);
    if (c.kind === 'beast' && c.level === 'APEX') return 2;
    if (c.kind === 'option' && (c.id.endsWith('7') || c.name.includes('極月札'))) return 1;
  } catch {
    /* unknown */
  }
  return 4;
}

export function rarityLabel(id: string): string {
  const r = rarityOf(id);
  const cap = copyCapOf(id);
  if (cap < 4) return `${RARITY_JA[r]}・制限${cap}`;
  return RARITY_JA[r];
}

export function sourceLabel(id: string): string {
  if (!isExclusive(id)) return '';
  return `${exclusiveFightTitle(id)}限定`;
}

export function exclusiveIdsOnFight(fightId: string): string[] {
  return EXCLUSIVE_DROPS.filter((e) => e.fightId === fightId).map((e) => e.id);
}

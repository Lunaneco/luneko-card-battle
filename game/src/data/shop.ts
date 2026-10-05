import { beasts, getCard, options } from './cards';
import { isExclusive, isSeven } from './rarity';
import type { AiLevel } from '../engine/ai';
import { SPECIALTY_JA, type CardDef, type Specialty } from '../engine/types';
import { addCards, spendGold, type SaveData } from '../state/save';

export type PackId = 'seed' | 'city' | 'premium' | Specialty;

export interface PackDef {
  id: PackId;
  name: string;
  price: number;
  count: number;
  blurb: string;
  spec?: Specialty;
}

const COLOR_PACKS: PackDef[] = (['flame', 'ice', 'nature', 'dark', 'rare'] as const).map((spec) => ({
  id: spec,
  name: `${SPECIALTY_JA[spec]}パック`,
  price: 220,
  count: 5,
  spec,
  blurb: `${SPECIALTY_JA[spec]}のたねと進化が多め。どうぐも少し入る。5枚。`,
}));

export const PACKS: PackDef[] = [
  { id: 'seed', name: 'たねパック', price: 120, count: 5, blurb: 'たねとどうぐが多め。パートナーのたねも出る。5枚。' },
  { id: 'city', name: 'シティパック', price: 280, count: 5, blurb: '1進化とパートナー進化が出やすい街の箱。5枚。' },
  { id: 'premium', name: 'プレミアムパック', price: 500, count: 5, blurb: '2進化とパートナーの完成形が出やすい箱。極月札は入らない。5枚。' },
  ...COLOR_PACKS,
];

export const PACK_BY_ID: Record<PackId, PackDef> = Object.fromEntries(PACKS.map((p) => [p.id, p])) as Record<
  PackId,
  PackDef
>;

export function goldForWin(mode: 'story' | 'cpu' | 'online', ai?: AiLevel, xp = 0): number {
  if (mode === 'cpu') return 70;
  if (mode === 'online') return 90;
  const table: Record<AiLevel, number> = {
    tutorial: 90,
    normal: 150,
    rival: 230,
    boss: 320,
    scripted: 400,
  };
  return (table[ai ?? 'normal'] ?? 150) + Math.floor(xp / 2);
}

export function goldForLoss(mode: 'story' | 'cpu' | 'online', ai?: AiLevel, xp = 0): number {
  return Math.max(40, Math.floor(goldForWin(mode, ai, xp) / 4));
}

export function xpForLoss(winXp = 20): number {
  return Math.max(8, Math.floor(winXp / 4));
}

function shopLegal(c: CardDef): boolean {
  if (isExclusive(c.id) || isSeven(c.id)) return false;
  if (c.kind === 'beast') return c.level !== 'MOON';
  return true;
}

function weightFor(pack: PackId, c: CardDef, lastSlot: boolean): number {
  if (!shopLegal(c)) return 0;
  const spec = PACK_BY_ID[pack]?.spec;
  if (spec) {
    if (c.kind === 'beast') {
      if (c.specialty !== spec) return 0;
      if (c.isPartner) {
        if (c.level === 'III') return 3;
        if (c.level === 'IV') return 2;
        if (c.level === 'APEX') return lastSlot ? 3 : 1;
        return 0;
      }
      if (c.level === 'III') return 8;
      if (c.level === 'IV') return 6;
      if (c.level === 'APEX') return lastSlot ? 6 : 3;
      return 0;
    }
    return c.optionType === 'evolution' ? 2 : 2;
  }
  if (c.kind === 'beast' && c.isPartner) {
    if (c.level === 'III') return pack === 'seed' ? 2 : 1;
    if (c.level === 'IV') return pack === 'seed' ? 0 : 2;
    if (c.level === 'APEX') return pack === 'premium' ? 2 : pack === 'city' ? 1 : 0;
    return 0;
  }
  if (c.kind === 'beast') {
    if (c.level === 'III') return pack === 'seed' ? 8 : pack === 'city' ? 3 : 1;
    if (c.level === 'IV') return pack === 'seed' ? 1 : pack === 'city' ? 5 : 4;
    if (c.level === 'APEX') {
      const base = pack === 'seed' ? 0 : pack === 'city' ? 1 : 5;
      return lastSlot && pack === 'premium' ? base + 4 : base;
    }
    return 0;
  }
  if (c.optionType === 'evolution') return pack === 'seed' ? 1 : pack === 'city' ? 2 : 3;
  return pack === 'seed' ? 4 : pack === 'city' ? 3 : 2;
}

function pickWeighted(pool: Array<{ id: string; w: number }>, rng: () => number): string {
  const total = pool.reduce((s, p) => s + p.w, 0);
  if (total <= 0) return 'ennya';
  let roll = rng() * total;
  for (const p of pool) {
    roll -= p.w;
    if (roll <= 0) return p.id;
  }
  return pool[pool.length - 1]!.id;
}

export function openPack(packId: PackId, rng: () => number): string[] {
  const pack = PACK_BY_ID[packId];
  if (!pack) return [];
  const catalog = [...beasts(), ...options()];
  const out: string[] = [];
  for (let i = 0; i < pack.count; i++) {
    const last = i === pack.count - 1;
    const pool = catalog
      .map((c) => ({ id: c.id, w: weightFor(packId, c, last) }))
      .filter((p) => p.w > 0 && getCard(p.id));
    out.push(pickWeighted(pool, rng));
  }
  return out;
}

export function buyPack(
  save: SaveData,
  packId: PackId,
  rng: () => number,
): { ok: true; cards: string[] } | { ok: false; reason: string } {
  const pack = PACK_BY_ID[packId];
  if (!pack) return { ok: false, reason: 'そのパックはない' };
  if (!spendGold(save, pack.price)) return { ok: false, reason: 'ゴールドが足りない' };
  const cards = openPack(packId, rng);
  addCards(save, cards);
  return { ok: true, cards };
}

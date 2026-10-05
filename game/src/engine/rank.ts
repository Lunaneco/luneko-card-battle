/** Luneko rules partner rank growth. */

export type RankStat = 'hp' | 'atk' | 'circle' | 'triangle' | 'cross';

export interface PartnerBonus {
  atRank: number;
  stat: RankStat;
  amount: number;
}

export interface RankUpEvent {
  partnerId: string;
  fromRank: number;
  toRank: number;
  bonuses: PartnerBonus[];
  pendingRanks: number[];
}

export const RANK_BONUS_AMOUNT = 10;
export const RANK_BONUS_EVERY = 5;
export const RANK_BONUS_LAST = 95;
export const RANK_CAP = 99;

/** Stats the player may pick at a 5-rank bonus. */
export const RANK_CHOICES = ['hp', 'circle', 'triangle', 'cross'] as const;
export type RankChoice = (typeof RANK_CHOICES)[number];

export const RANK_STAT_JA: Record<RankStat, string> = {
  hp: 'HP',
  atk: '攻撃力',
  circle: '○攻撃',
  triangle: '△攻撃',
  cross: '×攻撃',
};

export interface PartnerGrowth {
  hp: number;
  circle: number;
  triangle: number;
  cross: number;
}

/** Ranks 5, 10, … 95 — 19 bonuses. */
export function bonusRanksBetween(fromRank: number, toRank: number): number[] {
  const out: number[] = [];
  const start = Math.max(RANK_BONUS_EVERY, fromRank + 1);
  const end = Math.min(RANK_BONUS_LAST, toRank);
  for (let r = start; r <= end; r++) {
    if (r % RANK_BONUS_EVERY === 0) out.push(r);
  }
  return out;
}

export function pendingBonusRanks(rank: number, bonuses: PartnerBonus[] | undefined): number[] {
  const have = new Set((bonuses ?? []).map((b) => b.atRank));
  return bonusRanksBetween(0, rank).filter((r) => !have.has(r));
}

/** Original table: 1→2 is 8, 2→3 is 7, then 2×rank+3. */
export function xpNeeded(rank: number): number {
  if (rank >= RANK_CAP) return 0;
  if (rank <= 1) return 8;
  if (rank === 2) return 7;
  return 2 * rank + 3;
}

export function applyRankChoice(
  bonuses: PartnerBonus[] | undefined,
  rank: number,
  stat: RankStat,
): { all: PartnerBonus[]; gained: PartnerBonus | null } {
  const all = [...(bonuses ?? [])];
  const next = pendingBonusRanks(rank, all)[0];
  if (!next) return { all, gained: null };
  const gained: PartnerBonus = { atRank: next, stat, amount: RANK_BONUS_AMOUNT };
  all.push(gained);
  return { all, gained };
}

export const RANK_AUTO_HP = 2;
export const RANK_AUTO_ATK = 1;

export function emptyGrowth(): PartnerGrowth {
  return { hp: 0, circle: 0, triangle: 0, cross: 0 };
}

/** Every rank above 1: HP+2 and ○△× +1. */
export function autoGrowthForRank(rank: number): PartnerGrowth {
  const steps = Math.max(0, Math.min(RANK_CAP, rank) - 1);
  return {
    hp: steps * RANK_AUTO_HP,
    circle: steps * RANK_AUTO_ATK,
    triangle: steps * RANK_AUTO_ATK,
    cross: steps * RANK_AUTO_ATK,
  };
}

export function addGrowth(a: PartnerGrowth, b: PartnerGrowth): PartnerGrowth {
  return {
    hp: a.hp + b.hp,
    circle: a.circle + b.circle,
    triangle: a.triangle + b.triangle,
    cross: a.cross + b.cross,
  };
}

export function totalGrowth(rank: number, bonuses?: PartnerBonus[]): PartnerGrowth {
  return addGrowth(autoGrowthForRank(rank), sumBonuses(bonuses));
}

export function autoGrowthDelta(fromRank: number, toRank: number): PartnerGrowth {
  const a = autoGrowthForRank(fromRank);
  const b = autoGrowthForRank(toRank);
  return { hp: b.hp - a.hp, circle: b.circle - a.circle, triangle: b.triangle - a.triangle, cross: b.cross - a.cross };
}

export function growthLabel(g: PartnerGrowth): string {
  const bits: string[] = [];
  if (g.hp) bits.push(`HP+${g.hp}`);
  if (g.circle) bits.push(`○+${g.circle}`);
  if (g.triangle) bits.push(`△+${g.triangle}`);
  if (g.cross) bits.push(`×+${g.cross}`);
  return bits.join('　');
}

export function sumBonuses(bonuses: PartnerBonus[] | undefined): PartnerGrowth {
  const g = emptyGrowth();
  for (const b of bonuses ?? []) {
    if (b.stat === 'hp') g.hp += b.amount;
    else if (b.stat === 'circle') g.circle += b.amount;
    else if (b.stat === 'triangle') g.triangle += b.amount;
    else if (b.stat === 'cross') g.cross += b.amount;
    else if (b.stat === 'atk') {
      g.circle += b.amount;
      g.triangle += b.amount;
      g.cross += b.amount;
    }
  }
  return g;
}

export function bonusLabel(b: PartnerBonus): string {
  return `${RANK_STAT_JA[b.stat]} +${b.amount}`;
}

/** Player-facing label on the 5-rank pick buttons. Must match applyRankChoice. */
export function rankPickLabel(stat: RankStat): string {
  return `${RANK_STAT_JA[stat]} +${RANK_BONUS_AMOUNT}`;
}

export function rankPickButtonsHtml(opts: { choose?: string; sm?: boolean } = {}): string {
  return RANK_CHOICES.map((st) => {
    const cls = opts.sm ? 'btn sm rank-pick' : 'btn rank-pick';
    const choose = opts.choose ? ` data-choose="${opts.choose}"` : '';
    return `<button type="button" class="${cls}"${choose} data-stat="${st}">${rankPickLabel(st)}</button>`;
  }).join('');
}

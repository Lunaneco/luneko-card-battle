import type { Specialty } from '../engine/types';
import { SET2_LINES } from './set2';

/** Same-character lines: index 0 = たね, then 1進化, then 2進化. */
export const EVOLVE_LINES: string[][] = [
  ['moonember', 'moondrake', 'moonfang'],
  ['windfeather', 'windrush', 'windking'],
  ['shellwhite', 'shellguard', 'shellkeep'],
  ['fluffwing', 'fluffsail', 'fluffsky'],
  ['fireflytail', 'fireflymoon', 'fireflysaint'],
  ['shadebug', 'shadeneedle', 'shadeend'],
  ['ennya', 'ashflare', 'moonflareking'],
  ['chickflare', 'flamewing', 'vermilion'],
  ['flarecat', 'ashfist', 'emperordrake'],
  ['fangpup', 'frostwolf', 'steelfrost'],
  ['sesame', 'onehorn', 'hammerwhale'],
  ['penguin', 'seadrake', 'tidewhale'],
  ['needswing', 'shellbolt', 'skyfeather'],
  ['vinepup', 'thornball', 'thornbloom'],
  ['sparkkit', 'lampenvoy', 'lampdragon'],
  ['littleshade', 'nightsteward', 'bloodmarquis'],
  ['shadehand', 'spiritcat', 'venomcrown'],
  ['venompup', 'nightblade', 'calamycore'],
  ['blacktail', 'ironcat', 'lastchapter'],
  ['screwkit', 'filthorb', 'threadless'],
  ['gearsmith', 'stoneward', 'twinpole'],
  ['glasscat', 'starball', 'superstar'],
  ['slimekit', 'songape', 'goldape'],
  ...SET2_LINES,
];

const LINE_OF = new Map<string, string>();
const NEXT_OF = new Map<string, string>();
const PREV_OF = new Map<string, string>();
const FINAL_OF = new Map<string, string>();

for (const stages of EVOLVE_LINES) {
  const lineId = stages[0]!;
  const last = stages[stages.length - 1]!;
  for (let i = 0; i < stages.length; i++) {
    const id = stages[i]!;
    LINE_OF.set(id, lineId);
    FINAL_OF.set(id, last);
    if (i + 1 < stages.length) NEXT_OF.set(id, stages[i + 1]!);
    if (i > 0) PREV_OF.set(id, stages[i - 1]!);
  }
}

export function lineIdOf(cardId: string): string {
  return LINE_OF.get(cardId) ?? cardId;
}

export function nextFormId(cardId: string): string | null {
  return NEXT_OF.get(cardId) ?? null;
}

export function prevFormId(cardId: string): string | null {
  return PREV_OF.get(cardId) ?? null;
}

export function finalFormId(cardId: string): string | null {
  return FINAL_OF.get(cardId) ?? null;
}

export function lineStages(cardId: string): string[] {
  const line = lineIdOf(cardId);
  return EVOLVE_LINES.find((s) => s[0] === line)?.slice() ?? [cardId];
}

/** Defender specialty → colors that deal 1.5x to it. */
export const WEAK_TO: Record<Specialty, Specialty[]> = {
  flame: ['ice'],
  ice: ['nature'],
  nature: ['flame'],
  dark: ['rare'],
  rare: ['dark'],
};

export const WEAKNESS_MULT = 1.5;

export function isWeakTo(defender: Specialty, attacker: Specialty): boolean {
  return WEAK_TO[defender].includes(attacker);
}

/** Shipped damage after weakness. Same hit, weak defender takes more. */
export function damageWithWeakness(base: number, attacker: Specialty, defender: Specialty): number {
  if (base <= 0) return 0;
  if (isWeakTo(defender, attacker)) return Math.floor(base * WEAKNESS_MULT);
  return base;
}

export function specialtyJa(spec: Specialty): string {
  const ja: Record<Specialty, string> = {
    flame: '火炎',
    ice: '氷水',
    nature: '自然',
    dark: '暗黒',
    rare: '珍種',
  };
  return ja[spec];
}

export function weaknessJa(spec: Specialty): string {
  return WEAK_TO[spec].map(specialtyJa).join('・');
}

/** Colors this attacker deals 1.5x to. */
export function strongAgainst(attacker: Specialty): Specialty[] {
  return (Object.keys(WEAK_TO) as Specialty[]).filter((d) => WEAK_TO[d].includes(attacker));
}

export function weaknessChartJa(): string {
  return '氷水→火炎→自然→氷水。暗黒→珍種→暗黒。';
}

export function inspectWeaknessLine(spec: Specialty): string {
  const strong = strongAgainst(spec).map(specialtyJa).join('・') || 'なし';
  return `弱点 ${weaknessJa(spec)}（1.5倍くらう）　有利 ${strong}`;
}

export function matchupText(me: Specialty, you: Specialty): { kind: 'up' | 'down' | 'both' | 'even'; text: string } {
  if (isWeakTo(you, me) && isWeakTo(me, you)) return { kind: 'both', text: '互いに弱点！ 与える・受けるダメージともに×1.5' };
  if (isWeakTo(you, me)) return { kind: 'up', text: `自分の${specialtyJa(me)}が有利！ 弱点×1.5` };
  if (isWeakTo(me, you)) return { kind: 'down', text: `相手の${specialtyJa(you)}が有利。弱点をくらう` };
  return { kind: 'even', text: `弱点なし（${specialtyJa(me)}対${specialtyJa(you)}）` };
}

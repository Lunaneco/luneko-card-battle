import { CARD_BY_ID } from './cards';
import { exclusiveIdsOnFight } from './rarity';
import type { StoryNode } from './story';
import type { AiLevel } from '../engine/ai';
import type { Specialty } from '../engine/types';

const AI_W: Record<AiLevel, number> = {
  tutorial: 0,
  normal: 16,
  rival: 34,
  boss: 56,
  scripted: 78,
};

export interface DeckMix {
  iii: number;
  iv: number;
  perfect: number;
  options: number;
  beasts: number;
  avgCircle: number;
}

export function deckMix(ids: string[]): DeckMix {
  let iii = 0;
  let iv = 0;
  let perfect = 0;
  let options = 0;
  let beasts = 0;
  let circle = 0;
  for (const id of ids) {
    const c = CARD_BY_ID[id];
    if (!c) continue;
    if (c.kind === 'option') {
      options += 1;
      continue;
    }
    beasts += 1;
    if (c.level === 'III') iii += 1;
    else if (c.level === 'IV') iv += 1;
    else if (c.level === 'APEX') perfect += 1;
    circle += c.circle.power;
  }
  return { iii, iv, perfect, options, beasts, avgCircle: beasts ? circle / beasts : 0 };
}

/** Printed-line strength. Used to keep post-tutorial rivals above the real starter. */
export function mixPower(ids: string[]): number {
  const mix = deckMix(ids);
  return mix.perfect * 9 + mix.iv * 3.2 + mix.avgCircle / 35;
}

/** Share of beast cards matching a specialty. Options ignored. */
export function colorShare(ids: string[], spec: Specialty): number {
  let beasts = 0;
  let hit = 0;
  for (const id of ids) {
    const c = CARD_BY_ID[id];
    if (!c || c.kind !== 'beast') continue;
    beasts += 1;
    if (c.specialty === spec) hit += 1;
  }
  return beasts ? hit / beasts : 0;
}

/** Same fields the match uses: ai, deck composition, xp, exclusive stakes. */
export function storyPressure(node: StoryNode): number {
  const ai = AI_W[node.battle.ai];
  const deck = mixPower(node.battle.deck);
  const xp = node.battle.xp / 3;
  const stakes = exclusiveIdsOnFight(node.id).length * 10;
  const cheat = node.battle.cheat ? 14 : 0;
  return Math.round(ai + deck + xp + stakes + cheat);
}

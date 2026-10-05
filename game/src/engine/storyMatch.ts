import type { StoryNode } from '../data/story';
import { createMatch, tossFirst } from './battle';
import type { MatchFlags } from './types';

/** Shared by the live story and its simulations, including the climax rules. */
export function createStoryMatch(node: StoryNode, deck: string[], name: string, seed: number,
  growth: Pick<Partial<MatchFlags>, 'ownedShells' | 'partnerRanks' | 'partnerGrowth'> = {}) {
  return createMatch([deck, node.battle.deck], [name, node.battle.opponentName], {
    ...growth,
    partnerGrowthBySeat: [growth.partnerGrowth ?? {}, {}],
    noOptions: node.battle.noOptions,
    forbidMoonGarb: [false, true],
    cheat: node.battle.cheat ? {
      forceHand: ['littleshade', 'nightsteward', 'wild7', 'samehand'],
      forceTop: ['hacking', 'errorfang', 'holy7', 'dark7'],
      buryPartner: true,
    } : undefined,
  }, seed, tossFirst(seed));
}

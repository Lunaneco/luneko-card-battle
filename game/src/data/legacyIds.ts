/** Dropped clone options remap to the kept card of the same role. */
export const LEGACY_CARD_IDS: Record<string, string> = {
  circleKiller: 'defO',
  triKiller: 'defT',
  crossKiller: 'defX',
  guardBerry: 'defT',
  quickDust: 'firstChip',
  bitterRoot: 'jyureMist',
  softMoss: 'dropHeal',
  coolDew: 'speedEvo',
  primeMeat: 'dropHeal',
};

export function remapCardId(id: string): string {
  return LEGACY_CARD_IDS[id] ?? id;
}

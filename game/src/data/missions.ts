import { isExclusive } from './rarity';
import { STORY } from './story';
import type { MatchState } from '../engine/types';

export type MissionKind =
  | 'win'
  | 'noredraw'
  | 'shutout'
  | 'nosupport'
  | 'allcircle'
  | 'allcross'
  | 'alltriangle'
  | 'alldeck'
  | 'evolve'
  | 'moongarb'
  | 'partnerko'
  | 'justkill'
  | 'comeback'
  | 'noevo'
  | 'perfect'
  | 'fever'
  | 'perfectkill';

export interface FightMission {
  kind: MissionKind;
  label: string;
  hint: string;
  reward: string[];
}

export interface StoryLoot {
  first: string[];
  drop: string[];
  missions: [FightMission, FightMission, FightMission];
}

export function missionKey(fightId: string, slot: number): string {
  return `${fightId}:${slot}`;
}

export function evaluateMission(kind: MissionKind, s: MatchState, seat: 0 | 1): boolean {
  if (s.winner !== seat) return false;
  const st = s.stats;
  const you = s.players[seat === 0 ? 1 : 0];
  const supports = st.supportKinds[seat];
  const slots = st.attackSlots[seat];
  const shutout = you.kos === 0;
  const noredraw = st.redraws[seat] === 0;
  switch (kind) {
    case 'win':
      return true;
    case 'noredraw':
      return noredraw;
    case 'shutout':
      return shutout;
    case 'nosupport':
      return supports.length > 0 && supports.every((k) => k === 'none');
    case 'allcircle':
      return slots.length > 0 && slots.every((x) => x === 'circle');
    case 'allcross':
      return slots.length > 0 && slots.every((x) => x === 'cross');
    case 'alltriangle':
      return slots.length > 0 && slots.every((x) => x === 'triangle');
    case 'alldeck':
      return supports.length > 0 && supports.every((k) => k === 'deck');
    case 'evolve':
      return st.evolved[seat];
    case 'moongarb':
      return st.garbed[seat];
    case 'partnerko':
      return st.partnerKos[seat] > 0;
    case 'justkill':
      return st.finishingJust[seat];
    case 'comeback':
      return st.trailed02[seat];
    case 'noevo':
      return !st.evolved[seat] && !st.garbed[seat];
    case 'perfect':
      return shutout && noredraw;
    case 'fever':
      return st.hpFever[seat] || st.dmgFever[seat];
    case 'perfectkill':
      return st.perfectKilled[seat];
  }
}

const M: Record<MissionKind, { label: string; hint: string }> = {
  win: { label: '勝利する', hint: '3体倒せばクリア' },
  noredraw: { label: '引き直さず勝つ', hint: '最初の手札のまま行く' },
  shutout: { label: '無敗で勝つ', hint: '自分は1体も倒れない' },
  nosupport: { label: '援護なしで勝つ', hint: '全部「援護なし」' },
  allcircle: { label: '全部○で勝つ', hint: 'こうげきは○だけ' },
  allcross: { label: '全部×で勝つ', hint: 'こうげきは×だけ' },
  alltriangle: { label: '全部△で勝つ', hint: 'こうげきは△だけ' },
  alldeck: { label: '全部山札の上で勝つ', hint: '援護はいちかばちかだけ' },
  evolve: { label: '進化して勝つ', hint: '1回は進化する' },
  moongarb: { label: '月装して勝つ', hint: '金色の月装を使う' },
  partnerko: { label: 'パートナーで倒す', hint: 'パートナーが1体倒す' },
  justkill: { label: 'ジャストでとどめ', hint: '残りHPぴったりのダメージ' },
  comeback: { label: '0-2から逆転', hint: '2体倒されてから盛り返す' },
  noevo: { label: '進化も月装もせず勝つ', hint: 'たねのまま3体倒す' },
  perfect: { label: '引き直さず無敗', hint: '手札そのまま、自分は倒れない' },
  fever: { label: 'ぞろ目を出す', hint: 'HPかダメージが1110のような数' },
  perfectkill: { label: '2進化を倒す', hint: '相手の2進化を1体倒す' },
};

function m(kind: MissionKind, ...reward: string[]): FightMission {
  const meta = M[kind];
  return { kind, label: meta.label, hint: meta.hint, reward };
}

const DROPS: Record<string, string[]> = {
  'tut-mochi': ['floppy', 'jellpup'],
  'beg-luna': ['needswing', 'atkchip'],
  'flame-1': ['foxfire', 'atkchip'],
  'flame-2': ['littleshade', 'defO'],
  'bloom-1': ['leafkit', 'speedEvo'],
  'bloom-2': ['lampenvoy', 'roseSeduce'],
  'ice-1': ['snowkit', 'floppy'],
  'ice-2': ['icicle', 'bubblen'],
  'junk-1': ['clockbit', 'puffball'],
  'junk-2': ['dataCopy', 'speedEvo'],
  'dark-1': ['duskpup', 'batling'],
  'dark-2': ['jyureMist', 'spiritcat'],
  'sky-1': ['floppy', 'dawnwing'],
  'sky-2': ['warpEvo', 'lampenvoy'],
  'steep-1': ['embercub', 'superatkchip'],
  'tower-venom': ['downloader', 'duskpup'],
  'tower-zero': ['hacking', 'atkchip'],
  'extra-tsuki': ['hacking', 'littleshade'],
  'extra-plot': ['leafkit', 'margin'],
  'extra-yuki': ['snowkit', 'defT'],
  'extra-pino': ['dataCopy', 'clockbit'],
  'extra-sera': ['warpEvo', 'lampenvoy'],
  'extra-giga': ['cinder', 'superatkchip'],
};

const MISSIONS: Record<string, [FightMission, FightMission, FightMission]> = {
  'tut-mochi': [m('win', 'floppy'), m('noredraw', 'jellpup'), m('shutout', 'mochimemo')],
  'beg-luna': [m('win', 'needswing'), m('evolve', 'speedEvo'), m('perfect', 'gardenshears')],
  'flame-1': [m('win', 'foxfire'), m('allcircle', 'redwolf'), m('shutout', 'ashcrown')],
  'flame-2': [m('win', 'littleshade'), m('noredraw', 'defO'), m('comeback', 'rivalmark')],
  'bloom-1': [m('win', 'leafkit'), m('evolve', 'speedEvo'), m('alldeck', 'speedpetal')],
  'bloom-2': [m('win', 'lampenvoy'), m('nosupport', 'roseSeduce'), m('shutout', 'rosethorn')],
  'ice-1': [m('win', 'snowkit'), m('noredraw', 'ripple'), m('justkill', 'frostkeep')],
  'ice-2': [m('win', 'icicle'), m('nosupport', 'bubblen'), m('shutout', 'deepkeep')],
  'junk-1': [m('win', 'clockbit'), m('evolve', 'puffball'), m('noevo', 'toykings')],
  'junk-2': [m('win', 'dataCopy'), m('noredraw', 'stoneward'), m('allcross', 'gearcog')],
  'dark-1': [m('win', 'duskpup'), m('partnerko', 'batling'), m('shutout', 'nightseal')],
  'dark-2': [m('win', 'spiritcat'), m('allcircle', 'jyureMist'), m('perfect', 'dark7')],
  'sky-1': [m('win', 'floppy'), m('evolve', 'dawnwing'), m('shutout', 'lampwing')],
  'sky-2': [m('win', 'warpEvo'), m('noredraw', 'thornbloom'), m('nosupport', 'lampcut')],
  'steep-1': [m('win', 'embercub'), m('allcircle', 'superatkchip'), m('justkill', 'slopeash')],
  'tower-venom': [m('win', 'downloader'), m('noredraw', 'venomcrown'), m('comeback', 'venomdrop')],
  'tower-zero': [m('win', 'hacking'), m('partnerko', 'twinpole'), m('perfect', 'errorfang', 'samehand', 'wild7')],
  'extra-tsuki': [m('win', 'hacking'), m('noredraw', 'littleshade'), m('perfect', 'reverse7', 'blankfang')],
  'extra-plot': [m('win', 'leafkit'), m('evolve', 'margin'), m('alldeck', 'speed7')],
  'extra-yuki': [m('win', 'snowkit'), m('nosupport', 'frosthorn'), m('justkill', 'nevermelt')],
  'extra-pino': [m('win', 'dataCopy'), m('noredraw', 'threadless'), m('noevo', 'misty7')],
  'extra-sera': [m('win', 'lampenvoy'), m('evolve', 'warpEvo'), m('shutout', 'holy7')],
  'extra-giga': [m('win', 'cinder'), m('allcircle', 'volcanus'), m('perfect', 'grand7')],
};

export function storyLoot(fightId: string): StoryLoot {
  const node = STORY.find((n) => n.id === fightId || n.battle.id === fightId);
  const first = (node?.battle.reward ?? []).filter((id) => !isExclusive(id));
  const drop = DROPS[fightId] ?? first.slice(0, 2);
  const missions = MISSIONS[fightId] ?? [m('win', 'floppy'), m('noredraw', 'atkchip'), m('shutout', 'floppy')];
  return { first, drop, missions };
}

export function lastMissionRewards(fightId: string): string[] {
  return storyLoot(fightId).missions[2].reward;
}

export function pickDrop(fightId: string, rng: () => number): string | null {
  const pool = storyLoot(fightId).drop.filter(Boolean);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

export interface MissionRow {
  slot: number;
  label: string;
  hint: string;
  kind: MissionKind;
  ok: boolean;
  newly: boolean;
  already: boolean;
  reward: string[];
}

export interface SettledStoryLoot {
  first: string[];
  drop: string[];
  missions: MissionRow[];
}

export function settleStoryLoot(
  fightId: string,
  s: MatchState,
  seat: 0 | 1,
  cleared: string[],
  claimed: string[],
  rng: () => number,
): SettledStoryLoot {
  const loot = storyLoot(fightId);
  const win = s.winner === seat;
  const first: string[] = [];
  const drop: string[] = [];
  if (win && !cleared.includes(fightId)) first.push(...loot.first);
  if (win) {
    const d = pickDrop(fightId, rng);
    if (d) drop.push(d);
  }
  const missions: MissionRow[] = loot.missions.map((miss, slot) => {
    const key = missionKey(fightId, slot);
    const already = claimed.includes(key);
    const ok = evaluateMission(miss.kind, s, seat);
    const newly = win && ok && !already;
    return {
      slot,
      label: miss.label,
      hint: miss.hint,
      kind: miss.kind,
      ok,
      newly,
      already,
      reward: newly ? miss.reward : [],
    };
  });
  return { first, drop, missions };
}

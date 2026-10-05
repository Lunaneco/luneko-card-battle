import { CARD_BY_ID, partnerLineCards, starterDeck } from '../data/cards';
import { remapCardId } from '../data/legacyIds';
import { copyCapOf } from '../data/rarity';
import {
  RANK_CAP,
  applyRankChoice,
  pendingBonusRanks,
  totalGrowth,
  xpNeeded,
  type PartnerBonus,
  type PartnerGrowth,
  type RankStat,
  type RankUpEvent,
} from '../engine/rank';

export type { PartnerBonus, RankUpEvent };

export interface PartnerRec {
  id: string;
  rank: number;
  xp: number;
  xpToNext: number;
  bonuses?: PartnerBonus[];
}

export interface SaveData {
  version: 1;
  playerName: string;
  starter: string;
  chapter: number;
  node: number;
  wins: number;
  losses: number;
  cards: Record<string, number>;
  decks: string[][];
  activeDeck: number;
  partners: Record<string, PartnerRec>;
  unlockedPartners: string[];
  shells: string[];
  flags: Record<string, boolean>;
  titles: string[];
  seenStory: string[];
  gold: number;
  clearedFights: string[];
  missionClaimed: string[];
  /** Consecutive wins (story + free battle). */
  streak?: number;
  bestStreak?: number;
  /** Login calendar: last claimed local day (YYYY-MM-DD) and its 1–7 slot. */
  lastLogin?: string;
  loginDay?: number;
}

const KEY = 'luneko-save-v2';

export { xpNeeded };

export function emptySave(name: string, starter: string): SaveData {
  const deck = starterDeck(starter);
  const cards: Record<string, number> = {};
  for (const id of deck) cards[id] = (cards[id] ?? 0) + 1;
  const extra = ['ennya', 'floppy', 'atkchip'];
  for (const id of extra) {
    if (!CARD_BY_ID[id]) continue;
    cards[id] = Math.max(cards[id] ?? 0, 2);
  }
  return {
    version: 1,
    playerName: name || 'ルナネコ',
    starter,
    chapter: 0,
    node: 0,
    wins: 0,
    losses: 0,
    cards,
    decks: [deck, [], []],
    activeDeck: 0,
    partners: {
      [starter]: { id: starter, rank: 1, xp: 0, xpToNext: xpNeeded(1), bonuses: [] },
    },
    unlockedPartners: [starter],
    shells: [],
    flags: { intro: false, tutorialSeen: false, muted: false },
    titles: [],
    seenStory: [],
    gold: 150,
    clearedFights: [],
    missionClaimed: [],
  };
}

function grantNewPool(s: SaveData) {
  if (typeof s.gold !== 'number' || Number.isNaN(s.gold)) s.gold = 150;
  if (!Array.isArray(s.clearedFights)) s.clearedFights = [];
  if (!Array.isArray(s.missionClaimed)) s.missionClaimed = [];
  if (!s.flags || typeof s.flags !== 'object') s.flags = {};
  if (typeof s.flags.muted !== 'boolean') s.flags.muted = false;
  const cards: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.cards ?? {})) {
    const to = remapCardId(id);
    if (!CARD_BY_ID[to] || n <= 0) continue;
    const cap = copyCapOf(to);
    const hold = cap < 4 ? cap : 7;
    cards[to] = Math.min(hold, (cards[to] ?? 0) + n);
  }
  s.cards = cards;
  s.decks = (s.decks ?? []).map((deck) => {
    const out: string[] = [];
    const used: Record<string, number> = {};
    for (const raw of deck) {
      const id = remapCardId(raw);
      if (!CARD_BY_ID[id]) continue;
      const cap = copyCapOf(id);
      used[id] = (used[id] ?? 0) + 1;
      if (used[id]! <= cap) out.push(id);
    }
    return out;
  });
}

/** Load-path migrations (legacy option ids, missing flags). Tests drive this. */
export function migrateSave(s: SaveData): SaveData {
  grantNewPool(s);
  return s;
}

export function applyMuteToSave(s: SaveData, muted: boolean) {
  s.flags = { ...s.flags, muted };
}

export function muteFromSave(s: SaveData | null | undefined): boolean {
  return !!s?.flags?.muted;
}

export function addGold(s: SaveData, amount: number) {
  s.gold = Math.max(0, Math.floor((s.gold ?? 0) + amount));
}

export function spendGold(s: SaveData, amount: number): boolean {
  const n = Math.floor(amount);
  if (n <= 0) return true;
  if ((s.gold ?? 0) < n) return false;
  s.gold -= n;
  return true;
}

export function addShell(s: SaveData, id: string): boolean {
  if (!id || s.shells.includes(id)) return false;
  s.shells.push(id);
  return true;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveData;
    const hadGold = typeof s.gold === 'number' && !Number.isNaN(s.gold);
    migrateSave(s);
    if (!hadGold) writeSave(s);
    return s;
  } catch {
    return null;
  }
}

export function writeSave(s: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

export function addCards(s: SaveData, ids: string[]) {
  for (const id of ids) {
    const cap = copyCapOf(id);
    const hold = cap < 4 ? cap : 7;
    s.cards[id] = Math.min(hold, (s.cards[id] ?? 0) + 1);
    const c = CARD_BY_ID[id];
    if (c && c.kind === 'beast' && c.isPartner && c.partnerLine) unlockPartnerRecord(s, c.partnerLine);
  }
}

export function grantXp(s: SaveData, amount: number): RankUpEvent[] {
  const events: RankUpEvent[] = [];
  for (const id of s.unlockedPartners) {
    const inDeck = s.decks[s.activeDeck]?.includes(id);
    if (!inDeck) continue;
    const p = s.partners[id] ?? { id, rank: 1, xp: 0, xpToNext: xpNeeded(1), bonuses: [] };
    const from = p.rank;
    p.xp += amount;
    while (p.xp >= p.xpToNext && p.rank < RANK_CAP) {
      p.xp -= p.xpToNext;
      p.rank += 1;
      p.xpToNext = xpNeeded(p.rank);
    }
    s.partners[id] = p;
    const pending = pendingBonusRanks(p.rank, p.bonuses);
    if (p.rank > from || pending.length) {
      events.push({ partnerId: id, fromRank: from, toRank: p.rank, bonuses: [], pendingRanks: pending });
    }
  }
  return events;
}

export function chooseRankBonus(s: SaveData, partnerId: string, stat: RankStat): PartnerBonus | null {
  const p = s.partners[partnerId];
  if (!p) return null;
  const { all, gained } = applyRankChoice(p.bonuses, p.rank, stat);
  p.bonuses = all;
  s.partners[partnerId] = p;
  return gained;
}

function unlockPartnerRecord(s: SaveData, id: string) {
  if (s.unlockedPartners.includes(id)) return;
  s.unlockedPartners.push(id);
  s.partners[id] = { id, rank: 1, xp: 0, xpToNext: xpNeeded(1), bonuses: [] };
}

/** Unlock a partner and grant its たね + 進化 (not 月装). */
export function unlockPartner(s: SaveData, id: string) {
  unlockPartnerRecord(s, id);
  for (const c of partnerLineCards(id)) {
    s.cards[c.id] = Math.max(s.cards[c.id] ?? 0, 1);
  }
}

export function partnerRanks(s: SaveData): Record<string, number> {
  const o: Record<string, number> = {};
  for (const [id, p] of Object.entries(s.partners)) o[id] = p.rank;
  return o;
}

export function partnerGrowth(s: SaveData): Record<string, PartnerGrowth> {
  const o: Record<string, PartnerGrowth> = {};
  for (const [id, p] of Object.entries(s.partners)) o[id] = totalGrowth(p.rank, p.bonuses);
  return o;
}

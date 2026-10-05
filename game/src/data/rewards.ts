import { addCards, addGold, type SaveData } from '../state/save';
import { openPack, type PackId } from './shop';

/** Court badges: one per court master. Derived from cleared fights, so old saves get them too. */
export interface Badge {
  id: string;
  name: string;
  fightId: string;
  glyph: string;
  color: string;
}

export const BADGES: Badge[] = [
  { id: 'sprout', name: 'スプラウトバッジ', fightId: 'beg-luna', glyph: '芽', color: '#4ade80' },
  { id: 'ash', name: 'アッシュバッジ', fightId: 'flame-1', glyph: '炎', color: '#ff5a3c' },
  { id: 'bloom', name: 'ブルームバッジ', fightId: 'bloom-2', glyph: '花', color: '#f472b6' },
  { id: 'frost', name: 'フロストバッジ', fightId: 'ice-2', glyph: '氷', color: '#4ec6ff' },
  { id: 'gear', name: 'ギアバッジ', fightId: 'junk-2', glyph: '歯', color: '#fbbf24' },
  { id: 'shade', name: 'シェードバッジ', fightId: 'dark-1', glyph: '影', color: '#a78bfa' },
  { id: 'lamp', name: 'ランプバッジ', fightId: 'sky-1', glyph: '灯', color: '#fde047' },
  { id: 'slope', name: 'スロープバッジ', fightId: 'steep-1', glyph: '坂', color: '#fb923c' },
];

export function badgeForFight(fightId: string): Badge | undefined {
  return BADGES.find((b) => b.fightId === fightId);
}

export function ownedBadges(cleared: string[]): Badge[] {
  return BADGES.filter((b) => cleared.includes(b.fightId));
}

export function badgeRowHtml(cleared: string[], opts: { big?: boolean } = {}): string {
  return `<div class="badge-row${opts.big ? ' big' : ''}">${BADGES.map((b) => {
    const on = cleared.includes(b.fightId);
    return `<i class="badge${on ? ' on' : ''}" style="--bc:${b.color}" title="${b.name}">${on ? b.glyph : '?'}</i>`;
  }).join('')}</div>`;
}

/** Extra gold for consecutive wins. Small on purpose: a cheer, not an economy. */
export function streakBonus(streak: number): number {
  if (streak < 2) return 0;
  return Math.min(5, streak - 1) * 20;
}

export function recordResult(s: SaveData, win: boolean): { streak: number; bonus: number } {
  if (!win) {
    s.streak = 0;
    return { streak: 0, bonus: 0 };
  }
  s.streak = (s.streak ?? 0) + 1;
  s.bestStreak = Math.max(s.bestStreak ?? 0, s.streak);
  const bonus = streakBonus(s.streak);
  if (bonus) addGold(s, bonus);
  return { streak: s.streak, bonus };
}

/** 7-day login calendar. Day 7 is the big one. */
export interface LoginReward {
  day: number;
  label: string;
  gold?: number;
  pack?: PackId;
}

export const LOGIN_REWARDS: LoginReward[] = [
  { day: 1, label: '100G', gold: 100 },
  { day: 2, label: '150G', gold: 150 },
  { day: 3, label: 'たねパック', pack: 'seed' },
  { day: 4, label: '200G', gold: 200 },
  { day: 5, label: '250G', gold: 250 },
  { day: 6, label: 'シティパック', pack: 'city' },
  { day: 7, label: 'プレミアムパック', pack: 'premium' },
];

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const pa = Date.parse(`${a}T00:00:00`);
  const pb = Date.parse(`${b}T00:00:00`);
  return Math.round((pb - pa) / 86_400_000);
}

export interface LoginClaim {
  day: number;
  reward: LoginReward;
  cards: string[];
}

/** Claims today's login reward once per calendar day. Missing a day restarts the calendar. */
export function claimLogin(s: SaveData, now: Date, rng: () => number): LoginClaim | null {
  const today = dayKey(now);
  if (s.lastLogin === today) return null;
  const gap = s.lastLogin ? daysBetween(s.lastLogin, today) : 99;
  const prev = s.loginDay ?? 0;
  const day = gap === 1 ? (prev % LOGIN_REWARDS.length) + 1 : 1;
  const reward = LOGIN_REWARDS[day - 1]!;
  let cards: string[] = [];
  if (reward.gold) addGold(s, reward.gold);
  if (reward.pack) {
    cards = openPack(reward.pack, rng);
    addCards(s, cards);
  }
  s.lastLogin = today;
  s.loginDay = day;
  return { day, reward, cards };
}

export function loginCalendarHtml(day: number): string {
  return `<div class="login-cal">${LOGIN_REWARDS.map((r) => {
    const st = r.day < day ? 'got' : r.day === day ? 'today' : '';
    return `<div class="login-day ${st}${r.pack ? ' pack' : ''}"><small>${r.day}日目</small><b>${r.label}</b>${r.day < day ? '<i>済</i>' : ''}</div>`;
  }).join('')}</div>`;
}

import { getCard } from '../data/cards';
import type { AttackSlot, MatchState, MatchStats } from './types';

export interface Yaku {
  id: string;
  name: string;
  xp: number;
  when: 'win' | 'lose' | 'any';
}

export function emptyStats(optionInDeck: [number, number] = [0, 0]): MatchStats {
  return {
    redraws: [0, 0],
    attackSlots: [[], []],
    supportKinds: [[], []],
    evolved: [false, false],
    garbed: [false, false],
    evoOptionUsed: [false, false],
    partnerKos: [0, 0],
    perfectKilled: [false, false],
    specsSummoned: [[], []],
    partnersSummoned: [[], []],
    partnerTrioHand: [false, false],
    partnerPerfect: [false, false],
    fourKind: [false, false],
    hpFever: [false, false],
    dmgFever: [false, false],
    charges: [0, 0],
    trailed02: [false, false],
    led20: [false, false],
    finishingDeck: [false, false],
    finishingJust: [false, false],
    optionInDeck,
  };
}

/** HP / damage ぞろ目 (1110, 2220, 1111…). */
export function isFeverNumber(n: number): boolean {
  if (n < 110) return false;
  const s = String(n);
  return /^(\d)\1\1+0$/.test(s) || /^(\d)\1{2,}$/.test(s);
}

export function yakuXp(list: Yaku[]): number {
  return list.reduce((a, y) => a + y.xp, 0);
}

const LUCKY = /ルナ|ネコ|ニャン|月|ゼロ/;

function allSameSlot(slots: AttackSlot[], want: AttackSlot): boolean {
  return slots.length > 0 && slots.every((s) => s === want);
}

/**
 * Win-method 役. Mutually exclusive pairs.
 */
export function evaluateYaku(s: MatchState, seat: 0 | 1, playerName = ''): Yaku[] {
  const st = s.stats;
  const me = s.players[seat];
  const you = s.players[seat === 0 ? 1 : 0];
  const win = s.winner === seat;
  const lose = s.winner !== null && s.winner !== seat;
  const out: Yaku[] = [];
  const add = (id: string, name: string, xp: number, when: Yaku['when']) => {
    out.push({ id, name, xp, when });
  };

  const supports = st.supportKinds[seat];
  const allDeck = supports.length > 0 && supports.every((k) => k === 'deck');
  const allNone = supports.length > 0 && supports.every((k) => k === 'none');
  const shutout = win && you.kos === 0;
  const comeback = win && st.trailed02[seat];
  const deathMatch =
    win && me.kos >= 3 && you.kos >= 2 && me.deck.length === 0 && me.hand.length === 0 && you.deck.length === 0 && you.hand.length === 0;
  const zeroZero = win && me.deck.length === 0 && me.hand.length === 0;

  if (win) {
    if (st.redraws[seat] === 0) add('noredraw', 'とりかえなし勝利', 1, 'win');
    if (st.partnerKos[seat] > 0) add('partnerwin', 'パートナー勝利', 1, 'win');
    if (me.deck.length === 7) add('lucky7', 'ラッキー7', 1, 'win');
    if (allDeck) add('alldeck', 'オールいちかばちか勝利', 5, 'win');
    else if (st.finishingDeck[seat]) add('finishdeck', 'とどめのいちかばちか勝利', 2, 'win');
    if (you.deck.length === 0 && me.deck.length > 0) add('deckout', '山札破壊勝利', 2, 'win');
    if (deathMatch) add('death', '死闘勝利', 7, 'win');
    else if (zeroZero) add('zerozero', 'ゼロゼロ勝利', 2, 'win');
    if (allSameSlot(st.attackSlots[seat], 'circle')) add('allcircle', 'オール○攻撃勝利', 3, 'win');
    if (allSameSlot(st.attackSlots[seat], 'triangle')) add('alltriangle', 'オール△攻撃勝利', 3, 'win');
    if (allSameSlot(st.attackSlots[seat], 'cross')) add('allcross', 'オール×攻撃勝利', 3, 'win');
    if (!st.evolved[seat] && !st.garbed[seat]) add('noevo', 'オール進化なし勝利', 3, 'win');
    if (shutout) add('perfect', '無敗勝利', 3, 'win');
    if (comeback) add('comeback', '逆転勝利', 3, 'win');
    if (st.perfectKilled[seat]) add('perfectkill', 'レベル完キラー', 3, 'win');
    if (st.finishingJust[seat]) add('just', 'とどめのジャスト攻撃', 3, 'win');
    if (allNone) add('nosupport', 'オール援助なし勝利', 5, 'win');
    if (st.fourKind[seat]) add('four', '4カード', 5, 'win');
    if (st.optionInDeck[seat] >= 25) add('optmania', 'オプションマニア', 5, 'win');
    if (st.charges[seat] >= 8) add('powmania', 'ためマニア', 8, 'win');
  }

  if (lose) {
    if (me.kos === 0) add('sweep', '負け負け', 1, 'lose');
    if (st.led20[seat]) add('close', 'おしい負け', 2, 'lose');
    if (st.finishingDeck[seat === 0 ? 1 : 0]) add('decklose', 'いちかばちか負け', 2, 'lose');
  }

  if (LUCKY.test(playerName)) add('luckyname', 'ラッキーネーム', 1, 'any');
  if (new Set(st.specsSummoned[seat]).size >= 5) add('rainbow', 'レインボー', 2, 'any');
  if (st.partnerTrioHand[seat]) add('trio', 'パートナートリオ', 2, 'any');
  if (new Set(st.partnersSummoned[seat]).size >= 3) add('trioex', 'パートナートリオEX', 2, 'any');
  if (st.partnerPerfect[seat]) add('partnerevo', 'パートナー超進化', 2, 'any');
  if (st.hpFever[seat]) add('hpfever', 'HPフィーバー', 7, 'any');
  if (st.dmgFever[seat]) add('dmgfever', 'ダメージフィーバー', 10, 'any');
  if (out.length >= 7) add('super', 'スーパーボーナス', 10, 'any');

  return out;
}

export function countOptions(ids: string[]): number {
  let n = 0;
  for (const id of ids) {
    try {
      if (getCard(id).kind === 'option') n += 1;
    } catch {
      /* skip */
    }
  }
  return n;
}

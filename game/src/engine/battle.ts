import { beasts as allBeasts, getBeast, getCard, nextLevel, starterDeck } from '../data/cards';
import { optionGrantsFirstStrike } from '../data/optionPower';
import { copyCapOf } from '../data/rarity';
import { damageWithWeakness, isWeakTo, lineIdOf } from '../data/lines';
import { countOptions, emptyStats, isFeverNumber } from './yaku';
import { SeededRng } from './rng';
import type {
  Action,
  Attack,
  AttackSlot,
  BattleEvent,
  BeastCard,
  CardInstance,
  CombatAttackOutcome,
  CombatBeat,
  CombatSupport,
  FieldBeast,
  MatchFlags,
  MatchState,
  OptionCard,
  PlayerState,
  Specialty,
} from './types';
import { EFFECT_JA } from './types';

const HAND = 4;
const WIN_KOS = 3;

function normalizeDeck(raw: string[]): string[] {
  const counts: Record<string, number> = {};
  const ids: string[] = [];
  for (const id of raw) {
    try {
      getCard(id);
    } catch {
      continue;
    }
    counts[id] = (counts[id] ?? 0) + 1;
    if (counts[id]! <= 4) ids.push(id);
  }
  const pad = ['ennya', 'floppy', 'atkchip', 'needswing', 'fangpup'];
  let i = 0;
  while (ids.length < 30 && i < 80) {
    const id = pad[i % pad.length]!;
    counts[id] = counts[id] ?? 0;
    if (counts[id]! < 4) {
      ids.push(id);
      counts[id]! += 1;
    }
    i++;
  }
  return ids.slice(0, 30);
}

function uid(s: MatchState): string {
  s.nextInstance += 1;
  return `c${s.nextInstance}`;
}

function inst(s: MatchState, cardId: string): CardInstance {
  return { instanceId: uid(s), cardId };
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

function defOf(id: string) {
  return getCard(id);
}

function beastOf(id: string): BeastCard {
  return getBeast(id);
}

function partnerGrowthOf(s: MatchState, player: 0 | 1, line?: string): { hp: number; circle: number; triangle: number; cross: number } {
  if (!line) return { hp: 0, circle: 0, triangle: 0, cross: 0 };
  const growth = s.flags.partnerGrowthBySeat?.[player] ?? s.flags.partnerGrowth;
  return growth[line] ?? { hp: 0, circle: 0, triangle: 0, cross: 0 };
}

function toField(s: MatchState, cardId: string, abnormalRaw: boolean, player: 0 | 1 = 0): FieldBeast {
  const b = beastOf(cardId);
  let factor = 1;
  if (abnormalRaw && b.level === 'IV') factor = 0.5;
  if (abnormalRaw && b.level === 'APEX') factor = 0.25;
  const bonus = b.isPartner ? partnerGrowthOf(s, player, b.partnerLine) : { hp: 0, circle: 0, triangle: 0, cross: 0 };
  const scale = (a: Attack, extra: number): Attack => ({
    power: Math.max(1, Math.floor(a.power * factor) + extra),
    effect: a.effect,
  });
  return {
    instanceId: uid(s),
    cardId: b.id,
    name: b.name,
    specialty: b.specialty,
    level: b.level,
    hp: Math.max(1, Math.floor(b.hp * factor) + bonus.hp),
    maxHp: Math.max(1, Math.floor(b.hp * factor) + bonus.hp),
    circle: scale(b.circle, bonus.circle),
    triangle: scale(b.triangle, bonus.triangle),
    cross: scale(b.cross, bonus.cross),
    support: b.support,
    isPartner: !!b.isPartner,
    partnerLine: b.partnerLine,
    lineId: lineIdOf(b.id),
    garbed: b.level === 'MOON',
    abnormal: factor < 1,
    skillName: b.skillName,
  };
}

function drawTo(s: MatchState, p: PlayerState, n = HAND) {
  while (p.hand.length < n && p.deck.length > 0) {
    p.hand.push(p.deck.shift()!);
  }
}

function drawOne(s: MatchState, p: PlayerState) {
  if (p.deck.length > 0) p.hand.push(p.deck.shift()!);
}

function discardHand(p: PlayerState) {
  p.discard.push(...p.hand);
  p.hand = [];
}

function takeFromHand(p: PlayerState, instanceId: string): CardInstance | null {
  const i = p.hand.findIndex((c) => c.instanceId === instanceId);
  if (i < 0) return null;
  return p.hand.splice(i, 1)[0] ?? null;
}

function isSummonableBeast(id: string): boolean {
  const d = defOf(id);
  return d.kind === 'beast' && d.level !== 'MOON';
}

function isSeedBeast(id: string): boolean {
  const d = defOf(id);
  return d.kind === 'beast' && d.level === 'III';
}

/** Opening / redraw always includes a たね if the deck still has one. */
function ensureSeedInHand(p: PlayerState) {
  if (p.hand.some((c) => isSeedBeast(c.cardId))) return;
  const di = p.deck.findIndex((c) => isSeedBeast(c.cardId));
  if (di < 0 || !p.hand.length) return;
  let hi = p.hand.findIndex((c) => defOf(c.cardId).kind !== 'beast');
  if (hi < 0) hi = p.hand.findIndex((c) => !isSeedBeast(c.cardId));
  if (hi < 0) hi = p.hand.length - 1;
  const fromDeck = p.deck[di]!;
  const fromHand = p.hand[hi]!;
  p.hand[hi] = fromDeck;
  p.deck[di] = fromHand;
}

/** Reorder existing instances only: a scripted boss never creates extra cards. */
function arrangeOpening(p: PlayerState, ids: string[]) {
  const picked: CardInstance[] = [];
  for (const id of ids) {
    const at = p.deck.findIndex(c => c.cardId === id);
    if (at >= 0) picked.push(p.deck.splice(at, 1)[0]!);
  }
  p.deck.unshift(...picked);
}

function hasBeast(p: PlayerState): boolean {
  return p.hand.some((c) => isSummonableBeast(c.cardId));
}

/** Moon garb is only from the partner seed (III), never a wild or evolved body. */
export function canMoonGarb(field: FieldBeast | null | undefined): boolean {
  if (!field) return false;
  if (!field.isPartner || field.garbed) return false;
  if (field.level !== 'III') return false;
  return !!field.partnerLine;
}

function emit(s: MatchState, ev: BattleEvent) {
  s.events.push(ev);
  s.log.push(ev.text);
}

function bothLocked(s: MatchState): boolean {
  return s.players[0].locked && s.players[1].locked;
}

function unlock(s: MatchState) {
  s.players[0].locked = false;
  s.players[1].locked = false;
}

function setWaitingBoth(s: MatchState) {
  s.waitingOn = [0, 1];
}

function setWaitingActive(s: MatchState) {
  s.waitingOn = [s.active];
}

function opp(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0;
}

/** Seeded coin toss. Same seed always lands the same seat. */
export function tossFirst(seed: number): 0 | 1 {
  let x = (seed >>> 0) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) & 1) as 0 | 1;
}

export function createMatch(
  decks: [string[], string[]],
  names: [string, string],
  flags: Partial<MatchFlags> = {},
  seed = 1,
  first: 0 | 1 = 0,
): MatchState {
  const rng = new SeededRng(seed);
  const s: MatchState = {
    seed,
    phase: 'mulligan',
    active: first,
    firstPlayer: first,
    waitingOn: [0, 1],
    players: [emptyPlayer(0, names[0]), emptyPlayer(1, names[1])],
    flags: {
      noOptions: !!flags.noOptions,
      ownedShells: flags.ownedShells ?? [],
      forbidMoonGarb: flags.forbidMoonGarb ?? [false, false],
      partnerRanks: flags.partnerRanks ?? {},
      partnerGrowth: flags.partnerGrowth ?? {},
      partnerGrowthBySeat: flags.partnerGrowthBySeat,
      cheat: flags.cheat,
    },
    events: [],
    log: [],
    winner: null,
    turn: 1,
    nextInstance: 0,
    lastCombat: null,
    stats: emptyStats([countOptions(decks[0]), countOptions(decks[1])]),
  };
  for (const i of [0, 1] as const) {
    const ids = normalizeDeck(decks[i]);
    s.players[i].deck = rng.shuffle(ids).map((id) => inst(s, id));
    const cheat = s.flags.cheat;
    if (cheat && i === 1) arrangeOpening(s.players[i], cheat.forceHand?.slice(0, HAND) ?? []);
    if (cheat?.buryPartner && i === 0) {
      const pile = s.players[i].deck;
      const partner = (c: CardInstance) => {
        const d = getCard(c.cardId);
        return d.kind === 'beast' && !!d.isPartner;
      };
      s.players[i].deck = [...pile.filter(c => !partner(c)), ...pile.filter(partner)];
    }
    drawTo(s, s.players[i]);
    ensureSeedInHand(s.players[i]);
    if (cheat && i === 1) arrangeOpening(s.players[i], cheat.forceTop ?? []);
  }
  emit(s, {
    type: 'start',
    text: `${s.players[first].name} が先攻。デックをシャッフル。手札4枚。引き直す？`,
  });
  if (s.flags.cheat) emit(s, { type: 'bossRule', actor: 1, text: 'ゼロヒトの例外処理。公開手札と山の先頭を固定し、相棒を山底へ。○→○→×→△→○を繰り返す。' });
  return s;
}

export function firstStrikeFromField(s: MatchState): [boolean, boolean] {
  const flag = (i: 0 | 1): boolean => {
    const p = s.players[i];
    if (p.chosenAttack && p.field && p.field[p.chosenAttack].effect === 'firstStrike') return true;
    if (p.chosenSupport && typeof p.chosenSupport === 'object') {
      try {
        const c = getCard(p.chosenSupport.cardId);
        if (c.kind === 'option' && optionGrantsFirstStrike(c)) return true;
      } catch {
        return false;
      }
    }
    return false;
  };
  return [flag(0), flag(1)];
}

/**
 * Luneko rules hit order:
 * exclusive 先制 first, else exclusive カウンター goes second, else turn player (`active`).
 */
export function hitOrder(
  s: MatchState,
  first: [boolean, boolean] = firstStrikeFromField(s),
  counter: [boolean, boolean] = [false, false],
): [0 | 1, 0 | 1] {
  if (first[0] && !first[1]) return [0, 1];
  if (first[1] && !first[0]) return [1, 0];
  if (counter[0] && !counter[1]) return [1, 0];
  if (counter[1] && !counter[0]) return [0, 1];
  return [s.active, opp(s.active)];
}

function noteFeverHp(s: MatchState, i: 0 | 1) {
  const hp = s.players[i].field?.hp ?? 0;
  if (isFeverNumber(hp)) s.stats.hpFever[i] = true;
}

function noteHand(s: MatchState, i: 0 | 1) {
  const ids = s.players[i].hand.map((c) => c.cardId);
  if (ids.length === 4 && ids.every((id) => id === ids[0])) s.stats.fourKind[i] = true;
  const partners = new Set<string>();
  for (const id of ids) {
    try {
      const d = defOf(id);
      if (d.kind === 'beast' && d.isPartner && d.partnerLine) partners.add(d.partnerLine);
    } catch {
      /* skip */
    }
  }
  if (partners.size >= 3) s.stats.partnerTrioHand[i] = true;
}

function noteSummon(s: MatchState, i: 0 | 1) {
  const f = s.players[i].field;
  if (!f) return;
  if (!s.stats.specsSummoned[i].includes(f.specialty)) s.stats.specsSummoned[i].push(f.specialty);
  if (f.isPartner && f.partnerLine && !s.stats.partnersSummoned[i].includes(f.partnerLine)) {
    s.stats.partnersSummoned[i].push(f.partnerLine);
  }
  noteFeverHp(s, i);
  noteHand(s, i);
}

function noteAfterCombat(s: MatchState) {
  const lc = s.lastCombat;
  if (!lc) return;
  for (const i of [0, 1] as const) {
    if (isFeverNumber(lc.powers[i])) s.stats.dmgFever[i] = true;
    noteFeverHp(s, i);
    if (s.players[i].kos === 0 && s.players[opp(i)].kos >= 2) s.stats.trailed02[i] = true;
    if (s.players[i].kos >= 2 && s.players[opp(i)].kos === 0) s.stats.led20[i] = true;
  }
  for (const i of [0, 1] as const) {
    const o = opp(i);
    const victim = s.players[o].field;
    if (!victim || victim.hp > 0) continue;
    const killer = s.players[i].field;
    if (killer?.isPartner && (killer.level === 'III' || killer.level === 'MOON')) s.stats.partnerKos[i] += 1;
    if (victim.level === 'APEX') s.stats.perfectKilled[i] = true;
    if (s.players[i].kos >= 2) {
      if (lc.supports[i]?.fromDeck) s.stats.finishingDeck[i] = true;
      if (lc.damages[i] > 0 && lc.damages[i] === lc.hpBefore[o]) s.stats.finishingJust[i] = true;
    }
  }
}

function emptyPlayer(id: 0 | 1, name: string): PlayerState {
  return {
    id,
    name,
    deck: [],
    hand: [],
    discard: [],
    field: null,
    pow: 0,
    kos: 0,
    chosenAttack: null,
    chosenSupport: null,
    combatSupport: null,
    pendingSummon: false,
    locked: false,
    mulligansUsed: 0,
  };
}

export function legalActions(s: MatchState, player: 0 | 1): Action[] {
  if (s.phase === 'gameOver') return [];
  if (!s.waitingOn.includes(player)) return [];
  const p = s.players[player];
  const acts: Action[] = [];
  if (s.phase === 'mulligan') {
    acts.push({ type: 'mulligan', redraw: false });
    if (p.mulligansUsed < 3 && p.deck.length >= HAND) acts.push({ type: 'mulligan', redraw: true });
    return acts;
  }
  if (s.phase === 'turnDraw') {
    acts.push({ type: 'mulligan', redraw: false });
    return acts;
  }
  if (s.phase === 'summon' || s.phase === 'postKo') {
    for (const c of p.hand) {
      if (isSummonableBeast(c.cardId)) acts.push({ type: 'summon', instanceId: c.instanceId });
    }
    return acts;
  }
  if (s.phase === 'evo' && player === s.active) {
    acts.push({ type: 'skipEvo' });
    for (const c of p.hand) {
      const d = defOf(c.cardId);
      if (d.kind === 'beast') {
        acts.push({ type: 'charge', instanceId: c.instanceId });
        if (canEvolve(s, player, c.cardId, 'normal')) acts.push({ type: 'evolve', instanceId: c.instanceId });
      }
      if (d.kind === 'option' && d.optionType === 'evolution') {
        acts.push({ type: 'evoOption', instanceId: c.instanceId });
      }
    }
    if (canMoonGarb(p.field) && !s.flags.forbidMoonGarb[player]) {
      for (const id of moonGarbIdsFor(p.field!.partnerLine!, s.flags.ownedShells)) {
        acts.push({ type: 'moonGarb', cardId: id });
      }
    }
    return acts;
  }
  if (s.phase === 'attack') {
    if (p.locked) return [];
    acts.push({ type: 'chooseAttack', slot: 'circle' });
    acts.push({ type: 'chooseAttack', slot: 'triangle' });
    acts.push({ type: 'chooseAttack', slot: 'cross' });
    return acts;
  }
  if (s.phase === 'support') {
    if (p.locked) return [];
    acts.push({ type: 'playSupport', target: 'none' });
    if (p.deck.length > 0) acts.push({ type: 'playSupport', target: 'deck' });
    for (const c of p.hand) {
      const d = defOf(c.cardId);
      if (d.kind === 'beast') acts.push({ type: 'playSupport', target: c.instanceId });
      if (d.kind === 'option' && d.optionType === 'battle' && !s.flags.noOptions) {
        acts.push({ type: 'playSupport', target: c.instanceId });
      }
    }
    return acts;
  }
  if (s.phase === 'resolve') {
    if (p.locked) return [];
    acts.push({ type: 'ackResolve' });
    return acts;
  }
  return acts;
}

function moonGarbIdsFor(line: string, owned: string[]): string[] {
  return allBeasts()
    .filter((c) => c.garbOf && c.partnerLine === line && c.shellId && owned.includes(c.shellId))
    .map((c) => c.id);
}

/** Same specialty + one stage up. Armor stays a separate action. */
export function isLegalLineEvolve(
  fieldCardId: string,
  destId: string,
  pow: number,
  garbed: boolean,
  mode: 'normal' | 'free' | 'warp' | 'downloader' | 'shellBreak' = 'normal',
): boolean {
  let dest;
  try {
    dest = getCard(destId);
  } catch {
    return false;
  }
  if (dest.kind !== 'beast') return false;
  if (dest.level === 'MOON') return false;
  if (destId === fieldCardId) return false;
  if (garbed && mode !== 'shellBreak') return false;
  const fromId = garbed && mode === 'shellBreak' ? lineIdOf(fieldCardId) : fieldCardId;
  let from;
  try {
    from = getBeast(fromId);
  } catch {
    return false;
  }
  if (mode === 'downloader') return dest.specialty === from.specialty;
  const want = mode === 'warp' ? (from.level === 'III' ? 'APEX' : null) : nextLevel(from.level);
  if (!want || dest.level !== want) return false;
  if (mode !== 'free' && dest.specialty !== from.specialty) return false;
  if (mode === 'normal' && pow < dest.evoCost) return false;
  return true;
}

function canEvolve(
  s: MatchState,
  player: 0 | 1,
  cardId: string,
  mode: 'normal' | 'free' | 'warp' | 'downloader' | 'shellBreak',
): boolean {
  const p = s.players[player];
  const field = p.field;
  if (!field) return false;
  return isLegalLineEvolve(field.cardId, cardId, p.pow, field.garbed, mode);
}

export function submit(state: MatchState, player: 0 | 1, action: Action): MatchState {
  const s = clone(state);
  s.events = [];
  if (s.phase === 'gameOver') return s;
  if (action.type === 'surrender') {
    const me = s.players[player];
    const you = s.players[opp(player)];
    s.winner = opp(player);
    s.phase = 'gameOver';
    s.waitingOn = [];
    emit(s, { type: 'win', actor: s.winner, text: `${me.name} は降参した。${you.name} の勝ち！` });
    return s;
  }
  if (!s.waitingOn.includes(player)) return s;
  const p = s.players[player];

  switch (action.type) {
    case 'mulligan': {
      if (s.phase !== 'mulligan' && s.phase !== 'turnDraw') return s;
      if (action.redraw) {
        if (s.phase !== 'mulligan') return s;
        if (p.mulligansUsed >= 3 || p.deck.length < HAND) return s;
        p.discard.push(...p.hand);
        p.hand = [];
        drawTo(s, p);
        ensureSeedInHand(p);
        p.mulligansUsed += 1;
        s.stats.redraws[player] += 1;
        noteHand(s, player);
        emit(s, { type: 'mulligan', actor: player, text: `${p.name} は手札を引き直した。` });
        return s;
      }
      p.locked = true;
      p.mulligansUsed = 0;
      emit(s, { type: 'keep', actor: player, text: `${p.name} は手札をキープ。` });
      if (s.phase === 'mulligan') {
        if (bothLocked(s)) {
          unlock(s);
          s.phase = 'summon';
          setWaitingBoth(s);
          forceBeastOrLose(s);
          emit(s, { type: 'phase', text: '最初のルナビーストを場に出せ。' });
        }
      } else {
        s.waitingOn = s.waitingOn.filter((x) => x !== player);
        if (s.waitingOn.length === 0) beginEvo(s);
      }
      return s;
    }
    case 'summon': {
      if (s.phase !== 'summon' && s.phase !== 'postKo') return s;
      const peek = p.hand.find((c) => c.instanceId === action.instanceId);
      if (!peek || !isSummonableBeast(peek.cardId)) return s;
      const card = takeFromHand(p, action.instanceId);
      if (!card) return s;
      const d = beastOf(card.cardId);
      const abnormal = d.level === 'IV' || d.level === 'APEX';
      p.field = toField(s, d.id, abnormal, player);
      p.pow = 0;
      p.locked = true;
      p.pendingSummon = false;
      noteSummon(s, player);
      emit(s, {
        type: 'summon',
        actor: player,
        cardId: d.id,
        specialty: d.specialty,
        text: `${p.name} は ${d.name} を召喚！${p.field.abnormal ? '（異常状態）' : ''}`,
      });
      if (s.phase === 'summon') {
        if (bothLocked(s)) {
          unlock(s);
          beginTurnDraw(s);
        }
      } else {
        s.waitingOn = s.waitingOn.filter((x) => x !== player);
        if (s.waitingOn.length === 0) {
          if (s.players[0].field && s.players[1].field) {
            passTurn(s);
            beginTurnDraw(s);
          }
        }
      }
      return s;
    }
    case 'charge': {
      if (s.phase !== 'evo' || player !== s.active) return s;
      const card = takeFromHand(p, action.instanceId);
      if (!card || defOf(card.cardId).kind !== 'beast') return s;
      const b = beastOf(card.cardId);
      p.pow += b.dp;
      p.discard.push(card);
      s.stats.charges[player] += 1;
      noteHand(s, player);
      emit(s, { type: 'charge', actor: player, text: `${b.name} を進化ポイントに（+${b.dp} → ${p.pow}）` });
      return s;
    }
    case 'evolve': {
      if (s.phase !== 'evo' || player !== s.active) return s;
      const cid = getInstCard(p, action.instanceId);
      if (!cid || !canEvolve(s, player, cid, 'normal')) return s;
      const dest = beastOf(cid);
      const card = takeFromHand(p, action.instanceId);
      if (!card) return s;
      p.pow -= dest.evoCost;
      p.discard.push(card);
      p.field = toField(s, dest.id, false, player);
      s.stats.evolved[player] = true;
      if (dest.level === 'APEX' && dest.isPartner && !s.stats.evoOptionUsed[player]) {
        s.stats.partnerPerfect[player] = true;
      }
      noteFeverHp(s, player);
      emit(s, {
        type: 'evolve',
        actor: player,
        cardId: dest.id,
        specialty: dest.specialty,
        text: `進化！ ${dest.name} 登場！ HP${p.field.hp}`,
      });
      return s;
    }
    case 'moonGarb': {
      if (s.phase !== 'evo' || player !== s.active) return s;
      if (s.flags.forbidMoonGarb[player]) return s;
      if (!canMoonGarb(p.field)) return s;
      const dest = beastOf(action.cardId);
      const body = p.field!.partnerLine!;
      if (dest.level !== 'MOON' || !dest.isPartner) return s;
      if (dest.garbOf !== p.field!.cardId && dest.garbOf !== body && dest.partnerLine !== body) return s;
      if (!dest.shellId || !s.flags.ownedShells.includes(dest.shellId)) return s;
      p.field = toField(s, dest.id, false, player);
      s.stats.garbed[player] = true;
      noteFeverHp(s, player);
      emit(s, {
        type: 'armor',
        actor: player,
        cardId: dest.id,
        specialty: dest.specialty,
        text: `月装！ ${dest.name}！！`,
      });
      return s;
    }
    case 'evoOption': {
      if (s.phase !== 'evo' || player !== s.active) return s;
      const card = p.hand.find((c) => c.instanceId === action.instanceId);
      if (!card) return s;
      const d = defOf(card.cardId);
      if (d.kind !== 'option' || d.optionType !== 'evolution') return s;
      takeFromHand(p, action.instanceId);
      p.discard.push(card);
      s.stats.evoOptionUsed[player] = true;
      const fieldBefore = p.field;
      applyEvoOption(s, player, d);
      // Fuel and an unusable tool do not count as a completed evolution.
      if (p.field !== fieldBefore) s.stats.evolved[player] = true;
      return s;
    }
    case 'skipEvo': {
      if (s.phase !== 'evo' || player !== s.active) return s;
      s.phase = 'attack';
      s.players[0].chosenAttack = null;
      s.players[1].chosenAttack = null;
      s.players[0].locked = false;
      s.players[1].locked = false;
      setWaitingBoth(s);
      emit(s, { type: 'phase', text: '攻撃を選べ。○ 必殺 / △ 通常 / × 特殊' });
      return s;
    }
    case 'chooseAttack': {
      if (s.phase !== 'attack') return s;
      p.chosenAttack = action.slot;
      p.locked = true;
      emit(s, { type: 'lock', actor: player, text: `${p.name} は攻撃をロックした。` });
      if (bothLocked(s)) {
        unlock(s);
        s.phase = 'support';
        s.players[0].chosenSupport = null;
        s.players[1].chosenSupport = null;
        setWaitingBoth(s);
        emit(s, { type: 'phase', text: '援護カードを選べ。山札の上でも、パスでもいい。' });
      }
      return s;
    }
    case 'playSupport': {
      if (s.phase !== 'support') return s;
      if (action.target === 'none') {
        p.chosenSupport = 'none';
      } else if (action.target === 'deck') {
        if (p.deck.length === 0) return s;
        p.chosenSupport = 'deck';
      } else {
        const card = p.hand.find((c) => c.instanceId === action.target);
        if (!card) return s;
        p.chosenSupport = card;
      }
      p.locked = true;
      emit(s, { type: 'lock', actor: player, text: `${p.name} は援護をロックした。` });
      if (bothLocked(s)) {
        resolveCombat(s);
      }
      return s;
    }
    case 'ackResolve': {
      if (s.phase !== 'resolve') return s;
      p.locked = true;
      if (bothLocked(s)) afterResolve(s);
      return s;
    }
    default:
      return s;
  }
}

function getInstCard(p: PlayerState, instanceId: string): string | null {
  return p.hand.find((c) => c.instanceId === instanceId)?.cardId ?? null;
}

function beginTurnDraw(s: MatchState) {
  s.phase = 'turnDraw';
  const p = s.players[s.active];
  drawOne(s, p);
  noteHand(s, s.active);
  p.locked = false;
  setWaitingActive(s);
  emit(s, { type: 'turn', actor: s.active, text: `ターン${s.turn} — ${p.name} が先攻。山札から1枚。` });
}

function beginEvo(s: MatchState) {
  s.phase = 'evo';
  setWaitingActive(s);
  emit(s, { type: 'phase', actor: s.active, text: `${s.players[s.active].name} の進化フェイズ。` });
}

function forceBeastOrLose(s: MatchState) {
  for (const i of [0, 1] as const) {
    const p = s.players[i];
    let guard = 0;
    while (!hasBeast(p) && p.deck.length > 0 && guard++ < 40) {
      p.discard.push(...p.hand);
      p.hand = [];
      drawTo(s, p);
    }
    if (!hasBeast(p) && !p.field) {
      s.winner = opp(i);
      s.phase = 'gameOver';
      emit(s, { type: 'win', actor: s.winner, text: `${p.name} はビーストを出せない。${s.players[s.winner].name} の勝ち！` });
    }
  }
}

function applyEvoOption(s: MatchState, player: 0 | 1, d: OptionCard) {
  const p = s.players[player];
  const e = d.effect;
  emit(s, { type: 'option', actor: player, text: `${p.name} は ${d.name}！` });
  if (e.kind === 'addPow') {
    p.pow += e.amount;
    emit(s, { type: 'pow', actor: player, text: `進化P +${e.amount} → ${p.pow}` });
  }
  if (e.kind === 'downloader') {
    const target = p.hand.find((c) => canEvolve(s, player, c.cardId, 'downloader'));
    if (target) {
      const dest = beastOf(target.cardId);
      takeFromHand(p, target.instanceId);
      p.discard.push(target);
      p.field = toField(s, dest.id, false, player);
      emit(s, { type: 'evolve', actor: player, cardId: dest.id, text: `ふしぎな月飴！ ${dest.name} へ進化！` });
    }
  }
  if (e.kind === 'leapEvolve') {
    const target = p.hand.find((c) => canEvolve(s, player, c.cardId, 'warp'));
    if (target) {
      const dest = beastOf(target.cardId);
      takeFromHand(p, target.instanceId);
      p.discard.push(target);
      p.field = toField(s, dest.id, false, player);
      emit(s, { type: 'evolve', actor: player, cardId: dest.id, text: `月跳び！ ${dest.name}！` });
    }
  }
  if (e.kind === 'freeEvolve') {
    const target = p.hand.find((c) => canEvolve(s, player, c.cardId, 'free'));
    if (target) {
      const dest = beastOf(target.cardId);
      takeFromHand(p, target.instanceId);
      p.discard.push(target);
      p.field = toField(s, dest.id, false, player);
      emit(s, { type: 'evolve', actor: player, cardId: dest.id, text: `特殊進化！ 属性無視で ${dest.name}！` });
    }
  }
  if (e.kind === 'shellBreak' && p.field?.garbed) {
    p.field.garbed = false;
    emit(s, { type: 'shellBreak', actor: player, text: '殻割り！ ふつうの進化ができるようになった。' });
  }
}

interface CombatAttackSource {
  cardId: string;
  specialty: Specialty;
  skill: string;
}

interface CombatScratch {
  atk: [Attack, Attack];
  slot: [AttackSlot, AttackSlot];
  first: [boolean, boolean];
  jamSupport: [boolean, boolean];
  jamOption: [boolean, boolean];
  counter: [boolean, boolean];
  suicide: [boolean, boolean];
  drain: [boolean, boolean];
  zero: [Set<AttackSlot>, Set<AttackSlot>];
  dealt: [number, number];
  bonus: [number, number];
  base: [number, number];
  weak: [boolean, boolean];
  outcomes: [CombatAttackOutcome, CombatAttackOutcome];
}

function resolveCombat(s: MatchState) {
  const p0 = s.players[0];
  const p1 = s.players[1];
  if (!p0.field || !p1.field || !p0.chosenAttack || !p1.chosenAttack) return;

  for (const i of [0, 1] as const) {
    const slot = s.players[i].chosenAttack;
    if (slot) s.stats.attackSlots[i].push(slot);
    const sup = s.players[i].chosenSupport;
    const kind = !sup || sup === 'none' ? 'none' : sup === 'deck' ? 'deck' : 'hand';
    s.stats.supportKinds[i].push(kind);
  }

  const slot: [AttackSlot, AttackSlot] = [p0.chosenAttack, p1.chosenAttack];
  const sc: CombatScratch = {
    atk: [clone(p0.field[slot[0]]), clone(p1.field[slot[1]])],
    slot,
    first: [false, false],
    jamSupport: [false, false],
    jamOption: [false, false],
    counter: [false, false],
    suicide: [false, false],
    drain: [false, false],
    zero: [new Set(), new Set()],
    dealt: [0, 0],
    bonus: [0, 0],
    base: [0, 0],
    weak: [false, false],
    outcomes: ['interrupted', 'interrupted'],
  };
  sc.base = [sc.atk[0].power, sc.atk[1].power];

  for (const i of [0, 1] as const) {
    const fx = sc.atk[i].effect;
    if (fx === 'jam') sc.jamSupport[opp(i)] = true;
    if (fx === 'firstStrike') sc.first[i] = true;
    if (fx === 'counter') sc.counter[i] = true;
    if (fx === 'suicide') sc.suicide[i] = true;
    if (fx === 'drain') sc.drain[i] = true;
    if (fx === 'zeroCircle') sc.zero[i].add('circle');
    if (fx === 'zeroTriangle') sc.zero[i].add('triangle');
    if (fx === 'zeroCross') sc.zero[i].add('cross');
  }

  for (const i of [0, 1] as const) {
    s.players[i].combatSupport = null;
    flipCombatSupport(s, i);
  }

  const order: Array<0 | 1> = [s.active, opp(s.active)];
  for (const i of order) applySupport(s, i, sc, 'option');
  for (const i of order) applySupport(s, i, sc, 'beast');

  for (const i of [0, 1] as const) {
    for (const z of sc.zero[i]) {
      if (sc.slot[opp(i)] === z) {
        sc.atk[opp(i)].power = 0;
        emit(s, { type: 'zero', actor: i, slot: z, text: `${s.players[i].name} の効果で相手の${slotMark(z)}が0に！` });
      }
    }
  }

  for (const i of [0, 1] as const) {
    if (sc.suicide[i] && s.players[i].field) {
      const f = s.players[i].field!;
      sc.atk[i].power = Math.max(0, f.hp - 10);
      f.hp = 10;
      emit(s, { type: 'suicide', actor: i, amount: sc.atk[i].power, text: `${f.name} 自爆！ 威力${sc.atk[i].power}` });
    }
  }

  emit(s, {
    type: 'reveal',
    text: `${p0.name} の${slotMark(slot[0])} ${sc.atk[0].power}  vs  ${p1.name} の${slotMark(slot[1])} ${sc.atk[1].power}`,
  });

  const seq = hitOrder(s, sc.first, sc.counter);
  const attackSources: [CombatAttackSource, CombatAttackSource] = [
    { cardId: p0.field.cardId, specialty: p0.field.specialty, skill: skillCaption(p0.field, slot[0]) },
    { cardId: p1.field.cardId, specialty: p1.field.specialty, skill: skillCaption(p1.field, slot[1]) },
  ];
  const hpBefore: [number, number] = [p0.field.hp, p1.field.hp];

  for (const i of seq) {
    const o = opp(i);
    const attackingField = s.players[i].field;
    const targetField = s.players[o].field;
    const canAttack = !!attackingField && !!targetField && !(attackingField.hp <= 0);
    const outcome: CombatAttackOutcome = !canAttack ? 'interrupted' : sc.atk[i].power <= 0 ? 'zero' : 'hit';
    sc.outcomes[i] = outcome;
    if (canAttack && sc.counter[i] && !sc.first[i]) {
      emit(s, { type: 'counter', actor: i, text: `${s.players[i].field!.name} カウンター！ 後攻で攻撃。` });
    }
    const source = attackSources[i];
    const weak = canAttack && isWeakTo(targetField!.specialty, source.specialty);
    emit(s, {
      type: 'attack',
      actor: i,
      attacker: i,
      cardId: source.cardId,
      specialty: source.specialty,
      slot: sc.slot[i],
      skill: source.skill,
      outcome,
      amount: canAttack ? hitDamage(sc.atk[i].power, source.specialty, targetField!.specialty) : 0,
      text: outcome === 'interrupted'
        ? `${s.players[i].name} の${slotMark(sc.slot[i])} ${source.skill} は倒されたため中断。`
        : `${s.players[i].name} の${slotMark(sc.slot[i])} ${source.skill}！${outcome === 'zero' ? ' ダメージは0。' : weak ? ' 弱点！' : ''}`,
    });
    if (!canAttack) continue;
    applyDamage(s, o, sc.atk[i].power, sc.drain[i], i, sc);
  }

  const hpAfter: [number, number] = [
    Math.max(0, s.players[0].field?.hp ?? 0),
    Math.max(0, s.players[1].field?.hp ?? 0),
  ];

  s.lastCombat = {
    slots: slot,
    basePowers: [sc.base[0], sc.base[1]],
    bonuses: [sc.bonus[0], sc.bonus[1]],
    powers: [sc.atk[0].power, sc.atk[1].power],
    first: [sc.first[0], sc.first[1]],
    supports: [s.players[0].combatSupport, s.players[1].combatSupport],
    effectLabels: [effectLabelsFor(s, 0, sc), effectLabelsFor(s, 1, sc)],
    supportTexts: [
      s.players[0].combatSupport ? supportCaption(s.players[0].combatSupport.cardId) : '',
      s.players[1].combatSupport ? supportCaption(s.players[1].combatSupport.cardId) : '',
    ],
    skills: [attackSources[0].skill, attackSources[1].skill],
    hitFirst: seq[0]!,
    damages: [sc.dealt[0], sc.dealt[1]],
    weakHits: [sc.weak[0], sc.weak[1]],
    hpBefore,
    hpAfter,
    beats: buildCombatBeats(s, sc, seq, attackSources),
  };

  noteAfterCombat(s);

  s.phase = 'resolve';
  unlock(s);
  setWaitingBoth(s);
}

function slotMark(sl: AttackSlot): string {
  return sl === 'circle' ? '○' : sl === 'triangle' ? '△' : '×';
}

function supportCaption(id: string): string {
  const d = defOf(id);
  if (d.kind === 'option') return d.text;
  const e = d.support;
  switch (e.kind) {
    case 'atkAll':
      return `全攻撃 +${e.amount}`;
    case 'atkSlot':
      return `${slotMark(e.slot)} +${e.amount}`;
    case 'heal':
      return `HP +${e.amount}`;
    case 'setBothHp':
      return `互いのHPを ${e.amount} に`;
    case 'pow':
      return `進化P +${e.amount}`;
    case 'draw':
      return `${e.amount}枚ドロー`;
    case 'discardOpp':
      return `相手の手札を捨てる`;
    case 'jam':
      return '相手の援護を妨害';
    case 'shield':
      return `相手の${slotMark(e.slot)}を無効`;
    default:
      return '援護効果なし';
  }
}

function skillCaption(field: FieldBeast, slot: AttackSlot): string {
  const fx = field[slot].effect;
  if (fx !== 'none' && EFFECT_JA[fx]) return EFFECT_JA[fx];
  if (slot === 'circle') return field.skillName;
  if (slot === 'triangle') return '通常';
  return '特殊';
}

function buildCombatBeats(
  s: MatchState,
  sc: CombatScratch,
  seq: [0 | 1, 0 | 1],
  attackSources: [CombatAttackSource, CombatAttackSource],
): CombatBeat[] {
  const beats: CombatBeat[] = [];
  for (const i of [0, 1] as const) {
    const source = attackSources[i];
    beats.push({
      kind: 'cmd',
      actor: i,
      title: `${slotMark(sc.slot[i])} ${sc.atk[i].power}`,
      body: source.skill,
      cardId: source.cardId,
      specialty: source.specialty,
      skill: source.skill,
      slot: sc.slot[i],
      amount: sc.atk[i].power,
    });
  }
  for (const i of [0, 1] as const) {
    const sup = s.players[i].combatSupport;
    if (!sup) {
      beats.push({ kind: 'flip', actor: i, title: '援護なし' });
      continue;
    }
    const name = defOf(sup.cardId).name;
    beats.push({
      kind: 'flip',
      actor: i,
      title: sup.fromDeck ? 'いちかばちか' : '手札援護',
      body: name,
      cardId: sup.cardId,
      fromDeck: sup.fromDeck,
    });
    beats.push({
      kind: 'supportFx',
      actor: i,
      title: name,
      body: supportCaption(sup.cardId),
      cardId: sup.cardId,
      fromDeck: sup.fromDeck,
    });
  }
  for (const i of [0, 1] as const) {
    for (const lab of effectLabelsFor(s, i, sc)) {
      beats.push({ kind: 'special', actor: i, title: lab, ...attackSources[i], slot: sc.slot[i] });
    }
  }
  beats.push({
    kind: 'compare',
    title: `${s.players[0].name} ${slotMark(sc.slot[0])} ${sc.atk[0].power}  VS  ${s.players[1].name} ${slotMark(sc.slot[1])} ${sc.atk[1].power}`,
  });
  for (const i of seq) {
    const outcome = sc.outcomes[i];
    beats.push({
      kind: outcome === 'hit' ? 'hit' : 'attack',
      actor: i,
      title: outcome === 'interrupted' ? `${s.players[i].name} の攻撃は中断` : `${s.players[i].name} の攻撃`,
      body: outcome === 'interrupted' ? '先に倒されたため攻撃できない' : `${sc.dealt[i]} ダメージ`,
      amount: sc.dealt[i],
      slot: sc.slot[i],
      ...attackSources[i],
      outcome,
    });
  }
  for (const i of [0, 1] as const) {
    const f = s.players[i].field;
    if (f && f.hp <= 0) {
      beats.push({ kind: 'ko', actor: i, title: `${f.name} は倒れた！`, cardId: f.cardId });
    }
  }
  return beats;
}

function effectLabelsFor(s: MatchState, i: 0 | 1, sc: CombatScratch): string[] {
  const labels: string[] = [];
  const p = s.players[i];
  const slot = sc.slot[i];
  if (p.field) {
    const fx = p.field[slot].effect;
    if (fx !== 'none' && EFFECT_JA[fx]) labels.push(EFFECT_JA[fx]);
  }
  if (sc.first[i] && !labels.includes('先制')) labels.push('先制');
  if (sc.drain[i] && !labels.includes('すいとる')) labels.push('すいとる');
  if (sc.counter[i] && !labels.includes('カウンター')) labels.push('カウンター');
  if (sc.jamSupport[opp(i)] && !labels.includes('妨害')) labels.push('妨害');
  if (sc.weak[i] && !labels.includes('弱点')) labels.push('弱点');
  return labels;
}

/** Flip 山札の上 / hand support once per combat. */
export function flipCombatSupport(s: MatchState, i: 0 | 1): CombatSupport | null {
  const p = s.players[i];
  if (p.combatSupport) return p.combatSupport;
  const choice = p.chosenSupport;
  if (!choice || choice === 'none') return null;
  if (choice === 'deck') {
    const consumed = p.deck.shift() ?? null;
    if (!consumed) return null;
    p.discard.push(consumed);
    p.combatSupport = { cardId: consumed.cardId, fromDeck: true };
    emit(s, {
      type: 'deckSupport',
      actor: i,
      cardId: consumed.cardId,
      text: `${p.name} いちかばちか！ 山札の上は「${defOf(consumed.cardId).name}」！`,
    });
    return p.combatSupport;
  }
  const consumed = takeFromHand(p, choice.instanceId);
  if (!consumed) return null;
  p.discard.push(consumed);
  p.combatSupport = { cardId: consumed.cardId, fromDeck: false };
  return p.combatSupport;
}

export function resolveLockedCombat(s: MatchState) {
  resolveCombat(s);
}

/** Frozen resolve for cinema QA / `?cinema=1`. Both seats flip 山札の上. */
export function prepareResolveDemo(seed = 7): MatchState {
  const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['ルナ', 'ホーク'], {}, seed, 0);
  s.players[0].field = toField(s, 'moonember', false);
  s.players[1].field = toField(s, 'windfeather', false, 1);
  s.players[0].chosenAttack = 'circle';
  s.players[1].chosenAttack = 'cross';
  s.players[0].deck.unshift({ instanceId: 'demo-top0', cardId: 'atkchip' });
  s.players[1].deck.unshift({ instanceId: 'demo-top1', cardId: 'floppy' });
  s.players[0].chosenSupport = 'deck';
  s.players[1].chosenSupport = 'deck';
  resolveCombat(s);
  return s;
}

function applySupport(s: MatchState, i: 0 | 1, sc: CombatScratch, only: 'option' | 'beast') {
  const p = s.players[i];
  const revealed = p.combatSupport;
  if (!revealed) return;
  const d = defOf(revealed.cardId);

  if (d.kind === 'option') {
    if (only !== 'option') return;
    if (s.flags.noOptions) {
      emit(s, { type: 'fail', actor: i, text: 'このアリーナではオプション使用不可！' });
      return;
    }
    if (sc.jamOption[i]) {
      emit(s, { type: 'jam', actor: i, text: `${d.name} は霧に消えた。` });
      return;
    }
    emit(s, { type: 'option', actor: i, cardId: d.id, text: `${p.name} のオプション ${d.name}！` });
    applyOptionEffect(s, i, d, sc);
  } else {
    if (only !== 'beast') return;
    if (sc.jamSupport[i]) {
      emit(s, { type: 'jam', actor: i, text: `${d.name} の援護は妨害された！` });
      return;
    }
    emit(s, { type: 'support', actor: i, cardId: d.id, specialty: d.specialty, text: `${p.name} は ${d.name} で援護！` });
    applyBeastSupport(s, i, d, sc);
  }
}

function applyBeastSupport(s: MatchState, i: 0 | 1, d: BeastCard, sc: CombatScratch) {
  const f = s.players[i].field;
  const e = d.support;
  if (!f) return;
  switch (e.kind) {
    case 'atkAll':
      sc.atk[i].power += e.amount;
      sc.bonus[i] += e.amount;
      emit(s, { type: 'buff', actor: i, amount: e.amount, text: `攻撃力 +${e.amount} → ${sc.atk[i].power}` });
      break;
    case 'atkSlot':
      if (sc.slot[i] === e.slot) {
        sc.atk[i].power += e.amount;
        sc.bonus[i] += e.amount;
        emit(s, { type: 'buff', actor: i, amount: e.amount, text: `${slotMark(e.slot)} +${e.amount} → ${sc.atk[i].power}` });
      }
      break;
    case 'heal':
      f.hp = Math.min(f.maxHp, f.hp + e.amount);
      noteFeverHp(s, i);
      emit(s, { type: 'heal', actor: i, amount: e.amount, text: `${f.name} HP+${e.amount}` });
      break;
    case 'setBothHp':
      for (const j of [0, 1] as const) {
        if (s.players[j].field) s.players[j].field!.hp = Math.min(s.players[j].field!.maxHp, e.amount);
        noteFeverHp(s, j);
      }
      emit(s, { type: 'setHp', amount: e.amount, text: `互いのHPが ${e.amount} に！` });
      break;
    case 'pow':
      s.players[i].pow += e.amount;
      emit(s, { type: 'pow', actor: i, text: `進化P +${e.amount}` });
      break;
    case 'draw':
      drawTo(s, s.players[i], s.players[i].hand.length + e.amount);
      emit(s, { type: 'draw', actor: i, text: `${e.amount}枚ドロー` });
      break;
    case 'discardOpp':
      discardRandom(s, opp(i), e.amount);
      break;
    case 'jam':
      sc.jamSupport[opp(i)] = true;
      emit(s, { type: 'jam', actor: i, text: '相手の援護を妨害する！' });
      break;
    case 'shield':
      sc.zero[i].add(e.slot);
      emit(s, { type: 'shield', actor: i, text: `相手の${slotMark(e.slot)}を無効化` });
      break;
    default:
      break;
  }
}

function applyOptionEffect(s: MatchState, i: 0 | 1, d: OptionCard, sc: CombatScratch) {
  const f = s.players[i].field;
  const e = d.effect;
  if (!f) return;
  switch (e.kind) {
    case 'atkAll':
      sc.atk[i].power += e.amount;
      sc.bonus[i] += e.amount;
      emit(s, { type: 'buff', actor: i, amount: e.amount, text: `${d.name}！ 攻撃 +${e.amount} → ${sc.atk[i].power}` });
      if (e.discardOpp) discardRandom(s, opp(i), e.discardOpp);
      break;
    case 'atkSlot':
      if (sc.slot[i] === e.slot) {
        sc.atk[i].power += e.amount;
        sc.bonus[i] += e.amount;
        emit(s, { type: 'buff', actor: i, amount: e.amount, text: `${d.name}！ ${slotMark(e.slot)} +${e.amount} → ${sc.atk[i].power}` });
      }
      break;
    case 'heal':
      f.hp = Math.min(f.maxHp, f.hp + e.amount);
      noteFeverHp(s, i);
      emit(s, { type: 'heal', actor: i, amount: e.amount, text: `${d.name}！ HP+${e.amount}` });
      break;
    case 'fullHeal':
      f.hp = f.maxHp;
      if (e.firstStrike) sc.first[i] = true;
      noteFeverHp(s, i);
      emit(s, { type: 'heal', actor: i, text: `${d.name}！ HP全回復${e.firstStrike ? '＋先制' : ''}` });
      break;
    case 'zeroSlot':
      if (e.allSlots) {
        sc.zero[i].add('circle');
        sc.zero[i].add('triangle');
        sc.zero[i].add('cross');
      } else {
        sc.zero[i].add(e.slot);
      }
      emit(s, {
        type: 'zero',
        actor: i,
        slot: e.slot,
        text: `${d.name}！ 相手の${e.allSlots ? '○△×' : slotMark(e.slot)}を0に`,
      });
      break;
    case 'jamOptions':
      sc.jamOption[opp(i)] = true;
      if (e.zeroSlot) sc.zero[i].add(e.zeroSlot);
      if (e.firstStrike) sc.first[i] = true;
      emit(s, { type: 'jam', actor: i, text: `${d.name}！ 相手のどうぐを無効` });
      break;
    case 'firstStrike':
      sc.first[i] = true;
      if (e.atkAll) {
        sc.atk[i].power += e.atkAll;
        sc.bonus[i] += e.atkAll;
      }
      emit(s, { type: 'first', actor: i, text: `${d.name}！ 先制攻撃！` });
      break;
    case 'setBothHp':
      for (const j of [0, 1] as const) {
        if (s.players[j].field) s.players[j].field!.hp = e.amount;
        noteFeverHp(s, j);
      }
      emit(s, { type: 'setHp', amount: e.amount, text: `${d.name}！ 互いのHPが ${e.amount} に` });
      break;
    case 'hackPartnerBottom': {
      const o = s.players[opp(i)];
      const idx = o.hand.findIndex((c) => {
        const x = defOf(c.cardId);
        return x.kind === 'beast' && x.isPartner;
      });
      if (idx >= 0) {
        const [c] = o.hand.splice(idx, 1);
        if (c) o.deck.push(c);
        emit(s, { type: 'hack', text: 'ハッキング！ パートナーが山札の底へ。' });
      }
      break;
    }
    case 'draw':
      drawTo(s, s.players[i], s.players[i].hand.length + e.amount);
      break;
    case 'discardBothHands':
      discardHand(s.players[0]);
      discardHand(s.players[1]);
      if (e.redraw) drawTo(s, s.players[i], e.redraw);
      emit(s, { type: 'discard', text: '互いの手札が捨てられた！' });
      break;
    default:
      break;
  }
}

function discardRandom(s: MatchState, i: 0 | 1, n: number) {
  const p = s.players[i];
  const rng = new SeededRng(s.seed + s.turn * 17 + i);
  for (let k = 0; k < n && p.hand.length; k++) {
    const idx = rng.int(p.hand.length);
    const [c] = p.hand.splice(idx, 1);
    if (c) p.discard.push(c);
  }
  emit(s, { type: 'discard', actor: i, text: `${p.name} は手札を${n}枚捨てた。` });
}

/** Command power, then ×1.5 when the defender is weak to the attacker. */
export function hitDamage(base: number, attacker?: Specialty, defender?: Specialty): number {
  if (base <= 0) return 0;
  if (attacker && defender) return damageWithWeakness(base, attacker, defender);
  return base;
}

function applyDamage(
  s: MatchState,
  target: 0 | 1,
  amount: number,
  drain: boolean,
  attacker?: 0 | 1,
  sc?: CombatScratch,
) {
  const f = s.players[target].field;
  const atkF = attacker !== undefined ? s.players[attacker].field : null;
  const slot = attacker !== undefined ? s.players[attacker].chosenAttack ?? undefined : undefined;
  if (!f || amount <= 0) {
    if (amount <= 0) emit(s, {
      type: 'miss', actor: target, attacker, cardId: atkF?.cardId, specialty: atkF?.specialty,
      slot, skill: atkF && slot ? skillCaption(atkF, slot) : undefined, outcome: 'zero', amount: 0,
      text: `${s.players[target].name} へのダメージは0。`,
    });
    return;
  }
  const weak = !!(atkF && isWeakTo(f.specialty, atkF.specialty));
  const dealt = hitDamage(amount, atkF?.specialty, f.specialty);
  f.hp = Math.max(0, f.hp - dealt);
  if (sc && attacker !== undefined) {
    sc.dealt[attacker] += dealt;
    if (weak) sc.weak[attacker] = true;
  }
  emit(s, {
    type: 'damage',
    actor: target,
    attacker,
    cardId: atkF?.cardId,
    amount: dealt,
    specialty: (atkF?.specialty ?? f.specialty) as Specialty,
    slot: s.players[attacker ?? target].chosenAttack ?? undefined,
    text: weak ? `弱点！ ${f.name} に ${dealt} ダメージ！（残 ${f.hp}）` : `${f.name} に ${dealt} ダメージ！（残 ${f.hp}）`,
  });
  if (drain && atkF) {
    atkF.hp = Math.min(atkF.maxHp, atkF.hp + dealt);
    emit(s, { type: 'drain', actor: attacker, amount: dealt, text: `すいとる！ ${atkF.name} HP+${dealt}` });
  }
}

function afterResolve(s: MatchState) {
  const fallen: Array<0 | 1> = [];
  for (const i of [0, 1] as const) {
    const p = s.players[i];
    if (p.field && p.field.hp <= 0) {
      emit(s, { type: 'ko', actor: i, cardId: p.field.cardId, text: `${p.field.name} は倒れた！` });
      p.discard.push({ instanceId: p.field.instanceId, cardId: p.field.cardId });
      p.field = null;
      p.pow = 0;
      s.players[opp(i)].kos += 1;
      fallen.push(i);
    }
  }
  for (const i of [0, 1] as const) {
    if (s.players[i].kos >= WIN_KOS) {
      s.winner = i;
      s.phase = 'gameOver';
      emit(s, { type: 'win', actor: i, text: `${s.players[i].name} の勝ち！ ${WIN_KOS}体撃破。` });
      return;
    }
  }
  if (fallen.length) {
    s.phase = 'postKo';
    s.waitingOn = [];
    unlock(s);
    for (const i of fallen) {
      const p = s.players[i];
      drawTo(s, p);
      let guard = 0;
      while (!hasBeast(p) && p.deck.length > 0 && guard++ < 40) {
        p.discard.push(...p.hand);
        p.hand = [];
        drawTo(s, p);
      }
      if (!hasBeast(p)) {
        s.winner = opp(i);
        s.phase = 'gameOver';
        emit(s, { type: 'win', actor: s.winner, text: `${p.name} は次のビーストを出せない。` });
        return;
      }
      s.waitingOn.push(i);
    }
    emit(s, { type: 'phase', text: '倒された側は次のビーストを出せ。' });
    return;
  }
  passTurn(s);
  beginTurnDraw(s);
}

function passTurn(s: MatchState) {
  s.active = opp(s.active);
  s.turn += 1;
  s.players[0].chosenAttack = null;
  s.players[1].chosenAttack = null;
  s.players[0].chosenSupport = null;
  s.players[1].chosenSupport = null;
}

export function snapshotHands(s: MatchState) {
  return {
    open: true,
    p0: s.players[0].hand.map((c) => c.cardId),
    p1: s.players[1].hand.map((c) => c.cardId),
  };
}

export function isPartnerSeed(id: string): boolean {
  try {
    const c = getCard(id);
    return c.kind === 'beast' && !!c.isPartner && c.level === 'III';
  } catch {
    return false;
  }
}

export function partnerSeedCount(ids: string[]): number {
  return ids.filter((id) => isPartnerSeed(id)).length;
}

export function validateDeck(ids: string[]): string | null {
  if (ids.length !== 30) return 'デックは30枚';
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const c = getCard(id);
    counts[id] = (counts[id] ?? 0) + 1;
    const cap = copyCapOf(id);
    if (counts[id]! > cap) return cap < 4 ? `${c.name} は制限${cap}枚まで` : `${c.name} は4枚まで`;
    if (c.kind === 'beast' && c.level === 'MOON') return '月装はデックに入れない。パートナーから月装する';
  }
  if (partnerSeedCount(ids) > 1) return 'パートナーはデックに1体まで';
  return null;
}

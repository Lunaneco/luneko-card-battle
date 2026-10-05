export type Specialty = 'flame' | 'ice' | 'nature' | 'dark' | 'rare';
export type Level = 'III' | 'IV' | 'APEX' | 'MOON';
export type AttackSlot = 'circle' | 'triangle' | 'cross';
export type Phase =
  | 'mulligan'
  | 'summon'
  | 'turnDraw'
  | 'evo'
  | 'attack'
  | 'support'
  | 'resolve'
  | 'postKo'
  | 'gameOver';

export type AttackEffectKind =
  | 'none'
  | 'zeroCircle'
  | 'zeroTriangle'
  | 'zeroCross'
  | 'jam'
  | 'drain'
  | 'firstStrike'
  | 'suicide'
  | 'counter';

export interface Attack {
  power: number;
  effect: AttackEffectKind;
}

export type SupportEffect =
  | { kind: 'none' }
  | { kind: 'atkAll'; amount: number }
  | { kind: 'atkSlot'; slot: AttackSlot; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'setBothHp'; amount: number }
  | { kind: 'pow'; amount: number }
  | { kind: 'draw'; amount: number }
  | { kind: 'discardOpp'; amount: number }
  | { kind: 'jam' }
  | { kind: 'shield'; slot: AttackSlot };

export type OptionEffect =
  | { kind: 'atkAll'; amount: number; discardOpp?: number }
  | { kind: 'atkSlot'; slot: AttackSlot; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'fullHeal'; firstStrike?: boolean }
  | { kind: 'zeroSlot'; slot: AttackSlot; allSlots?: boolean }
  | { kind: 'jamOptions'; zeroSlot?: AttackSlot; firstStrike?: boolean }
  | { kind: 'firstStrike'; atkAll?: number }
  | { kind: 'addPow'; amount: number }
  | { kind: 'freeEvolve' }
  | { kind: 'leapEvolve' }
  | { kind: 'downloader' }
  | { kind: 'shellBreak' }
  | { kind: 'setBothHp'; amount: number }
  | { kind: 'hackPartnerBottom' }
  | { kind: 'draw'; amount: number }
  | { kind: 'discardBothHands'; redraw?: number };

export interface BeastCard {
  id: string;
  no: number;
  name: string;
  kind: 'beast';
  specialty: Specialty;
  level: Level;
  hp: number;
  circle: Attack;
  triangle: Attack;
  cross: Attack;
  dp: number;
  evoCost: number;
  support: SupportEffect;
  fusionValue: number;
  resultValue: number;
  isPartner?: boolean;
  partnerLine?: string;
  lineId?: string;
  evolvesTo?: string;
  garbOf?: string;
  shellId?: string;
  art?: string;
  skillName: string;
}

export interface OptionCard {
  id: string;
  no: number;
  name: string;
  kind: 'option';
  optionType: 'battle' | 'evolution';
  effect: OptionEffect;
  fusionValue: number;
  resultValue: number;
  art?: string;
  text: string;
}

export type CardDef = BeastCard | OptionCard;

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface FieldBeast {
  instanceId: string;
  cardId: string;
  name: string;
  specialty: Specialty;
  level: Level;
  hp: number;
  maxHp: number;
  circle: Attack;
  triangle: Attack;
  cross: Attack;
  support: SupportEffect;
  isPartner: boolean;
  partnerLine?: string;
  lineId?: string;
  garbed: boolean;
  abnormal: boolean;
  skillName: string;
}

export interface PlayerState {
  id: 0 | 1;
  name: string;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  field: FieldBeast | null;
  pow: number;
  kos: number;
  chosenAttack: AttackSlot | null;
  chosenSupport: CardInstance | 'deck' | 'none' | null;
  combatSupport: CombatSupport | null;
  pendingSummon: boolean;
  locked: boolean;
  mulligansUsed: number;
}

export interface CombatSupport {
  cardId: string;
  fromDeck: boolean;
}

export type CombatAttackOutcome = 'hit' | 'zero' | 'interrupted';
export type CombatBeatKind = 'cmd' | 'flip' | 'supportFx' | 'special' | 'compare' | 'hit' | 'attack' | 'ko';

/** Sequential field cinema, Luneko rules order. */
export interface CombatBeat {
  kind: CombatBeatKind;
  actor?: 0 | 1;
  title: string;
  body?: string;
  cardId?: string;
  fromDeck?: boolean;
  slot?: AttackSlot;
  amount?: number;
  /** Frozen attack identity, including zero damage and interrupted commands. */
  specialty?: Specialty;
  skill?: string;
  outcome?: CombatAttackOutcome;
}

export interface LastCombat {
  slots: [AttackSlot, AttackSlot];
  /** Printed command after 異常, before support. */
  basePowers: [number, number];
  /** Support / option attack adds. */
  bonuses: [number, number];
  /** Final command power. this is the damage. */
  powers: [number, number];
  first: [boolean, boolean];
  supports: [CombatSupport | null, CombatSupport | null];
  effectLabels: [string[], string[]];
  supportTexts: [string, string];
  skills: [string, string];
  hitFirst: 0 | 1;
  damages: [number, number];
  /** True when that seat hit a weak specialty (×1.5). */
  weakHits: [boolean, boolean];
  hpBefore: [number, number];
  hpAfter: [number, number];
  beats: CombatBeat[];
}

export interface MatchFlags {
  noOptions: boolean;
  ownedShells: string[];
  /** When true for a seat, that seat cannot 月装 (CPU). */
  forbidMoonGarb: [boolean, boolean];
  partnerRanks: Record<string, number>;
  partnerGrowth: Record<string, { hp: number; circle: number; triangle: number; cross: number }>;
  /** Story saves grow only the human's cards, even if the CPU owns the same line. */
  partnerGrowthBySeat?: [MatchFlags['partnerGrowth'], MatchFlags['partnerGrowth']];
  cheat?: {
    forceHand?: string[];
    forceTop?: string[];
    buryPartner?: boolean;
  };
}

export interface BattleEvent {
  type: string;
  text: string;
  actor?: 0 | 1;
  /** Damage actor is the target; attacker identifies the origin of its FX. */
  attacker?: 0 | 1;
  slot?: AttackSlot;
  specialty?: Specialty;
  amount?: number;
  cardId?: string;
  skill?: string;
  outcome?: CombatAttackOutcome;
}

export type SupportKind = 'none' | 'deck' | 'hand';

/** Per-seat combat bookkeeping for Luneko rules 役. */
export interface MatchStats {
  redraws: [number, number];
  attackSlots: [AttackSlot[], AttackSlot[]];
  supportKinds: [SupportKind[], SupportKind[]];
  evolved: [boolean, boolean];
  garbed: [boolean, boolean];
  evoOptionUsed: [boolean, boolean];
  partnerKos: [number, number];
  perfectKilled: [boolean, boolean];
  specsSummoned: [Specialty[], Specialty[]];
  partnersSummoned: [string[], string[]];
  partnerTrioHand: [boolean, boolean];
  partnerPerfect: [boolean, boolean];
  fourKind: [boolean, boolean];
  hpFever: [boolean, boolean];
  dmgFever: [boolean, boolean];
  charges: [number, number];
  trailed02: [boolean, boolean];
  led20: [boolean, boolean];
  finishingDeck: [boolean, boolean];
  finishingJust: [boolean, boolean];
  optionInDeck: [number, number];
}

export interface MatchState {
  seed: number;
  phase: Phase;
  active: 0 | 1;
  /** Seat that started the match as 先攻 (coin toss). Attack 先攻 each turn is `active`. */
  firstPlayer: 0 | 1;
  waitingOn: Array<0 | 1>;
  players: [PlayerState, PlayerState];
  flags: MatchFlags;
  events: BattleEvent[];
  log: string[];
  winner: 0 | 1 | null;
  turn: number;
  nextInstance: number;
  lastCombat: LastCombat | null;
  stats: MatchStats;
}

export type Action =
  | { type: 'mulligan'; redraw: boolean }
  | { type: 'summon'; instanceId: string }
  | { type: 'charge'; instanceId: string }
  | { type: 'evolve'; instanceId: string }
  | { type: 'moonGarb'; cardId: string }
  | { type: 'evoOption'; instanceId: string }
  | { type: 'skipEvo' }
  | { type: 'chooseAttack'; slot: AttackSlot }
  | { type: 'playSupport'; target: string | 'deck' | 'none' }
  | { type: 'ackResolve' }
  | { type: 'surrender' };

export const SPECIALTY_JA: Record<Specialty, string> = {
  flame: '火炎',
  ice: '氷水',
  nature: '自然',
  dark: '暗黒',
  rare: '珍種',
};

/** Visible chip: Japanese color name, never the English id. */
export function specialtyChipLabel(spec: Specialty): string {
  return `色 ${SPECIALTY_JA[spec]}`;
}

export const LEVEL_JA: Record<Level, string> = {
  III: 'たね',
  IV: '1進化',
  APEX: '2進化',
  MOON: '月装',
};

export const SLOT_JA: Record<AttackSlot, string> = {
  circle: '○',
  triangle: '△',
  cross: '×',
};

export const EFFECT_JA: Record<AttackEffectKind, string> = {
  none: '',
  zeroCircle: '○を0に',
  zeroTriangle: '△を0に',
  zeroCross: '×を0に',
  jam: '妨害',
  drain: 'すいとる',
  firstStrike: '先制',
  suicide: '自爆',
  counter: 'カウンター',
};

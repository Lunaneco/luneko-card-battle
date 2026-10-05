import { CARD_BY_ID } from '../data/cards';
import { lineIdOf, lineStages } from '../data/lines';
import { copyCapOf } from '../data/rarity';
import { isPartnerSeed } from './battle';
import type { CardDef, OptionCard, Specialty } from './types';

export const SUGGEST_SPECS: Specialty[] = ['flame', 'ice', 'nature', 'dark', 'rare'];

/** Target mix for a 30-card deck. Leftover slots refill weaker kinds. */
export const SUGGEST_QUOTA = { seed: 8, evo1: 8, evo2: 4, item: 10 } as const;

export type SuggestKind = keyof typeof SUGGEST_QUOTA;

export interface SuggestResult {
  deck: string[];
  spec: Specialty;
  mix: Record<SuggestKind, number>;
  colorBeasts: number;
  note: string;
}

interface Pile {
  id: string;
  c: CardDef;
  have: number;
  used: number;
}

export function kindOfCard(c: CardDef): SuggestKind | null {
  if (c.kind === 'option') return 'item';
  if (c.level === 'MOON') return null;
  if (c.level === 'III') return 'seed';
  if (c.level === 'IV') return 'evo1';
  if (c.level === 'APEX') return 'evo2';
  return null;
}

export function itemFamily(c: OptionCard): string {
  const k = c.effect.kind;
  if (k === 'heal' || k === 'fullHeal' || k === 'setBothHp') return 'heal';
  if (k === 'atkAll' || k === 'atkSlot') return 'atk';
  if (k === 'zeroSlot' || k === 'jamOptions') return 'jam';
  if (k === 'firstStrike') return 'first';
  if (k === 'addPow' || k === 'leapEvolve' || k === 'downloader' || k === 'freeEvolve' || k === 'shellBreak') {
    return 'evo';
  }
  if (k === 'draw' || k === 'discardBothHands') return 'hand';
  return 'other';
}

export function suggestDeck(
  owned: Record<string, number>,
  spec: Specialty,
  preferPartner?: string,
): SuggestResult {
  const piles = new Map<string, Pile>();
  for (const [id, n] of Object.entries(owned)) {
    if (n <= 0) continue;
    const c = CARD_BY_ID[id];
    if (!c || kindOfCard(c) === null) continue;
    piles.set(id, { id, c, have: n, used: 0 });
  }

  const deck: string[] = [];
  const mix: Record<SuggestKind, number> = { seed: 0, evo1: 0, evo2: 0, item: 0 };

  const avail = (p: Pile) => Math.max(0, Math.min(p.have, copyCapOf(p.id)) - p.used);
  const canPartner = (p: Pile) => !isPartnerSeed(p.id) || !deck.some((id) => isPartnerSeed(id));

  const take = (id: string, n: number) => {
    const p = piles.get(id);
    if (!p) return 0;
    const kind = kindOfCard(p.c);
    if (!kind) return 0;
    let got = 0;
    const max = Math.min(n, avail(p), 30 - deck.length);
    for (let i = 0; i < max; i++) {
      if (!canPartner(p)) break;
      deck.push(id);
      p.used += 1;
      mix[kind] += 1;
      got += 1;
    }
    return got;
  };

  const softCopy = (p: Pile) => {
    if (isPartnerSeed(p.id)) return 1;
    const kind = kindOfCard(p.c);
    if (kind === 'evo2') return Math.min(2, copyCapOf(p.id));
    return 2;
  };

  const beastScore = (c: CardDef) => {
    if (c.kind !== 'beast') return 0;
    let s = c.hp / 8 + c.circle.power + c.triangle.power * 0.55 + c.cross.power * 0.45;
    if (c.specialty === spec) s += 520;
    if (c.isPartner && c.level === 'III') s += 180;
    if (c.circle.effect !== 'none') s += 36;
    const line = lineIdOf(c.id);
    if (deck.some((id) => lineIdOf(id) === line)) s += 90;
    return s;
  };

  const itemScore = (c: OptionCard) => {
    const families = familyCounts();
    const fam = itemFamily(c);
    const fewest = Math.min(...['heal', 'atk', 'jam', 'first', 'evo', 'hand'].map(k => families[k] ?? 0));
    return c.resultValue * 3 + c.fusionValue + ((families[fam] ?? 0) === fewest ? 50 : 0);
  };

  const familyCounts = () => {
    const out: Record<string, number> = {};
    for (const id of deck) {
      const c = CARD_BY_ID[id];
      if (c?.kind === 'option') out[itemFamily(c)] = (out[itemFamily(c)] ?? 0) + 1;
    }
    return out;
  };

  const matchesSpec = (p: Pile) => p.c.kind === 'option' || (p.c.kind === 'beast' && p.c.specialty === spec);

  const candidates = (kind: SuggestKind, specOnly = false) =>
    [...piles.values()]
      .filter((p) => kindOfCard(p.c) === kind && avail(p) > 0 && canPartner(p) && (!specOnly || matchesSpec(p)))
      .sort((a, b) => {
        const sa = a.c.kind === 'option' ? itemScore(a.c) : beastScore(a.c);
        const sb = b.c.kind === 'option' ? itemScore(b.c) : beastScore(b.c);
        if (sb !== sa) return sb - sa;
        return a.id.localeCompare(b.id);
      });

  const pickKind = (kind: SuggestKind, want: number, specOnly = false) => {
    while (mix[kind] < want && deck.length < 30) {
      const list = candidates(kind, specOnly);
      if (!list.length) break;
      const p = list[0]!;
      const n = Math.min(softCopy(p), want - mix[kind], 30 - deck.length, avail(p));
      if (take(p.id, n) === 0) break;
    }
  };

  const supportLine = (id: string) => {
    const root = CARD_BY_ID[id];
    if (root?.kind === 'beast' && root.specialty !== spec) return;
    const stages = lineStages(id);
    for (const stage of [...stages].reverse()) {
      const p = piles.get(stage);
      if (!p || avail(p) <= 0) continue;
      const kind = kindOfCard(p.c);
      if (!kind || kind === 'item') continue;
      const room = SUGGEST_QUOTA[kind] - mix[kind];
      take(stage, Math.max(0, Math.min(room, kind === 'seed' && isPartnerSeed(stage) ? 1 : 2)));
    }
  };

  const partners = [...piles.values()].filter((p) => isPartnerSeed(p.id) && avail(p) > 0);
  const preferred =
    partners.find((p) => p.id === preferPartner && p.c.kind === 'beast' && p.c.specialty === spec) ??
    partners.find((p) => p.c.kind === 'beast' && p.c.specialty === spec) ??
    partners.find((p) => p.id === preferPartner) ??
    partners[0];
  if (preferred) take(preferred.id, 1);

  pickKind('evo2', SUGGEST_QUOTA.evo2, true);
  for (const id of [...new Set(deck)]) {
    const c = CARD_BY_ID[id];
    if (c?.kind === 'beast' && c.level === 'APEX') supportLine(id);
  }
  pickKind('evo1', SUGGEST_QUOTA.evo1, true);
  for (const id of [...new Set(deck)]) {
    const c = CARD_BY_ID[id];
    if (c?.kind === 'beast' && c.level === 'IV') supportLine(id);
  }
  pickKind('seed', SUGGEST_QUOTA.seed, true);
  // Heavy evolutions need fuel even when the collection owns every expensive
  // combat exclusive. Reserve two item slots before ranking general supports.
  for (let i = 0; i < 2 && deck.length < 30; i++) {
    const tool = candidates('item').find(p => p.c.kind === 'option' &&
      ['addPow', 'freeEvolve', 'leapEvolve'].includes(p.c.effect.kind));
    if (!tool) break;
    take(tool.id, 1);
  }
  pickKind('item', SUGGEST_QUOTA.item);

  const leftoverOrder: SuggestKind[] = ['seed', 'evo1', 'item', 'evo2'];
  let guard = 0;
  while (deck.length < 30 && guard++ < 80) {
    let added = false;
    for (const specOnly of [true, false]) {
      for (const kind of leftoverOrder) {
        if (deck.length >= 30) break;
        const before = deck.length;
        pickKind(kind, mix[kind] + 2, specOnly);
        if (deck.length > before) added = true;
      }
    }
    if (!added) break;
  }

  const colorBeasts = deck.filter((id) => {
    const c = CARD_BY_ID[id];
    return c?.kind === 'beast' && c.specialty === spec;
  }).length;
  const name = specJa(spec);
  const note =
    deck.length < 30
      ? `${name}のおすすめは所持が足りず${deck.length}枚`
      : colorBeasts >= 8
        ? `${name}のおすすめを入れた`
        : `${name}中心で所持からバランス編成`;

  return { deck, spec, mix, colorBeasts, note };
}

function specJa(spec: Specialty): string {
  return { flame: '火炎', ice: '氷水', nature: '自然', dark: '暗黒', rare: '珍種' }[spec];
}

import { getCard } from '../data/cards';
import { isLegalLineEvolve, legalActions, resolveLockedCombat, submit } from './battle';
import type { Action, AttackSlot, MatchState, PlayerState } from './types';

export type AiLevel = 'tutorial' | 'normal' | 'rival' | 'boss' | 'scripted';

export function pickAi(s: MatchState, player: 0 | 1, level: AiLevel, script?: AttackSlot[]): Action | null {
  const acts = legalActions(s, player);
  if (!acts.length) return null;

  if (s.phase === 'turnDraw') {
    return { type: 'mulligan', redraw: false };
  }
  if (s.phase === 'mulligan') {
    const p = s.players[player];
    const beasts = p.hand.filter((c) => getCard(c.cardId).kind === 'beast').length;
    if (beasts === 0 && acts.some((a) => a.type === 'mulligan' && a.redraw)) {
      return { type: 'mulligan', redraw: true };
    }
    return { type: 'mulligan', redraw: false };
  }

  if (s.phase === 'summon' || s.phase === 'postKo') {
    const summons = acts.filter((a): a is Extract<Action, { type: 'summon' }> => a.type === 'summon');
    const scored = summons.map((a) => {
      const card = s.players[player].hand.find((c) => c.instanceId === a.instanceId)!;
      const d = getCard(card.cardId);
      let score = 0;
      if (d.kind === 'beast') {
        if (d.level === 'III') score += 100;
        if (d.isPartner) score += 40;
        if (d.level === 'IV') score += 20;
        if (d.level === 'APEX') score += 5;
        score += d.hp / 20;
      }
      return { a, score };
    });
    scored.sort((x, y) => y.score - x.score);
    return scored[0]?.a ?? acts[0]!;
  }

  if (s.phase === 'evo') {
    const me = s.players[player].field;
    const evo = acts.find((a) => a.type === 'evolve');
    if (evo) return evo;

    // Keep one reachable evolution. Keeping every same-color IV used to make
    // dark decks refuse all charge actions when their hand was full of IVs.
    const reserved = s.players[player].hand.filter(c => me &&
      isLegalLineEvolve(me.cardId, c.cardId, 9999, me.garbed, 'normal'))
      .sort((a, b) => {
        const x = getCard(a.cardId), y = getCard(b.cardId);
        return x.kind === 'beast' && y.kind === 'beast' ? x.evoCost - y.evoCost : 0;
      })[0]?.instanceId;
    const isEvoPiece = (instanceId: string): boolean => instanceId === reserved;

    const p = s.players[player];
    const opt = acts.filter((a): a is Extract<Action, { type: 'evoOption' }> => a.type === 'evoOption')
      .map(a => {
        const d = getCard(p.hand.find(c => c.instanceId === a.instanceId)!.cardId);
        if (!me || d.kind !== 'option') return { a, score: 0 };
        const e = d.effect;
        if (e.kind === 'addPow' && me.level !== 'MOON' && me.level !== 'APEX') {
          const next = reserved ? getCard(p.hand.find(c => c.instanceId === reserved)!.cardId) : null;
          const need = (next?.kind === 'beast' ? next.evoCost : 30) - p.pow;
          return { a, score: need > 0 ? Math.min(e.amount, need) : 0 };
        }
        const mode = e.kind === 'leapEvolve' ? 'warp' : e.kind === 'freeEvolve' ? 'free' : e.kind === 'downloader' ? 'downloader' : null;
        if (!mode) return { a, score: 0 };
        // Match the engine's first legal target. Do not spend a tool that has no
        // target, or a downloader whose first target would downgrade the field.
        const target = p.hand.find(c => isLegalLineEvolve(me.cardId, c.cardId, p.pow, me.garbed, mode));
        const card = target ? getCard(target.cardId) : null;
        const stage = { III: 0, IV: 1, APEX: 2, MOON: 1 };
        return { a, score: card?.kind === 'beast' && stage[card.level] > stage[me.level] ? 100 + stage[card.level] * 50 : 0 };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0];
    if (opt) return opt.a;

    const charges = acts.filter((a): a is Extract<Action, { type: 'charge' }> => a.type === 'charge' && !isEvoPiece(a.instanceId));
    if (charges.length && me && me.level !== 'APEX' && me.level !== 'MOON') {
      const best = charges
        .map((a) => {
          const card = s.players[player].hand.find((c) => c.instanceId === a.instanceId)!;
          const d = getCard(card.cardId);
          if (d.kind !== 'beast') return { a, score: -1 };
          let score = d.dp;
          if (d.level === 'APEX') score -= 100;
          if (d.level === 'IV') score -= 8;
          return { a, score };
        })
        .sort((x, y) => y.score - x.score)[0];
      if (best && best.score > 0) return best.a;
    }
    return { type: 'skipEvo' };
  }

  if (s.phase === 'attack') {
    if (level === 'scripted' && script && script.length) {
      const slot = script[(s.turn - 1) % script.length]!;
      return { type: 'chooseAttack', slot };
    }
    return pickAttack(s, player, level);
  }

  if (s.phase === 'support') {
    return pickSupport(s, player, level);
  }

  if (s.phase === 'resolve') return { type: 'ackResolve' };
  return acts.find((a) => a.type !== 'surrender') ?? null;
}

/**
 * One CPU step for the live battle loop.
 * On resolve, CPU waits until the human has tapped 次へ, then acks.
 * After leaving resolve, the caller must invoke again so the CPU's turn starts.
 */
export function advanceCpu(
  s: MatchState,
  human: 0 | 1,
  cpu: 0 | 1,
  level: AiLevel,
  script?: AttackSlot[],
): MatchState | null {
  if (s.phase === 'gameOver') return null;
  if (s.phase === 'resolve') {
    if (s.players[human].locked && s.waitingOn.includes(cpu)) {
      return submit(s, cpu, { type: 'ackResolve' });
    }
    return null;
  }
  if (!s.waitingOn.includes(cpu)) return null;
  const act = pickAi(s, cpu, level, script);
  if (!act) return null;
  return submit(s, cpu, act);
}

const SLOTS: AttackSlot[] = ['circle', 'triangle', 'cross'];

/** Only public board / hand information enters the forecast. Never read a locked
 * opponent command, support selection, or the order of either hidden deck. */
function forecast(s: MatchState, player: 0 | 1, slot: AttackSlot, target = 'none'): number {
  const other = player === 0 ? 1 : 0;
  const me = s.players[player].field!;
  const you = s.players[other].field!;
  const values = SLOTS.map(theirSlot => {
    const previewPlayer = (id: 0 | 1): PlayerState => ({
      ...s.players[id], deck: [], discard: [],
      chosenAttack: id === player ? slot : theirSlot,
      chosenSupport: 'none', combatSupport: null,
    });
    const probe: MatchState = structuredClone({
      ...s, events: [], log: [], lastCombat: null,
      players: [previewPlayer(0), previewPlayer(1)],
    });
    const handCard = probe.players[player].hand.find(c => c.instanceId === target);
    if (handCard) probe.players[player].chosenSupport = handCard;
    resolveLockedCombat(probe);
    const myHp = probe.players[player].field?.hp ?? 0;
    const theirHp = probe.players[other].field?.hp ?? 0;
    // A KO matters more than surplus damage; healing only counts up to max HP.
    return (you.hp - theirHp) - (me.hp - myHp) * 0.9
      + (theirHp <= 0 ? 900 : 0) - (myHp <= 0 ? 1000 : 0);
  });
  return values[0]! * 0.5 + values[1]! * 0.3 + values[2]! * 0.2;
}

function pickAttack(s: MatchState, player: 0 | 1, level: AiLevel): Action {
  const me = s.players[player].field!;
  const you = s.players[player === 0 ? 1 : 0].field!;
  if (level === 'tutorial') {
    return { type: 'chooseAttack', slot: me.circle.power >= you.hp ? 'circle' : 'triangle' };
  }
  // Resolve the actual rules, including weakness, zeroing, drain and attack order.
  // カウンター only goes second in this game; it does not reflect or block damage.
  const ranked = SLOTS.map(slot => ({ slot, score: forecast(s, player, slot) }))
    .sort((a, b) => b.score - a.score);
  const last = s.lastCombat;
  // Equal drain attacks can restore every point of damage indefinitely. Learn
  // from the last public result instead of repeating that stalemate forever.
  const drainStall = last && last.damages.every(d => d > 0) &&
    last.hpBefore.every((hp, i) => hp === last.hpAfter[i]) &&
    s.players.every((p, i) => p.field?.hp === last.hpAfter[i] &&
      p.field[last.slots[i]!].effect === 'drain');
  const best = drainStall
    ? ranked.find(({ slot }) => me[slot].effect !== 'drain') ?? ranked[0]!
    : ranked[0]!;
  return { type: 'chooseAttack', slot: best.slot };
}

function pickSupport(s: MatchState, player: 0 | 1, level: AiLevel): Action {
  if (level === 'tutorial') return { type: 'playSupport', target: 'none' };
  const p = s.players[player];
  const other = s.players[player === 0 ? 1 : 0];
  const me = p.field!;
  const slot = p.chosenAttack!;
  const baseline = forecast(s, player, slot);
  const enemyBeasts = other.hand.filter(c => getCard(c.cardId).kind === 'beast').length;
  const enemyOptions = other.hand.filter(c => {
    const d = getCard(c.cardId);
    return d.kind === 'option' && d.optionType === 'battle';
  }).length;
  const acts = legalActions(s, player).filter(
    (a): a is Extract<Action, { type: 'playSupport' }> => a.type === 'playSupport',
  );
  const scored = acts.map(a => {
    if (a.target === 'none') return { a, score: 0 };
    // Blind support is a limited gamble, never a peek at the next card.
    if (a.target === 'deck') return { a, score: p.deck.length > 8 && me.hp < me.maxHp / 2 ? 5 : -1 };
    const d = getCard(p.hand.find(c => c.instanceId === a.target)!.cardId);
    const effect = d.kind === 'beast' ? d.support : d.effect;
    let score = forecast(s, player, slot, a.target) - baseline;
    // Value future resources that a board-only forecast cannot see.
    if (effect.kind === 'pow' && me.level !== 'APEX' && me.level !== 'MOON' && p.pow < 60) score += effect.amount * 2;
    if (effect.kind === 'draw') score += Math.min(effect.amount, p.deck.length) * 35;
    if (effect.kind === 'discardOpp') score += Math.min(effect.amount, other.hand.length) * 35;
    if (effect.kind === 'discardBothHands') {
      score += (other.hand.length - (p.hand.length - 1) + Math.min(effect.redraw ?? 0, p.deck.length)) * 35;
    }
    if (effect.kind === 'hackPartnerBottom' && other.hand.some(c => {
      const card = getCard(c.cardId);
      return card.kind === 'beast' && card.isPartner;
    })) score += 65;
    if (effect.kind === 'jam') score += Math.min(enemyBeasts, 2) * 25;
    if (effect.kind === 'jamOptions' && !s.flags.noOptions) score += Math.min(enemyOptions, 2) * 30;
    if (effect.kind === 'atkAll' && 'discardOpp' in effect && typeof effect.discardOpp === 'number') score += Math.min(effect.discardOpp, other.hand.length) * 35;
    // Preserve the next evolution and the last replacement seed unless a combat
    // gain is worth spending it. Merely being a seed is not a useful support effect.
    score -= 20;
    if (d.kind === 'beast') {
      if (isLegalLineEvolve(me.cardId, d.id, 9999, me.garbed, 'normal')) score -= 110;
      if (d.level === 'III' && p.hand.filter(c => {
        const card = getCard(c.cardId);
        return card.kind === 'beast' && card.level === 'III';
      }).length === 1) score -= 45;
    }
    return { a, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.a ?? { type: 'playSupport', target: 'none' };
}

export function runAiUntilWait(s: MatchState, player: 0 | 1, level: AiLevel, script?: AttackSlot[]): MatchState {
  let cur = s;
  let guard = 0;
  while (cur.waitingOn.includes(player) && cur.phase !== 'gameOver' && guard++ < 20) {
    const act = pickAi(cur, player, level, script);
    if (!act) break;
    cur = submit(cur, player, act);
  }
  return cur;
}

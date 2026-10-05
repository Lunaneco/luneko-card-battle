/**
 * Engine-to-asset coverage for every real beast and ○ / △ / × on both seats.
 * Run: node --import tsx scripts/check-all-attack-routes.ts
 *
 * The fixture chooses opening hands, then uses legal submit actions for summons,
 * charges, evolution, moon garb, commands and support. It never substitutes a
 * beast's attacks. HP alone is enlarged to keep the selected attack executable;
 * suicide-zero and preemptive-KO cases intentionally use low HP instead.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATTACK_MOTIONS } from '../src/data/attackMotions';
import { beasts, getBeast, starterDeck } from '../src/data/cards';
import { createMatch, legalActions, submit } from '../src/engine/battle';
import type {
  Action, AttackSlot, BeastCard, CombatAttackOutcome, CombatBeat, FieldBeast, MatchState,
} from '../src/engine/types';
import { attackMotionFor } from '../src/fx/characterAttack';

type Seat = 0 | 1;
type Construction = 'native' | 'abnormal';
type Scenario = 'hit' | 'zero' | 'abnormal' | 'interrupted';
const SLOTS: AttackSlot[] = ['circle', 'triangle', 'cross'];
const SEATS: Seat[] = [0, 1];
const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = resolve(gameDir, '../studio/pdca/all-attack-routes.json');
const allBeasts = beasts();
const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;

function fixtureCard(s: MatchState, cardId: string) {
  return { instanceId: `route-fixture-${++s.nextInstance}`, cardId };
}

function act(s: MatchState, seat: Seat, action: Action): MatchState {
  assert.ok(
    legalActions(s, seat).some(a => JSON.stringify(a) === JSON.stringify(action)),
    `${s.phase}: illegal fixture action for seat ${seat}: ${JSON.stringify(action)}`,
  );
  return submit(s, seat, action);
}

function seedFor(card: BeastCard): BeastCard {
  if (card.level === 'III') return card;
  if (card.level === 'MOON') {
    const seed = getBeast(card.garbOf ?? card.partnerLine ?? '');
    assert.equal(seed.level, 'III', `${card.id}: moon-garb seed`);
    return seed;
  }
  const seed = allBeasts.find(b => b.level === 'III' && b.specialty === card.specialty);
  assert.ok(seed, `${card.id}: no native evolution seed`);
  return seed;
}

/** This is the game's toField path, exercised via submit rather than duplicated. */
function prepare(card: BeastCard, seat: Seat, opponentId: string, construction: Construction): MatchState {
  const opening = construction === 'abnormal' ? card : seedFor(card);
  let s = createMatch(
    [starterDeck('moonember'), starterDeck('windfeather')],
    ['route human', 'route CPU'],
    { ownedShells: card.shellId ? [card.shellId] : [] },
    105,
    seat,
  );
  s.players[seat].hand = [fixtureCard(s, opening.id)];
  s.players[other(seat)].hand = [fixtureCard(s, opponentId)];
  for (const i of SEATS) s = act(s, i, { type: 'mulligan', redraw: false });
  for (const i of SEATS) {
    const cardInHand = s.players[i].hand[0]!;
    s = act(s, i, { type: 'summon', instanceId: cardInHand.instanceId });
  }
  assert.equal(s.phase, 'turnDraw');
  s = act(s, seat, { type: 'mulligan', redraw: false });
  assert.equal(s.phase, 'evo');

  if (construction === 'native' && (card.level === 'IV' || card.level === 'APEX')) {
    const steps: BeastCard[] = card.level === 'IV' ? [card] : [
      allBeasts.find(b => b.level === 'IV' && b.specialty === card.specialty)!, card,
    ];
    assert.ok(steps.every(Boolean), `${card.id}: native evolution ladder`);
    const cost = steps.reduce((sum, b) => sum + b.evoCost, 0);
    assert.ok(opening.dp > 0, `${opening.id}: charge fuel`);
    while (s.players[seat].pow < cost) {
      const fuel = fixtureCard(s, opening.id);
      s.players[seat].hand.push(fuel);
      s = act(s, seat, { type: 'charge', instanceId: fuel.instanceId });
    }
    for (const dest of steps) {
      const destination = fixtureCard(s, dest.id);
      s.players[seat].hand.push(destination);
      s = act(s, seat, { type: 'evolve', instanceId: destination.instanceId });
      assert.equal(s.players[seat].field?.cardId, dest.id);
    }
    assert.equal(s.stats.evolved[seat], true);
  } else if (card.level === 'MOON') {
    s = act(s, seat, { type: 'moonGarb', cardId: card.id });
    assert.equal(s.stats.garbed[seat], true);
  }

  const field = s.players[seat].field!;
  const abnormal = construction === 'abnormal' && (card.level === 'IV' || card.level === 'APEX');
  assert.equal(field.cardId, card.id);
  assert.equal(field.specialty, card.specialty);
  assert.equal(field.garbed, card.level === 'MOON');
  assert.equal(field.abnormal, abnormal);
  const factor = abnormal ? card.level === 'IV' ? 0.5 : 0.25 : 1;
  for (const slot of SLOTS) {
    assert.equal(field[slot].power, Math.max(1, Math.floor(card[slot].power * factor)));
    assert.equal(field[slot].effect, card[slot].effect);
  }
  assert.equal(field.skillName, card.skillName);
  return s;
}

function chooseAndResolve(s: MatchState, seat: Seat, slot: AttackSlot, opponentSlot: AttackSlot): MatchState {
  s = act(s, seat, { type: 'skipEvo' });
  s = act(s, seat, { type: 'chooseAttack', slot });
  s = act(s, other(seat), { type: 'chooseAttack', slot: opponentSlot });
  s = act(s, seat, { type: 'playSupport', target: 'none' });
  s = act(s, other(seat), { type: 'playSupport', target: 'none' });
  assert.equal(s.phase, 'resolve');
  assert.ok(s.lastCombat);
  return s;
}

interface AssetInfo {
  src: string; poster: string; durationMs: number; gifBytes: number; posterBytes: number; gifSha256: string;
}
const assets = new Map<string, AssetInfo>();
function assetFor(cardId: string): AssetInfo {
  const cached = assets.get(cardId);
  if (cached) return cached;
  const motion = attackMotionFor(cardId);
  assert.ok(motion, `${cardId}: runtime motion resolver has no entry`);
  assert.deepEqual(motion, ATTACK_MOTIONS[cardId]);
  assert.equal(motion.durationMs, 520, `${cardId}: reviewed attack timing`);
  assert.equal(motion.src, `/art/fx/attacks/${cardId}.gif`, `${cardId}: character GIF identity`);
  assert.equal(motion.poster, `/art/fx/attacks/${cardId}.png`, `${cardId}: character poster identity`);
  const gif = readFileSync(resolve(gameDir, 'public', `.${motion.src}`));
  const png = readFileSync(resolve(gameDir, 'public', `.${motion.poster}`));
  assert.match(gif.subarray(0, 6).toString('ascii'), /^GIF8[79]a$/);
  assert.equal(gif.readUInt16LE(6), 320);
  assert.equal(gif.readUInt16LE(8), 320);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 320);
  assert.equal(png.readUInt32BE(20), 320);
  assert.ok(gif.length > 100 && png.length > 100, `${cardId}: empty runtime asset`);
  const info = {
    ...motion, gifBytes: gif.length, posterBytes: png.length,
    gifSha256: createHash('sha256').update(gif).digest('hex'),
  };
  assets.set(cardId, info);
  return info;
}

function inspectRoute(
  s: MatchState, seat: Seat, field: FieldBeast, slot: AttackSlot, outcome: CombatAttackOutcome,
) {
  const combat = s.lastCombat!;
  const events = s.events.filter(ev => ev.type === 'attack');
  const beats = combat.beats.filter(b => b.kind === 'hit' || b.kind === 'attack');
  assert.equal(events.length, 2, 'each locked command has one attack event');
  assert.equal(beats.length, 2, 'each locked command has one attack beat');
  assert.deepEqual(events.map(ev => ev.actor), beats.map(b => b.actor), 'event and cinema attack order');
  const event = events.find(ev => ev.actor === seat)!;
  const beat = beats.find(b => b.actor === seat)!;
  const command = combat.beats.find(b => b.kind === 'cmd' && b.actor === seat)!;
  assert.ok(event && beat && command, `${field.cardId}/${slot}/${seat}: missing attack snapshot`);
  for (const snapshot of [event, beat, command]) {
    assert.equal(snapshot.cardId, field.cardId, 'originating character identity');
    assert.equal(snapshot.specialty, field.specialty, 'originating specialty');
    assert.equal(snapshot.slot, slot, 'selected command slot');
    assert.equal(snapshot.skill, combat.skills[seat], 'frozen attack caption');
    assert.ok(snapshot.skill, 'attack caption must be present');
    assetFor(snapshot.cardId!);
  }
  assert.equal(event.attacker, seat, 'attack origin is the acting seat');
  assert.equal(event.outcome, outcome);
  assert.equal(beat.outcome, outcome);
  assert.equal(beat.kind, outcome === 'hit' ? 'hit' : 'attack');
  assert.equal(event.amount, combat.damages[seat]);
  assert.equal(beat.amount, combat.damages[seat]);
  assert.equal(combat.slots[seat], slot);
  assert.equal(combat.basePowers[seat], field[slot].power, 'actual toField attack reaches combat');
  assert.equal(command.amount, combat.powers[seat]);
  const damage = s.events.filter(ev => ev.type === 'damage' && ev.attacker === seat);
  const misses = s.events.filter(ev => ev.type === 'miss' && ev.attacker === seat);
  if (outcome === 'hit') {
    assert.ok(event.amount! > 0);
    assert.equal(damage.length, 1);
    assert.equal(misses.length, 0);
    assert.equal(damage[0]!.actor, other(seat), 'damage actor is victim, not motion origin');
    for (const key of ['cardId', 'specialty', 'slot'] as const) assert.equal(damage[0]![key], event[key]);
    assert.equal(damage[0]!.amount, event.amount);
    assert.ok(s.events.indexOf(event) < s.events.indexOf(damage[0]!), 'motion trigger precedes its damage');
  } else {
    assert.equal(event.amount, 0);
    assert.equal(damage.length, 0);
    assert.equal(misses.length, outcome === 'zero' ? 1 : 0);
    if (outcome === 'zero') {
      assert.equal(combat.powers[seat], 0);
      for (const key of ['cardId', 'specialty', 'slot', 'skill', 'outcome'] as const) {
        assert.equal(misses[0]![key], event[key]);
      }
      assert.equal(misses[0]!.actor, other(seat));
    }
  }
  return { cardId: beat.cardId!, specialty: beat.specialty!, slot: beat.slot!, outcome: beat.outcome!,
    actor: seat, skill: beat.skill!, amount: beat.amount!, motion: assetFor(beat.cardId!) };
}

interface Row {
  id: string; slot: AttackSlot; seat: Seat; scenario: Scenario; construction: Construction;
  passed: boolean; route?: ReturnType<typeof inspectRoute>; error?: string;
}
const rows: Row[] = [];
function record(card: BeastCard, slot: AttackSlot, seat: Seat, scenario: Scenario, run: () => ReturnType<typeof inspectRoute>) {
  const construction: Construction = scenario === 'abnormal' ? 'abnormal' : 'native';
  const row: Row = { id: card.id, slot, seat, scenario, construction, passed: false };
  try { row.route = run(); row.passed = true; }
  catch (err) { row.error = err instanceof Error ? err.message : String(err); }
  rows.push(row);
}

const zeroers: Record<AttackSlot, string> = { circle: 'moonember', triangle: 'waxcat', cross: 'starball' };
for (const card of allBeasts) {
  const opponent = allBeasts.find(b => b.level === 'III' && b.specialty === card.specialty)!;
  for (const slot of SLOTS) for (const seat of SEATS) {
    for (const scenario of ['hit', 'zero', ...(card.level === 'IV' || card.level === 'APEX' ? ['abnormal'] : [])] as Scenario[]) {
      record(card, slot, seat, scenario, () => {
        const zero = scenario === 'zero';
        let s = prepare(card, seat, zero ? zeroers[slot] : opponent.id, scenario === 'abnormal' ? 'abnormal' : 'native');
        s.players[seat].field!.hp = s.players[seat].field!.maxHp = 1_000_000;
        s.players[other(seat)].field!.hp = s.players[other(seat)].field!.maxHp = 2_000_000;
        // Suicide power is HP-10 after zero-slot resolution; this real effect
        // needs HP10 to exercise its zero result instead of inventing power0.
        if (zero && card[slot].effect === 'suicide') s.players[seat].field!.hp = 10;
        const field = structuredClone(s.players[seat].field!);
        s = chooseAndResolve(s, seat, slot, zero ? 'cross' : 'triangle');
        return inspectRoute(s, seat, field, slot, zero ? 'zero' : 'hit');
      });
    }
  }
}

// Non-execution remains distinguishable from a real zero-damage attack. These
// cover ordinary, both-first-strike and counter commands on both human/CPU seats.
for (const [id, slot] of [['moonember', 'circle'], ['windfeather', 'cross'], ['fluffwing', 'cross']] as const) {
  const card = getBeast(id);
  for (const seat of SEATS) record(card, slot, seat, 'interrupted', () => {
    let s = prepare(card, seat, 'windfeather', 'native');
    s.players[seat].field!.hp = 1;
    s.players[other(seat)].field!.hp = s.players[other(seat)].field!.maxHp = 2_000_000;
    // Both-first-strike resolves by active seat; pick the opponent deliberately.
    s.active = other(seat);
    const field = structuredClone(s.players[seat].field!);
    // skipEvo belongs to the original fixture active seat.
    s.active = seat;
    s = act(s, seat, { type: 'skipEvo' });
    s.active = other(seat);
    s = act(s, seat, { type: 'chooseAttack', slot });
    s = act(s, other(seat), { type: 'chooseAttack', slot: 'cross' });
    s = act(s, seat, { type: 'playSupport', target: 'none' });
    s = act(s, other(seat), { type: 'playSupport', target: 'none' });
    assert.equal(s.players[seat].field!.hp, 0, 'preemptive KO fixture actually falls');
    const route = inspectRoute(s, seat, field, slot, 'interrupted');
    const frozen: CombatBeat[] = structuredClone(s.lastCombat!.beats);
    for (const i of SEATS) s = act(s, i, { type: 'ackResolve' });
    assert.equal(s.players[seat].field, null, 'KO acknowledgement removes field');
    assert.deepEqual(s.lastCombat!.beats, frozen, 'motion snapshots survive field removal');
    return route;
  });
}

const failures = rows.filter(r => !r.passed);
const primary = rows.filter(r => r.scenario === 'hit');
const zero = rows.filter(r => r.scenario === 'zero');
const expectedPairs = new Set(allBeasts.flatMap(b => SLOTS.map(slot => `${b.id}/${slot}`)));
const coveredPairs = new Set(primary.filter(r => r.passed).map(r => `${r.id}/${r.slot}`));
const missingPairs = [...expectedPairs].filter(pair => !SEATS.every(seat =>
  primary.some(r => r.passed && `${r.id}/${r.slot}` === pair && r.seat === seat)));
const missingZeroPairs = [...expectedPairs].filter(pair => !SEATS.every(seat =>
  zero.some(r => r.passed && `${r.id}/${r.slot}` === pair && r.seat === seat)));
const inventoryErrors: string[] = [];
if (allBeasts.length !== 170) inventoryErrors.push(`expected 170 real beasts, received ${allBeasts.length}`);
if (expectedPairs.size !== 510) inventoryErrors.push(`expected 510 unique card/slot pairs, received ${expectedPairs.size}`);
const cardIds = allBeasts.map(b => b.id).sort();
if (JSON.stringify(Object.keys(ATTACK_MOTIONS).sort()) !== JSON.stringify(cardIds)) inventoryErrors.push('motion registry/card inventory mismatch');
if (new Set([...assets.values()].map(a => a.gifSha256)).size !== assets.size) inventoryErrors.push('duplicate character GIF content');
const scenarioCounts = Object.fromEntries(['hit', 'zero', 'abnormal', 'interrupted'].map(scenario => {
  const matching = rows.filter(r => r.scenario === scenario);
  return [scenario, { total: matching.length, passed: matching.filter(r => r.passed).length }];
}));
const passed = failures.length === 0 && inventoryErrors.length === 0 && missingPairs.length === 0 && missingZeroPairs.length === 0;
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(), passed, realBeasts: allBeasts.length, expectedCardSlotPairs: 510,
  coveredCardSlotPairs: coveredPairs.size, seats: SEATS, combats: rows.length, scenarios: scenarioCounts,
  construction: 'legal submit summons/charge/native evolution/moon garb/abnormal summon; no attack substitution',
  hpFixture: 'high HP keeps selected commands executable; HP10 exercises suicide zero; HP1 exercises preemptive KO',
  boundary: 'engine submit → resolveCombat → attack event/beat snapshot → runtime attackMotionFor → registered GIF/PNG on disk',
  browserPlayback: 'Verified separately by normal-operation E2E; this script covers routing and real files, not browser rendering.',
  report: relative(gameDir, reportPath), missingPairs, missingZeroPairs, inventoryErrors, failures,
  runtimeAssets: assets.size, runtimeAssetBytes: [...assets.values()].reduce((sum, a) => sum + a.gifBytes + a.posterBytes, 0),
  rows,
}, null, 2)}\n`);
console.log(JSON.stringify({ passed, pairs: `${coveredPairs.size}/510`, combats: rows.length, scenarios: scenarioCounts,
  runtimeAssets: assets.size, failed: failures.length, inventoryErrors, missingPairs, missingZeroPairs,
  report: reportPath }, null, 2));
if (failures.length) console.error(JSON.stringify(failures.slice(0, 12), null, 2));
process.exitCode = passed ? 0 : 1;

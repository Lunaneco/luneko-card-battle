import { createStoryMatch } from '../src/engine/storyMatch';
import { writeFileSync } from 'node:fs';
import { CARDS, beasts, starterDeck, STARTER_PARTNERS } from '../src/data/cards';
import { STORY } from '../src/data/story';
import { pickAi } from '../src/engine/ai';
import { createMatch, legalActions, submit, tossFirst, validateDeck } from '../src/engine/battle';
import { SUGGEST_SPECS, suggestDeck } from '../src/engine/suggestDeck';
import type { MatchState } from '../src/engine/types';

const samples = Number(process.env.AUDIT_SAMPLES ?? 24);
if (!Number.isInteger(samples) || samples < 2 || samples > 1000) throw new Error('AUDIT_SAMPLES must be 2..1000');
let matches = 0;
function play(s: MatchState, ai: Parameters<typeof pickAi>[2], script?: Parameters<typeof pickAi>[3]) {
  for (let step = 0; s.phase !== 'gameOver' && step < 900; step++) {
    if (!s.waitingOn.length) throw new Error(`stuck: ${s.phase}`);
    for (const p of s.waitingOn.slice()) {
      if (!s.waitingOn.includes(p)) continue;
      const act = pickAi(s, p, p === 0 ? 'normal' : ai, p === 1 ? script : undefined);
      if (!act || !legalActions(s, p).some(a => JSON.stringify(a) === JSON.stringify(act))) {
        throw new Error(`illegal action: ${s.phase} ${JSON.stringify(act)}`);
      }
      s = submit(s, p, act);
    }
  }
  if (s.phase !== 'gameOver') throw new Error('match did not finish');
  matches++;
  return s;
}

const attributes = SUGGEST_SPECS.map(spec => {
  const all = beasts().filter(c => c.specialty === spec);
  const ordinary = all.filter(c => !c.isPartner);
  return { spec, total: all.length, ordinary: ordinary.length,
    stages: Object.fromEntries(['III', 'IV', 'APEX', 'MOON'].map(level => [level, all.filter(c => c.level === level).length])),
    stats: ['III', 'IV', 'APEX'].map(level => {
      const row = ordinary.filter(c => c.level === level);
      const avg = (f: (c: typeof row[number]) => number) => Math.round(row.reduce((s, c) => s + f(c), 0) / row.length);
      return { level, hp: avg(c => c.hp), circle: avg(c => c.circle.power), dp: avg(c => c.dp), evoCost: avg(c => c.evoCost) };
    }),
  };
});

// Rank 1, unchanged starters, no 月装. This measures an unprepared deck, not human clear rates.
const story = STORY.map(node => {
  const error = validateDeck(node.battle.deck);
  if (error) throw new Error(`${node.id}: ${error}`);
  const starters = STARTER_PARTNERS.map(partner => {
    let wins = 0, turns = 0;
    for (let k = 0; k < samples; k++) {
      const seed = 11 + k * 97;
      const end = play(createStoryMatch(node, starterDeck(partner), partner, seed), node.battle.ai, node.battle.script);
      wins += Number(end.winner === 0);
      turns += end.turn;
    }
    return { partner, wins, samples, winRate: Math.round(wins / samples * 100), turns: +(turns / samples).toFixed(1) };
  });
  console.log(node.id, starters.map(r => `${r.partner}:${r.winRate}%`).join(' '));
  return { id: node.id, ai: node.battle.ai, starters };
});

// Same deck-building policy, no exclusivity restriction: indicative mirror-policy matchups only.
const owned = Object.fromEntries(CARDS.map(c => [c.id, 4]));
const decks = Object.fromEntries(SUGGEST_SPECS.map(spec => [spec, suggestDeck(owned, spec).deck]));
const matchups = [];
for (let i = 0; i < SUGGEST_SPECS.length; i++) for (let j = i + 1; j < SUGGEST_SPECS.length; j++) {
  const a = SUGGEST_SPECS[i]!, b = SUGGEST_SPECS[j]!;
  let wins = 0;
  // Swap seats for each seed to separate color performance from the shuffle / first-seat bias.
  for (let k = 0; k < samples; k++) for (const swap of [false, true]) {
    const seed = 23 + k * 89;
    const end = play(createMatch(swap ? [decks[b]!, decks[a]!] : [decks[a]!, decks[b]!], [a, b], {}, seed, tossFirst(seed)), 'normal');
    wins += Number(end.winner === (swap ? 1 : 0));
  }
  matchups.push({ a, b, wins, samples: samples * 2, winRate: Math.round(wins / (samples * 2) * 100) });
}
const result = { samples, matches, cards: CARDS.length, attributes, story, decks, matchups };
writeFileSync(process.argv[2] ?? '/tmp/luneko-balance.json', JSON.stringify(result, null, 2) + '\n');
console.log('matchups', matchups, 'completed matches', matches);

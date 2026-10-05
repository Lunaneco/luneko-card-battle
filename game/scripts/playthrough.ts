import { createStoryMatch } from '../src/engine/storyMatch';
import { suggestDeck } from '../src/engine/suggestDeck';
import { WEAK_TO } from '../src/data/lines';
import { armorsOf, getCard, starterDeck, STARTER_PARTNERS } from '../src/data/cards';
import { STORY, shellsGrantedByFight, type StoryNode } from '../src/data/story';
import { pickAi } from '../src/engine/ai';
import { createMatch, legalActions, submit } from '../src/engine/battle';
import type { MatchState } from '../src/engine/types';
import { goldForWin } from '../src/data/shop';
import { addCards, addGold, addShell, emptySave, grantXp, unlockPartner, partnerGrowth, partnerRanks } from '../src/state/save';

function play(s: MatchState, node: StoryNode): MatchState {
  let cur = s;
  let g = 0;
  while (cur.phase !== 'gameOver' && g++ < 900) {
    const waiting = cur.waitingOn.slice();
    if (!waiting.length) throw new Error(`stuck ${cur.phase}`);
    for (const p of waiting) {
      if (!cur.waitingOn.includes(p)) continue;
      const legal = legalActions(cur, p);
      const moon = p === 0 ? legal.find(a => a.type === 'moonGarb') : undefined;
      const act = moon ?? pickAi(cur, p, p === 0 ? 'normal' : node.battle.ai, p === 1 ? node.battle.script : undefined);
      if (!act) throw new Error(`no act ${cur.phase} p${p} wait=${cur.waitingOn.join(',')}`);
      if (!legal.some((a) => JSON.stringify(a) === JSON.stringify(act))) {
        throw new Error(`illegal ${JSON.stringify(act)} in ${cur.phase}`);
      }
      cur = submit(cur, p, act);
    }
  }
  if (cur.phase !== 'gameOver') throw new Error('did not finish');
  return cur;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1. full story as a new save
for (const starter of STARTER_PARTNERS) {
const save = emptySave('QA', starter);
assert(save.decks[0]!.length === 30, 'starter deck');
assert(save.unlockedPartners.includes(starter), 'starter partner');

for (const node of STORY) {
  // Use owned cards and an appropriate color, as a player can after visiting the deck screen.
  const spec = node.battle.spec === 'mix' ? 'nature' : WEAK_TO[node.battle.spec][0]!;
  const deck = suggestDeck(save.cards, spec, starter).deck;
  save.decks[save.activeDeck] = deck;
  let won = false;
  for (let attempt = 0; attempt < 24 && !won; attempt++) {
    const m = createStoryMatch(node, deck, save.playerName, 11 + node.title.length + attempt * 97, {
      ownedShells: save.shells, partnerRanks: partnerRanks(save), partnerGrowth: partnerGrowth(save),
    });
    const end = play(m, node);
    if (end.winner === 0) {
      addCards(save, node.battle.reward.filter((id) => {
        try { getCard(id); return true; } catch { return false; }
      }));
      grantXp(save, node.battle.xp);
      if (node.battle.unlockPartner) unlockPartner(save, node.battle.unlockPartner);
      for (const id of shellsGrantedByFight(node.id, save.starter)) addShell(save, id);
      addGold(save, goldForWin('story', node.battle.ai, node.battle.xp));
      save.chapter += 1;
      save.wins += 1;
      won = true;
      console.log('story', starter, node.id, 'WIN', 'try', attempt + 1);
    } else {
      save.losses += 1;
    }
  }
  assert(won, `story not clearable: ${node.id}`);
}

assert(save.chapter === STORY.length, 'full story cleared');
assert((save.partners[starter]?.rank ?? 1) >= 1, 'partner exists');
console.log('playthrough ok', { starter, wins: save.wins, losses: save.losses, chapter: save.chapter, cards: Object.keys(save.cards).length });
}

// 2. armor evolve must fire (search a seed where partner is in opening hand)
{
  let ok = false;
  for (let seed = 1; seed < 80 && !ok; seed++) {
    let s = createMatch(
      [starterDeck('moonember'), starterDeck('windfeather')],
      ['A', 'B'],
      { ownedShells: ['embershell'] },
      seed,
    );
    s = submit(s, 0, { type: 'mulligan', redraw: false });
    s = submit(s, 1, { type: 'mulligan', redraw: false });
    const luna = s.players[0].hand.find((c) => c.cardId === 'moonember');
    if (!luna || s.phase !== 'summon') continue;
    s = submit(s, 0, { type: 'summon', instanceId: luna.instanceId });
    const other = s.players[1].hand.find((c) => getCard(c.cardId).kind === 'beast');
    if (!other) continue;
    s = submit(s, 1, { type: 'summon', instanceId: other.instanceId });
    if (s.phase === 'turnDraw') s = submit(s, s.active, { type: 'mulligan', redraw: false });
    if (s.phase !== 'evo' || s.active !== 0 || s.players[0].field?.cardId !== 'moonember') continue;
    const armor = legalActions(s, 0).find((a): a is Extract<Action, { type: 'moonGarb' }> => a.type === 'moonGarb');
    if (!armor) continue;
    s = submit(s, 0, armor);
    assert(s.players[0].field?.garbed, 'garbed');
    console.log('armor ok', s.players[0].field?.name, 'seed', seed);
    ok = true;
  }
  assert(ok, 'could not armor evolve in 80 seeds');
}

// 3. armors exist
{
  assert(armorsOf('moonember').length >= 2, 'armor lineup');
  console.log('armor ok', armorsOf('moonember').map((c) => c.id).join(','));
}

// 4. open hand
{
  const s = createMatch([starterDeck('moonember'), starterDeck('shellwhite')], ['A', 'B'], {}, 5);
  assert(s.players[0].hand.length === 4 && s.players[1].hand.length === 4, 'hands');
}


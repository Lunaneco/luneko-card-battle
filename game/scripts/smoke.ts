import { createStoryMatch } from '../src/engine/storyMatch';
import { starterDeck } from '../src/data/cards';
import { STORY } from '../src/data/story';
import { pickAi } from '../src/engine/ai';
import { submit } from '../src/engine/battle';

let fails = 0;
for (const node of STORY) {
  let s = createStoryMatch(node, starterDeck('moonember'), 'P', 99);
  let g = 0;
  while (s.phase !== 'gameOver' && g++ < 900) {
    const waiting = s.waitingOn.slice();
    if (!waiting.length) {
      console.error('stuck', node.id, s.phase);
      fails++;
      break;
    }
    for (const p of waiting) {
      if (!s.waitingOn.includes(p)) continue;
      const act = pickAi(s, p, p === 0 ? 'normal' : node.battle.ai, p === 1 ? node.battle.script : undefined);
      if (!act) {
        console.error('no act', node.id, s.phase, p);
        fails++;
        g = 9999;
        break;
      }
      s = submit(s, p, act);
    }
  }
  if (s.phase !== 'gameOver') {
    console.error('no finish', node.id, s.phase, g);
    fails++;
  } else {
    console.log('ok', node.id, 'winner', s.winner, 'turns', s.turn);
  }
}
process.exit(fails ? 1 : 0);

import { starterDeck } from '../src/data/cards';
import { STORY } from '../src/data/story';
import { validateDeck } from '../src/engine/battle';

let fail = 0;
for (const id of ['moonember', 'windfeather', 'shellwhite']) {
  const err = validateDeck(starterDeck(id));
  if (err) {
    console.error('starter', id, err);
    fail++;
  } else console.log('starter ok', id);
}
for (const n of STORY) {
  const err = validateDeck(n.battle.deck);
  if (err) {
    console.error('story', n.id, err, n.battle.deck.length);
    fail++;
  } else console.log('story ok', n.id, n.battle.deck.length);
}
process.exit(fail ? 1 : 0);

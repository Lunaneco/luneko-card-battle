import { starterDeck } from '../src/data/cards';
import { pickAi } from '../src/engine/ai';
import { createMatch, legalActions, submit } from '../src/engine/battle';
import type { Action, MatchState } from '../src/engine/types';

/** Host-authoritative lockstep: both sides only play legal actions. */
function lockstep(): void {
  const seed = 4242;
  const host = createMatch(
    [starterDeck('moonember'), starterDeck('windfeather')],
    ['Host', 'Guest'],
    { ownedShells: ['embershell', 'bloomshell'] },
    seed,
  );
  let guest: MatchState = structuredClone(host);
  let g = 0;
  while (host.phase !== 'gameOver' && g++ < 900) {
    const waiting = host.waitingOn.slice();
    if (!waiting.length) throw new Error('stuck');
    for (const p of waiting) {
      const act = pickAi(host, p, 'normal');
      if (!act) throw new Error('no act');
      if (!legalActions(host, p).some((a) => JSON.stringify(a) === JSON.stringify(act))) {
        throw new Error('host illegal');
      }
      const next = submit(host, p, act);
      Object.assign(host, next);
      // guest applies same action (as if it received state)
      guest = submit(guest, p, act);
      if (guest.phase !== host.phase || guest.turn !== host.turn) {
        throw new Error(`desync phase host=${host.phase} guest=${guest.phase} turn ${host.turn}/${guest.turn}`);
      }
    }
  }
  if (host.phase !== 'gameOver') throw new Error('no finish');
  if (guest.winner !== host.winner) throw new Error('winner desync');
  console.log('online lockstep ok winner', host.winner, 'turns', host.turn);
}

lockstep();

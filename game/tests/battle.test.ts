import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { starterDeck, getCard, CARDS } from '../src/data/cards';
import { createMatch, legalActions, submit, validateDeck } from '../src/engine/battle';
import { pickAi } from '../src/engine/ai';

describe('deck validation', () => {
  it('starter decks are legal 30', () => {
    for (const id of ['moonember', 'windfeather', 'shellwhite']) {
      const d = starterDeck(id);
      assert.equal(d.length, 30, id);
      assert.equal(validateDeck(d), null, id);
      for (const cardId of d) assert.ok(getCard(cardId), `${id} unknown ${cardId}`);
    }
    assert.ok(CARDS.some((c) => c.kind === 'option' && c.id === 'jyureMist'));
  });

  it('starts with no APEX beasts so 2進化 is a collect climb', () => {
    for (const id of ['moonember', 'windfeather', 'shellwhite']) {
      const apex = starterDeck(id).filter((c) => {
        const card = getCard(c);
        return card.kind === 'beast' && card.level === 'APEX';
      });
      assert.equal(apex.length, 0, `${id} still has ${apex.join(',')}`);
    }
  });

  it('rejects 5 copies', () => {
    const d = Array(30).fill('ennya');
    assert.ok(validateDeck(d));
  });

  it('allows only one partner seed in a deck', () => {
    const one = starterDeck('moonember');
    assert.equal(validateDeck(one), null);
    const twoLines = one.slice();
    const swap = twoLines.findIndex((id) => id === 'ennya');
    twoLines[swap] = 'windfeather';
    assert.match(validateDeck(twoLines) ?? '', /1体/);
    const twoCopies = starterDeck('moonember');
    const slot = twoCopies.findIndex((id) => id === 'ennya');
    twoCopies[slot] = 'moonember';
    assert.match(validateDeck(twoCopies) ?? '', /制限1|1体/);
  });
});

describe('match flow', () => {
  it('plays a full CPU vs CPU game to completion', () => {
    const a = starterDeck('moonember');
    const b = starterDeck('windfeather');
    let s = createMatch([a, b], ['P0', 'P1'], { ownedShells: ['embershell', 'bloomshell'] }, 42, 0);
    let guard = 0;
    while (s.phase !== 'gameOver' && guard++ < 2000) {
      const waiting = s.waitingOn.slice();
      if (!waiting.length) break;
      for (const p of waiting) {
        const act = pickAi(s, p, 'normal');
        assert.ok(act, `no action in ${s.phase} for ${p}`);
        s = submit(s, p, act);
      }
    }
    assert.equal(s.phase, 'gameOver');
    assert.ok(s.winner === 0 || s.winner === 1);
    assert.ok(s.players[s.winner!].kos >= 3 || s.log.some((l) => l.includes('出せない')));
  });

  it('mulligan keep proceeds to summon', () => {
    const d = starterDeck('moonember');
    let s = createMatch([d, d], ['A', 'B'], {}, 7);
    assert.equal(s.phase, 'mulligan');
    s = submit(s, 0, { type: 'mulligan', redraw: false });
    s = submit(s, 1, { type: 'mulligan', redraw: false });
    assert.equal(s.phase, 'summon');
    const acts = legalActions(s, 0);
    assert.ok(acts.some((a) => a.type === 'summon'));
  });

  it('surrender ends the match as a loss for that seat', () => {
    const d = starterDeck('moonember');
    let s = createMatch([d, starterDeck('windfeather')], ['A', 'B'], {}, 7);
    assert.equal(s.phase, 'mulligan');
    s = submit(s, 0, { type: 'surrender' });
    assert.equal(s.phase, 'gameOver');
    assert.equal(s.winner, 1);
    assert.ok(s.log.some((l) => l.includes('降参')));
    const again = submit(s, 0, { type: 'surrender' });
    assert.equal(again.winner, 1);
  });

  it('CPU never surrenders', () => {
    const d = starterDeck('moonember');
    const s = createMatch([d, starterDeck('shellwhite')], ['A', 'B'], {}, 3);
    const act = pickAi(s, 1, 'normal');
    assert.ok(act);
    assert.notEqual(act!.type, 'surrender');
  });

  it('open hand is visible', () => {
    const d = starterDeck('moonember');
    const s = createMatch([d, starterDeck('shellwhite')], ['A', 'B'], {}, 3);
    assert.equal(s.players[0].hand.length, 4);
    assert.equal(s.players[1].hand.length, 4);
  });

  it('opening hand always has a たね', () => {
    for (let seed = 1; seed <= 24; seed++) {
      const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, seed);
      for (const p of s.players) {
        const seedCard = p.hand.some((c) => {
          const d = getCard(c.cardId);
          return d.kind === 'beast' && d.level === 'III';
        });
        assert.ok(seedCard, `seed ${seed} ${p.name} ${p.hand.map((c) => c.cardId).join(',')}`);
      }
    }
  });
});

describe('cards', () => {
  it('every card has a unique id', () => {
    const ids = CARDS.map((c) => c.id);
    assert.equal(ids.length, new Set(ids).size);
  });
  it('getCard throws on missing', () => {
    assert.throws(() => getCard('nope'));
  });
});



import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { CARD_BY_ID } from '../src/data/cards';
import { storyLoot } from '../src/data/missions';
import { SHELLS, matchingShellFor, shellName } from '../src/data/shells';
import { CITIES, STORY, faceIdOf, firstMainShellGrants, shellsGrantedByFight, stageSrc, storyCast } from '../src/data/story';
import { faceSrc } from '../src/ui/card';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function resolved(art: string): string {
  return join(publicDir, art.replace(/^\//, ''));
}

describe('story cast and stages', () => {
  it('ships at least 20 story fights across every city', () => {
    assert.ok(STORY.length >= 20, `too few nodes: ${STORY.length}`);
    for (const city of CITIES) {
      const n = STORY.filter((s) => s.city === city.id);
      assert.ok(n.length >= 1, `${city.id} has no fights`);
    }
  });

  it('gives every opponent a unique existing portrait, never the city stand-in', () => {
    const cityStandin = faceSrc('npc');
    const seen = new Map<string, string>();
    const hashes = new Map<string, string>();
    for (const n of STORY) {
      const face = n.battle.opponentFace;
      assert.notEqual(face, 'npc', `${n.id} still uses generic npc face`);
      const src = faceSrc(face);
      assert.notEqual(src, cityStandin, `${n.battle.opponentName} fell back to city art`);
      assert.ok(/\.(jpg|jpeg|png)$/i.test(src), `${n.id} face is not a portrait ${src}`);
      const file = resolved(src);
      assert.equal(existsSync(file), true, `${n.id} missing ${src}`);
      const owner = seen.get(src);
      if (owner && owner !== n.battle.opponentName) {
        assert.fail(`${n.battle.opponentName} shares ${src} with ${owner}`);
      }
      seen.set(src, n.battle.opponentName);
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
      const other = hashes.get(hash);
      if (other && other !== n.battle.opponentName) {
        assert.fail(`${n.battle.opponentName} has the same bust bytes as ${other}`);
      }
      hashes.set(hash, n.battle.opponentName);
    }
    assert.ok(storyCast().length >= 15, `cast too small: ${storyCast().length}`);
  });

  it('gives every city its own existing stage file', () => {
    const hashes = new Map<string, string>();
    for (const city of CITIES) {
      const src = stageSrc(city.id);
      assert.equal(src, `/art/stages/${city.id}.jpg`);
      const file = resolved(src);
      assert.equal(existsSync(file), true, `missing stage ${src}`);
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
      const other = hashes.get(hash);
      assert.equal(other, undefined, `${city.id} stage matches ${other}`);
      hashes.set(hash, city.id);
    }
  });

  it('maps speaker names to the same faces the battles use', () => {
    assert.equal(faceIdOf('アッシュフィスト'), 'ashfist');
    assert.equal(faceIdOf('ヴェノムクラウン'), 'venomcrown');
    assert.equal(faceIdOf('マージン'), 'margin');
    assert.equal(faceSrc(faceIdOf('ゼロヒト')), '/art/ui/zero.jpg');
  });

  it('uses real cards in every story deck', () => {
    for (const n of STORY) {
      assert.equal(n.battle.deck.length, 30, `${n.id} deck is ${n.battle.deck.length}`);
      for (const id of n.battle.deck) {
        assert.ok(CARD_BY_ID[id], `${n.id} unknown card ${id}`);
      }
    }
  });

  it('drops every 月殻 on the main path and lectures the first grant', () => {
    const grants = firstMainShellGrants();
    const byId = new Set(grants.map((g) => g.shellId));
    for (const sh of SHELLS) {
      assert.ok(byId.has(sh.id), `${sh.id} never drops on the main path`);
    }
    assert.ok(grants[0]?.fightId === 'flame-1');
    assert.ok(grants[0]?.shellId === 'embershell');
    for (const g of grants) {
      const node = STORY.find((n) => n.id === g.fightId);
      const blob = (node?.after ?? []).map((l) => l.text).join('\n');
      const named = blob.includes('月殻') || blob.includes(shellName(g.shellId));
      assert.ok(named, `${g.fightId} after-text never names 月殻 / ${g.shellId}`);
    }
    const luna = STORY.find((n) => n.id === 'beg-luna');
    const lunaBlob = (luna?.after ?? []).map((l) => l.text).join('');
    assert.ok(lunaBlob.includes('月殻') && lunaBlob.includes('アッシュコート'));
    const flame = STORY.find((n) => n.id === 'flame-1');
    const flameBlob = (flame?.after ?? []).map((l) => l.text).join('');
    assert.ok(flameBlob.includes('月装') && flameBlob.includes('たね'));
  });

  it('ships a portrait file for every talk mood', () => {
    for (const n of STORY) {
      for (const l of [...n.before, ...n.after]) {
        if (!l.mood || l.mood === 'neutral') continue;
        const src = faceSrc(l.face, l.mood);
        assert.equal(existsSync(resolved(src)), true, `${n.id} ${l.speaker} missing ${src}`);
      }
    }
  });

  it('gives the starter a matching 月殻 at the first lecture fight', () => {
    assert.deepEqual(shellsGrantedByFight('flame-1', 'moonember'), ['embershell']);
    assert.ok(shellsGrantedByFight('flame-1', 'windfeather').includes('bloomshell'));
    assert.ok(shellsGrantedByFight('flame-1', 'windfeather').includes('embershell'));
    assert.equal(matchingShellFor('shellwhite'), 'chartshell');
    assert.ok(shellsGrantedByFight('flame-1', 'shellwhite').includes('chartshell'));
    assert.deepEqual(shellsGrantedByFight('tut-mochi', 'moonember'), []);
  });
});

describe('energetic story continuity', () => {
  it('keeps Mochinyafe’s dialogue and battle callouts to her frozen utterance', () => {
    for (const n of STORY) {
      for (const l of [...n.before, ...n.after]) {
        if (l.face === 'mochi') assert.equal(l.text, 'ふぇ〜', `${n.id} changes Mochinyafe’s utterance`);
      }
      if (n.battle.opponentFace === 'mochi') {
        for (const field of ['taunt', 'winLine', 'loseLine'] as const) {
          assert.equal(n.battle[field], 'ふぇ〜', `${n.id} ${field} changes Mochinyafe’s utterance`);
        }
      }
    }
  });

  it('introduces ERROR and the tutorial rules without making Mochinyafe explain them', () => {
    const tutorial = STORY.find((n) => n.id === 'tut-mochi')!;
    const guide = [...tutorial.before, ...tutorial.after].filter((l) => l.face === 'nyanluna');
    assert.ok(guide.some((l) => l.text.includes('○△×')));
    assert.ok(guide.some((l) => l.text.includes('ERROR')));
    assert.ok(guide.some((l) => l.text.includes(CARD_BY_ID.mochimemo!.name)));
  });

  it('gives every fight a callout and aligns the final attack hint with the real script', () => {
    for (const n of STORY) {
      assert.ok(n.battle.taunt?.trim(), `${n.id} has no taunt`);
      assert.ok(n.battle.winLine?.trim(), `${n.id} has no victory line`);
      assert.ok(n.battle.loseLine?.trim(), `${n.id} has no defeat line`);
    }
    const final = STORY.find((n) => n.id === 'tower-zero')!;
    const glyph = { circle: '○', triangle: '△', cross: '×' };
    const cycle = final.battle.script!.map((slot) => glyph[slot]).join('→');
    assert.ok(final.before.some((l) => l.face === 'tsukineko' && l.text.includes(cycle)));
    assert.ok(final.battle.deckTrait.includes(cycle));
  });

  it('states the real mission condition when after-talk offers a secret card', () => {
    const offers = [
      'tut-mochi', 'beg-luna', 'flame-1', 'ice-2', 'junk-1', 'sky-1',
      'extra-tsuki', 'extra-plot', 'extra-pino', 'extra-sera', 'extra-giga',
    ];
    const wording: Record<string, string> = {
      shutout: '無敗', perfect: '引き直さず無敗',
      noevo: '進化も月装もせず', alldeck: '全部「山札の上」',
    };
    for (const id of offers) {
      const n = STORY.find((node) => node.id === id)!;
      const last = storyLoot(id).missions[2];
      const text = n.after.map((l) => l.text).join('');
      assert.ok(last.reward.some((reward) => text.includes(CARD_BY_ID[reward]!.name)), `${id} names no secret reward`);
      assert.ok(wording[last.kind], `${id} has an unreviewed mission condition`);
      assert.ok(text.includes(wording[last.kind]!), `${id} promises a secret without its ${last.kind} condition`);
    }
  });
});

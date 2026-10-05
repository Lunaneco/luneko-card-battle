import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { partnerLineCards, partners, starterDeck } from '../src/data/cards';
import { STARTER_BLURB } from '../src/ui/copy';
import { copyCapOf } from '../src/data/rarity';
import { SHELLS } from '../src/data/shells';
import { openPack } from '../src/data/shop';
import { STORY } from '../src/data/story';
import { getCard } from '../src/data/cards';
import { validateDeck } from '../src/engine/battle';
import { SeededRng } from '../src/engine/rng';
import { addCards, emptySave, unlockPartner } from '../src/state/save';

describe('partner obtain paths', () => {
  it('prints partner names in katakana', () => {
    assert.equal(getCard('moonember').name, 'ムーンエンバー');
    assert.equal(getCard('windfeather').name, 'ウィンドフェザー');
    assert.equal(getCard('shellwhite').name, 'シェルホワイト');
    for (const p of partners()) {
      assert.match(p.name, /[ァ-ヶー]/, p.id);
      assert.ok(!/[A-Za-z]/.test(p.name), `${p.id} still latin: ${p.name}`);
    }
  });

  it('unlocks every partner seed on a story fight and grants the whole line', () => {
    const unlocks = new Set(STORY.map((n) => n.battle.unlockPartner).filter((id): id is string => !!id));
    for (const p of partners()) {
      assert.ok(unlocks.has(p.id), `${p.id} has no story unlock`);
      const line = partnerLineCards(p.id);
      assert.ok(line.some((c) => c.level === 'III'), p.id);
      assert.ok(line.some((c) => c.level === 'IV'), p.id);
      assert.ok(line.some((c) => c.level === 'APEX'), p.id);
      assert.ok(line.every((c) => c.level !== 'MOON'));
    }
  });

  it('unlockPartner puts たね and 進化 into the save pile', () => {
    const s = emptySave('QA', 'moonember');
    assert.equal(s.cards.fluffwing ?? 0, 0);
    unlockPartner(s, 'fluffwing');
    assert.ok(s.unlockedPartners.includes('fluffwing'));
    assert.ok((s.cards.fluffwing ?? 0) >= 1);
    assert.ok((s.cards.fluffsail ?? 0) >= 1);
    assert.ok((s.cards.fluffsky ?? 0) >= 1);
    assert.equal(s.cards.dawnwing ?? 0, 0);
  });

  it('lets shop packs roll partners and never 月装', () => {
    let found = false;
    for (const pack of ['seed', 'city', 'premium', 'flame', 'ice'] as const) {
      for (let seed = 1; seed <= 120; seed++) {
        const rng = new SeededRng(seed * 23 + pack.length);
        const cards = openPack(pack, () => rng.next());
        for (const id of cards) {
          const c = getCard(id);
          assert.notEqual(c.kind === 'beast' && c.level === 'MOON', true, `${pack} rolled ${id}`);
          if (c.kind === 'beast' && c.isPartner) found = true;
        }
      }
    }
    assert.equal(found, true);
  });

  it('gives every moon shell a main-story grant so 月装 is reachable mid-run', () => {
    const fromMain = new Set(
      STORY.filter((n) => !n.id.startsWith('extra-'))
        .map((n) => n.battle.unlockShell)
        .filter((id): id is string => !!id),
    );
    for (const sh of SHELLS) {
      assert.ok(fromMain.has(sh.id), `${sh.id} has no main-story grant`);
    }
    const s = emptySave('QA', 'moonember');
    assert.deepEqual(s.shells, []);
  });

  it('lets only one copy of a raisable partner exist', () => {
    for (const p of partners()) {
      assert.equal(copyCapOf(p.id), 1, p.id);
      for (const c of partnerLineCards(p.id)) {
        assert.equal(copyCapOf(c.id), 1, c.id);
      }
    }
    for (const id of ['moonember', 'windfeather', 'shellwhite']) {
      assert.equal(validateDeck(starterDeck(id)), null, id);
    }
    const iceIn = (id: string) =>
      starterDeck(id).some((cid) => {
        const c = getCard(cid);
        return c.kind === 'beast' && c.specialty === 'ice';
      });
    assert.equal(iceIn('moonember'), false);
    assert.equal(iceIn('windfeather'), false);
    assert.equal(iceIn('shellwhite'), true);
    assert.ok(STARTER_BLURB.moonember.includes('火炎'));
    assert.ok(STARTER_BLURB.windfeather.includes('自然'));
    assert.ok(STARTER_BLURB.shellwhite.includes('氷水'));
    assert.ok(!Object.values(STARTER_BLURB).some((t) => t.includes('氷は入っていない')));
    const two = starterDeck('moonember');
    const slot = two.findIndex((id) => id === 'ennya');
    two[slot] = 'moondrake';
    assert.match(validateDeck(two) ?? '', /制限1/);
    const s = emptySave('QA', 'moonember');
    addCards(s, ['moonember', 'moonember']);
    assert.equal(s.cards.moonember, 1);
  });
});

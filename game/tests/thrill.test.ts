import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID, options, starterDeck } from '../src/data/cards';
import { effectFamily, familyPower } from '../src/data/optionPower';
import { copyCapOf, exclusiveFightId, exclusiveIds, isExclusive, rarityOf, sourceLabel } from '../src/data/rarity';
import { SET2_GRANT } from '../src/data/set2';
import { openPack, PACKS } from '../src/data/shop';
import { lastMissionRewards } from '../src/data/missions';
import { CITIES, STORY } from '../src/data/story';
import { SHELL_EXPLAIN, SHELL_EVO_JA, SHELL_KIND_JA } from '../src/data/shells';
import { validateDeck } from '../src/engine/battle';
import { SeededRng } from '../src/engine/rng';
import { emptySave } from '../src/state/save';
import { STOREFRONT_RULES } from '../src/ui/copy';
import { TUTORIAL_STEPS } from '../src/ui/tutorial';
import { evoCoach } from '../src/ui/evoMarks';

describe('collection thrill', () => {
  it('lists exclusives, each tied to a real story win reward', () => {
    const ids = exclusiveIds();
    assert.ok(ids.length >= 8, `too few exclusives: ${ids.length}`);
    for (const id of ids) {
      assert.ok(CARD_BY_ID[id], `missing card ${id}`);
      assert.equal(isExclusive(id), true);
      assert.equal(rarityOf(id), 'secret');
      assert.equal(copyCapOf(id), 1);
      const fight = exclusiveFightId(id);
      assert.ok(fight, id);
      const node = STORY.find((n) => n.id === fight || n.battle.id === fight);
      assert.ok(node, `${id} fight ${fight} missing`);
      const last = lastMissionRewards(fight!);
      assert.ok(last.includes(id) || node!.battle.reward.includes(id), `${id} not in ${fight} last mission`);
      assert.match(sourceLabel(id), /限定/);
    }
  });

  it('never grants exclusives from shop packs or starter grants', () => {
    const banned = new Set(exclusiveIds());
    const save = emptySave('QA', 'moonember');
    for (const id of banned) {
      assert.equal(save.cards[id] ?? 0, 0, `starter owns ${id}`);
      assert.ok(!SET2_GRANT.includes(id), `SET2_GRANT has ${id}`);
      assert.ok(!starterDeck('moonember').includes(id));
    }
    for (const pack of PACKS.map((p) => p.id)) {
      for (let seed = 1; seed <= 80; seed++) {
        const rng = new SeededRng(seed * 17 + pack.length);
        const cards = openPack(pack, () => rng.next());
        for (const id of cards) assert.equal(banned.has(id), false, `pack ${pack} rolled ${id}`);
      }
    }
  });

  it('rejects restricted copies above the cap', () => {
    const deck = starterDeck('moonember').slice();
    assert.equal(validateDeck(deck), null);
    deck[1] = 'ashcrown';
    deck[2] = 'ashcrown';
    const err = validateDeck(deck);
    assert.ok(err && err.includes('制限'), err ?? 'no error');
    const seven = starterDeck('moonember').slice();
    seven[1] = 'wild7';
    seven[2] = 'wild7';
    assert.ok((validateDeck(seven) ?? '').includes('制限'));
  });

  it('keeps exclusive options above the best common of the same family', () => {
    const commons = options().filter((c) => !isExclusive(c.id));
    for (const ex of options().filter((c) => isExclusive(c.id))) {
      const peers = commons.filter((c) => effectFamily(c) === effectFamily(ex));
      if (!peers.length) continue;
      const best = Math.max(...peers.map(familyPower));
      assert.ok(familyPower(ex) > best, `${ex.id} lost to common family ${effectFamily(ex)}`);
    }
  });
});

describe('player-facing corpus', () => {
  it('has no デジメンタル or アーマー進化', () => {
    const storyBlob = STORY.flatMap((n) => [...n.before, ...n.after].map((l) => l.text + l.speaker + n.battle.opponentName)).join('\n');
    const cards = Object.values(CARD_BY_ID)
      .map((c) => c.name + (c.kind === 'option' ? c.text : c.skillName))
      .join('\n');
    const blob = [
      STOREFRONT_RULES,
      TUTORIAL_STEPS.map((s) => s.title + s.tap + s.body).join('\n'),
      evoCoach(true, false),
      SHELL_EXPLAIN,
      SHELL_EVO_JA,
      SHELL_KIND_JA,
      storyBlob,
      cards,
      CITIES.map((c) => c.name + c.area).join('\n'),
    ].join('\n');
    assert.ok(!blob.includes('デジメンタル'), blob.slice(0, 200));
    assert.ok(!blob.includes('アーマー進化'));
    assert.ok(!blob.includes('合成'));
    assert.ok(blob.includes('月殻') && blob.includes('月装'));
    assert.match(evoCoach(true, false), /金枠/);
    const banned = [
      'デジモン',
      'グレイモン',
      'ガルルモン',
      'ウォーグレイ',
      'メタルガルル',
      'メラニャン',
      'ガブニャン',
      'テントニャン',
      'カブテニャン',
      'エンジェニャン',
      'セラフィニャン',
      'ホーリードラ',
      'デビニャン',
      'ヴェノムニャン',
      'ディアボロニャン',
      'オメガニャン',
      'アポカリニャン',
      'エテニャン',
      'ピノキニャン',
      'ハグルニャン',
      'トイニャン',
      'ホエーニャン',
      'パタニャン',
      'プロットニャン',
      'ユキダルニャン',
      'ロゼニャン',
      'ルナドラコ',
      'ホークニャン',
      'アルマニャン',
      'ルナテイル',
      'シャドウワーム',
      'ガイアフォース',
      'セブンヘブンズ',
      'グレイソード',
      'メガデス',
      'コキュートス',
      'ヘブンズナックル',
      'フォービドゥン',
      'カタストロフィカノン',
      'グランドデスビッグバン',
      'セブンズ',
      'ワープ進化',
      'ビギナシティ',
      'ムゲンタワー',
      'メガエリア',
      'ギガエリア',
      'テラエリア',
      'テイマー',
      'トイキング',
    ];
    for (const word of banned) {
      assert.equal(blob.includes(word), false, `still showing ${word}`);
    }
  });

  it('keeps a 5-act throughline with before and after on every node', () => {
    assert.ok(STORY.length >= 20);
    for (const n of STORY) {
      assert.ok(n.before.length >= 1 && n.after.length >= 1, n.id);
      for (const line of [...n.before, ...n.after]) {
        if (line.face === 'mochi') assert.equal(line.text, 'ふぇ〜', n.id);
        else assert.ok(line.text.length > 8, n.id);
      }
    }
    const all = STORY.flatMap((n) => [...n.before, ...n.after].map((l) => l.text)).join('');
    assert.ok(all.includes('庭'));
    assert.ok(all.includes('空欄'));
    assert.ok(all.includes('同じ手'));
    assert.ok(all.includes('メニュー'));
  });
});

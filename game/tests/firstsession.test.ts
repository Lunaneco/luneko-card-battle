import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_BY_ID } from '../src/data/cards';
import { exclusiveIdsOnFight } from '../src/data/rarity';
import { PACKS } from '../src/data/shop';
import { CITY_ACT, STORY, nextStoryNode } from '../src/data/story';
import { specialtyChipLabel } from '../src/engine/types';
import { emptySave } from '../src/state/save';
import {
  COLLECTION_LEAD,
  DEFAULT_PLAYER_NAME,
  SETTINGS_FOOTER,
  SETTINGS_SAVE_LEAD,
  SETTINGS_WIPE,
  STOREFRONT_RULES,
  TITLE_CONTINUE,
  TITLE_NEW,
  TITLE_NEW_WARN,
  TITLE_START,
} from '../src/ui/copy';
import { settingsScreenHtml } from '../src/ui/settingsView';
import { titleScreenHtml } from '../src/ui/titleView';
import { phaseNextTap } from '../src/ui/tutorial';
import { applyMuteToSave, muteFromSave } from '../src/state/save';

describe('first-session review fixes', () => {
  it('shows Japanese specialty chips, never the English id', () => {
    assert.equal(specialtyChipLabel('flame'), '色 火炎');
    assert.equal(specialtyChipLabel('rare'), '色 珍種');
    for (const id of ['flame', 'ice', 'nature', 'dark', 'rare'] as const) {
      const lab = specialtyChipLabel(id);
      assert.ok(!lab.split(' ').includes(id), lab);
    }
  });

  it('strips デジ jewels and PS inheritance from player copy', () => {
    assert.ok(!SETTINGS_FOOTER.includes('旧タイトル'));
    assert.ok(!STOREFRONT_RULES.includes('デジメンタル'));
    assert.ok(!STOREFRONT_RULES.includes('アーマー進化'));
    assert.ok(!STOREFRONT_RULES.includes('合成'));
    assert.ok(STOREFRONT_RULES.includes('パートナーカード（育成できるたねと進化）は各1枚まで'));
    assert.ok(COLLECTION_LEAD.includes('珍種'));
    assert.ok(COLLECTION_LEAD.includes('希少とは別'));
  });

  it('starts with pack gold, one filled deck, no triple copies', () => {
    const s = emptySave('QA', 'moonember');
    assert.ok(s.gold >= PACKS[0]!.price);
    assert.equal(s.decks[0]!.length, 30);
    assert.equal(s.decks[1]!.length, 0);
    assert.equal(s.decks.filter((d) => d.length === 30).length, 1);
  });

  it('defaults the player name to ルナネコ', () => {
    assert.equal(DEFAULT_PLAYER_NAME, 'ルナネコ');
    assert.equal(emptySave('', 'moonember').playerName, 'ルナネコ');
    assert.equal(emptySave('月使い', 'moonember').playerName, '月使い');
  });

  it('groups the map by act and hints exclusives before the result', () => {
    const next = nextStoryNode(0);
    assert.equal(next?.id, 'tut-mochi');
    assert.ok(CITY_ACT.beginner.label.includes('第1幕'));
    assert.ok(CITY_ACT.tower.label.includes('第5幕'));
    assert.ok(exclusiveIdsOnFight('flame-1').includes('ashcrown'));
    assert.ok(exclusiveIdsOnFight('tower-zero').includes('samehand'));
    const hinted = STORY.filter((n) => exclusiveIdsOnFight(n.id).length > 0);
    assert.ok(hinted.length >= 8);
  });

  it('tutorial opening fight is not ice-checking the flame starter', () => {
    const tut = STORY.find((n) => n.id === 'tut-mochi')!;
    const ice = tut.battle.deck.filter((id) => {
      const c = CARD_BY_ID[id];
      return c && c.kind === 'beast' && c.specialty === 'ice';
    });
    assert.equal(ice.length, 0, ice.join(','));
    assert.ok(!tut.battle.deckTrait.includes('氷は入っていない'), tut.battle.deckTrait);
  });

  it('tells mulligan to keep a seed, not just この手で行く', () => {
    const t = phaseNextTap('mulligan');
    assert.ok(t.includes('たね'));
    assert.ok(t.includes('無い'));
  });

  it('persists mute on the save and explains local storage', () => {
    const s = emptySave('QA', 'moonember');
    assert.equal(s.flags.muted, false);
    applyMuteToSave(s, true);
    assert.equal(muteFromSave(s), true);
    const html = settingsScreenHtml(true, true);
    assert.ok(html.includes(SETTINGS_SAVE_LEAD));
    assert.ok(html.includes(SETTINGS_WIPE));
    assert.ok(html.includes('wipe-yes'));
    assert.ok(html.includes('サウンドをオン'));
  });

  it('shows つづきから and warns before はじめから', () => {
    assert.equal(TITLE_START, 'はじめる');
    const fresh = titleScreenHtml(false);
    assert.ok(fresh.includes(TITLE_START));
    assert.ok(!fresh.includes(TITLE_CONTINUE));
    const cont = titleScreenHtml(true, true);
    assert.ok(cont.includes(TITLE_CONTINUE));
    assert.ok(cont.includes(TITLE_NEW));
    assert.ok(cont.includes(TITLE_NEW_WARN));
    assert.ok(STOREFRONT_RULES.includes('ターンごとに入れ替わる'));
  });
});

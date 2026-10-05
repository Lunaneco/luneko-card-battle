import { CARDS, getCard, starterDeck } from '../data/cards';
import { buyPack, PACKS } from '../data/shop';
import { isExclusive } from '../data/rarity';
import { SHELLS } from '../data/shells';
import { CITIES, STORY, firstMainShellGrants } from '../data/story';
import { createMatch, isLegalLineEvolve, hitDamage, submit, validateDeck } from '../engine/battle';
import { suggestDeck } from '../engine/suggestDeck';
import { FX_PLATES, fxHudHtml, spawnAttack, spawnBattleStart } from '../fx/battlefield';
import { applyMuteToSave, emptySave, muteFromSave } from '../state/save';
import { vsIntroHtml } from '../ui/vsIntro';
import { helpFab, inspectHtml } from '../ui/inspect';
import {
  DEFAULT_PLAYER_NAME,
  SETTINGS_SAVE_LEAD,
  SETTINGS_WIPE,
  SETTINGS_WIPE_WARN,
  STOREFRONT_RULES,
  TITLE_BRAND,
  TITLE_CONTINUE,
  TITLE_NEW,
  TITLE_NEW_WARN,
  TITLE_START,
  RESULT_LOSE,
  RESULT_LOSE_TITLE,
  GIVEUP_YES,
  SHOP_BUY,
} from '../ui/copy';
import { faceSrc } from '../ui/card';
import { fieldOrderHudHtml, fieldRole, roleBadgeHtml } from '../ui/battleHud';
import { settingsScreenHtml } from '../ui/settingsView';
import { titleScreenHtml } from '../ui/titleView';
import { homeScreenHtml } from '../ui/homeView';
import { shopScreenHtml } from '../ui/shopView';
import { collectionScreenHtml, collectionVisible } from '../ui/collectionView';
import { deckScreenHtml } from '../ui/deckView';
import { resultHeadlineHtml } from '../ui/resultView';
import { giveupButtonHtml, giveupOverlayHtml } from '../ui/giveupView';
import {
  phaseNextTap,
  shouldStartTutorial,
  shellTutorialCovers,
  shouldStartShellTutorial,
  TUTORIAL_STEPS,
  tutorialCoversBasics,
} from '../ui/tutorial';

export interface QualityItem {
  id: string;
  name: string;
  inspect: () => string | null;
}

export interface QualityResult {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export const QUALITY_ITEMS: QualityItem[] = [
  {
    id: 'boot',
    name: '起動／はじめる',
    inspect: () => {
      if (!TITLE_BRAND.includes('ルナネコ')) return 'title brand missing';
      if (TITLE_START !== 'はじめる') return 'start label missing';
      return null;
    },
  },
  {
    id: 'tutorial',
    name: '初回チュートリアル',
    inspect: () => {
      if (!shouldStartTutorial({}, 0)) return 'first-run should show tutorial';
      if (!tutorialCoversBasics()) return 'tutorial missing たね/○/進化/どうぐ';
      if (shouldStartTutorial({ tutorialSeen: true }, 0)) return 'seen flag ignored';
      return null;
    },
  },
  {
    id: 'hint',
    name: '次タップ案内',
    inspect: () => {
      const s = phaseNextTap('summon');
      const a = phaseNextTap('attack');
      const e = phaseNextTap('evo');
      const u = phaseNextTap('support');
      if (!s.includes('たね') || !s.includes('タップ')) return 'summon hint weak';
      if (!a.includes('○') || !a.includes('タップ')) return 'attack hint weak';
      if (!e.includes('進化')) return 'evo hint weak';
      if (!u.includes('どうぐ') && !u.includes('援護')) return 'support hint weak';
      return null;
    },
  },
  {
    id: 'fx',
    name: 'フィールド攻撃エフェクト',
    inspect: () => {
      const c = spawnAttack(390, 844, 'circle', 'flame', false);
      const t = spawnAttack(390, 844, 'triangle', 'nature', true);
      const x = spawnAttack(390, 844, 'cross', 'dark', false);
      if (c.parts.length < 40 || !c.parts.some((p) => p.kind === 'beam')) return 'circle fx thin';
      if (t.parts.filter((p) => p.kind === 'slash').length < 20) return 'triangle fx thin';
      if (!x.parts.some((p) => p.kind === 'hex')) return 'cross fx thin';
      const start = spawnBattleStart(390, 844);
      if (start.parts.length < 40 || start.flash < 0.5) return 'battle start fx thin';
      const vs = vsIntroHtml({
        youName: '相手',
        youFace: '/art/ui/city.jpg',
        meName: '自分',
        meFace: '/art/partners/moonember.jpg',
        youRole: '後攻',
        meRole: '先攻',
        city: 'スプラウトコート',
        stage: '/art/stages/beginner.jpg',
      });
      if (!vs.includes('対戦開始') || !vs.includes('VS') || !vs.includes('コイントス') || !vs.includes('先攻')) {
        return 'vs intro missing';
      }
      if (!spawnAttack(390, 844, 'circle', 'flame', false).plate) return 'attack plate missing';
      if (!fxHudHtml().includes('fx-hud') || !fxHudHtml().includes('fx-vid')) return 'fx hud missing';
      if (Object.keys(FX_PLATES).length < 6) return 'fx plates missing';
      return null;
    },
  },
  {
    id: 'evo',
    name: '同属性進化',
    inspect: () => {
      if (!isLegalLineEvolve('ennya', 'ashflare', 30, false)) return 'same-spec evolve rejected';
      if (!isLegalLineEvolve('ennya', 'ashfist', 80, false)) return 'same-spec other character rejected';
      if (isLegalLineEvolve('ennya', 'shellbolt', 80, false)) return 'other-spec evolve allowed';
      if (!isLegalLineEvolve('moonember', 'moondrake', 30, false)) return 'partner same-spec evolve rejected';
      return null;
    },
  },
  {
    id: 'weak',
    name: '弱点',
    inspect: () => {
      const w = hitDamage(200, 'ice', 'flame');
      const n = hitDamage(200, 'flame', 'flame');
      if (w !== 300 || n !== 200) return `weakness 1.5x missing, got ${w}/${n}`;
      return null;
    },
  },
  {
    id: 'item',
    name: 'どうぐ',
    inspect: () => {
      const p = getCard('floppy');
      if (p.kind !== 'option' || p.name !== 'きずぐすり') return 'potion name wrong';
      if (p.effect.kind !== 'heal') return 'potion effect lost';
      for (const c of CARDS) {
        const blob = c.kind === 'option' ? c.name + c.text : c.name;
        if (blob.includes('フロッピー')) return `floppy remains on ${c.id}`;
      }
      return null;
    },
  },
  {
    id: 'rules',
    name: 'ルール／ヒント到達',
    inspect: () => {
      const fab = helpFab();
      if (!fab.includes('rules-btn') || !fab.includes('?')) return '? control missing';
      if (!STOREFRONT_RULES.includes('HP+2')) return 'missing every-rank growth';
      if (!STOREFRONT_RULES.includes('月装')) return 'missing moon garb';
      if (STOREFRONT_RULES.includes('デジメンタル') || STOREFRONT_RULES.includes('アーマー進化')) {
        return 'licensed copy remains';
      }
      if (STOREFRONT_RULES.includes('合成')) return 'fusion copy remains';
      return null;
    },
  },
  {
    id: 'story',
    name: 'ストーリー敵とステージ',
    inspect: () => {
      if (STORY.length < 20) return `too few story fights: ${STORY.length}`;
      if (STORY.some((n) => n.battle.opponentFace === ('npc' as string))) return 'generic npc face remains';
      if (STORY.some((n) => faceSrc(n.battle.opponentFace) === faceSrc('npc'))) return 'opponent still uses city stand-in';
      if (CITIES.length < 9) return 'missing cities';
      return null;
    },
  },
  {
    id: 'shell-story',
    name: '月殻の物語入手と月装チュートリアル',
    inspect: () => {
      const grants = firstMainShellGrants();
      if (grants.length < SHELLS.length) return `main path missing 月殻: ${grants.length}/${SHELLS.length}`;
      if (!shellTutorialCovers()) return 'shell tutorial missing 月殻/月装';
      if (!shouldStartShellTutorial({ shellTutorialPending: true })) return 'pending flag ignored';
      if (shouldStartShellTutorial({ shellTutorialSeen: true })) return 'seen flag ignored';
      const flame = STORY.find((n) => n.id === 'flame-1');
      const lecture = (flame?.after ?? []).map((l) => l.text).join('');
      if (!lecture.includes('月殻') || !lecture.includes('月装')) return 'flame-1 after missing lecture';
      return null;
    },
  },
  {
    id: 'attack-order',
    name: 'バトル攻撃順（先攻はターン交代）',
    inspect: inspectAttackOrder,
  },
  {
    id: 'settings-save',
    name: '設定／セーブ（端末保存・消す確認・ミュート）',
    inspect: inspectSettingsSave,
  },
  {
    id: 'first-session',
    name: '初回起動面（つづき・はじめから警告）',
    inspect: inspectFirstSessionSurface,
  },
  {
    id: 'home-loop',
    name: 'ホームメニュー到達',
    inspect: inspectHomeLoop,
  },
  {
    id: 'shop-loop',
    name: 'ショップパック購入',
    inspect: inspectShopLoop,
  },
  {
    id: 'collection-loop',
    name: '図鑑の所持／秘蔵',
    inspect: inspectCollectionLoop,
  },
  {
    id: 'deck-loop',
    name: '編成（おすすめ・2行スライド・長押し）',
    inspect: inspectDeckLoop,
  },
  {
    id: 'surrender-loop',
    name: 'バトル降参',
    inspect: inspectSurrenderLoop,
  },
  {
    id: 'result-loop',
    name: '結果／敗北コピー',
    inspect: inspectResultLoop,
  },
];

function inspectAttackOrder(): string | null {
  const s = createMatch([starterDeck('moonember'), starterDeck('windfeather')], ['A', 'B'], {}, 3, 0);
  if (fieldRole(s, 0) !== '先攻' || fieldRole(s, 1) !== '後攻') return 'opening 先攻 is not the turn attacker';
  s.active = 1;
  if (fieldRole(s, 1) !== '先攻' || fieldRole(s, 0) !== '後攻') return '先攻 does not follow the current turn';
  const hud = fieldOrderHudHtml(s, 0);
  if (!hud.includes('このターンの攻撃順')) return 'order hud missing turn label';
  if (!hud.includes('相手・先攻') || !hud.includes('自分・後攻')) return 'order hud did not swap with active';
  if (!roleBadgeHtml(s, 1).includes('role-badge first')) return '先攻 badge class missing';
  if (!STOREFRONT_RULES.includes('先攻') || !STOREFRONT_RULES.includes('ターンごとに入れ替わる')) {
    return 'storefront missing turn 先攻';
  }
  const atk = TUTORIAL_STEPS.find((step) => step.id === 'attack');
  if (!atk || !atk.body.includes('先攻') || !atk.body.includes('ターン')) return 'tutorial missing turn 先攻';
  return null;
}

function inspectSettingsSave(): string | null {
  const fresh = emptySave('QA', 'moonember');
  if (fresh.flags.muted !== false) return 'new save is not unmuted';
  applyMuteToSave(fresh, true);
  if (!muteFromSave(fresh)) return 'mute flag not stored on save';
  applyMuteToSave(fresh, false);
  if (muteFromSave(fresh)) return 'unmute flag not stored on save';
  if (!SETTINGS_SAVE_LEAD.includes('この端末')) return 'missing local-save notice';
  if (!SETTINGS_WIPE.includes('セーブ') || !SETTINGS_WIPE_WARN.includes('消')) return 'wipe copy missing';
  const html = settingsScreenHtml(false, false);
  if (!html.includes(SETTINGS_SAVE_LEAD) || !html.includes(SETTINGS_WIPE) || !html.includes('id="mute"')) {
    return 'settings screen missing save/mute controls';
  }
  const ask = settingsScreenHtml(true, true);
  if (!ask.includes(SETTINGS_WIPE_WARN) || !ask.includes('wipe-yes')) return 'wipe confirm missing';
  if (!ask.includes('サウンドをオン')) return 'muted settings label missing';
  return null;
}

function inspectFirstSessionSurface(): string | null {
  if (TITLE_CONTINUE !== 'つづきから' || TITLE_NEW !== 'はじめから') return 'continue/new labels missing';
  if (!TITLE_NEW_WARN.includes('セーブ')) return 'new-game overwrite warning missing';
  const fresh = titleScreenHtml(false, false);
  if (!fresh.includes(TITLE_BRAND) || !fresh.includes(TITLE_START) || fresh.includes(TITLE_CONTINUE)) {
    return 'fresh title is not はじめる';
  }
  const cont = titleScreenHtml(true, false);
  if (!cont.includes(TITLE_CONTINUE) || !cont.includes(TITLE_NEW) || !cont.includes('id="new"')) {
    return 'continue title missing つづきから/はじめから';
  }
  const warn = titleScreenHtml(true, true);
  if (!warn.includes(TITLE_NEW_WARN) || !warn.includes('new-yes')) return 'new-game confirm missing';
  if (DEFAULT_PLAYER_NAME !== 'ルナネコ') return 'default name missing';
  const s = emptySave('', 'moonember');
  if (s.playerName !== 'ルナネコ') return 'empty name did not fall back';
  if (s.gold < (PACKS[0]?.price ?? 9999)) return 'cannot buy a first pack';
  if (s.decks.filter((d) => d.length === 30).length !== 1) return 'starter is not one filled deck';
  return null;
}

function inspectHomeLoop(): string | null {
  const html = homeScreenHtml(emptySave('QA', 'moonember'));
  for (const id of ['story', 'deck', 'shop', 'col', 'part', 'set']) {
    if (!html.includes(`id="${id}"`)) return `home missing #${id}`;
  }
  if (!html.includes('デック') || !html.includes('ショップ') || !html.includes('図鑑') || !html.includes('設定')) {
    return 'home menu labels missing';
  }
  if (html.includes('id="fuse"') || html.includes('合成')) return 'fusion remains on home';
  return null;
}

function inspectShopLoop(): string | null {
  if (PACKS.length < 8) return 'too few packs';
  if (PACKS.filter((p) => p.spec).length !== 5) return 'missing color packs';
  const rich = shopScreenHtml(999);
  const poor = shopScreenHtml(0);
  if (!rich.includes(SHOP_BUY) || !rich.includes('data-pack="seed"') || !rich.includes('data-pack="flame"')) {
    return 'shop buy control missing';
  }
  if (!poor.includes('ゴールド不足') || !poor.includes('disabled')) return 'broke shop still sells';
  const s = emptySave('QA', 'moonember');
  const before = s.gold;
  const r = buyPack(s, 'seed', () => 0.2);
  if (!r.ok) return `buyPack failed: ${r.reason}`;
  if (r.cards.length !== 5) return `pack not 5 cards: ${r.cards.length}`;
  if (s.gold !== before - (PACKS.find((p) => p.id === 'seed')?.price ?? 0)) return 'gold not spent';
  if (r.cards.some((id) => isExclusive(id))) return 'shop sold exclusive';
  return null;
}

function inspectCollectionLoop(): string | null {
  const s = emptySave('QA', 'moonember');
  const html = collectionScreenHtml(s, 'owned');
  if (!html.includes('data-col="owned"') || !html.includes('所持')) return 'owned filter missing';
  if (!html.includes('data-col="secret"') || !html.includes('秘蔵')) return 'secret filter missing';
  const owned = collectionVisible(s.cards, 'owned');
  if (!owned.length) return 'owned list empty on new save';
  if (owned.some((c) => (s.cards[c.id] ?? 0) <= 0)) return 'owned filter leaked unowned';
  const secret = collectionVisible(s.cards, 'secret');
  if (!secret.length) return 'secret list empty';
  if (secret.some((c) => !isExclusive(c.id))) return 'secret filter leaked non-exclusive';
  if (!html.includes('data-inspect="') || !html.includes('カードをタップして大きく見る')) return 'collection inspect missing';
  return null;
}

function inspectDeckLoop(): string | null {
  const s = emptySave('QA', 'moonember');
  const html = deckScreenHtml(s, 0);
  if (!html.includes('おすすめ') || !html.includes('data-suggest="flame"')) return 'suggest chips missing';
  if (!html.includes('deck-slide') || !html.includes('deck-slide-track')) return '2-row slide missing';
  if ((html.match(/長押しで説明/g) ?? []).length < 2) return 'long-press copy missing';
  const inspect = inspectHtml(getCard('moonember'), 'deck');
  if (!inspect.includes('deck-inspect-stage') || !inspect.includes('hero')) return 'deck inspect missing large card';
  if (!inspect.includes('foil-holo') || !inspect.includes('foil-glare')) return 'deck inspect missing holo';
  const rec = suggestDeck(s.cards, 'flame', s.starter);
  if (rec.deck.length !== 30) return `suggest not 30: ${rec.deck.length}`;
  if (validateDeck(rec.deck)) return `suggest illegal: ${validateDeck(rec.deck)}`;
  return null;
}

function inspectSurrenderLoop(): string | null {
  if (!giveupButtonHtml().includes('id="giveup"') || !giveupButtonHtml().includes('降参')) return 'giveup button missing';
  const ask = giveupOverlayHtml(true);
  if (!ask.includes('giveup-yes') || !ask.includes(GIVEUP_YES)) return 'giveup confirm missing';
  const d = starterDeck('moonember');
  let m = createMatch([d, starterDeck('windfeather')], ['A', 'B'], {}, 7);
  m = submit(m, 0, { type: 'surrender' });
  if (m.phase !== 'gameOver' || m.winner !== 1) return 'surrender did not concede';
  if (!m.log.some((l) => l.includes('降参'))) return 'surrender log missing';
  return null;
}

function inspectResultLoop(): string | null {
  if (!RESULT_LOSE.includes('負け') || !RESULT_LOSE.includes('経験値')) return 'lose copy missing XP note';
  const lose = resultHeadlineHtml(false, [0, 3]);
  if (!lose.includes(RESULT_LOSE_TITLE) || !lose.includes(RESULT_LOSE)) return 'lose headline missing';
  const win = resultHeadlineHtml(true, [3, 0]);
  if (win.includes(RESULT_LOSE_TITLE) || !win.includes('WIN')) return 'win headline missing';
  return null;
}

export function inspectQuality(): QualityResult[] {
  return QUALITY_ITEMS.map((item) => {
    const fail = item.inspect();
    return { id: item.id, name: item.name, pass: !fail, detail: fail ?? 'pass' };
  });
}

export function allQualityPassed(results = inspectQuality()): boolean {
  return results.every((r) => r.pass);
}

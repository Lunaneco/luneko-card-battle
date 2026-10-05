import { createStoryMatch } from '../engine/storyMatch';
import { audioReady, isMuted, setBgmMode, setMuted, sfx, startBgm, stopBgm } from '../audio/synth';
import { installVoiceUnlock, playStoryVoice, stopVoice } from '../audio/voice';
import {
  CARD_BY_ID,
  STARTER_PARTNERS,
  armorsOf,
  getCard,
  partners,
  starterDeck,
} from '../data/cards';
import { SHELL_EXPLAIN, SHELL_EVO_JA, SHELLS, shellName, shellOf } from '../data/shells';
import { PACK_BY_ID, buyPack, goldForLoss, goldForWin, xpForLoss, type PackId } from '../data/shop';
import { RARITY_JA, copyCapOf, exclusiveIdsOnFight, isExclusive, rarityLabel, rarityOf, sourceLabel } from '../data/rarity';
import { matchupText } from '../data/lines';
import { missionKey, settleStoryLoot, storyLoot } from '../data/missions';
import { badgeForFight, badgeRowHtml, claimLogin, recordResult, type LoginClaim } from '../data/rewards';
import { CITIES, CITY_ACT, STORY, faceIdOf, shellsGrantedByFight, stageSrc, type StoryNode } from '../data/story';
import { advanceCpu, type AiLevel } from '../engine/ai';
import { createMatch, isPartnerSeed, legalActions, partnerSeedCount, prepareResolveDemo, submit, tossFirst, validateDeck } from '../engine/battle';
import { suggestDeck } from '../engine/suggestDeck';
import {
  autoGrowthDelta,
  bonusLabel,
  growthLabel,
  pendingBonusRanks,
  rankPickButtonsHtml,
  totalGrowth,
  type RankStat,
  type RankUpEvent,
} from '../engine/rank';
import { evaluateYaku, yakuXp, type Yaku } from '../engine/yaku';
import type { Action, AttackSlot, MatchState, Specialty } from '../engine/types';
import { FieldFx, fxHudHtml, punchBattleFx, type SpecialKind } from '../fx/battlefield';
import { clearCharacterAttacks, warmCharacterAttacks } from '../fx/characterAttack';
import { NetClient, defaultWsUrl, hasOnlineRelay } from '../net/client';
import { publicHtml, publicUrl } from '../assets';
import { coinBurst, confetti, countUp, cutIn, damagePop, flash, fxHoldLeft, holdFx, kick, mountHypeLayer, screenShake, stamp } from '../fx/hype';
import {
  addCards,
  addGold,
  addShell,
  applyMuteToSave,
  chooseRankBonus,
  clearSave,
  emptySave,
  grantXp,
  loadSave,
  muteFromSave,
  partnerGrowth,
  partnerRanks,
  type SaveData,
  unlockPartner,
  writeSave,
} from '../state/save';
import { EFFECT_JA, specialtyChipLabel } from '../engine/types';
import { bindCardFoil, cardArt, cardHtml, faceSrc, fieldHtml } from './card';
import { evoCoach, markForEvo } from './evoMarks';
import { cinemaBannerText, fieldRole, resolveBoardHtml, resultBannerText, roleBadgeHtml } from './battleHud';
import { vsIntroHtml } from './vsIntro';
import { talkSceneHtml } from './talkView';
import { deckScreenHtml, type DeckFilter, type DeckSpec } from './deckView';
import { DEFAULT_PLAYER_NAME, PHASE_JA, STARTER_BLURB } from './copy';
import { settingsScreenHtml } from './settingsView';
import { titleScreenHtml } from './titleView';
import { homeScreenHtml } from './homeView';
import { shopScreenHtml } from './shopView';
import { collectionScreenHtml } from './collectionView';
import { badgeOverlayHtml, resultHeadlineHtml } from './resultView';
import { giveupButtonHtml, giveupOverlayHtml } from './giveupView';
import { bindDeckInspectTilt, inspectHtml, overlayWrap, rulesHtml } from './inspect';
import {
  markTutorialSeen,
  phaseNextTap,
  markShellTutorialPending,
  markShellTutorialSeen,
  shouldStartShellTutorial,
  shouldStartTutorial,
  tutorialForPhase,
  tutorialSpots,
  type TutSpot,
} from './tutorial';

type Screen =
  | 'title'
  | 'newgame'
  | 'home'
  | 'map'
  | 'talk'
  | 'brief'
  | 'battle'
  | 'result'
  | 'deck'
  | 'collection'
  | 'partners'
  | 'online'
  | 'settings'
  | 'shop';

interface BattleCtx {
  mode: 'story' | 'cpu' | 'online';
  nodeIndex?: number;
  match: MatchState;
  ai: AiLevel;
  script?: AttackSlot[];
  seat: 0 | 1;
  net?: NetClient;
  host?: boolean;
  tutorial?: boolean;
  tutorialKind?: 'basic' | 'shell';
  introPlayed?: boolean;
}

let root: HTMLElement;
let save: SaveData | null = null;
let screen: Screen = 'title';
let talk = { index: 0, line: 0, after: false };
let battle: BattleCtx | null = null;
let fx: FieldFx | null = null;
let toastTimer = 0;
let deckTab = 0;
let deckFilter: DeckFilter = 'all';
let deckSpec: DeckSpec = 'all';
let deckQuery = '';
let colFilter: 'owned' | 'secret' | 'all' = 'owned';
let nameDraft = DEFAULT_PLAYER_NAME;
let starterPick: string = 'moonember';
let roomCode = '';
let onlineName = '';
let pendingOnlineSeed = 1;
let inspectTarget: string | 'rules' | null = null;
let giveupAsk = false;
let titleNewAsk = false;
let settingsWipeAsk = false;
let lastGold = 0;
let rankCinemaDone = false;
let lastResult: {
  win: boolean;
  gold: number;
  baseXp: number;
  yaku: Yaku[];
  totalXp: number;
  partners: { id: string; name: string; before: { rank: number; xp: number; xpToNext: number }; after: { rank: number; xp: number; xpToNext: number } }[];
  rankUps: RankUpEvent[];
  rewards: string[];
  firstRewards: string[];
  dropRewards: string[];
  missions: { slot: number; label: string; ok: boolean; newly: boolean; already: boolean; reward: string[] }[];
  shell: string | null;
  shells: string[];
  score: [number, number];
  streak: number;
  streakGold: number;
  badge: string | null;
} | null = null;
let packReveal: { cards: string[]; flipped: number; fresh: Set<string>; pack?: PackId; opened?: boolean } | null = null;
let cinemaKey = '';
let cinemaTimer = 0;
let lastPhase = '';
let vsTimer = 0;
let aiTimer = 0;
let aiSequence = 0;

export function boot(el: HTMLElement) {
  installVoiceUnlock();
  el.innerHTML = '<div id="screen-root"></div><div id="hype-layer" aria-hidden="true"><canvas class="fx" id="fx"></canvas>' + fxHudHtml() + '</div>';
  root = el.querySelector('#screen-root') as HTMLElement;
  mountHypeLayer(el.querySelector('#hype-layer') as HTMLElement);
  bindCardFoil(root);
  save = loadSave();
  setMuted(muteFromSave(save));
  if (maybeCinemaDemo()) {
    render();
    return;
  }
  render();
}

function maybeCinemaDemo(): boolean {
  try {
    if (new URLSearchParams(location.search).get('cinema') !== '1') return false;
  } catch {
    return false;
  }
  if (!save) save = emptySave('QA', 'moonember');
  battle = { mode: 'cpu', match: prepareResolveDemo(), ai: 'tutorial', seat: 0, tutorial: false, introPlayed: true };
  screen = 'battle';
  return true;
}

function cinemaToken(s: MatchState): string {
  const lc = s.lastCombat;
  return `${s.seed}:${s.turn}:${s.phase}:${s.players.map(p => p.field?.cardId ?? '-').join(',')}:${lc?.slots.join(',')}:${lc?.powers.join(',')}:${lc?.supports.map((x) => x?.cardId ?? '-').join(',')}`;
}

function cinemaAlreadyPlayed(s: MatchState): boolean {
  return s.phase === 'resolve' && cinemaKey === cinemaToken(s);
}

function persist() {
  if (!save) return;
  applyMuteToSave(save, isMuted());
  writeSave(save);
}

function go(s: Screen) {
  stopVoice();
  cancelCpu();
  clearCharacterAttacks();
  window.clearTimeout(cinemaTimer);
  if (s === 'battle') {
    cinemaKey = '';
    const node = battle?.nodeIndex !== undefined ? STORY[battle.nodeIndex] : undefined;
    setBgmMode(node && (node.battle.ai === 'boss' || node.battle.ai === 'scripted') ? 'boss' : 'battle');
  } else setBgmMode('menu');
  if (s !== 'battle' && s !== 'title') startBgm();
  if (s !== 'title') titleNewAsk = false;
  if (s !== 'settings') settingsWipeAsk = false;
  screen = s;
  render();
}

function toast(msg: string) {
  const n = document.createElement('div');
  n.className = 'toast';
  n.textContent = msg;
  root.appendChild(n);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => n.remove(), 1800);
}

function render() {
  switch (screen) {
    case 'title':
      root.innerHTML = publicHtml(titleHtml());
      bindTitle();
      break;
    case 'newgame':
      root.innerHTML = publicHtml(newGameHtml());
      bindNewGame();
      break;
    case 'home':
      root.innerHTML = publicHtml(homeHtml());
      bindHome();
      break;
    case 'map':
      root.innerHTML = publicHtml(mapHtml());
      bindMap();
      break;
    case 'talk':
      root.innerHTML = publicHtml(talkHtml());
      bindTalk();
      break;
    case 'brief':
      root.innerHTML = publicHtml(briefHtml());
      bindBrief();
      break;
    case 'battle':
      root.innerHTML = publicHtml(battleHtml());
      bindBattle();
      break;
    case 'result':
      root.innerHTML = publicHtml(resultHtml());
      bindResult();
      break;
    case 'deck':
      root.innerHTML = publicHtml(deckHtml());
      bindDeck();
      break;
    case 'collection':
      root.innerHTML = publicHtml(collectionHtml());
      bindCollection();
      break;
    case 'partners':
      root.innerHTML = publicHtml(partnersHtml());
      bindBack();
      bindPartnerPicks();
      break;
    case 'online':
      root.innerHTML = publicHtml(onlineHtml());
      bindOnline();
      break;
    case 'settings':
      root.innerHTML = publicHtml(settingsHtml());
      bindSettings();
      break;
    case 'shop':
      root.innerHTML = publicHtml(shopHtml());
      bindShop();
      break;
  }
  if (inspectTarget === 'rules') {
    root.insertAdjacentHTML('beforeend', overlayWrap(rulesHtml()));
  } else if (inspectTarget && CARD_BY_ID[inspectTarget]) {
    const deckMode = screen === 'deck' || screen === 'collection';
    root.insertAdjacentHTML(
      'beforeend',
      overlayWrap(inspectHtml(getCard(inspectTarget), deckMode ? 'deck' : 'sheet'), deckMode ? 'deck' : undefined),
    );
  }
  bindInspectUi();
}

function bindInspectUi() {
  root.querySelector('#rules-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    inspectTarget = 'rules';
    render();
  });
  root.querySelectorAll('[data-inspect]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      inspectTarget = el.getAttribute('data-inspect');
      render();
    });
  });
  root.querySelector('.inspect-x')?.addEventListener('click', (e) => {
    e.stopPropagation();
    inspectTarget = null;
    render();
  });
  root.querySelector('#inspect-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      inspectTarget = null;
      render();
    }
  });
  bindDeckInspectTilt(root);
}

/* ——— screens ——— */

function titleHtml() {
  return titleScreenHtml(!!save, titleNewAsk);
}

function bindTitle() {
  $('#start')?.addEventListener('click', () => {
    audioReady();
    startBgm();
    sfx('tap');
    if (save) go('home');
    else go('newgame');
  });
  $('#new')?.addEventListener('click', () => {
    audioReady();
    sfx('tap');
    titleNewAsk = true;
    render();
  });
  $('#new-no')?.addEventListener('click', (e) => {
    e.stopPropagation();
    titleNewAsk = false;
    render();
  });
  $('#new-yes')?.addEventListener('click', (e) => {
    e.stopPropagation();
    titleNewAsk = false;
    sfx('tap');
    go('newgame');
  });
  $('#how')?.addEventListener('click', () => {
    sfx('tap');
    inspectTarget = 'rules';
    render();
  });
}

function newGameHtml() {
  const picks = STARTER_PARTNERS.map((id) => {
    const c = getCard(id);
    const on = starterPick === id ? 'on' : '';
    const art = 'art' in c && c.art ? c.art : '';
    const spec = c.kind === 'beast' ? c.specialty : 'rare';
    const blurb = STARTER_BLURB[id] ?? '';
    return `<button class="pick ${on}" data-id="${id}" aria-label="${escapeHtml(c.name)}">
      <div class="pick-art">
        <img src="${art}" alt="${escapeHtml(c.name)}"/>
        <span class="pick-name" hidden>${escapeHtml(c.name)}</span>
      </div>
      <div class="pick-body">
        <b class="pick-name">${escapeHtml(c.name)}</b>
        <div class="chip ${spec}">${specialtyChipLabel(spec)}</div>
        <p class="sub" style="text-align:left;margin-top:4px">${blurb}</p>
      </div>
    </button>`;
  }).join('');
  return `<section class="screen scroll">
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>パートナー選択</h2></div>
    <p class="sub">最初の1体。ほかのパートナーのたねと進化は物語とパックで全員揃う。デックに入れるのは1体だけ。</p>
    <div class="portrait-pick" style="margin:12px 0">${picks}</div>
    <label class="sub" for="name" style="text-align:left;display:block;margin-bottom:4px">プレイヤー名</label>
    <input id="name" placeholder="${DEFAULT_PLAYER_NAME}" maxlength="12" value="${escapeHtml(nameDraft)}"/>
    <button class="btn gold" id="go" style="margin-top:12px">ルナネットへ入る</button>
  </section>`;
}

function bindNewGame() {
  $('#back')?.addEventListener('click', () => go('title'));
  $$('.pick').forEach((el) =>
    el.addEventListener('click', () => {
      starterPick = el.getAttribute('data-id') || 'moonember';
      sfx('tap');
      render();
    }),
  );
  $('#name')?.addEventListener('input', (e) => {
    nameDraft = (e.target as HTMLInputElement).value;
  });
  $('#go')?.addEventListener('click', () => {
    save = emptySave(nameDraft || DEFAULT_PLAYER_NAME, starterPick);
    persist();
    sfx('evolve');
    startBgm();
    talk = { index: 0, line: 0, after: false };
    go('talk');
  });
}

function finishTutorial(skipped: boolean) {
  if (save) {
    save.flags =
      battle?.tutorialKind === 'shell'
        ? markShellTutorialSeen(save.flags, skipped)
        : markTutorialSeen(save.flags, skipped);
    persist();
  }
  if (battle) battle.tutorial = false;
}

let pendingLogin: LoginClaim | null = null;

function homeHtml() {
  if (!pendingLogin && save) {
    pendingLogin = claimLogin(save, new Date(), Math.random);
    if (pendingLogin) persist();
  }
  return homeScreenHtml(save!, pendingLogin);
}

function bindHome() {
  if (pendingLogin) sfx('badge');
  $('#login-ok')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const claim = pendingLogin;
    pendingLogin = null;
    if (!claim) return;
    sfx('coin');
    coinBurst($('#login-ok'), 16);
    if (claim.cards.length) {
      const fresh = new Set(claim.cards.filter((id) => (save?.cards[id] ?? 0) <= claim.cards.filter((x) => x === id).length));
      packReveal = { cards: sortForReveal(claim.cards), flipped: 0, fresh, pack: claim.reward.pack };
      go('shop');
      return;
    }
    window.setTimeout(render, 450);
  });
  $('#story')?.addEventListener('click', () => {
    sfx('tap');
    go('map');
  });
  $('#shop')?.addEventListener('click', () => {
    sfx('tap');
    packReveal = null;
    go('shop');
  });
  $('#online')?.addEventListener('click', () => {
    sfx('tap');
    go('online');
  });
  $('#deck')?.addEventListener('click', () => {
    sfx('tap');
    deckTab = save?.activeDeck ?? 0;
    deckFilter = 'all';
    go('deck');
  });
  $('#col')?.addEventListener('click', () => {
    sfx('tap');
    go('collection');
  });
  $('#part')?.addEventListener('click', () => {
    sfx('tap');
    go('partners');
  });
  $('#set')?.addEventListener('click', () => {
    sfx('tap');
    go('settings');
  });
}

function mapHtml() {
  const s = save!;
  const blocks: string[] = [];
  let lastAct = '';
  for (let i = 0; i < STORY.length; i++) {
    const n = STORY[i]!;
    const extra = n.id.startsWith('extra-');
    const act = extra ? 'EXTRA　クリア後の強敵たち' : (CITY_ACT[n.city]?.label ?? n.city);
    if (act !== lastAct) {
      blocks.push(`<h3 class="act-h">${escapeHtml(act)}</h3>`);
      lastAct = act;
    }
    const lock = i > s.chapter;
    const current = i === s.chapter;
    const cleared = s.clearedFights.includes(n.id);
    const city = CITIES.find((c) => c.id === n.city);
    const secrets = exclusiveIdsOnFight(n.id);
    const loot = storyLoot(n.id);
    const missDone = loot.missions.filter((_, slot) => s.missionClaimed.includes(missionKey(n.id, slot))).length;
    const lastOpen = secrets.length && !s.missionClaimed.includes(missionKey(n.id, 2));
    const newShell = n.battle.unlockShell && !s.shells.includes(n.battle.unlockShell);
    const badge = badgeForFight(n.id);
    const boss = n.battle.ai === 'boss' || n.battle.ai === 'scripted';
    const tags = [
      badge && !cleared ? `<span class="ntag badge-tag" style="--bc:${badge.color}">${badge.glyph} バッジ</span>` : '',
      newShell ? `<span class="ntag shell-tag">月殻</span>` : '',
      lastOpen ? `<span class="ntag secret-tag">秘蔵</span>` : '',
    ].join('');
    const face = lock ? '' : `<img class="node-face" src="${faceSrc(n.battle.opponentFace)}" alt=""/>`;
    blocks.push(`<button class="node ${lock ? 'lock' : ''}${current ? ' current' : ''}${cleared ? ' cleared' : ''}${boss ? ' boss' : ''}" data-i="${i}" ${lock ? 'disabled' : ''}>
      <img class="node-art" src="${stageSrc(n.city)}" alt=""/>
      ${face || '<span class="node-face lock-face">？</span>'}
      <div class="grow">
        <div class="city">${extra ? 'EXTRA' : `STAGE ${i + 1}`}　${city?.name ?? n.city}</div>
        <div class="nm">${lock ? '？？？' : escapeHtml(n.title)}</div>
        <div class="node-meta"><span class="kos">${lock ? '' : `${'★'.repeat(missDone)}<em>${'★'.repeat(3 - missDone)}</em>`}</span>${lock ? '' : tags}</div>
      </div>
      ${current ? '<span class="node-new">NEXT!</span>' : cleared ? '<span class="node-clear">CLEAR</span>' : boss && !lock ? '<span class="node-boss">BOSS</span>' : ''}
    </button>`);
  }
  const heroCity = STORY[Math.min(s.chapter, STORY.length - 1)]?.city ?? 'beginner';
  return `<section class="screen scroll map-screen">
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>ストーリー</h2><span class="gold-chip">${Math.min(s.chapter, STORY.length)}/${STORY.length}</span></div>
    <div class="map-hero">
      <img src="${stageSrc(heroCity)}" alt=""/>
      <div class="map-hero-cap"><small>あつめたバッジ</small>${badgeRowHtml(s.clearedFights)}</div>
    </div>
    <div class="map-list">${blocks.join('')}</div>
  </section>`;
}

function bindMap() {
  bindBack();
  root.querySelector('.node.current')?.scrollIntoView({ block: 'center' });
  $$('.node').forEach((el) =>
    el.addEventListener('click', () => {
      const i = Number(el.getAttribute('data-i'));
      if (Number.isNaN(i) || i > save!.chapter) return;
      talk = { index: i, line: 0, after: false };
      sfx('tap');
      go('talk');
    }),
  );
}

function currentNode(): StoryNode {
  return STORY[talk.index] ?? STORY[0]!;
}

function talkHtml() {
  const n = currentNode();
  const lines = talk.after ? n.after : n.before;
  const line = lines[Math.min(talk.line, lines.length - 1)];
  if (!line) {
    return `<section class="screen"><p>…</p></section>`;
  }
  const city = CITIES.find((c) => c.id === n.city);
  const isPlayer = line.face === 'player';
  const partnerFace = `/art/partners/${save?.starter ?? 'moonember'}.jpg`;
  const firstLine = talk.line === 0 && !talk.after;
  return talkSceneHtml({
    city: city?.name ?? '',
    title: n.title,
    stage: stageSrc(n.city),
    face: isPlayer ? partnerFace : faceSrc(line.face, line.mood),
    fallback: isPlayer ? partnerFace : faceSrc(line.face),
    speaker: isPlayer ? (save?.playerName ?? line.speaker) : line.speaker,
    text: line.text,
    mood: line.mood,
    faceId: line.face,
    chapter: firstLine ? (n.id.startsWith('extra-') ? 'EXTRA STAGE' : `STAGE ${talk.index + 1}`) : undefined,
    progress: `${Math.min(talk.line, lines.length - 1) + 1}/${lines.length}`,
  });
}

let typeTimer = 0;

function endTalk() {
  window.clearInterval(typeTimer);
  if (!talk.after) {
    go('brief');
    return;
  }
  go(talk.index >= STORY.length - 1 ? 'home' : 'map');
}

function bindTalk() {
  const n = currentNode();
  const lines = talk.after ? n.after : n.before;
  const tx = root.querySelector<HTMLElement>('.talk .tx');
  const full = tx?.dataset.full ?? '';
  let typing = false;
  window.clearInterval(typeTimer);
  if (tx && full && !quickMotion()) {
    typing = true;
    let i = 0;
    tx.textContent = '';
    root.querySelector('.talk')?.classList.add('typing');
    typeTimer = window.setInterval(() => {
      i += 1;
      tx.textContent = full.slice(0, i);
      if (i % 3 === 0) sfx('tick');
      if (i >= full.length) {
        window.clearInterval(typeTimer);
        typing = false;
        root.querySelector('.talk')?.classList.remove('typing');
      }
    }, 32);
  }
  $('#talk-skip')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx('tap');
    endTalk();
  });
  $('#talk')?.addEventListener('click', () => {
    if (typing && tx) {
      window.clearInterval(typeTimer);
      typing = false;
      tx.textContent = full;
      root.querySelector('.talk')?.classList.remove('typing');
      return;
    }
    sfx('tap');
    if (talk.line < lines.length - 1) {
      talk.line += 1;
      render();
      return;
    }
    endTalk();
  });
}

function briefHtml() {
  const n = currentNode();
  const s = save!;
  const loot = storyLoot(n.id);
  const firstDone = s.clearedFights.includes(n.id);
  const badge = badgeForFight(n.id);
  const boss = n.battle.ai === 'boss' || n.battle.ai === 'scripted';
  const rows = loot.missions
    .map((miss, slot) => {
      const claimed = s.missionClaimed.includes(missionKey(n.id, slot));
      const hard = slot === 2;
      return `<div class="mission-row ${claimed ? 'done' : ''} ${hard ? 'hard' : ''}">
        <div class="mstar">${claimed ? '★' : '☆'}</div>
        <div class="grow">
          <b>${escapeHtml(miss.label)}${hard ? '　<em>秘蔵</em>' : ''}</b>
          <p class="sub" style="text-align:left;margin:2px 0 0">${escapeHtml(miss.hint)}</p>
          <p class="sub mreward" style="text-align:left">${claimed ? 'ゲット済み！' : `ごほうび：${miss.reward.map((id) => getCard(id).name).join('・')}`}</p>
        </div>
      </div>`;
    })
    .join('');
  const firstCards = firstDone ? [] : loot.first;
  return `<section class="screen scroll brief-screen${boss ? ' boss' : ''}">
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>${boss ? 'BOSS BATTLE' : 'バトル'}</h2></div>
    <div class="brief-foe" style="background-image:url('${stageSrc(n.city)}')">
      <img src="${faceSrc(n.battle.opponentFace)}" alt=""/>
      <div class="brief-foe-txt">
        <small>VS</small>
        <b>${escapeHtml(n.battle.opponentName)}</b>
        ${n.battle.taunt ? `<p>「${escapeHtml(n.battle.taunt)}」</p>` : ''}
      </div>
    </div>
    <div class="brief-trait">${escapeHtml(n.battle.deckTrait)}</div>
    ${badge && !firstDone ? `<div class="brief-badge" style="--bc:${badge.color}"><i class="badge on" style="--bc:${badge.color}">${badge.glyph}</i><span>勝てば <b>${escapeHtml(badge.name)}</b> ゲット！</span></div>` : ''}
    <h3 class="res-h">ミッション</h3>
    <div class="col">${rows}</div>
    ${firstCards.length ? `<h3 class="res-h">はじめて勝ったらもらえる</h3><div class="hand brief-cards">${firstCards.map((id) => cardHtml(getCard(id), { size: 'tiny', extra: `data-inspect="${id}"` })).join('')}</div>` : ''}
    <p class="sub" style="margin-top:6px">勝つたびにドロップ：${loot.drop.map((id) => getCard(id).name).join(' / ')}</p>
    <div class="spacer"></div>
    <button class="btn gold big brief-go" id="go">バトル開始！</button>
  </section>`;
}

function bindBrief() {
  $('#back')?.addEventListener('click', () => {
    talk = { index: talk.index, line: 0, after: false };
    go('talk');
  });
  $('#go')?.addEventListener('click', () => startStoryBattle(talk.index));
}

function startStoryBattle(index: number) {
  if (!save) return;
  stopVoice();
  const n = STORY[index]!;
  const deck = save.decks[save.activeDeck] ?? starterDeck(save.starter);
  const err = validateDeck(deck);
  if (err) {
    toast(err);
    go('deck');
    return;
  }
  const seed = Date.now() % 1_000_000;
  const match = createStoryMatch(n, deck, save.playerName, seed, {
    ownedShells: save.shells,
    partnerRanks: partnerRanks(save), partnerGrowth: partnerGrowth(save),
  });
  battle = {
    mode: 'story',
    nodeIndex: index,
    match,
    ai: n.battle.ai,
    script: n.battle.script,
    seat: 0,
    tutorial: (shouldStartTutorial(save.flags, save.wins) && index === 0) || shouldStartShellTutorial(save.flags),
    tutorialKind: shouldStartTutorial(save.flags, save.wins) && index === 0 ? 'basic' : shouldStartShellTutorial(save.flags) ? 'shell' : undefined,
  };
  go('battle');
}

function tutOn(...spots: TutSpot[]): string {
  if (!battle?.tutorial) return '';
  const active = tutorialSpots(battle.match.phase, battle.tutorialKind ?? 'basic');
  return spots.some((s) => active.includes(s)) ? 'tut-spot' : '';
}

function liveTutorialHtml(): string {
  if (!battle?.tutorial) return '';
  const s = battle.match;
  const myTurn = s.waitingOn.includes(battle.seat);
  if (!myTurn && s.phase !== 'resolve' && s.phase !== 'gameOver') {
    return `<aside class="tut-live slim" id="tut-live">
      <div class="tut-live-bar">
        <span>れんしゅう</span>
        <button type="button" class="btn sm ghost" id="tut-skip">とばす</button>
      </div>
      <p class="tut-title">あいてのばん</p>
      <p class="tut-tap">終わるまで待ってね</p>
    </aside>`;
  }
  const step = tutorialForPhase(s.phase, battle.tutorialKind ?? 'basic');
  if (!step) return '';
  return `<aside class="tut-live" id="tut-live">
    <div class="tut-live-bar">
      <span>れんしゅう</span>
      <button type="button" class="btn sm ghost" id="tut-skip">とばす</button>
    </div>
    <p class="tut-title">${escapeHtml(step.title)}</p>
    <p class="tut-tap">👉 ${escapeHtml(step.tap)}</p>
  </aside>`;
}

function koPips(n: number): string {
  return `<div class="kos" aria-label="撃破 ${n}/3">${[0, 1, 2].map((i) => `<i class="ko-pip${i < n ? ' on' : ''}">★</i>`).join('')}</div>`;
}

function whoBarHtml(p: MatchState['players'][0], face: string, s: MatchState, mine: boolean, extra = ''): string {
  return `<div class="who ${mine ? 'me' : 'you'}">
    <img src="${face}" alt=""/>
    <div class="grow">
      <div class="who-name"><b>${escapeHtml(p.name)}</b>${roleBadgeHtml(s, p.id)}</div>
      <div class="hpbar ${mine ? 'me' : ''}"><i style="width:${hpPct(p)}%"></i></div>
    </div>
    ${koPips(p.kos)}
    ${extra}
  </div>`;
}

function finaleHtml(s: MatchState, seat: 0 | 1): string {
  if (s.phase !== 'gameOver') return '';
  const win = s.winner === seat;
  const me = s.players[seat];
  const you = s.players[seat === 0 ? 1 : 0];
  const node = battle?.nodeIndex !== undefined ? STORY[battle.nodeIndex] : undefined;
  const line = win
    ? node?.battle.winLine ?? 'やったね！ 最高のバトルだった！'
    : node?.battle.loseLine ?? 'くやしい…！ デックを見直して、もう一回！';
  return `<div class="finale ${win ? 'win' : 'lose'}" id="finale">
    <div class="finale-rays"></div>
    <div class="finale-title">${win ? 'VICTORY!!' : 'LOSE…'}</div>
    <div class="finale-score"><span>${me.kos}</span><i>-</i><span>${you.kos}</span></div>
    <p class="finale-line">${escapeHtml(line)}</p>
    <button class="btn gold big" id="end">${win ? 'ごほうびを見る ▶' : '結果へ ▶'}</button>
  </div>`;
}

function battleHtml() {
  const b = battle!;
  const s = b.match;
  const me = s.players[b.seat];
  const you = s.players[b.seat === 0 ? 1 : 0];
  const myTurn = s.waitingOn.includes(b.seat);
  const acts = legalActions(s, b.seat);
  const last = s.events.at(-1)?.text ?? s.log.at(-1) ?? '';
  const node = b.nodeIndex !== undefined ? STORY[b.nodeIndex] : undefined;
  const stage = node ? stageSrc(node.city) : '/art/ui/battlefield.jpg';
  const city = node ? (CITIES.find((c) => c.id === node.city)?.name ?? 'ルナネット') : 'フリーバトル';
  const meFace = `/art/partners/${save?.starter ?? 'moonember'}.jpg`;
  const youFace = faceSrc(storyFace(you.name));
  const intro = !b.introPlayed
    ? vsIntroHtml({
        youName: you.name,
        youFace,
        meName: me.name,
        meFace,
        youRole: fieldRole(s, you.id),
        meRole: fieldRole(s, me.id),
        meFirst: s.firstPlayer === b.seat,
        city,
        stage,
        trait: node?.battle.deckTrait,
        taunt: node?.battle.taunt,
        boss: node ? node.battle.ai === 'boss' || node.battle.ai === 'scripted' : false,
      })
    : '';
  const phasePop = s.phase !== lastPhase ? ' pop' : '';
  const meFirstNow = s.active === b.seat;
  const tools = `<div class="who-tools">
      <button class="help-inline" id="rules-btn" type="button" title="ルール">?</button>
      ${s.phase === 'gameOver' ? '' : giveupButtonHtml()}
    </div>`;
  const matchup =
    me.field && you.field
      ? (() => {
          const m = matchupText(me.field.specialty, you.field.specialty);
          return `<div class="matchup ${m.kind}">${escapeHtml(m.text)}</div>`;
        })()
      : '';
  return `<section class="screen battle${node && (node.battle.ai === 'boss' || node.battle.ai === 'scripted') ? ' boss' : ''}">
    <div class="battle-bg" style="background-image:url('${stage}')"></div>
    ${intro}
    <div class="hud">
      ${whoBarHtml(you, youFace, s, false, tools)}
      <div class="hand opp-hand">
        ${you.hand
          .map((c) =>
            cardHtml(getCard(c.cardId), {
              size: 'tiny',
              hideInfo: true,
              highlight: !!tutOn('opp-hand'),
              extra: `data-inspect="${c.cardId}"`,
            }),
          )
          .join('')}
      </div>
      <div class="field-row">
        ${fieldHtml(you.field, false, fieldRole(s, you.id))}
        <div class="battle-mid">
          <div class="phase-pill${phasePop}">${PHASE_JA[s.phase] ?? s.phase}</div>
          <div class="mid-vs">VS</div>
          ${battle?.tutorial ? '' : `<div class="turn-line ${meFirstNow ? 'me' : 'you'}">${meFirstNow ? '⚡ 自分が先攻' : '⚡ 相手が先攻'}</div>`}
          ${matchup}
          <div class="pow-row" title="進化ポイント"><span>進化P</span><b class="you">${you.pow}</b><b class="me">${me.pow}</b></div>
          <div class="deck-row">山札 ${you.deck.length} | ${me.deck.length}</div>
        </div>
        ${fieldHtml(me.field, true, fieldRole(s, me.id))}
      </div>
      ${battle?.tutorial ? '' : `<div class="logbox">${escapeHtml(last)}</div>`}
      <div class="hand" id="myhand">
        ${me.hand
          .map((c) => {
            const def = getCard(c.cardId);
            const tane = def.kind === 'beast' && def.level === 'III';
            const item = def.kind === 'option';
            const mark = s.phase === 'evo' && myTurn ? markForEvo(me.field, me.pow, c.cardId) : null;
            const hi =
              !!(tane && tutOn('hand-tane')) ||
              !!(mark?.kind === 'evolve' && tutOn('hand-beast')) ||
              !!(item && tutOn('hand-item'));
            return cardHtml(def, {
              extra: `data-iid="${c.instanceId}"`,
              highlight: hi,
              hideInfo: true,
              evoKind: mark?.kind,
              evoLabel: mark?.label,
              chargeLabel: mark?.chargeLabel,
              chargeIid: mark?.canCharge ? c.instanceId : undefined,
            });
          })
          .join('')}
      </div>
      ${liveTutorialHtml()}
      <div id="acts">${actionBar(s, acts, myTurn, me.field)}</div>
      ${whoBarHtml(me, meFace, s, true)}
    </div>
    ${s.phase === 'resolve' ? resolveBoardHtml(s, b.seat, { played: cinemaAlreadyPlayed(s) }) : ''}
    ${finaleHtml(s, b.seat)}
    ${giveupOverlayHtml(giveupAsk)}
  </section>`;
}

function hpPct(p: MatchState['players'][0]): number {
  if (!p.field) return 0;
  return Math.max(0, Math.round((p.field.hp / p.field.maxHp) * 100));
}

function storyFace(name: string): string {
  const n = battle?.nodeIndex !== undefined ? STORY[battle.nodeIndex] : undefined;
  if (n && n.battle.opponentName === name) return n.battle.opponentFace;
  return faceIdOf(name);
}

function phaseHint(phase: MatchState['phase']): string {
  return phaseNextTap(phase);
}

function fxLabel(field: NonNullable<MatchState['players'][0]['field']>, slot: 'circle' | 'triangle' | 'cross'): string {
  const a = field[slot];
  if (a.effect !== 'none') return EFFECT_JA[a.effect];
  if (slot === 'circle') return field.skillName;
  if (slot === 'triangle') return '通常';
  return '特殊';
}

function actionBar(s: MatchState, acts: Action[], myTurn: boolean, field: MatchState['players'][0]['field']): string {
  const hint = battle?.tutorial ? '' : `<p class="coach">${phaseHint(s.phase)}</p>`;
  if (s.phase === 'gameOver') return '';
  if (!myTurn) return `<p class="sub">相手の入力を待っています…</p>`;
  if (s.phase === 'mulligan') {
    const canRedraw = acts.some((a) => a.type === 'mulligan' && a.redraw);
    return `${hint}<div class="row">
      ${canRedraw ? `<button class="btn" data-act='{"type":"mulligan","redraw":true}'>引き直す</button>` : ''}
      <button class="btn gold ${tutOn('mulligan')}" data-act='{"type":"mulligan","redraw":false}'>この手で行く</button>
    </div>`;
  }
  if (s.phase === 'turnDraw') {
    return `${hint}<div class="row">
      <button class="btn gold" data-act='{"type":"mulligan","redraw":false}'>つづける</button>
    </div>`;
  }
  if (s.phase === 'summon' || s.phase === 'postKo') {
    return `${hint}<p class="sub">手札のビーストをタップして召喚</p>`;
  }
  if (s.phase === 'evo') {
    const armor = acts.filter((a) => a.type === 'moonGarb');
    const evo = acts.filter((a) => a.type === 'evolve');
    const opt = acts.filter((a) => a.type === 'evoOption');
    const marks = battle
      ? battle.match.players[battle.seat].hand.map((c) => markForEvo(field, battle!.match.players[battle!.seat].pow, c.cardId))
      : [];
    const coach = battle?.tutorial ? '' : `<p class="coach">${evoCoach(marks.some((m) => m?.kind === 'evolve'), marks.some((m) => m?.kind === 'needPow'))}</p>`;
    return `<div class="col">
      ${coach}
      ${armor.map((a) => (a.type === 'moonGarb' ? `<button class="btn gold ${tutOn('moon-garb')}" data-act='${JSON.stringify(a)}'>${SHELL_EVO_JA} ${getCard(a.cardId).name}</button>` : '')).join('')}
      ${evo.length ? `<p class="sub">金枠のカードをタップで進化</p>` : ''}
      ${opt.map((a) => (a.type === 'evoOption' ? `<button class="btn" data-act='${JSON.stringify(a)}'>${labelAction(a)}</button>` : '')).join('')}
      <button class="btn" data-act='{"type":"skipEvo"}'>進化を終える</button>
    </div>`;
  }
  if (s.phase === 'attack' && field) {
    const first = fieldRole(s, battle!.seat) === '先攻' ? '先攻！ 先にダメージを入れられる' : '後攻… 相手のあとで反撃！';
    const btn = (slot: AttackSlot, sym: string, name: string) =>
      `<button class="atk ${slot} ${tutOn('atk')}" data-act='{"type":"chooseAttack","slot":"${slot}"}'><div class="sym">${sym}</div><div class="pw">${field[slot].power}</div><div class="fxn">${fxLabel(field, slot) || name}</div></button>`;
    return `${hint}<p class="coach">${first}</p><div class="atk-row">
      ${btn('circle', '○', '必殺')}
      ${btn('triangle', '△', '通常')}
      ${btn('cross', '×', '特殊')}
    </div>`;
  }
  if (s.phase === 'support') {
    return `${hint}<div class="row">
      <button class="btn ${tutOn('support')}" data-act='{"type":"playSupport","target":"none"}'>援護なし</button>
      <button class="btn" data-act='{"type":"playSupport","target":"deck"}'>山札の上を裏返す</button>
    </div><p class="sub">手札タップでも援護。山札の上は表になって効果発動</p>`;
  }
  if (s.phase === 'resolve') {
    return `${hint}${s.lastCombat ? '' : '<button class="btn gold" data-act=\'{"type":"ackResolve"}\'>次へ</button>'}`;
  }
  return '';
}

function labelAction(a: Action): string {
  if (a.type === 'evoOption') {
    const id = battle?.match.players[battle.seat].hand.find((c) => c.instanceId === a.instanceId)?.cardId;
    return id ? getCard(id).name : '進化オプション';
  }
  return a.type;
}

function bindBattle() {
  const canvas = document.getElementById('fx') as HTMLCanvasElement | null;
  if (canvas) {
    if (!fx) {
      fx = new FieldFx(canvas);
      window.addEventListener('resize', () => fx?.resize());
    }
    fx.resize();
    fx.start();
    const s = battle!.match;
    warmCharacterAttacks(s.players.map((p) => p.field?.cardId));
    lastPhase = s.phase;
    if (!battle!.introPlayed) {
      playVsIntro();
    } else if (s.phase === 'resolve' && s.lastCombat) {
      if (!cinemaAlreadyPlayed(s)) {
        cinemaKey = cinemaToken(s);
        playCombatCinema();
      }
    } else {
      playEvents(s);
    }
  }
  $$('[data-act]').forEach((el) =>
    el.addEventListener('click', () => {
      const act = JSON.parse(el.getAttribute('data-act') || '{}') as Action;
      doAct(act);
    }),
  );
  $('#end')?.addEventListener('click', finishBattle);
  playFinale();
  $('#giveup')?.addEventListener('click', (e) => {
    e.stopPropagation();
    giveupAsk = true;
    $('#giveup-overlay')?.classList.add('on');
  });
  $('#giveup-no')?.addEventListener('click', (e) => {
    e.stopPropagation();
    giveupAsk = false;
    $('#giveup-overlay')?.classList.remove('on');
  });
  $('#giveup-yes')?.addEventListener('click', (e) => {
    e.stopPropagation();
    giveupAsk = false;
    doAct({ type: 'surrender' });
  });
  $('#tut-skip')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx('tap');
    finishTutorial(true);
    render();
  });
  $$('#myhand [data-charge]').forEach((el) => {
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('pointerdown', stop);
    el.addEventListener('click', stop);
    el.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      const iid = el.getAttribute('data-charge');
      if (iid) doAct({ type: 'charge', instanceId: iid });
    });
  });
  $$('#myhand .card').forEach((el) => {
    const iid = el.getAttribute('data-iid');
    const cardId = el.getAttribute('data-id');
    bindHoldInspect(el, cardId, () => {
      if (!iid || !battle) return;
      const s = battle.match;
      if (s.phase === 'summon' || s.phase === 'postKo') doAct({ type: 'summon', instanceId: iid });
      else if (s.phase === 'evo') {
        const card = s.players[battle.seat].hand.find((c) => c.instanceId === iid);
        if (!card) return;
        const d = getCard(card.cardId);
        if (d.kind === 'beast') {
          const canEvo = legalActions(s, battle.seat).some((a) => a.type === 'evolve' && a.instanceId === iid);
          doAct(canEvo ? { type: 'evolve', instanceId: iid } : { type: 'charge', instanceId: iid });
        } else doAct({ type: 'evoOption', instanceId: iid });
      } else if (s.phase === 'support') doAct({ type: 'playSupport', target: iid });
    });
  });
}

const HOLD_INSPECT_MS = 420;
const HOLD_MOVE_PX = 12;

function bindHoldInspect(el: HTMLElement, cardId: string | null, onTap: () => void) {
  let timer = 0;
  let held = false;
  let sx = 0;
  let sy = 0;
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    held = false;
    if (!cardId) return;
    sx = e.clientX;
    sy = e.clientY;
    timer = window.setTimeout(() => {
      held = true;
      inspectTarget = cardId;
      render();
    }, HOLD_INSPECT_MS);
  });
  const clear = () => window.clearTimeout(timer);
  el.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - sx) > HOLD_MOVE_PX || Math.abs(e.clientY - sy) > HOLD_MOVE_PX) clear();
  });
  el.addEventListener('pointerup', () => {
    clear();
    if (!held) onTap();
  });
  el.addEventListener('pointerleave', clear);
  el.addEventListener('pointercancel', clear);
}

function pulseField(opp: boolean) {
  const wraps = root.querySelectorAll('.field-wrap');
  const el = wraps[opp ? 0 : wraps.length - 1] as HTMLElement | undefined;
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}

function playVsIntro() {
  const overlay = document.getElementById('vs-intro');
  if (!overlay || !battle) return;
  if (battle.mode === 'story' && battle.nodeIndex !== undefined) {
    void playStoryVoice(STORY[battle.nodeIndex]!.id, 'taunt');
  }
  sfx('vs');
  cinemaKo = false;
  finaleKey = '';
  window.setTimeout(() => {
    if (!battle?.introPlayed) {
      fx?.intro();
      sfx('clash');
      screenShake('hard');
    }
  }, 380);
  window.clearTimeout(vsTimer);
  let done = false;
  const finish = () => {
    if (done || !battle) return;
    done = true;
    window.clearTimeout(vsTimer);
    battle.introPlayed = true;
    overlay.classList.add('out');
    window.setTimeout(() => {
      if (screen === 'battle') {
        render();
        pumpAi();
      }
    }, 360);
  };
  overlay.addEventListener('click', finish);
  const quick = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  vsTimer = window.setTimeout(finish, quick ? 700 : 3300);
}

function fieldEl(enemy: boolean): HTMLElement | null {
  const wraps = root.querySelectorAll<HTMLElement>('.field-wrap');
  return (wraps[enemy ? 0 : wraps.length - 1] as HTMLElement | undefined) ?? null;
}

function playEvents(s: MatchState) {
  if (s.phase === 'resolve') return;
  const hasAttackEvents = s.events.some(ev => ev.type === 'attack');
  for (const ev of s.events) {
    const enemy = ev.actor !== battle?.seat;
    if ((ev.type === 'attack' || (!hasAttackEvents && ev.type === 'damage')) && ev.slot && ev.specialty) {
      if (ev.outcome === 'interrupted') continue;
      const attacker = ev.type === 'attack' ? ev.actor! : ev.attacker ?? (ev.actor === 0 ? 1 : 0);
      const landed = (ev.amount ?? 0) > 0;
      fx?.attack(ev.slot, ev.specialty, attacker !== battle?.seat, ev.cardId ?? s.players[attacker].field?.cardId, false, landed);
      sfx(ev.slot);
      if (landed) {
        pulseField(attacker === battle?.seat);
        punchBattleFx(ev.text.includes('弱点') ? 'weak' : 'hit');
      }
    } else if (ev.type === 'ko') {
      if (cinemaKo) continue;
      fx?.ko(enemy);
      sfx('ko');
      punchBattleFx('ko');
    } else if (ev.type === 'armor') {
      fx?.moonGarb(enemy);
      sfx('garb');
      const c = ev.cardId ? CARD_BY_ID[ev.cardId] : undefined;
      if (c) cutIn({ art: cardArt(c), title: enemy ? 'あいての月装!!' : '月装!!', name: c.name, kind: 'garb', enemy });
      kick(fieldEl(enemy), 'evo-in', 900);
    } else if (ev.type === 'evolve') {
      fx?.evolve(enemy);
      sfx('evolve');
      const c = ev.cardId ? CARD_BY_ID[ev.cardId] : undefined;
      if (c) cutIn({ art: cardArt(c), title: enemy ? 'あいてが進化!!' : '進化!!', name: c.name, kind: 'evo', enemy });
      kick(fieldEl(enemy), 'evo-in', 900);
    } else if (ev.type === 'summon') {
      fx?.summon(enemy);
      sfx('summon');
      kick(fieldEl(enemy), 'slam-in', 700);
      holdFx(450);
    } else if (ev.type === 'heal' || ev.type === 'drain') {
      fx?.heal();
      sfx('heal');
      if (ev.amount) damagePop(fieldEl(enemy), ev.amount, { heal: true });
    } else if (ev.type === 'first') {
      fx?.special('firstStrike', enemy);
      sfx('special');
    } else if (ev.type === 'counter') {
      fx?.special('counter', enemy);
      sfx('special');
    } else if (ev.type === 'deckSupport') {
      sfx('flip');
    } else if (ev.type === 'win') {
      sfx('win');
    } else if (ev.type === 'turn') {
      cinemaKo = false;
    }
  }
}

const SPECIAL_FX: Record<string, SpecialKind> = {
  先制: 'firstStrike',
  カウンター: 'counter',
  すいとる: 'drain',
  自爆: 'suicide',
  妨害: 'jam',
};

let cinemaKo = false;

function finishCombatCinema() {
  window.clearTimeout(cinemaTimer);
  clearCharacterAttacks();
  const cine = document.getElementById('combat-cinema');
  if (!cine || !battle) return;
  render();
}

function playCombatCinema() {
  const s = battle?.match;
  const lc = s?.lastCombat;
  const cine = document.getElementById('combat-cinema');
  if (!s || !lc || !cine || !battle) return;
  window.clearTimeout(cinemaTimer);
  const seat = battle.seat;
  const side = (i: 0 | 1) => cine.querySelector<HTMLElement>(`.clash-side[data-seat="${i}"]`);
  const banner = document.getElementById('cinema-banner');
  const say = (text: string, kind: string) => {
    if (!banner) return;
    banner.textContent = text;
    banner.dataset.kind = kind;
    kick(banner, 'pop', 400);
  };
  const setHp = (i: 0 | 1, hp: number) => {
    const el = side(i);
    if (!el) return;
    const max = Number(el.dataset.maxHp ?? 1);
    const pct = `${Math.max(0, Math.min(100, Math.round((hp / Math.max(1, max)) * 100)))}%`;
    const fill = el.querySelector<HTMLElement>('.clash-bar .fill');
    const ghost = el.querySelector<HTMLElement>('.clash-bar .ghost');
    if (fill) fill.style.width = pct;
    window.setTimeout(() => {
      if (ghost) ghost.style.width = pct;
    }, 380);
    const num = el.querySelector<HTMLElement>('.hpnum');
    countUp(num, Number(num?.textContent ?? hp), hp, 520);
  };
  const shown: [number, number] = [lc.hpBefore[0], lc.hpBefore[1]];
  cine.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.clash-next')) return;
    if (cine.classList.contains('done')) return;
    finishCombatCinema();
  });

  const steps: Array<() => number> = [];
  steps.push(() => {
    cine.classList.add('st-in');
    sfx('vs');
    return 420;
  });
  steps.push(() => {
    cine.classList.add('st-cmd');
    sfx('clash');
    flash('#ffffffaa');
    screenShake('soft');
    const o: 0 | 1 = seat === 0 ? 1 : 0;
    say(`${SLOT_JA_UI[lc.slots[o]]} ${lc.basePowers[o]}  VS  ${SLOT_JA_UI[lc.slots[seat]]} ${lc.basePowers[seat]}`, 'compare');
    return 760;
  });
  for (const b of lc.beats) {
    if (b.kind === 'flip' && b.cardId) {
      steps.push(() => {
        const el = side(b.actor ?? 0);
        el?.classList.add('flip-on');
        sfx('flip');
        say(cinemaBannerText(b), 'flip');
        return b.fromDeck ? 900 : 620;
      });
    } else if (b.kind === 'supportFx') {
      steps.push(() => {
        const i = b.actor ?? 0;
        const el = side(i);
        const pw = el?.querySelector<HTMLElement>('.cinema-cmd .pw');
        const base = Number(pw?.dataset.base ?? 0);
        const fin = Number(pw?.dataset.final ?? base);
        say(cinemaBannerText(b), 'flip');
        if (fin !== base && pw) {
          countUp(pw, base, fin, 520);
          kick(el?.querySelector('.cinema-cmd') ?? null, 'pump', 700);
          sfx('powerup');
          if (fin > base) stamp(`+${fin - base}`, 'gold', { at: pw, ms: 800 });
        }
        if (b.body?.includes('HP')) {
          fx?.heal();
          sfx('heal');
          const m = b.body.match(/HP\+(\d+)/);
          if (m) damagePop(el?.querySelector('.fighter-art') ?? null, Number(m[1]), { heal: true });
        }
        return 640;
      });
    } else if (b.kind === 'special') {
      steps.push(() => {
        const i = b.actor ?? 0;
        const kind = SPECIAL_FX[b.title] ?? (b.title.includes('0') ? 'zero' : undefined);
        if (kind) fx?.special(kind, i !== seat);
        sfx('special');
        say(cinemaBannerText(b), 'special');
        stamp(`${b.title}!!`, 'special', { at: side(i)?.querySelector('.fighter-art') ?? null });
        if (b.title.includes('0')) {
          const o: 0 | 1 = i === 0 ? 1 : 0;
          const pw = side(o)?.querySelector<HTMLElement>('.cinema-cmd .pw');
          if (pw) countUp(pw, Number(pw.textContent ?? 0), Number(pw.dataset.final ?? 0), 400);
        }
        return 700;
      });
    } else if ((b.kind === 'hit' || b.kind === 'attack') && b.slot) {
      steps.push(() => {
        const i = b.actor ?? 0;
        if (b.outcome === 'interrupted') {
          say(`${s.players[i].name} は撃破され、${SLOT_NAME[b.slot!]}を出せない！`, 'interrupted');
          return 450;
        }
        const o: 0 | 1 = i === 0 ? 1 : 0;
        const atkSide = side(i);
        const tgtSide = side(o);
        const pw = atkSide?.querySelector<HTMLElement>('.cinema-cmd .pw');
        if (pw) pw.textContent = pw.dataset.final ?? pw.textContent;
        kick(atkSide?.querySelector('.fighter-art') ?? null, 'lunge', 520);
        const fighter = s.players[i].field;
        const cardId = b.cardId ?? fighter?.cardId;
        const spec = b.specialty ?? fighter?.specialty ?? 'flame';
        const motionStarted = fx?.windup(b.slot!, spec, i !== seat, cardId) ?? false;
        const weak = !!lc.weakHits?.[i];
        const amount = b.amount ?? lc.damages[i];
        const skill = b.skill ?? lc.skills[i];
        say(`${s.players[i].name} の${SLOT_NAME[b.slot!]}${skill ? `「${skill}」` : ''}！ ${amount} ダメージ${weak ? '！ 弱点！！' : '！'}`, amount > 0 ? 'hit' : 'zero');
        window.setTimeout(() => {
          if (!cine.isConnected) return;
          fx?.attack(b.slot!, spec, i !== seat, cardId, motionStarted, amount > 0);
          sfx(b.slot!);
          if (amount > 0) {
            sfx(weak ? 'crit' : 'impact');
            kick(tgtSide?.querySelector('.fighter-art') ?? null, 'struck', 520);
            damagePop(tgtSide?.querySelector('.fighter-art') ?? null, amount, { weak });
            shown[o] = lc.hpAfter[o];
            setHp(o, shown[o]);
            screenShake(weak || amount >= 500 ? 'hard' : 'soft');
          } else {
            stamp('ダメージ0', 'special', { at: tgtSide?.querySelector('.fighter-art') ?? null, ms: 650 });
          }
          if (lc.effectLabels[i].includes('すいとる') && lc.hpAfter[i] > shown[i]) {
            damagePop(atkSide?.querySelector('.fighter-art') ?? null, lc.hpAfter[i] - shown[i], { heal: true });
            shown[i] = lc.hpAfter[i];
            setHp(i, shown[i]);
          }
          if (weak) stamp('こうかばつぐん!!', 'weak', { ms: 900 });
        }, 100);
        return 1000;
      });
    } else if (b.kind === 'ko') {
      steps.push(() => {
        const i = b.actor ?? 0;
        const el = side(i);
        el?.classList.add('is-ko');
        fx?.ko(i !== seat);
        sfx('ko');
        screenShake('hard');
        flash('#ffffff');
        stamp(i === seat ? 'やられた…' : '撃破!!', i === seat ? 'lose' : 'ko', { sub: el?.querySelector('.fighter-name')?.textContent ?? '' });
        say(cinemaBannerText(b), 'ko');
        cinemaKo = true;
        return 1200;
      });
    }
  }
  steps.push(() => {
    setHp(0, lc.hpAfter[0]);
    setHp(1, lc.hpAfter[1]);
    cine.classList.add('done');
    say(resultBannerText(s, seat), 'end');
    return 0;
  });
  let i = 0;
  const run = () => {
    const step = steps[i++];
    if (!step || !battle || !cine.isConnected) return;
    const wait = step();
    if (i < steps.length) cinemaTimer = window.setTimeout(run, quickMotion() ? Math.min(wait, 240) : wait);
  };
  run();
}

const SLOT_JA_UI = { circle: '○', triangle: '△', cross: '×' } as const;
const SLOT_NAME = { circle: '○必殺', triangle: '△通常', cross: '×特殊' } as const;

function quickMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let finaleKey = '';

function playFinale() {
  const s = battle?.match;
  if (!s || s.phase !== 'gameOver' || !battle) return;
  const key = `${s.seed}:${s.turn}:${s.winner}`;
  if (finaleKey === key) {
    document.getElementById('finale')?.classList.add('shown');
    return;
  }
  finaleKey = key;
  const win = s.winner === battle.seat;
  if (battle.mode === 'story' && battle.nodeIndex !== undefined) {
    void playStoryVoice(STORY[battle.nodeIndex]!.id, win ? 'win' : 'lose');
  }
  stopBgm();
  if (win) {
    sfx('fanfare');
    window.setTimeout(() => confetti(90), 250);
    flash('#fff3c0');
  } else {
    sfx('lose');
  }
}

function hasSeedInHand(s: MatchState, seat: 0 | 1): boolean {
  return s.players[seat].hand.some((c) => {
    const d = getCard(c.cardId);
    return d.kind === 'beast' && d.level === 'III';
  });
}

function tutorialAllows(act: Action): boolean {
  if (!battle?.tutorial) return true;
  const s = battle.match;
  const me = s.players[battle.seat];
  if (s.phase === 'mulligan') {
    if (act.type !== 'mulligan') return false;
    if (hasSeedInHand(s, battle.seat)) return act.redraw === false;
    return true;
  }
  if (s.phase === 'turnDraw') {
    return act.type === 'mulligan' && act.redraw === false;
  }
  if (s.phase === 'summon' || s.phase === 'postKo') {
    if (act.type !== 'summon') return false;
    const card = me.hand.find((c) => c.instanceId === act.instanceId);
    if (!card) return false;
    const d = getCard(card.cardId);
    if (d.kind !== 'beast') return false;
    if (hasSeedInHand(s, battle.seat)) return d.level === 'III';
    return true;
  }
  if (s.phase === 'evo') {
    return (
      act.type === 'charge' ||
      act.type === 'evolve' ||
      act.type === 'skipEvo' ||
      act.type === 'moonGarb' ||
      act.type === 'evoOption'
    );
  }
  if (s.phase === 'attack') return act.type === 'chooseAttack';
  if (s.phase === 'support') return act.type === 'playSupport';
  return true;
}

function doAct(act: Action) {
  if (!battle) return;
  const givingUp = act.type === 'surrender';
  if (!givingUp && !battle.match.waitingOn.includes(battle.seat)) return;
  if (givingUp && battle.match.phase === 'gameOver') return;
  if (!givingUp) {
    const legal = legalActions(battle.match, battle.seat);
    const ok = legal.some((a) => JSON.stringify(a) === JSON.stringify(act));
    if (!ok) {
      toast(battle.tutorial ? 'いまは、ぴかぴか光っているところをタップしてね' : 'その行動は今はできない');
      return;
    }
    if (!tutorialAllows(act)) {
      toast('いまは、ぴかぴか光っているところをタップしてね');
      return;
    }
  }
  sfx('lock');
  if (battle.net && battle.host === false) {
    battle.net.send({ type: 'action', player: battle.seat, action: act });
    return;
  }
  const next = submit(battle.match, battle.seat, act);
  battle.match = next;
  if (battle.net && battle.host) {
    battle.net.send({ type: 'state', state: next });
  }
  if (next.phase === 'gameOver') {
    render();
    return;
  }
  render();
  pumpAi();
}

/** The other seat confirming the result changes nothing on screen; never cut a playing clash for it. */
function cinemaLive(): boolean {
  return battle?.match.phase === 'resolve' && !!document.querySelector('#combat-cinema:not(.done)');
}

function renderUnlessCinema() {
  if (!cinemaLive()) render();
}

function cancelCpu() {
  window.clearTimeout(aiTimer);
  aiSequence += 1;
}

function pumpAi() {
  cancelCpu();
  if (!battle || screen !== 'battle') return;
  if (battle.mode === 'online') return;
  const currentBattle = battle;
  const sequence = aiSequence;
  const cpu = (battle.seat === 0 ? 1 : 0) as 0 | 1;
  let guard = 0;
  const step = () => {
    if (!battle || battle !== currentBattle || screen !== 'battle' || sequence !== aiSequence) return;
    const s = battle.match;
    if (s.phase === 'gameOver') {
      render();
      return;
    }
    if (guard++ > 16) {
      renderUnlessCinema();
      return;
    }
    const next = advanceCpu(s, battle.seat, cpu, battle.ai, battle.script);
    if (!next) {
      renderUnlessCinema();
      return;
    }
    battle.match = next;
    renderUnlessCinema();
    if (!battle || battle.match.phase === 'gameOver') return;
    if (battle.match.phase === 'resolve' && !battle.match.players[battle.seat].locked) return;
    const base = battle.match.phase === 'attack' || battle.match.phase === 'support' ? 320 : 220;
    aiTimer = window.setTimeout(step, Math.max(base, fxHoldLeft()));
  };
  aiTimer = window.setTimeout(step, battle.match.phase === 'resolve' ? 0 : Math.max(260, fxHoldLeft()));
}

function finishBattle() {
  if (!battle || !save) return;
  giveupAsk = false;
  const win = battle.match.winner === battle.seat;
  const node = battle.nodeIndex !== undefined ? STORY[battle.nodeIndex] : undefined;
  lastGold = 0;
  const yaku = evaluateYaku(battle.match, battle.seat, save.playerName);
  const fightXp = node?.battle.xp ?? 20;
  const baseXp = win ? fightXp : xpForLoss(fightXp);
  const bonus = yakuXp(yaku);
  const totalXp = baseXp + bonus;
  const deck = save.decks[save.activeDeck] ?? [];
  const partnerIds = save.unlockedPartners.filter((id) => deck.includes(id));
  const before = partnerIds.map((id) => {
    const p = save!.partners[id] ?? { id, rank: 1, xp: 0, xpToNext: 58 };
    return { id, name: getCard(id).name, rec: { rank: p.rank, xp: p.xp, xpToNext: p.xpToNext } };
  });
  let unlockedShell: string | null = null;
  const unlockedShells: string[] = [];
  let firstRewards: string[] = [];
  let dropRewards: string[] = [];
  let missionRows: NonNullable<typeof lastResult>['missions'] = [];
  let newBadge: string | null = null;
  const streak = recordResult(save, win);
  if (win) {
    save.wins += 1;
    lastGold = goldForWin(battle.mode, node?.battle.ai ?? battle.ai, node?.battle.xp ?? 20);
    addGold(save, lastGold);
    if (node) {
      const settled = settleStoryLoot(
        node.id,
        battle.match,
        battle.seat,
        save.clearedFights,
        save.missionClaimed,
        Math.random,
      );
      firstRewards = settled.first.filter((id) => CARD_BY_ID[id]);
      dropRewards = settled.drop.filter((id) => CARD_BY_ID[id]);
      missionRows = settled.missions;
      if (!save.clearedFights.includes(node.id)) {
        newBadge = badgeForFight(node.id)?.id ?? null;
        save.clearedFights.push(node.id);
      }
      for (const row of settled.missions) {
        const key = missionKey(node.id, row.slot);
        if (row.newly && !save.missionClaimed.includes(key)) save.missionClaimed.push(key);
      }
      addCards(save, [...firstRewards, ...dropRewards, ...settled.missions.flatMap((row) => row.reward)].filter((id) => CARD_BY_ID[id]));
      if (node.battle.unlockPartner) unlockPartner(save, node.battle.unlockPartner);
      for (const id of shellsGrantedByFight(node.id, save.starter)) {
        if (addShell(save, id)) unlockedShells.push(id);
      }
      unlockedShell = unlockedShells[0] ?? null;
      if (node.battle.unlockShell || unlockedShells.length) {
        save.flags = markShellTutorialPending(save.flags);
      }
      if (save.chapter === battle.nodeIndex) save.chapter += 1;
    }
  } else {
    save.losses += 1;
    lastGold = goldForLoss(battle.mode, node?.battle.ai ?? battle.ai, fightXp);
    addGold(save, lastGold);
    if (node) {
      missionRows = settleStoryLoot(node.id, battle.match, battle.seat, save.clearedFights, save.missionClaimed, () => 0).missions;
    }
  }
  const rankUps = grantXp(save, totalXp);
  rankCinemaDone = false;
  badgeShown = false;
  resultAnimated = false;
  lastResult = {
    win,
    gold: lastGold,
    baseXp,
    yaku,
    totalXp,
    partners: before.map((b) => {
      const p = save!.partners[b.id] ?? b.rec;
      return { id: b.id, name: b.name, before: b.rec, after: { rank: p.rank, xp: p.xp, xpToNext: p.xpToNext } };
    }),
    rankUps,
    rewards: [...firstRewards, ...dropRewards, ...missionRows.flatMap((row) => row.reward)],
    firstRewards,
    dropRewards,
    missions: missionRows,
    shell: unlockedShell,
    shells: unlockedShells,
    score: [battle.match.players[battle.seat].kos, battle.match.players[battle.seat === 0 ? 1 : 0].kos],
    streak: streak.streak,
    streakGold: streak.bonus,
    badge: newBadge,
  };
  if (win && battle.tutorial) finishTutorial(false);
  persist();
  if (lastGold > 0) sfx('coin');
  go('result');
}

function lootPanelHtml(r: typeof lastResult): string {
  if (!r || r.missions.length === 0) return '';
  const miss = r.missions
    .map((row) => {
      const st = row.newly ? 'クリア！' : row.already ? '済' : row.ok ? '条件達成（済）' : '未達';
      return `<li class="yaku-row ${row.newly ? '' : 'muted'}"><span>${row.slot + 1}. ${escapeHtml(row.label)}</span><b>${st}</b></li>`;
    })
    .join('');
  const first = r.firstRewards.length ? r.firstRewards.map((id) => getCard(id).name).join('・') : '';
  const drop = r.dropRewards.length ? r.dropRewards.map((id) => getCard(id).name).join('・') : '';
  return `<div class="panel yaku-panel">
    <h3>ミッション</h3>
    <ul class="yaku-list">${miss}</ul>
    ${first ? `<p class="sub" style="text-align:left">初回　${escapeHtml(first)}</p>` : ''}
    ${drop ? `<p class="sub" style="text-align:left">ドロップ　${escapeHtml(drop)}</p>` : ''}
  </div>`;
}

let badgeShown = false;

function resultHtml() {
  const b = battle!;
  const r = lastResult;
  const win = r?.win ?? b.match.winner === b.seat;
  const node = b.nodeIndex !== undefined ? STORY[b.nodeIndex] : undefined;
  const rewards = r?.rewards ?? [];
  const score = r?.score ?? [b.match.players[b.seat].kos, b.match.players[b.seat === 0 ? 1 : 0].kos];
  const yaku = r?.yaku ?? [];
  const yakuRows = yaku
    .map((y, i) => `<li class="yaku-row pop-in" style="animation-delay:${0.5 + i * 0.12}s"><span>${y.name}</span><b>+${y.xp}</b></li>`)
    .join('');
  const ups = r?.rankUps ?? [];
  const partnerRows = (r?.partners ?? [])
    .map((p) => {
      const up = p.after.rank > p.before.rank;
      const ev = ups.find((u) => u.partnerId === p.id);
      const auto = up ? growthLabel(autoGrowthDelta(p.before.rank, p.after.rank)) : '';
      const bonusBits = (ev?.bonuses ?? []).map((b) => `<span class="fx-chip sen">${bonusLabel(b)}</span>`).join('');
      const pct = Math.max(0, Math.min(100, Math.round((p.after.xp / Math.max(1, p.after.xpToNext)) * 100)));
      const from = up ? 0 : Math.max(0, Math.min(100, Math.round((p.before.xp / Math.max(1, p.before.xpToNext)) * 100)));
      return `<div class="xp-partner ${up ? 'did-rankup' : ''}" data-partner="${p.id}">
        <img src="/art/partners/${p.id}.jpg" alt=""/>
        <div class="grow">
          <b>${p.name}</b>
          <span class="sub" style="text-align:left">Rank ${p.before.rank}${up ? ` → <em class="rank-new">${p.after.rank}</em>` : ''}　${p.after.xp}/${p.after.xpToNext}</span>
          <div class="xpbar"><i data-to="${pct}" style="width:${from}%"></i></div>
          ${up ? `<div class="rank-up">RANK UP!! ${auto}</div>` : ''}
          ${up || ev?.pendingRanks.length ? `<div class="rank-up">${bonusBits}${ev?.pendingRanks.length ? ' 5ランクボーナスを選べ' : ''}</div>` : ''}
        </div>
      </div>`;
    })
    .join('');
  const badgeFirst = !!(win && r?.badge && !badgeShown);
  const overlay = ups.length && !rankCinemaDone && !badgeFirst
    ? `<div class="rankup-overlay" id="rankup-overlay">
        <div class="rankup-flash"></div>
        <img class="rankup-art" id="rankup-art" alt=""/>
        <div class="rankup-title" id="rankup-title">RANK UP</div>
        <div class="rankup-name" id="rankup-name"></div>
        <div class="rankup-rank" id="rankup-rank"></div>
        <p class="rankup-hint" id="rankup-hint"></p>
        <div class="rankup-bonus" id="rankup-bonus"></div>
        <div class="rankup-picks" id="rankup-picks"></div>
      </div>`
    : '';
  const missions = r?.missions ?? [];
  const stars = missions.length
    ? `<div class="res-stars">${missions.map((m, i) => `<i class="${m.ok || m.already ? 'on' : ''}" style="animation-delay:${0.35 + i * 0.18}s">★</i>`).join('')}</div>`
    : '';
  return `<section class="screen scroll result-screen ${win ? 'win' : 'lose'}" id="result-screen">
    <div class="res-rays"></div>
    <div class="res-head">
      ${resultHeadlineHtml(win, score)}
      ${stars}
    </div>
    <div class="res-chips">
      <div class="res-chip gold"><i class="coin-ico"></i><b class="count" data-to="${r?.gold ?? 0}">0</b><span>G</span></div>
      <div class="res-chip xp"><b class="count" data-to="${r?.totalXp ?? 0}">0</b><span>EXP</span></div>
      ${r && r.streak >= 2 ? `<div class="res-chip streak"><b>${r.streak}連勝！</b>${r.streakGold ? `<span>+${r.streakGold}G</span>` : ''}</div>` : ''}
    </div>
    <div class="panel yaku-panel">
      <h3>ボーナス役</h3>
      <ul class="yaku-list">
        ${r && r.baseXp > 0 ? `<li class="yaku-row pop-in" style="animation-delay:.35s"><span>基本経験値</span><b>+${r.baseXp}</b></li>` : ''}
        ${yakuRows || '<li class="yaku-row muted"><span>役なし</span><b>+0</b></li>'}
      </ul>
      <p class="yaku-total">合計 <b>+${r?.totalXp ?? 0}</b> EXP</p>
    </div>
    ${partnerRows ? `<div class="panel">${partnerRows}</div>` : ''}
    ${
      (r?.shells?.length ?? 0) > 0 || r?.shell
        ? `<div class="panel shell-get"><b>月殻ゲット！　${escapeHtml((r!.shells?.length ? r!.shells : [r!.shell!]).map((id) => shellName(id)).join('　'))}</b><p class="sub" style="text-align:left">${escapeHtml(
            r!.shells?.length
              ? `${r!.shells.map((id) => shellOf(id)?.blurb ?? '').filter(Boolean).join(' ')} 次の対戦で、パートナーのたねから金色の「月装」を押せる。`
              : (shellOf(r!.shell!)?.blurb ?? SHELL_EXPLAIN),
          )}</p></div>`
        : ''
    }
    ${lootPanelHtml(r)}
    ${rewards.length ? `<h3 class="res-h">ゲットしたカード</h3><div class="hand res-cards">${rewards.map((id, i) => `<div class="res-card glow-${rarityOf(id)}" style="animation-delay:${0.6 + i * 0.15}s">${cardHtml(getCard(id))}${isExclusive(id) ? `<div class="sub secret-tag">秘蔵 ${escapeHtml(sourceLabel(id))}</div>` : `<div class="sub">${escapeHtml(rarityLabel(id))}</div>`}</div>`).join('')}</div>` : ''}
    <button class="btn gold big" id="next">${win && node && node.after.length ? 'ストーリーのつづきへ ▶' : win ? 'ホームへ ▶' : 'もう一回がんばる ▶'}</button>
    ${badgeFirst && r?.badge ? badgeOverlayHtml(r.badge, save?.clearedFights ?? []) : ''}
    ${overlay}
  </section>`;
}

function pickButtonsHtml(): string {
  return rankPickButtonsHtml();
}

function playRankUpCinema() {
  const ups = lastResult?.rankUps ?? [];
  const overlay = document.getElementById('rankup-overlay');
  if (!overlay || !ups.length) return;
  const nextBtn = document.getElementById('next') as HTMLButtonElement | null;
  if (nextBtn) nextBtn.disabled = true;
  let i = 0;
  const art = document.getElementById('rankup-art') as HTMLImageElement | null;
  const nameEl = document.getElementById('rankup-name');
  const rankEl = document.getElementById('rankup-rank');
  const hintEl = document.getElementById('rankup-hint');
  const bonusEl = document.getElementById('rankup-bonus');
  const picks = document.getElementById('rankup-picks');
  const paintPartner = (ev: RankUpEvent) => {
    const rec = lastResult?.partners.find((p) => p.id === ev.partnerId);
    if (art) art.src = publicUrl(`/art/partners/${ev.partnerId}.jpg`);
    if (nameEl) nameEl.textContent = rec?.name ?? ev.partnerId;
    if (rankEl) rankEl.textContent = ev.toRank > ev.fromRank ? `Rank ${ev.fromRank} → ${ev.toRank}` : `Rank ${ev.toRank}`;
    if (bonusEl) {
      const auto = ev.toRank > ev.fromRank ? growthLabel(autoGrowthDelta(ev.fromRank, ev.toRank)) : '';
      const chips = ev.bonuses.map((b) => `<span class="rankup-chip">${bonusLabel(b)}</span>`).join('');
      bonusEl.innerHTML = `${auto ? `<span class="rankup-chip">${auto}</span>` : ''}${chips}`;
    }
  };
  const finish = () => {
    overlay.classList.add('out');
    rankCinemaDone = true;
    window.setTimeout(() => {
      overlay.remove();
      render();
    }, 380);
    if (nextBtn) nextBtn.disabled = false;
  };
  const show = () => {
    const ev = ups[i];
    if (!ev) {
      finish();
      return;
    }
    paintPartner(ev);
    overlay.classList.remove('pop');
    void overlay.offsetWidth;
    overlay.classList.add('pop');
    sfx('evolve');
    const pending = ev.pendingRanks[0];
    if (pending && picks && hintEl) {
      hintEl.textContent = `ランク${pending}ボーナス　伸ばす能力を選べ`;
      picks.innerHTML = pickButtonsHtml();
      picks.querySelectorAll<HTMLElement>('[data-stat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!save) return;
          const stat = btn.getAttribute('data-stat') as RankStat;
          const gained = chooseRankBonus(save, ev.partnerId, stat);
          if (!gained) return;
          persist();
          ev.bonuses.push(gained);
          ev.pendingRanks.shift();
          sfx('special');
          paintPartner(ev);
          show();
        });
      });
      return;
    }
    if (hintEl) hintEl.textContent = ev.toRank > ev.fromRank ? 'ランクアップ！' : '';
    if (picks) picks.innerHTML = '';
    i += 1;
    window.setTimeout(show, 1100);
  };
  show();
}

let resultAnimated = false;

function animateResult() {
  const r = lastResult;
  if (resultAnimated) {
    root.querySelectorAll<HTMLElement>('.res-chip .count').forEach((el) => (el.textContent = el.dataset.to ?? '0'));
    root.querySelectorAll<HTMLElement>('.xpbar i').forEach((el) => (el.style.width = `${el.dataset.to ?? 0}%`));
    root.querySelector('#result-screen')?.classList.add('settled');
    return;
  }
  resultAnimated = true;
  root.querySelectorAll<HTMLElement>('.res-chip .count').forEach((el, i) => {
    window.setTimeout(() => countUp(el, 0, Number(el.dataset.to ?? 0), 900), 250 + i * 200);
  });
  if (r?.win) {
    window.setTimeout(() => {
      sfx('coin');
      coinBurst(root.querySelector('.res-chip.gold'), 14);
    }, 300);
    if (r.streak >= 2) window.setTimeout(() => stamp(`${r.streak}連勝!!`, 'gold', { at: root.querySelector('.res-chip.streak'), ms: 1000 }), 900);
  }
  window.setTimeout(() => {
    root.querySelectorAll<HTMLElement>('.xpbar i').forEach((el) => {
      el.style.width = `${el.dataset.to ?? 0}%`;
    });
  }, 500);
}

function bindResult() {
  const badge = document.getElementById('badge-overlay');
  if (badge) {
    const nextBtn = document.getElementById('next') as HTMLButtonElement | null;
    if (nextBtn) nextBtn.disabled = true;
    sfx('badge');
    window.setTimeout(() => confetti(80), 300);
    badge.addEventListener('click', () => {
      badgeShown = true;
      badge.classList.add('out');
      window.setTimeout(render, 300);
    });
    return;
  }
  animateResult();
  playRankUpCinema();
  $('#next')?.addEventListener('click', () => {
    sfx('tap');
    const b = battle;
    const node = b?.nodeIndex !== undefined ? STORY[b.nodeIndex] : undefined;
    const win = b && b.match.winner === b.seat;
    if (win && node && node.after.length) {
      talk = { index: b!.nodeIndex!, line: 0, after: true };
      battle = null;
      go('talk');
      return;
    }
    battle = null;
    go('home');
  });
}

const RARITY_RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, secret: 3 };

/** Rarest card last, so the best pull is the final flip. */
function sortForReveal(ids: string[]): string[] {
  return [...ids].sort((a, b) => RARITY_RANK[rarityOf(a)]! - RARITY_RANK[rarityOf(b)]!);
}

function shopHtml() {
  const s = save!;
  if (packReveal) {
    const pack = packReveal.pack ? PACK_BY_ID[packReveal.pack] : undefined;
    if (!packReveal.opened) {
      return `<section class="screen pack-open" id="pack-open">
        <div class="pack-rays"></div>
        <p class="pack-hint">タップしてあけろ！</p>
        <div class="pack-sealed ${pack?.spec ?? pack?.id ?? 'seed'}" id="pack-sealed">
          <img src="/art/ui/cardback.jpg" alt=""/>
          <b>${escapeHtml(pack?.name ?? 'カードパック')}</b>
          <span>${packReveal.cards.length}まい入り</span>
        </div>
      </section>`;
    }
    const done = packReveal.flipped >= packReveal.cards.length;
    const slots = packReveal.cards
      .map((id, i) => {
        const up = i < packReveal!.flipped;
        const r = rarityOf(id);
        if (!up) {
          return `<div class="pack-slot down glow-${r}${i === packReveal!.flipped ? ' next' : ''}" data-flip="${i}"><div class="card pack-back"><img src="/art/ui/cardback.jpg" alt=""/></div></div>`;
        }
        const neu = packReveal!.fresh.has(id);
        const just = i === packReveal!.flipped - 1 ? ' just' : '';
        return `<div class="pack-slot up glow-${r}${just}">${cardHtml(getCard(id))}${neu ? '<div class="new-tag">NEW</div>' : ''}${r !== 'common' ? `<div class="rarity-tag ${r}">${RARITY_JA[r]}</div>` : ''}</div>`;
      })
      .join('');
    return `<section class="screen pack-open revealed">
      <div class="pack-rays"></div>
      <div class="topbar"><h2>${escapeHtml(pack?.name ?? 'パック開封')}</h2><span class="gold-chip">${s.gold}G</span></div>
      <p class="pack-hint">${done ? 'ゲットしたカード！' : 'カードをタップしてめくれ！'}</p>
      <div class="pack-grid" id="pack-grid">${slots}</div>
      <div class="spacer"></div>
      ${done ? '<button class="btn gold big" id="pack-done">OK！</button>' : '<button class="btn ghost" id="pack-all">全部めくる</button>'}
    </section>`;
  }
  return shopScreenHtml(s.gold ?? 0);
}

function revealPull(id: string) {
  const r = rarityOf(id);
  const c = CARD_BY_ID[id];
  const slot = root.querySelector('.pack-slot.just');
  if (r === 'secret') {
    sfx('rare');
    flash('#fff3c0');
    stamp(`${RARITY_JA.secret}カード!!`, 'win', { sub: c?.name });
    confetti(90);
    screenShake('hard');
  } else if (r === 'rare') {
    sfx('rare');
    flash('#ffd23f88');
    stamp(`${RARITY_JA.rare}!!`, 'gold', { at: slot, ms: 1000 });
    confetti(40);
  } else if (r === 'uncommon') {
    sfx('evolve');
    stamp(`${RARITY_JA.uncommon}!`, 'special', { at: slot, ms: 800 });
  } else sfx('flip');
}

function bindShop() {
  bindBack();
  if (packReveal) {
    if (!packReveal.opened) {
      sfx('drum');
      $('#pack-open')?.addEventListener('click', () => {
        if (!packReveal || packReveal.opened) return;
        const el = $('#pack-sealed');
        el?.classList.add('tear');
        sfx('clash');
        flash('#ffffff');
        window.setTimeout(() => {
          if (!packReveal) return;
          packReveal.opened = true;
          render();
        }, 380);
      });
      return;
    }
    const flipNext = () => {
      if (!packReveal || packReveal.flipped >= packReveal.cards.length) return;
      packReveal.flipped += 1;
      const id = packReveal.cards[packReveal.flipped - 1]!;
      render();
      revealPull(id);
    };
    $('#pack-grid')?.addEventListener('click', flipNext);
    $('#pack-all')?.addEventListener('click', () => {
      if (!packReveal) return;
      const best = packReveal.cards.at(-1)!;
      packReveal.flipped = packReveal.cards.length;
      render();
      revealPull(best);
    });
    $('#pack-done')?.addEventListener('click', () => {
      sfx('tap');
      packReveal = null;
      render();
    });
    return;
  }
  $$('[data-pack]').forEach((el) =>
    el.addEventListener('click', () => {
      if (!save) return;
      const id = el.getAttribute('data-pack') as PackId;
      const owned = new Set(Object.keys(save.cards).filter((k) => (save!.cards[k] ?? 0) > 0));
      const r = buyPack(save, id, Math.random);
      if (!r.ok) {
        toast(r.reason);
        return;
      }
      persist();
      const fresh = new Set(r.cards.filter((cid) => !owned.has(cid)));
      packReveal = { cards: sortForReveal(r.cards), flipped: 0, fresh, pack: id };
      sfx('coin');
      render();
    }),
  );
}

function deckHtml() {
  const s = save!;
  while (s.decks.length < 3) s.decks.push([]);
  deckTab = Math.min(2, Math.max(0, deckTab));
  return deckScreenHtml(s, deckTab, deckFilter, deckSpec, deckQuery);
}

function bindDeck() {
  bindBack();
  $$('[data-tab]').forEach((el) =>
    el.addEventListener('click', () => {
      deckTab = Number(el.getAttribute('data-tab'));
      render();
    }),
  );
  $$('[data-filter]').forEach((el) =>
    el.addEventListener('click', () => {
      deckFilter = (el.getAttribute('data-filter') || 'all') as DeckFilter;
      render();
      focusDeckSearch();
    }),
  );
  $$('[data-spec]').forEach((el) =>
    el.addEventListener('click', () => {
      deckSpec = (el.getAttribute('data-spec') || 'all') as DeckSpec;
      render();
      focusDeckSearch();
    }),
  );
  $('#deck-q')?.addEventListener('input', (e) => {
    deckQuery = (e.target as HTMLInputElement).value;
    render();
    focusDeckSearch();
  });
  $('#use')?.addEventListener('click', () => {
    const err = validateDeck(save!.decks[deckTab] ?? []);
    if (err) return toast(err);
    save!.activeDeck = deckTab;
    persist();
    toast(`デック${deckTab + 1} を使用`);
    render();
  });
  $$('[data-suggest]').forEach((el) =>
    el.addEventListener('click', () => {
      const spec = el.getAttribute('data-suggest') as Specialty | null;
      if (!spec || !save) return;
      const rec = suggestDeck(save.cards, spec, save.starter);
      save.decks[deckTab] = rec.deck;
      persist();
      const m = rec.mix;
      toast(`${rec.note}　たね${m.seed} 1進化${m.evo1} 2進化${m.evo2} どうぐ${m.item}`);
      render();
    }),
  );
  $$('[data-add]').forEach((el) => {
    const id = el.getAttribute('data-add');
    bindHoldInspect(el, id, () => {
      if (!id) return;
      const deck = save!.decks[deckTab]!;
      const have = save!.cards[id] ?? 0;
      const used = deck.filter((x) => x === id).length;
      if (deck.length >= 30) return toast('30枚まで');
      if (used >= have) return toast('所持不足');
      const c = getCard(id);
      const cap = copyCapOf(id);
      if (used >= cap) return toast(cap < 4 ? `${c.name} は制限${cap}枚まで` : '同名4枚まで');
      if (c.kind === 'beast' && c.level === 'MOON') return toast('月装はデックに入れない');
      if (isPartnerSeed(id) && partnerSeedCount(deck) >= 1) return toast('パートナーはデックに1体まで');
      deck.push(id);
      persist();
      render();
      focusDeckSearch();
    });
  });
  $$('[data-rm-id]').forEach((el) => {
    const id = el.getAttribute('data-rm-id');
    bindHoldInspect(el, id, () => {
      const deck = save!.decks[deckTab]!;
      const i = deck.lastIndexOf(id ?? '');
      if (i >= 0) deck.splice(i, 1);
      persist();
      render();
      focusDeckSearch();
    });
  });
}

function focusDeckSearch() {
  const q = $('#deck-q') as HTMLInputElement | null;
  if (!q) return;
  q.focus();
  const n = q.value.length;
  q.setSelectionRange(n, n);
}

function collectionHtml() {
  return collectionScreenHtml(save!, colFilter);
}

function bindCollection() {
  bindBack();
  $$('[data-col]').forEach((el) =>
    el.addEventListener('click', () => {
      colFilter = (el.getAttribute('data-col') || 'owned') as 'owned' | 'secret' | 'all';
      render();
    }),
  );
}

function partnersHtml() {
  const s = save!;
  const list = partners()
    .map((p) => {
      const rec = s.partners[p.id];
      const have = s.unlockedPartners.includes(p.id);
      const arms = armorsOf(p.id)
        .filter((a) => a.shellId && s.shells.includes(a.shellId))
        .map((a) => `${a.name}（${shellName(a.shellId!)}）`)
        .join(' / ');
      return `<div class="panel" style="opacity:${have ? 1 : 0.35}">
        <div class="row">
          ${cardHtml(p)}
          <div class="grow">
            <b>${p.name}</b>
            <div class="chip ${p.specialty}">${specialtyChipLabel(p.specialty)}</div>
            <p class="sub" style="text-align:left">Rank ${rec?.rank ?? '-'}　XP ${rec?.xp ?? 0}/${rec?.xpToNext ?? '-'}</p>
            <p class="sub" style="text-align:left">${rec ? growthLabel(totalGrowth(rec.rank, rec.bonuses)) || '成長なし' : 'ランク1ごとに HP+2 ○△×+1'}</p>
            ${
              have && rec && pendingBonusRanks(rec.rank, rec.bonuses).length
                ? `<div class="rankup-picks inline">${rankPickButtonsHtml({ choose: p.id, sm: true })}</div>`
                : ''
            }
            <p class="sub" style="text-align:left">${arms || '月装なし（月殻を集める）'}</p>
          </div>
        </div>
      </div>`;
    })
    .join('');
  const shells = SHELLS.map((sh) => {
    const have = s.shells.includes(sh.id);
    return `<article class="shell-card ${have ? 'have' : 'dim'}">
      <b>${escapeHtml(sh.name)}</b>
      <p class="sub" style="text-align:left;margin:4px 0 0">${have ? escapeHtml(sh.blurb) : '未所持'}</p>
    </article>`;
  }).join('');
  return `<section class="screen scroll">
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>パートナー</h2></div>
    <p class="sub">たねと進化は物語とパックで全員揃う。各1枚まで。月殻はアッシュコートから先の物語で落ちる。デックに入れるパートナーたねは1体だけ。</p>
    <div class="panel">
      <h3>月殻とは</h3>
      <p class="sub" style="text-align:left">${SHELL_EXPLAIN}</p>
    </div>
    <div class="col">${list}</div>
    <h3 style="margin:14px 0 8px">月殻図鑑</h3>
    <div class="col">${shells}</div>
  </section>`;
}

function onlineHtml() {
  const available = hasOnlineRelay();
  return `<section class="screen">
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>オンライン</h2></div>
    <p class="sub">${available ? 'ルームコードを共有して対戦できます。' : 'オンライン対戦は準備中です。CPU対戦で遊べます。'}</p>
    <input id="oname" placeholder="表示名" value="${escapeHtml(onlineName || save?.playerName || '')}"/>
    <div class="row" style="margin-top:8px">
      <button class="btn gold" id="create" ${available ? '' : 'disabled'}>部屋を作る</button>
    </div>
    <div class="row" style="margin-top:8px">
      <input id="code" placeholder="ROOM" maxlength="4" value="${escapeHtml(roomCode)}" style="text-transform:uppercase"/>
      <button class="btn" id="join" ${available ? '' : 'disabled'}>入室</button>
    </div>
    <p class="sub" id="ostatus" style="margin-top:12px">${available ? '部屋を作るか、ルームコードを入力してください。' : ''}</p>
    <button class="btn ghost" id="cpu" style="margin-top:auto">CPUとフリーバトル</button>
  </section>`;
}

function bindOnline() {
  bindBack();
  $('#oname')?.addEventListener('input', (e) => {
    onlineName = (e.target as HTMLInputElement).value;
  });
  $('#code')?.addEventListener('input', (e) => {
    roomCode = (e.target as HTMLInputElement).value.toUpperCase();
  });
  $('#create')?.addEventListener('click', () => void onlineCreate());
  $('#join')?.addEventListener('click', () => void onlineJoin());
  $('#cpu')?.addEventListener('click', () => {
    if (!save) return;
    const deck = save.decks[save.activeDeck] ?? starterDeck(save.starter);
    if (validateDeck(deck)) {
      toast(validateDeck(deck)!);
      return;
    }
    const seed = Date.now() % 999983;
    battle = {
      mode: 'cpu',
      match: createMatch(
        [deck, starterDeck('windfeather')],
        [save.playerName, 'CPU ウィンドフェザー'],
        {
          ownedShells: save.shells,
          partnerRanks: partnerRanks(save),
          partnerGrowth: partnerGrowth(save),
          forbidMoonGarb: [false, true],
        },
        seed,
        tossFirst(seed),
      ),
      ai: 'normal',
      seat: 0,
    };
    go('battle');
  });
}

async function onlineCreate() {
  const net = new NetClient();
  try {
    await net.connect(defaultWsUrl());
  } catch {
    toast('サーバに繋がらない。npm run server');
    return;
  }
  net.onMsg = (m) => {
    if (m.type === 'created') {
      roomCode = m.code;
      $('#ostatus')!.textContent = `部屋 ${m.code} — 相手待ち`;
    }
    if (m.type === 'peerJoined') {
      const deck = save!.decks[save!.activeDeck] ?? starterDeck(save!.starter);
      pendingOnlineSeed = Date.now() % 999983;
      net.send({ type: 'hello', name: onlineName || save!.playerName, deck, seed: pendingOnlineSeed });
    }
    if (m.type === 'hello') {
      startOnlineHost(net, m.deck, m.name, pendingOnlineSeed);
    }
    if (m.type === 'action' && battle) {
      battle.match = submit(battle.match, m.player, m.action as Action);
      net.send({ type: 'state', state: battle.match });
      renderUnlessCinema();
    }
    if (m.type === 'left') toast('切断');
  };
  net.send({ type: 'create' });
}

async function onlineJoin() {
  const net = new NetClient();
  try {
    await net.connect(defaultWsUrl());
  } catch {
    toast('サーバに繋がらない');
    return;
  }
  net.onMsg = (m) => {
    if (m.type === 'joined') $('#ostatus')!.textContent = '入室した。ホスト待機…';
    if (m.type === 'hello') {
      const deck = save!.decks[save!.activeDeck] ?? starterDeck(save!.starter);
      net.send({ type: 'hello', name: onlineName || save!.playerName, deck });
      beginOnlineGuest(net, m.deck, m.seed, m.name);
    }
    if (m.type === 'state' && battle) {
      const wasResolve = battle.match.phase === 'resolve';
      battle.match = m.state as MatchState;
      if (!(wasResolve && cinemaLive())) render();
    }
    if (m.type === 'error') toast(m.message);
  };
  net.send({ type: 'join', code: roomCode || ($('#code') as HTMLInputElement).value });
}

function startOnlineHost(net: NetClient, guestDeck: string[], guestName: string, seed: number) {
  if (!save) return;
  const deck = save.decks[save.activeDeck] ?? starterDeck(save.starter);
  const g = guestDeck.filter((id) => CARD_BY_ID[id]);
  while (g.length < 30) g.push('ennya');
  battle = {
    mode: 'online',
    match: createMatch(
      [deck, g.slice(0, 30)],
      [save.playerName, guestName || '相手'],
      { ownedShells: save.shells, partnerRanks: partnerRanks(save), partnerGrowth: partnerGrowth(save) },
      seed,
      tossFirst(seed),
    ),
    ai: 'normal',
    seat: 0,
    net,
    host: true,
  };
  net.send({ type: 'state', state: battle.match });
  go('battle');
}

function beginOnlineGuest(net: NetClient, hostDeck: string[], seed: number, hostName: string) {
  if (!save) return;
  const deck = save.decks[save.activeDeck] ?? starterDeck(save.starter);
  battle = {
    mode: 'online',
    match: createMatch(
      [hostDeck, deck],
      [hostName, onlineName || save.playerName],
      { ownedShells: save.shells, partnerRanks: partnerRanks(save), partnerGrowth: partnerGrowth(save) },
      seed,
      tossFirst(seed),
    ),
    ai: 'normal',
    seat: 1,
    net,
    host: false,
  };
  go('battle');
}

function settingsHtml() {
  return settingsScreenHtml(isMuted(), settingsWipeAsk);
}

function bindSettings() {
  bindBack();
  $('#mute')?.addEventListener('click', () => {
    setMuted(!isMuted());
    if (!isMuted()) startBgm();
    else stopBgm();
    persist();
    render();
  });
  $('#wipe')?.addEventListener('click', () => {
    settingsWipeAsk = true;
    render();
  });
  $('#wipe-no')?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsWipeAsk = false;
    render();
  });
  $('#wipe-yes')?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsWipeAsk = false;
    clearSave();
    save = null;
    setMuted(false);
    go('title');
  });
}

function bindBack() {
  $('#back')?.addEventListener('click', () => {
    sfx('tap');
    go(save ? 'home' : 'title');
  });
}

function bindPartnerPicks() {
  $$('[data-choose]').forEach((el) =>
    el.addEventListener('click', () => {
      if (!save) return;
      const id = el.getAttribute('data-choose');
      const stat = el.getAttribute('data-stat') as RankStat;
      if (!id || !stat) return;
      const gained = chooseRankBonus(save, id, stat);
      if (!gained) return;
      persist();
      sfx('special');
      render();
    }),
  );
}

function $(sel: string) {
  return root.querySelector(sel) as HTMLElement | null;
}
function $$(sel: string) {
  return [...root.querySelectorAll(sel)] as HTMLElement[];
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

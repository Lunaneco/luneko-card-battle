import { getCard } from '../data/cards';
import { BADGES, badgeRowHtml, loginCalendarHtml, ownedBadges, type LoginClaim } from '../data/rewards';
import { CITIES, CITY_ACT, STORY, nextStoryNode, stageSrc } from '../data/story';
import type { SaveData } from '../state/save';
import { faceSrc } from './card';
import { helpFab } from './inspect';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** What the partner says on the home screen. Reacts to progress so the screen feels alive. */
export function partnerChatter(s: SaveData): string {
  const streak = s.streak ?? 0;
  const badges = ownedBadges(s.clearedFights).length;
  if (s.chapter >= STORY.length) return '全クリおめでとう！ でも、まだ強い相手がかくれてるよ！';
  if (streak >= 3) return `${streak}連勝中！ このまま突っ走ろう！`;
  if (streak === 2) return '2連勝！ あと1回で3連勝だ！';
  if (s.chapter === 0) return 'いっしょにがんばろう！ まずはバトルで勝ってみよう！';
  if (badges >= 7) return 'バッジはあと少し！ 塔はもう目の前だよ！';
  if (s.gold >= 500) return `${s.gold}Gもある！ ショップでパックをひこうよ！`;
  if (s.losses > s.wins) return '負けてもへっちゃら！ デックを組み直して、もう一回！';
  return `バッジ ${badges}/${BADGES.length}！ 次のコートへ行こう！`;
}

function loginOverlayHtml(claim: LoginClaim): string {
  return `<div class="login-overlay" id="login-overlay">
    <div class="login-sheet">
      <div class="login-title">ログインボーナス！</div>
      <p class="login-day-big">${claim.day}日目</p>
      <div class="login-prize"><span>今日のごほうび</span><b>${esc(claim.reward.label)}</b></div>
      ${loginCalendarHtml(claim.day)}
      <p class="sub">毎日ひらくと、7日目にプレミアムパック！</p>
      <button class="btn gold big" id="login-ok">${claim.cards.length ? 'パックをあける！' : '受け取る！'}</button>
    </div>
  </div>`;
}

export function homeScreenHtml(s: SaveData, login?: LoginClaim | null): string {
  const next = nextStoryNode(s.chapter);
  const city = next ? CITIES.find((c) => c.id === next.city) : undefined;
  const act = next ? CITY_ACT[next.city]?.label ?? '' : '';
  const done = s.chapter >= STORY.length;
  const partner = getCard(s.starter);
  const streak = s.streak ?? 0;
  const foe = next && !done ? faceSrc(next.battle.opponentFace) : '';
  const boss = next && (next.battle.ai === 'boss' || next.battle.ai === 'scripted');
  return `<section class="screen scroll home" id="home-screen">
    ${helpFab()}
    <div class="home-top">
      <div class="home-player"><b>${esc(s.playerName)}</b><small>${s.wins}勝 ${s.losses}敗${s.bestStreak ? `　最高${s.bestStreak}連勝` : ''}</small></div>
      <div class="gold-chip big" id="home-gold"><i class="coin-ico"></i>${s.gold ?? 0}</div>
    </div>
    <div class="home-hero">
      <img class="hero-stage" src="${stageSrc(next?.city ?? 'beginner')}" alt=""/>
      <div class="hero-rays"></div>
      <img class="hero-partner" src="/art/partners/${s.starter}.jpg" alt="${esc(partner.name)}"/>
      <div class="hero-speech"><b>${esc(partner.name)}</b>${esc(partnerChatter(s))}</div>
      ${streak >= 2 ? `<div class="streak-chip">${streak}連勝中！</div>` : ''}
    </div>
    ${badgeRowHtml(s.clearedFights)}
    <button class="story-btn${boss ? ' boss' : ''}" id="story">
      ${foe ? `<img src="${foe}" alt=""/>` : '<span class="story-crown">★</span>'}
      <span class="story-text">
        <small>${done ? 'ストーリー クリア！' : `STAGE ${s.chapter + 1}　${esc(act)}`}</small>
        <b>${done ? 'もう一度あそぶ' : `VS ${esc(next?.battle.opponentName ?? '')}`}</b>
        <span>${done ? '強敵がまだ待っている' : esc(`${city?.name ?? ''}　${next?.title ?? ''}`)}</span>
      </span>
      <span class="story-go">${boss ? 'BOSS' : 'GO!'}</span>
    </button>
    <div class="menu menu-grid">
      <button class="tile" id="deck"><i>札</i><b>デック</b></button>
      <button class="tile hot" id="shop"><i>包</i><b>ショップ</b>${(s.gold ?? 0) >= 120 ? '<em>!</em>' : ''}</button>
      <button class="tile" id="col"><i>鑑</i><b>図鑑</b></button>
      <button class="tile" id="part"><i>友</i><b>パートナー</b></button>
      <button class="tile" id="online"><i>対</i><b>オンライン</b></button>
      <button class="tile" id="set"><i>設</i><b>設定</b></button>
    </div>
    ${login ? loginOverlayHtml(login) : ''}
  </section>`;
}

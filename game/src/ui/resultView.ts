import { BADGES, badgeRowHtml } from '../data/rewards';
import { RESULT_LOSE, RESULT_LOSE_TITLE, RESULT_WIN, RESULT_WIN_TITLE } from './copy';

export function resultHeadlineHtml(win: boolean, score: [number, number] = [0, 0]): string {
  return `<h1 class="title">${win ? RESULT_WIN_TITLE : RESULT_LOSE_TITLE}</h1>
    <p class="scoreline">${score[0]} — ${score[1]}</p>
    <p class="sub">${win ? RESULT_WIN : RESULT_LOSE}</p>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Full-screen medal for a newly earned court badge. */
export function badgeOverlayHtml(id: string, cleared: string[]): string {
  const bd = BADGES.find((x) => x.id === id);
  if (!bd) return '';
  const count = BADGES.filter((x) => cleared.includes(x.fightId)).length;
  return `<div class="badge-overlay" id="badge-overlay">
    <div class="badge-rays"></div>
    <p class="badge-get-sub">コートマスターに勝った！</p>
    <div class="badge-medal" style="--bc:${bd.color}"><span>${bd.glyph}</span></div>
    <div class="badge-get-title">${esc(bd.name)}<br>ゲット！！</div>
    ${badgeRowHtml(cleared, { big: true })}
    <p class="badge-get-sub">バッジ ${count} / ${BADGES.length}${count >= BADGES.length ? '　塔の扉がひらいた！' : ''}</p>
    <p class="talk-hint">タップでつづける</p>
  </div>`;
}

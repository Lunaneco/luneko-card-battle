import { getCard } from '../data/cards';
import { rarityLabel, sourceLabel } from '../data/rarity';
import { SHELL_EXPLAIN, SHELL_EVO_JA, shellOf } from '../data/shells';
import { inspectWeaknessLine, lineStages, nextFormId, prevFormId, weaknessChartJa } from '../data/lines';
import { EFFECT_JA, LEVEL_JA, SPECIALTY_JA, type CardDef } from '../engine/types';
import { cardHtml, supportText } from './card';
import { STOREFRONT_RULES } from './copy';

export const RULES_TEXT = STOREFRONT_RULES;

const ATTRIBUTE_ROLE = {
  flame: '高火力。攻撃援護と先制で短期決戦。',
  ice: '高いHPと回復。攻撃を受け止めて粘る。',
  nature: '高いチャージと軽い進化。先に成長して押す。',
  dark: '進化は重い。封じと進化どうぐで時間を作る。',
  rare: 'HP操作と手札操作。攻撃順を整えて逆転する。',
};

export function inspectHtml(card: CardDef, mode: 'sheet' | 'deck' = 'sheet'): string {
  const stats = inspectStatsHtml(card);
  if (mode === 'deck') {
    return `<div class="deck-inspect-panel" data-inspect-root>
      <button class="btn sm ghost inspect-x" type="button">閉じる</button>
      <div class="deck-inspect-stage">
        ${cardHtml(card, { size: 'hero', hideInfo: true })}
      </div>
      <p class="sub deck-inspect-hint">スワイプでカードを動かす</p>
      <div class="inspect-sheet deck-inspect-sheet">${stats}</div>
    </div>`;
  }
  return `<div class="inspect-sheet" data-inspect-root>
    <button class="btn sm ghost inspect-x" type="button">閉じる</button>
    ${stats}
  </div>`;
}

function inspectStatsHtml(card: CardDef): string {
  if (card.kind === 'option') {
    return `<h3>${esc(card.name)}</h3>
      <p class="chip">${card.optionType === 'evolution' ? '進化どうぐ' : 'どうぐ'}</p>
      <p class="chip">${esc(rarityLabel(card.id))}</p>
      ${sourceLabel(card.id) ? `<p class="inspect-line">${esc(sourceLabel(card.id))}</p>` : ''}
      <p class="inspect-body">${esc(card.text)}</p>`;
  }
  const next = nextFormId(card.id);
  const prev = prevFormId(card.id);
  const nextName = next ? getCard(next).name : '—';
  const prevName = prev ? getCard(prev).name : '—';
  const stages = lineStages(card.id).map((id) => getCard(id).name).join(' → ');
  return `<h3>${esc(card.name)}</h3>
    <div class="row" style="flex-wrap:wrap;gap:6px">
      <span class="chip ${card.specialty}">${SPECIALTY_JA[card.specialty]}</span>
      <span class="chip">${LEVEL_JA[card.level]}</span>
      <span class="chip">${esc(rarityLabel(card.id))}</span>
    </div>
    ${sourceLabel(card.id) ? `<p class="inspect-line">${esc(sourceLabel(card.id))}</p>` : ''}
    <p class="inspect-line">${ATTRIBUTE_ROLE[card.specialty]}</p>
    <p class="inspect-line">ライン ${esc(stages)}</p>
    <p class="inspect-line">進化前 ${esc(prevName)} ／ 進化後 ${esc(nextName)}</p>
    <p class="inspect-line">HP ${card.hp}　進化P必要 ${card.evoCost || '—'}　チャージ ${card.dp}</p>
    <p class="inspect-line">${esc(inspectWeaknessLine(card.specialty))}</p>
    <p class="inspect-line">○ ${card.circle.power} ${EFFECT_JA[card.circle.effect] || card.skillName}</p>
    <p class="inspect-line">△ ${card.triangle.power} ${EFFECT_JA[card.triangle.effect] || '通常'}</p>
    <p class="inspect-line">× ${card.cross.power} ${EFFECT_JA[card.cross.effect] || '特殊'}</p>
    <p class="inspect-line">${esc(supportText(card))}</p>
    ${card.isPartner && card.level !== 'MOON' ? `<p class="inspect-line">育成パートナー。1枚まで</p>` : ''}
    ${card.isPartner && card.level === 'III' ? `<p class="inspect-line">このカードだけ${SHELL_EVO_JA}できる。${esc(SHELL_EXPLAIN)}</p>` : ''}
    ${
      card.level === 'MOON'
        ? `<p class="inspect-line">${esc(shellNote(card.shellId))}パートナーのたねからのみ月装。デックには入れない</p>`
        : ''
    }`;
}

function shellNote(id?: string): string {
  const sh = shellOf(id);
  return sh ? `${sh.name} — ${sh.blurb}　` : '';
}

export function rulesHtml(): string {
  return `<div class="inspect-sheet" data-inspect-root>
    <button class="btn sm ghost inspect-x" type="button">閉じる</button>
    <h3>ルール</h3>
    <pre class="inspect-body">${esc(RULES_TEXT)}\n弱点 ${esc(weaknessChartJa())}</pre>
  </div>`;
}

export function overlayWrap(inner: string, kind?: 'deck'): string {
  return `<div class="inspect-overlay${kind === 'deck' ? ' deck-inspect' : ''}" id="inspect-overlay">${inner}</div>`;
}

export function bindDeckInspectTilt(root: HTMLElement) {
  const stage = root.querySelector('.deck-inspect-stage') as HTMLElement | null;
  const card = root.querySelector('.deck-inspect-stage .card.hero') as HTMLElement | null;
  if (!stage || !card) return;
  let down = false;
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  const apply = (x: number, y: number) => {
    const r = stage.getBoundingClientRect();
    const nx = clamp(r.width ? ((x - r.left) / r.width) * 2 - 1 : 0, -1, 1);
    const ny = clamp(r.height ? ((y - r.top) / r.height) * 2 - 1 : 0, -1, 1);
    const hyp = Math.min(1, Math.hypot(nx, ny));
    const rotY = nx * 28;
    const rotX = -ny * 18;
    card.classList.add('is-tilt');
    card.style.setProperty('--foil-x', `${50 + nx * 50}%`);
    card.style.setProperty('--foil-y', `${50 + ny * 50}%`);
    card.style.setProperty('--hyp', hyp.toFixed(3));
    card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(${nx * 28}px, ${ny * 18}px, ${22 + hyp * 36}px)`;
  };
  const reset = () => {
    down = false;
    card.classList.remove('is-tilt');
    card.style.transform = '';
    card.style.setProperty('--foil-x', '42%');
    card.style.setProperty('--foil-y', '28%');
    card.style.setProperty('--hyp', '0');
  };
  stage.addEventListener('pointerdown', (e) => {
    down = true;
    stage.setPointerCapture(e.pointerId);
    apply(e.clientX, e.clientY);
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!down && e.pointerType !== 'mouse') return;
    apply(e.clientX, e.clientY);
    if (down) e.preventDefault();
  });
  stage.addEventListener('pointerup', reset);
  stage.addEventListener('pointercancel', reset);
  stage.addEventListener('pointerleave', () => {
    if (!down) reset();
  });
  stage.addEventListener('click', (e) => e.stopPropagation());
}

export function helpFab(): string {
  return `<button class="help-fab" id="rules-btn" type="button" title="ルール">?</button>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

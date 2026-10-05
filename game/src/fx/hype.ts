/**
 * Persistent "hype" layer: big stamps, damage numbers, cut-ins, confetti.
 * Lives beside the screen root so re-renders never cut an effect short.
 */

import { publicHtml } from '../assets';

let layer: HTMLElement | null = null;
let holdUntil = 0;

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountHypeLayer(host: HTMLElement): HTMLElement {
  layer = host;
  return host;
}

export function hypeLayer(): HTMLElement | null {
  return layer;
}

/** Ask the CPU pump to wait until a cinematic beat finishes. */
export function holdFx(ms: number) {
  holdUntil = Math.max(holdUntil, Date.now() + ms);
}

export function fxHoldLeft(): number {
  return Math.max(0, holdUntil - Date.now());
}

function spawn(html: string, life: number): HTMLElement | null {
  if (!layer) return null;
  const wrap = document.createElement('div');
  wrap.innerHTML = publicHtml(html.trim());
  const el = wrap.firstElementChild as HTMLElement | null;
  if (!el) return null;
  layer.appendChild(el);
  window.setTimeout(() => el.remove(), life);
  return el;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Center of an element, relative to the hype layer. */
function centerOf(el: Element | null): { x: number; y: number } {
  if (!layer) return { x: 0, y: 0 };
  const base = layer.getBoundingClientRect();
  if (!el || !el.isConnected) return { x: base.width / 2, y: base.height / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
}

export type StampKind = 'hit' | 'weak' | 'ko' | 'evo' | 'garb' | 'start' | 'win' | 'lose' | 'special' | 'heal' | 'gold';

/** Giant manga-style text slammed onto the screen. */
export function stamp(text: string, kind: StampKind = 'hit', opts: { at?: Element | null; sub?: string; ms?: number } = {}) {
  const ms = opts.ms ?? (kind === 'ko' || kind === 'win' || kind === 'start' ? 1300 : 900);
  const pos = opts.at ? centerOf(opts.at) : null;
  const style = pos ? ` style="left:${pos.x}px;top:${pos.y}px"` : '';
  spawn(
    `<div class="hype-stamp k-${kind}${pos ? ' at' : ''}"${style}><b>${esc(text)}</b>${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}</div>`,
    ms,
  );
}

/** Floating damage / heal number over an element. */
export function damagePop(at: Element | null, amount: number, opts: { weak?: boolean; heal?: boolean } = {}) {
  const p = centerOf(at);
  const cls = opts.heal ? 'heal' : opts.weak ? 'weak' : amount >= 500 ? 'big' : '';
  const label = opts.heal ? `+${amount}` : `-${amount}`;
  spawn(
    `<div class="dmg-pop ${cls}" style="left:${p.x}px;top:${p.y}px"><b>${label}</b>${opts.weak ? '<i>弱点!! ×1.5</i>' : ''}</div>`,
    1400,
  );
}

/** Full-width cut-in banner with card art: evolve / 月装 / summon of a boss. */
export function cutIn(v: { art: string; title: string; name: string; kind: 'evo' | 'garb' | 'summon'; enemy?: boolean }) {
  const ms = reduced() ? 700 : 1250;
  spawn(
    `<div class="cut-in k-${v.kind}${v.enemy ? ' enemy' : ''}">
      <div class="cut-band">
        <img src="${esc(v.art)}" alt=""/>
        <div class="cut-text"><span>${esc(v.title)}</span><b>${esc(v.name)}</b></div>
      </div>
    </div>`,
    ms,
  );
  holdFx(ms - 150);
}

export function screenShake(power: 'soft' | 'hard' = 'soft') {
  const el = document.getElementById('screen-root');
  if (!el || reduced()) return;
  el.classList.remove('shake-soft', 'shake-hard');
  void el.offsetWidth;
  el.classList.add(power === 'hard' ? 'shake-hard' : 'shake-soft');
  window.setTimeout(() => el.classList.remove('shake-soft', 'shake-hard'), 420);
}

export function flash(color = '#fff') {
  if (reduced()) return;
  spawn(`<div class="hype-flash" style="background:${color}"></div>`, 420);
}

const CONFETTI = ['#f5d48a', '#fb7185', '#4ec6ff', '#4ade80', '#c4b5fd', '#fff'];

export function confetti(n = 70) {
  if (!layer || reduced()) return;
  const bits: string[] = [];
  for (let i = 0; i < n; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const dur = 1.6 + Math.random() * 1.4;
    const rot = Math.floor(Math.random() * 720 - 360);
    const c = CONFETTI[i % CONFETTI.length];
    const w = 6 + Math.random() * 6;
    bits.push(
      `<i style="left:${left}%;background:${c};width:${w}px;height:${w * 1.6}px;animation-delay:${delay}s;animation-duration:${dur}s;--rot:${rot}deg"></i>`,
    );
  }
  spawn(`<div class="confetti">${bits.join('')}</div>`, 3400);
}

/** Coins flying from a point to the gold counter (or upward). */
export function coinBurst(from: Element | null, n = 12) {
  if (!layer || reduced()) return;
  const p = centerOf(from);
  const coins: string[] = [];
  for (let i = 0; i < n; i++) {
    const dx = Math.round((Math.random() - 0.5) * 220);
    const dy = Math.round(-80 - Math.random() * 180);
    coins.push(`<i style="left:${p.x}px;top:${p.y}px;--dx:${dx}px;--dy:${dy}px;animation-delay:${(i * 0.03).toFixed(2)}s"></i>`);
  }
  spawn(`<div class="coin-burst">${coins.join('')}</div>`, 1600);
}

/** Animate a number in an element. */
export function countUp(el: HTMLElement | null, from: number, to: number, ms = 700, fmt = (n: number) => String(n)) {
  if (!el) return;
  if (reduced() || ms <= 0 || from === to) {
    el.textContent = fmt(to);
    return;
  }
  const t0 = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Restart a CSS animation class on an element. */
export function kick(el: Element | null, cls: string, ms = 600) {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
}

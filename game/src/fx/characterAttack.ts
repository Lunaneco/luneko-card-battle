import { ATTACK_MOTIONS, type AttackMotionDef } from '../data/attackMotions';
import { publicUrl } from '../assets';
import type { AttackSlot } from '../engine/types';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Only generated, explicitly registered character assets are played. */
export function attackMotionFor(cardId: string | undefined): AttackMotionDef | undefined {
  return cardId && Object.hasOwn(ATTACK_MOTIONS, cardId) ? ATTACK_MOTIONS[cardId] : undefined;
}

const warmed = new Set<string>();
let playSequence = 0;
const activeAttacks = new Set<() => void>();

/** Navigation, explicit skips and the next actor end any previous playback. */
export function clearCharacterAttacks(): void {
  for (const clear of [...activeAttacks]) clear();
}

/** Warm just the two current fighters, rather than loading the whole collection. */
export function warmCharacterAttacks(cardIds: Array<string | undefined>): void {
  if (typeof Image === 'undefined') return;
  for (const cardId of cardIds) {
    const motion = attackMotionFor(cardId);
    if (!motion) continue;
    const src = publicUrl(prefersReducedMotion() ? motion.poster : motion.src);
    if (warmed.has(src)) continue;
    const image = new Image();
    image.addEventListener('error', () => warmed.delete(src), { once: true });
    image.src = src;
    warmed.add(src);
  }
}

/**
 * True means a registered character effect owns this beat. Its GIF is a single
 * attack, while slot-specific canvas particles remain the impact effect.
 * Asset errors (including slow/failed loads) hand the beat back to the old FX.
 */
export function playCharacterAttack(
  cardId: string | undefined,
  slot: AttackSlot,
  fromTop: boolean,
  onFallback: () => void,
): boolean {
  const motion = attackMotionFor(cardId);
  const host = typeof document === 'undefined' ? null : document.getElementById('fx-vid');
  if (!motion || !host) return false;
  const still = prefersReducedMotion();
  const image = document.createElement('img');
  image.className = `fx-character-attack${fromTop ? ' from-top' : ''}${still ? ' still' : ''}`;
  image.dataset.character = cardId!;
  image.dataset.slot = slot;
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');
  image.decoding = 'async';
  image.draggable = false;

  // One actor at a time. A new turn must not leave an old GIF looping on top.
  clearCharacterAttacks();
  let settled = false;
  let timer = 0;
  const clear = () => {
    activeAttacks.delete(clear);
    window.clearTimeout(timer);
    image.remove();
  };
  const fail = () => {
    if (settled || !image.isConnected) return;
    settled = true;
    clear();
    if (!still) onFallback();
  };
  image.addEventListener('load', () => {
    if (settled || !image.isConnected) return;
    settled = true;
    window.clearTimeout(timer);
    image.classList.add('ready');
    timer = window.setTimeout(clear, still ? 500 : Math.max(200, Math.min(2500, motion.durationMs)));
  }, { once: true });
  image.addEventListener('error', fail, { once: true });
  activeAttacks.add(clear);
  host.appendChild(image);
  timer = window.setTimeout(fail, 650);
  // Cached GIFs can share their playback clock. Give each strike a fresh URL
  // so the anticipation pose starts again when a character attacks twice.
  image.src = publicUrl(still ? motion.poster : `${motion.src}${motion.src.includes('?') ? '&' : '?'}play=${++playSequence}`);
  return true;
}

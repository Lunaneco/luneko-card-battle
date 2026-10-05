import { CARD_BY_ID, getCard } from '../data/cards';
import { isPartnerSeed, partnerSeedCount, validateDeck } from '../engine/battle';
import { SUGGEST_SPECS } from '../engine/suggestDeck';
import { SPECIALTY_JA, type CardDef, type Specialty } from '../engine/types';
import type { SaveData } from '../state/save';
import { cardHtml } from './card';

const SPEC_ORDER: Record<Specialty, number> = { flame: 0, ice: 1, nature: 2, dark: 3, rare: 4 };
const SPECS: Specialty[] = ['flame', 'ice', 'nature', 'dark', 'rare'];

export type DeckFilter = 'all' | 'seed' | 'evo' | 'item';
export type DeckSpec = 'all' | Specialty;

export function safeCard(id: string): CardDef | null {
  try {
    return getCard(id);
  } catch {
    return CARD_BY_ID[id] ?? null;
  }
}

export function compareCards(a: CardDef, b: CardDef): number {
  const ka = sortKey(a);
  const kb = sortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i]! - kb[i]!;
  }
  return a.name.localeCompare(b.name, 'ja');
}

function kindOrder(c: CardDef): number {
  if (c.kind === 'option') return 3;
  if (c.level === 'III') return 0;
  if (c.level === 'IV') return 1;
  if (c.level === 'APEX') return 2;
  return 4;
}

function sortKey(c: CardDef): number[] {
  const kind = kindOrder(c);
  if (c.kind === 'option') return [kind, c.optionType === 'evolution' ? 1 : 0, c.no];
  return [kind, c.isPartner ? 0 : 1, SPEC_ORDER[c.specialty], c.no];
}

export function filterOwned(c: CardDef, filter: DeckFilter, spec: DeckSpec = 'all', q = ''): boolean {
  if (c.kind === 'beast' && c.level === 'MOON') return false;
  if (filter === 'item' && c.kind !== 'option') return false;
  if (filter === 'seed' && !(c.kind === 'beast' && c.level === 'III')) return false;
  if (filter === 'evo' && !(c.kind === 'beast' && c.level !== 'III')) return false;
  if (spec !== 'all' && (c.kind !== 'beast' || c.specialty !== spec)) return false;
  if (q) {
    const needle = q.trim().toLowerCase();
    const blob = `${c.name} ${c.id} ${c.kind === 'beast' ? SPECIALTY_JA[c.specialty] : ''}`.toLowerCase();
    if (!blob.includes(needle)) return false;
  }
  return true;
}

export function stackedDeck(deck: string[]): { id: string; n: number; c: CardDef }[] {
  const order: string[] = [];
  const count: Record<string, number> = {};
  for (const id of deck) {
    if (!count[id]) order.push(id);
    count[id] = (count[id] ?? 0) + 1;
  }
  return order
    .map((id) => ({ id, n: count[id]!, c: safeCard(id) }))
    .filter((x): x is { id: string; n: number; c: CardDef } => !!x.c)
    .sort((a, b) => compareCards(a.c, b.c));
}

export function deckScreenHtml(
  s: SaveData,
  tab: number,
  filter: DeckFilter = 'all',
  spec: DeckSpec = 'all',
  q = '',
): string {
  const deck = (s.decks[tab] ?? []).slice();
  const err = deck.length === 30 ? validateDeck(deck) : deck.length === 0 ? 'カードを入れて30枚にしよう' : `あと${30 - deck.length}枚`;
  const legal = deck.length === 30 && !validateDeck(deck);
  const using = s.activeDeck === tab;
  const stacked = stackedDeck(deck);
  const pct = Math.max(0, Math.min(100, Math.round((deck.length / 30) * 100)));

  const trayCards = stacked
    .map(
      ({ id, n, c }) => `<button type="button" class="deck-tray-card" data-rm-id="${id}" title="${c.name} を外す">
        ${cardHtml(c, { size: 'tiny', hideInfo: true })}
        ${n > 1 ? `<span class="tray-n">×${n}</span>` : ''}
      </button>`,
    )
    .join('');
  const trayHtml = stacked.length
    ? slideTrack(trayCards, stacked.length)
    : '<p class="sub tray-empty">下の所持からタップして入れる</p>';

  const owned = Object.entries(s.cards)
    .map(([id, n]) => ({ id, n, c: CARD_BY_ID[id] }))
    .filter((x): x is { id: string; n: number; c: CardDef } => !!x.c && x.n > 0)
    .filter((x) => filterOwned(x.c, filter, spec, q))
    .sort((a, b) => compareCards(a.c, b.c));

  const partnerIn = partnerSeedCount(deck) >= 1;
  const ownedHtml = owned
    .map(({ id, n, c }) => {
      const used = deck.filter((x) => x === id).length;
      const partnerBlocked = isPartnerSeed(id) && partnerIn && used === 0;
      const full = used >= n || used >= 4 || deck.length >= 30 || partnerBlocked;
      return `<button type="button" class="owned-slot ${full ? 'dim' : ''} ${used ? 'in' : ''}" data-add="${id}">
        ${cardHtml(c, { size: 'tiny', hideInfo: true })}
        <div class="owned-count">${used}/${n}</div>
        ${used ? '<span class="owned-check">✓</span>' : ''}
      </button>`;
    })
    .join('');
  const ownedSlide = owned.length ? slideTrack(ownedHtml, owned.length) : '<p class="sub">該当する所持カードがありません</p>';

  const kinds: { id: DeckFilter; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'seed', label: 'たね' },
    { id: 'evo', label: '進化' },
    { id: 'item', label: 'どうぐ' },
  ];

  return `<section class="screen deck-screen" id="deck-screen">
    <div class="topbar">
      <button class="btn sm ghost" id="back">戻る</button>
      <h2>編成</h2>
      <span class="deck-count ${legal ? 'ok' : 'bad'}">${deck.length}/30</span>
    </div>
    <div class="deck-tabs">
      ${[0, 1, 2]
        .map((i) => {
          const on = tab === i;
          const live = s.activeDeck === i;
          const n = (s.decks[i] ?? []).length;
          return `<button class="btn sm ${on ? 'gold' : ''}" data-tab="${i}">${i + 1}${live ? ' 使用' : ''} <span class="muted">${n}</span></button>`;
        })
        .join('')}
      <button class="btn sm ${using ? 'gold' : ''}" id="use" ${using || !legal ? 'disabled' : ''}>${using ? '使用中' : 'これを使う'}</button>
    </div>
    <div class="deck-meter"><i style="width:${pct}%"></i></div>
    <p class="sub deck-status ${legal ? '' : 'bad'}">${legal ? 'このデックで戦える' : err}　パートナーは1体まで</p>
    <div class="deck-suggest">
      <span class="deck-suggest-label">おすすめ</span>
      ${SUGGEST_SPECS.map(
        (sp) =>
          `<button type="button" class="spec-chip ${sp}" data-suggest="${sp}">${SPECIALTY_JA[sp]}</button>`,
      ).join('')}
    </div>
    <div class="deck-tray-wrap">
      <div class="deck-tray-label">このデック　タップで外す　長押しで説明</div>
      <div class="deck-slide" id="deck-in">${trayHtml}</div>
    </div>
    <div class="deck-pick">
      <input id="deck-q" type="search" placeholder="名前でさがす" value="${escapeAttr(q)}" maxlength="20"/>
      <div class="deck-filters">
        ${kinds.map((f) => `<button class="btn sm ${filter === f.id ? 'gold' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
      </div>
      <div class="deck-specs">
        <button class="spec-chip ${spec === 'all' ? 'on' : ''}" data-spec="all">色</button>
        ${SPECS.map(
          (sp) =>
            `<button class="spec-chip ${sp} ${spec === sp ? 'on' : ''}" data-spec="${sp}">${SPECIALTY_JA[sp]}</button>`,
        ).join('')}
      </div>
      <div class="deck-slide-label">手持ち　長押しで説明</div>
      <div class="deck-slide owned" id="deck-owned">${ownedSlide}</div>
    </div>
  </section>`;
}

const SLIDE_COL = 76;

/** Two-row strip that scrolls sideways. Row-major so cards read left to right. */
export function slideTrack(items: string, count: number, col = SLIDE_COL): string {
  const cols = Math.max(1, Math.ceil(count / 2));
  return `<div class="deck-slide-track" style="grid-template-columns:repeat(${cols},${col}px)">${items}</div>`;
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

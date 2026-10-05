import { CARD_BY_ID } from '../data/cards';
import { isExclusive, rarityLabel, sourceLabel } from '../data/rarity';
import type { CardDef } from '../engine/types';
import type { SaveData } from '../state/save';
import { cardHtml } from './card';
import { COLLECTION_LEAD } from './copy';
import { helpFab } from './inspect';

export type ColFilter = 'owned' | 'secret' | 'all';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function collectionVisible(owned: Record<string, number>, filter: ColFilter): CardDef[] {
  return Object.values(CARD_BY_ID).filter((c) => {
    const n = owned[c.id] ?? 0;
    if (filter === 'owned') return n > 0;
    if (filter === 'secret') return isExclusive(c.id);
    return true;
  });
}

export function collectionScreenHtml(s: SaveData, filter: ColFilter = 'owned'): string {
  const all = Object.values(CARD_BY_ID);
  const rows = collectionVisible(s.cards, filter)
    .map((c) => {
      const n = s.cards[c.id] ?? 0;
      const src = sourceLabel(c.id);
      return `<div class="col-card" style="opacity:${n ? 1 : 0.28}" data-inspect="${c.id}">
        ${cardHtml(c, { hideInfo: true, extra: `data-inspect="${c.id}"` })}
        <div class="sub">×${n}　${esc(rarityLabel(c.id))}</div>
        ${src ? `<div class="sub secret-tag">${n ? esc(src) : `未所持・${esc(src)}`}</div>` : ''}
      </div>`;
    })
    .join('');
  return `<section class="screen scroll" id="collection-screen">
    ${helpFab()}
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>図鑑 ${Object.keys(s.cards).length}/${all.length}</h2></div>
    <p class="sub" style="text-align:left">${COLLECTION_LEAD}</p>
    <p class="sub" style="text-align:left">カードをタップして大きく見る。スワイプで傾けられる</p>
    <div class="deck-filters">
      <button class="btn sm ${filter === 'owned' ? 'gold' : ''}" data-col="owned">所持</button>
      <button class="btn sm ${filter === 'secret' ? 'gold' : ''}" data-col="secret">秘蔵</button>
      <button class="btn sm ${filter === 'all' ? 'gold' : ''}" data-col="all">全部</button>
    </div>
    <div class="hand" style="flex-wrap:wrap;justify-content:flex-start">${rows}</div>
  </section>`;
}

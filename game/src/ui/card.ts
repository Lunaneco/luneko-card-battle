import { CARD_BY_ID, SPECIALTY_COLOR, getCard } from '../data/cards';
import { rarityOf } from '../data/rarity';
import { publicUrl } from '../assets';
import {
  EFFECT_JA,
  LEVEL_JA,
  SPECIALTY_JA,
  type CardDef,
  type FieldBeast,
} from '../engine/types';

export type OptionCategory = 'heal' | 'attack' | 'evolve' | 'jam' | 'first' | 'hand';

export const OPTION_CAT_JA: Record<OptionCategory, string> = {
  heal: '回復',
  attack: '攻撃',
  evolve: '進化',
  jam: '妨害',
  first: '先制',
  hand: '手札',
};

export const OPTION_CAT_COLOR: Record<OptionCategory, string> = {
  heal: '#4ade80',
  attack: '#ff5a3c',
  evolve: '#fbbf24',
  jam: '#a78bfa',
  first: '#4ec6ff',
  hand: '#f9a8d4',
};

/** Shipped category for option cards. Heal and attack must stay distinct. */
export function optionCategory(card: CardDef | string): OptionCategory | null {
  const c = typeof card === 'string' ? CARD_BY_ID[card] : card;
  if (!c || c.kind !== 'option') return null;
  const k = c.effect.kind;
  if (k === 'heal' || k === 'fullHeal' || k === 'setBothHp') return 'heal';
  if (k === 'atkAll' || k === 'atkSlot') return 'attack';
  if (k === 'addPow' || k === 'leapEvolve' || k === 'downloader' || k === 'shellBreak' || k === 'freeEvolve') {
    return 'evolve';
  }
  if (k === 'firstStrike') return 'first';
  if (k === 'draw' || k === 'discardBothHands') return 'hand';
  return 'jam';
}

const FACE: Record<string, string> = {
  nyanluna: '/art/characters/nyanluna_bust.jpg',
  tsukineko: '/art/characters/tsukineko_bust.jpg',
  mochi: '/art/characters/mochi_bust.jpg',
  player: '/art/partners/moonember.jpg',
  zero: '/art/ui/zero.jpg',
  ashfist: '/art/characters/ashfist_bust.jpg',
  needswing: '/art/characters/needswing_bust.jpg',
  thornbloom: '/art/characters/thornbloom_bust.jpg',
  frostwolf: '/art/characters/frostwolf_bust.jpg',
  tidewhale: '/art/characters/tidewhale_bust.jpg',
  screwkit: '/art/characters/screwkit_bust.jpg',
  gearsmith: '/art/characters/gearsmith_bust.jpg',
  nightsteward: '/art/characters/nightsteward_bust.jpg',
  fireflytail: '/art/characters/fireflytail_bust.jpg',
  slopedrake: '/art/characters/slopedrake_bust.jpg',
  venomcrown: '/art/characters/venomcrown_bust.jpg',
  margin: '/art/characters/margin_bust.jpg',
  snowlump: '/art/characters/snowlump_bust.jpg',
  threadless: '/art/characters/threadless_bust.jpg',
  skyfeather: '/art/characters/skyfeather_bust.jpg',
  npc: '/art/ui/city.jpg',
};

export function faceSrc(face?: string, mood?: string): string {
  if (face && mood && mood !== 'neutral') {
    return publicUrl(`/art/characters/${face}_${mood}.jpg`);
  }
  if (face && FACE[face]) return publicUrl(FACE[face]!);
  if (face && face !== 'npc') return publicUrl(`/art/characters/${face}_bust.jpg`);
  return publicUrl(FACE.npc!);
}

function artFilename(art: string): string {
  return art.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
}

/** True only when the file is this card's own portrait, not another character's. */
export function artBelongsTo(cardId: string, art: string | undefined): boolean {
  if (!art) return false;
  const base = artFilename(art);
  return base === cardId || base === `${cardId}_bust`;
}

export function cardArt(card: CardDef | string): string {
  const c = typeof card === 'string' ? CARD_BY_ID[card] : card;
  if (!c) return publicUrl('/art/ui/cardback.jpg');
  if (c.kind === 'option') return publicUrl(`/art/items/${c.id}.jpg`);
  const declared = 'art' in c ? c.art : undefined;
  if (artBelongsTo(c.id, declared) && !declared!.endsWith('.svg')) return publicUrl(declared!);
  return publicUrl(`/art/beasts/${c.id}.jpg`);
}

export function foilHtml(rarity: string): string {
  if (rarity === 'common') return '';
  return `<div class="foil" aria-hidden="true"><i class="foil-holo"></i><i class="foil-spec"></i><i class="foil-spark"></i><i class="foil-glare"></i></div>`;
}

export function bindCardFoil(root: HTMLElement) {
  const hit = (t: EventTarget | null) =>
    (t instanceof Element &&
      t.closest(
        '.card[data-rarity]:not([data-rarity="common"]):not(.hero), .inspect-art-wrap.rarity-uncommon, .inspect-art-wrap.rarity-rare, .inspect-art-wrap.rarity-secret',
      )) ||
    null;
  root.addEventListener(
    'pointermove',
    (e) => {
      const el = hit(e.target);
      if (!(el instanceof HTMLElement)) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.classList.add('is-tilt');
      el.style.setProperty('--foil-x', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--foil-y', `${((e.clientY - r.top) / r.height) * 100}%`);
    },
    { passive: true },
  );
  root.addEventListener('pointerout', (e) => {
    const el = hit(e.target);
    if (!el) return;
    const next = e.relatedTarget;
    if (next instanceof Node && el.contains(next)) return;
    el.classList.remove('is-tilt');
  });
}

export function glyph(card: CardDef): string {
  if (card.kind === 'option') return '◆';
  const g: Record<string, string> = { flame: '▲', ice: '●', nature: '✿', dark: '◆', rare: '★' };
  return g[card.specialty] ?? '○';
}

export function cardHtml(
  card: CardDef,
  opts: {
    selected?: boolean;
    size?: 'tiny' | 'norm' | 'field' | 'hero';
    extra?: string;
    highlight?: boolean;
    hideInfo?: boolean;
    evoKind?: 'evolve' | 'needPow' | 'charge' | 'item';
    evoLabel?: string;
    chargeLabel?: string;
    chargeIid?: string;
  } = {},
): string {
  const size = opts.size ?? 'norm';
  const cat = optionCategory(card);
  const spec = card.kind === 'beast' ? card.specialty : cat ? `opt-${cat}` : 'option';
  const rarity = rarityOf(card.id);
  const cls = [
    'card',
    size === 'tiny' ? 'tiny' : '',
    size === 'field' ? 'field' : '',
    size === 'hero' ? 'hero' : '',
    spec,
    `rarity-${rarity}`,
    opts.selected ? 'selected' : '',
    opts.highlight ? 'tut-spot' : '',
    opts.evoKind === 'evolve' ? 'can-evo' : '',
    opts.evoKind === 'needPow' ? 'need-pow' : '',
    opts.evoKind === 'charge' ? 'for-pow' : '',
    opts.evoKind === 'item' ? 'evo-item' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const art = cardArt(card);
  const lv =
    card.kind === 'beast' ? LEVEL_JA[card.level] : cat ? OPTION_CAT_JA[cat] : card.optionType === 'evolution' ? '進化' : '戦闘';
  const hp = card.kind === 'beast' ? String(card.hp) : '';
  const atk = card.kind === 'beast' ? String(card.circle.power) : '';
  const specJa = card.kind === 'beast' ? SPECIALTY_JA[card.specialty] : '';
  const commands = card.kind === 'beast' && size !== 'tiny' && size !== 'field'
    ? `<div class="card-commands"><span>△${card.triangle.power}</span><span>×${card.cross.power}</span></div>
       <div class="card-effect">${EFFECT_JA[card.cross.effect] ? `× ${EFFECT_JA[card.cross.effect]}` : '× 効果なし'}</div>` : '';
  const hideInfo = opts.hideInfo || size === 'tiny' || size === 'field' || size === 'hero';
  const mark = opts.evoKind
    ? `<div class="evo-mark ${opts.evoKind}">${opts.evoLabel ?? ''}</div>${
        opts.evoKind === 'evolve' && opts.chargeLabel && opts.chargeIid
          ? `<button type="button" class="evo-pow" data-charge="${opts.chargeIid}">${opts.chargeLabel}</button>`
          : ''
      }`
    : '';
  return `<div class="${cls}" data-id="${card.id}" data-name="${card.name}" data-rarity="${rarity}" ${opts.extra ?? ''}>
    <div class="lv">${lv}</div>
    ${hp ? `<div class="hpchip">${hp}</div>` : ''}
    ${mark}
    ${hideInfo ? '' : `<button class="info" type="button" data-inspect="${card.id}" aria-label="詳細">i</button>`}
    <img src="${art}" alt="${card.name}" onerror="this.src='${publicUrl('/art/ui/cardback.jpg')}'"/>
    ${foilHtml(rarity)}
    <div class="meta">
      <span class="cname" title="${card.name}">${card.name}</span>
      <div class="csub">${specJa ? `<span class="cspec">${specJa}</span>` : ''}${atk ? `<span class="ca">○${atk}</span>` : ''}</div>
      ${commands}
    </div>
  </div>`;
}

export function fieldHtml(f: FieldBeast | null, mine: boolean, role?: '先攻' | '後攻'): string {
  const tag = role
    ? `<div class="field-order ${role === '先攻' ? 'first' : 'second'}">${role}</div>`
    : '';
  if (!f) {
    return `<div class="field-wrap"><div class="card field empty-slot"></div><div class="field-name">空き</div></div>`;
  }
  const def = getCard(f.cardId);
  const pct = Math.max(0, Math.round((f.hp / f.maxHp) * 100));
  return `<div class="field-wrap spec-${f.specialty}${pct <= 30 ? ' pinch' : ''}" data-inspect="${def.id}">
    ${tag}
    ${cardHtml(def, { size: 'field', hideInfo: true })}
    <div class="field-name" title="${def.name}">${def.name}</div>
    <div class="hpbar ${mine ? 'me' : ''}"><i style="width:${pct}%"></i><span class="hpnum">HP ${f.hp}</span></div>
    <div class="statline">${SPECIALTY_JA[f.specialty]} 最大${f.maxHp} ${f.abnormal ? '<span class="abn">異常</span>' : ''} ${f.garbed ? '<span class="garb">月装</span>' : ''}</div>
    <div class="mini-atk">○${f.circle.power} △${f.triangle.power} ×${f.cross.power}</div>
  </div>`;
}

export function supportText(card: CardDef): string {
  if (card.kind === 'option') return card.text;
  const s = card.support;
  switch (s.kind) {
    case 'atkAll': return `援護 全攻撃+${s.amount}`;
    case 'atkSlot': return `援護 ${s.slot === 'circle' ? '○' : s.slot === 'triangle' ? '△' : '×'}+${s.amount}`;
    case 'heal': return `援護 HP+${s.amount}`;
    case 'setBothHp': return `互いのHPを${s.amount}に`;
    case 'pow': return `進化P+${s.amount}`;
    case 'draw': return `${s.amount}枚ドロー`;
    case 'discardOpp': return `相手手札-${s.amount}`;
    case 'jam': return '援護妨害';
    case 'shield': return `相手の${s.slot === 'circle' ? '○' : s.slot === 'triangle' ? '△' : '×'}を0に`;
    default: return '援護なし';
  }
}

export function atkLabel(f: FieldBeast, slot: 'circle' | 'triangle' | 'cross'): string {
  const a = f[slot];
  const fx = EFFECT_JA[a.effect];
  return `${a.power}${fx ? ' ' + fx : ''}`;
}

export { SPECIALTY_JA, LEVEL_JA, EFFECT_JA, SPECIALTY_COLOR };

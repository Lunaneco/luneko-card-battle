import { getCard } from '../data/cards';
import { firstStrikeFromField, hitOrder } from '../engine/battle';
import { SLOT_JA, type CombatBeat, type LastCombat, type MatchState } from '../engine/types';
import { cardArt, cardHtml, supportText } from './card';

export function fieldRole(s: MatchState, seat: 0 | 1): '先攻' | '後攻' {
  return seat === s.active ? '先攻' : '後攻';
}

export function fieldHasFirstStrike(s: MatchState, seat: 0 | 1): boolean {
  const fs = firstStrikeFromField(s);
  return fs[seat] && !fs[seat === 0 ? 1 : 0];
}

/** Live field badges. Always 先攻/後攻; 先制 when that seat uniquely has firstStrike. */
export function fieldSeatBadge(s: MatchState, seat: 0 | 1): string {
  const role = fieldRole(s, seat);
  return fieldHasFirstStrike(s, seat) ? `${role}・先制` : role;
}

export function roleBadgeHtml(s: MatchState, seat: 0 | 1): string {
  const role = fieldRole(s, seat);
  const kind = role === '先攻' ? 'first' : 'second';
  const sen = fieldHasFirstStrike(s, seat);
  return `<span class="role-badge ${kind}">${role}</span>${sen ? '<span class="role-badge sen">先制</span>' : ''}`;
}

export function fieldFirstHud(s: MatchState): string {
  const a = s.players[s.active].name;
  const b = s.players[s.active === 0 ? 1 : 0].name;
  return `先攻 ${a}　後攻 ${b}`;
}

export function fieldOrderHudHtml(s: MatchState, seat: 0 | 1): string {
  const first = s.active;
  const second: 0 | 1 = first === 0 ? 1 : 0;
  const label = (i: 0 | 1) => (i === seat ? '自分' : '相手');
  const [hitter] = hitOrder(s);
  const sen = fieldHasFirstStrike(s, hitter);
  const live = s.phase === 'attack' || s.phase === 'support' || s.phase === 'resolve';
  const now = live
    ? `<div class="order-now">${sen ? `この攻撃 ${label(hitter)}が先制` : `このターン ${label(hitter)}が先に攻撃`}</div>`
    : '';
  return `<div class="order-hud" id="order-hud">
    <div class="order-title">このターンの攻撃順</div>
    <div class="order-row first${first === seat ? ' me' : ''}"><span class="ord">1</span><span class="who-lab">${label(first)}・先攻</span></div>
    <div class="order-row second${second === seat ? ' me' : ''}"><span class="ord">2</span><span class="who-lab">${label(second)}・後攻</span></div>
    ${now}
  </div>`;
}

export function fieldHitOrderText(s: MatchState): string {
  const [hitter] = hitOrder(s);
  const fs = firstStrikeFromField(s);
  const exclusive = fs[0] !== fs[1];
  if (exclusive && fs[hitter]) return `${s.players[hitter].name} が先制`;
  return `${s.players[s.active].name} のターン`;
}

export function fxChipClass(label: string): string {
  if (label === '先制') return 'sen';
  if (label === 'カウンター') return 'counter';
  if (label === 'すいとる') return 'drain';
  if (label === '自爆') return 'suicide';
  if (label === '妨害') return 'jam';
  if (label === '弱点') return 'weak';
  if (label.includes('0')) return 'zero';
  return '';
}

/** Player-facing resolve recap: flipped 山札の上 + specials. */
export function powerMath(lc: LastCombat, i: 0 | 1): string {
  const base = lc.basePowers[i];
  const bonus = lc.bonuses[i];
  const final = lc.powers[i];
  if (final === 0 && base + bonus > 0) return `${base}${bonus ? '+' + bonus : ''}→0`;
  if (bonus) return `${base}+${bonus}=${final}`;
  return String(final);
}

export function resolveRecapText(s: MatchState): string {
  const lc = s.lastCombat;
  if (!lc) return '';
  const bits: string[] = [];
  for (const i of [0, 1] as const) {
    const sup = lc.supports[i];
    if (sup) {
      const name = getCard(sup.cardId).name;
      const fx = lc.supportTexts[i] ? `（${lc.supportTexts[i]}）` : '';
      bits.push(sup.fromDeck ? `${s.players[i].name} 山札の上 → ${name}${fx}` : `${s.players[i].name} 援護 ${name}${fx}`);
    }
    if (lc.effectLabels[i].length) bits.push(`${s.players[i].name} ${lc.effectLabels[i].join('・')}`);
    bits.push(`${s.players[i].name} ${SLOT_JA[lc.slots[i]]} ${powerMath(lc, i)} ダメージ${lc.damages[i]}${lc.weakHits?.[i] ? ' 弱点' : ''}`);
  }
  return bits.join(' / ');
}

export function cinemaBannerText(beat: CombatBeat): string {
  if (beat.kind === 'flip' && beat.fromDeck && beat.body) {
    return `いちかばちか！ 山札の上は「${beat.body}」！`;
  }
  if (beat.kind === 'flip' && beat.body) return `援護カードは「${beat.body}」！`;
  if (beat.kind === 'flip') return '援護なし';
  if (beat.kind === 'supportFx' && beat.body) return `${beat.title}！ ${beat.body}`;
  if (beat.kind === 'special') return `${beat.title}！！`;
  if (beat.kind === 'hit') return `${beat.title} ${beat.body ?? ''}`;
  if (beat.kind === 'ko') return beat.title;
  if (beat.kind === 'compare') return beat.title;
  return beat.body ? `${beat.title} ${beat.body}` : beat.title;
}

function flipHtml(lc: LastCombat, i: 0 | 1): string {
  const sup = lc.supports[i];
  if (!sup) {
    return `<div class="flip-stage empty" data-reveal="none">
      <div class="flip-empty">援護なし</div>
    </div>`;
  }
  const card = getCard(sup.cardId);
  const fx = lc.supportTexts[i] || supportText(card);
  const tag = sup.fromDeck ? '山札の上' : '手札';
  return `<div class="flip-stage ${sup.fromDeck ? 'from-deck' : 'from-hand'}" data-reveal="${card.id}" data-from-deck="${sup.fromDeck ? '1' : '0'}">
    <div class="flip-card ${sup.fromDeck ? 'do-flip' : 'face-up'}">
      <div class="flip-inner">
        <div class="flip-back">
          <img src="/art/ui/cardback.jpg" alt="山札"/>
          <div class="deck-flip">山札の上</div>
        </div>
        <div class="flip-face">
          ${cardHtml(card, { size: 'tiny', hideInfo: true })}
        </div>
      </div>
    </div>
    <div class="reveal-txt">
      <div class="reveal-src">${tag}</div>
      <div class="reveal-name" data-card-name="${card.name}">${card.name}</div>
      <div class="reveal-fx">${fx}</div>
    </div>
  </div>`;
}

function hpPctOf(hp: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((hp / Math.max(1, max)) * 100)));
}

function sideHtml(s: MatchState, lc: LastCombat, i: 0 | 1, mine: boolean, played: boolean): string {
  const f = s.players[i].field;
  const fx = lc.effectLabels[i]
    .map((t) => `<span class="fx-chip ${fxChipClass(t)}">${t}</span>`)
    .join('');
  const dmg = lc.damages[i];
  const o: 0 | 1 = i === 0 ? 1 : 0;
  const first = lc.hitFirst === i && lc.first[i] && !lc.first[o];
  const math = powerMath(lc, i);
  const maxHp = f?.maxHp ?? Math.max(lc.hpBefore[i], 1);
  const hp = played ? lc.hpAfter[i] : lc.hpBefore[i];
  const ko = lc.hpAfter[i] <= 0;
  const spec = f?.specialty ?? 'flame';
  const art = f ? cardArt(f.cardId) : '/art/ui/cardback.jpg';
  const weak = !!lc.weakHits?.[i];
  return `<div class="cinema-side clash-side ${mine ? 'me' : 'you'} spec-${spec}${played && ko ? ' is-ko' : ''}" data-seat="${i}" data-atk="${lc.powers[i]}" data-dealt="${dmg}" data-hp-before="${lc.hpBefore[i]}" data-hp-after="${lc.hpAfter[i]}" data-max-hp="${maxHp}">
    <div class="clash-fighter">
      <div class="fighter-art"><img src="${art}" alt=""/><div class="fighter-ko">撃破</div></div>
      <div class="cinema-who">${s.players[i].name}${first ? ' <span class="role-badge sen">先制</span>' : ''}</div>
      <div class="fighter-name">${f?.name ?? ''}</div>
      <div class="clash-hp">
        <div class="clash-bar"><i class="ghost" style="width:${hpPctOf(hp, maxHp)}%"></i><i class="fill" style="width:${hpPctOf(hp, maxHp)}%"></i></div>
        <span class="hpnum">${hp}</span><span class="hpmax">/${maxHp}</span>
      </div>
    </div>
    <div class="clash-col">
      <div class="cinema-cmd slot-${lc.slots[i]}">
        <span class="sym">${SLOT_JA[lc.slots[i]]}</span>
        <span class="pw" data-base="${lc.basePowers[i]}" data-final="${lc.powers[i]}">${played ? lc.powers[i] : lc.basePowers[i]}</span>
        <span class="sk">${lc.skills[i]}</span>
      </div>
      <div class="fx-row">${fx}</div>
      ${flipHtml(lc, i)}
      <div class="clash-result">
        ${math !== String(lc.powers[i]) ? `<div class="cinema-math">${math}</div>` : ''}
        ${dmg > 0 ? `<div class="cinema-dmg${weak ? ' weak' : ''}">与ダメージ ${dmg}${weak ? ' 弱点×1.5' : ''}</div>` : '<div class="cinema-dmg zero">与ダメージ 0</div>'}
      </div>
    </div>
  </div>`;
}

/** Fighting-game style resolve: two fighters, commands slam, supports flip, hits land. */
export function resolveBoardHtml(s: MatchState, seat: 0 | 1, opts: { played?: boolean } = {}): string {
  const lc = s.lastCombat;
  if (!lc) return '';
  const played = !!opts.played;
  const firstFlip = lc.beats.find((b) => b.kind === 'flip' && b.fromDeck && b.body);
  const banner = played ? resultBannerText(s, seat) : firstFlip ? cinemaBannerText(firstFlip) : 'こうげきけっか';
  const you = seat === 0 ? 1 : 0;
  const order = lc.first[lc.hitFirst] && !lc.first[lc.hitFirst === 0 ? 1 : 0]
    ? `${s.players[lc.hitFirst].name} が先制`
    : `${s.players[s.active].name} が先に攻撃`;
  return `<div class="combat-cinema clash ${played ? 'played done' : ''}" id="combat-cinema" data-played="${played ? '1' : '0'}">
    <div class="clash-veil"></div>
    <div class="clash-lines"></div>
    ${sideHtml(s, lc, you, false, played)}
    <div class="cinema-vs clash-center">
      <div class="vs-badge">VS</div>
      <div class="hit-order">${order}</div>
    </div>
    ${sideHtml(s, lc, seat, true, played)}
    <div class="cinema-banner pop" id="cinema-banner" data-kind="${played ? 'end' : firstFlip ? 'flip' : 'compare'}">${banner}</div>
    <p class="sub recap">${resolveRecapText(s)}</p>
    <button class="btn gold clash-next" data-act='{"type":"ackResolve"}'>次へ ▶</button>
    <p class="clash-skip">タップでスキップ</p>
  </div>`;
}

/** One-line verdict for the end of the clash. */
export function resultBannerText(s: MatchState, seat: 0 | 1): string {
  const lc = s.lastCombat;
  if (!lc) return '';
  const o: 0 | 1 = seat === 0 ? 1 : 0;
  const meKo = lc.hpAfter[seat] <= 0;
  const youKo = lc.hpAfter[o] <= 0;
  if (youKo && meKo) return '相打ち！！';
  if (youKo) return `${s.players[o].field?.name ?? 'あいて'} を撃破！！`;
  if (meKo) return `${s.players[seat].field?.name ?? 'じぶん'} がやられた…！`;
  if (lc.damages[seat] > lc.damages[o]) return `押してる！ ${lc.damages[seat]} ダメージ！`;
  if (lc.damages[seat] < lc.damages[o]) return `くらった… 次でやり返せ！`;
  return '互角！！';
}

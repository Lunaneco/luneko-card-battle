import { PACKS, type PackDef } from '../data/shop';
import { helpFab } from './inspect';
import { SHOP_BUY, SHOP_POOR } from './copy';

function packCard(p: PackDef, gold: number): string {
  const poor = gold < p.price;
  const tint = p.spec ? ` ${p.spec}` : '';
  return `<article class="pack-card${tint}">
      <div class="row"><b>${p.name}</b><span class="gold-chip">${p.price}G</span></div>
      <p class="sub" style="text-align:left;margin:6px 0 10px">${p.blurb}</p>
      <button class="btn ${poor ? '' : 'gold'}" data-pack="${p.id}" ${poor ? 'disabled' : ''}>${poor ? SHOP_POOR : SHOP_BUY}</button>
    </article>`;
}

export function shopScreenHtml(gold: number): string {
  const general = PACKS.filter((p) => !p.spec);
  const color = PACKS.filter((p) => p.spec);
  return `<section class="screen scroll" id="shop-screen">
    ${helpFab()}
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>カードショップ</h2>
      <span class="gold-chip">${gold}G</span></div>
    <p class="sub" style="margin-bottom:10px">敵を倒したゴールドでパックをひく。</p>
    <div class="col">${general.map((p) => packCard(p, gold)).join('')}</div>
    <p class="shop-h">属性パック</p>
    <div class="col">${color.map((p) => packCard(p, gold)).join('')}</div>
  </section>`;
}

import { STOREFRONT_RULES } from '../ui/copy';
import { QUALITY_ITEMS, type QualityItem, type QualityResult } from './checklist';

function inspectStorefront(): string | null {
  if (!STOREFRONT_RULES.includes('同じ属性の1段階')) return 'missing same-specialty evolve';
  if (STOREFRONT_RULES.includes('別のキャラの同属性には進化できない')) return 'stale same-line-only evolve copy';
  if (!STOREFRONT_RULES.includes('きずぐすり')) return 'missing natural item name';
  if (STOREFRONT_RULES.includes('フロッピー')) return 'floppy remains';
  if (!STOREFRONT_RULES.includes('弱点')) return 'missing weakness rule';
  if (!STOREFRONT_RULES.includes('1.5')) return 'missing weakness multiplier';
  if (!STOREFRONT_RULES.includes('攻撃力＝ダメージ')) return 'missing attack=damage rule';
  if (!STOREFRONT_RULES.includes('月装はパートナーのたねだけ')) return 'missing partner-only moon garb';
  if (!STOREFRONT_RULES.includes('月殻')) return 'missing moon-shell explanation';
  if (!STOREFRONT_RULES.includes('先攻はコイントスのあとターンごとに入れ替わる')) return 'missing turn 先攻';
  return null;
}

/** 980-yen refund-risk review: first-session surfaces + storefront copy. */
export const PAID_REVIEW_ITEMS: QualityItem[] = [
  ...QUALITY_ITEMS,
  { id: 'storefront', name: 'ストア向けルールが現行仕様', inspect: inspectStorefront },
];

export function inspectPaidProduct(): QualityResult[] {
  return PAID_REVIEW_ITEMS.map((item) => {
    const fail = item.inspect();
    return { id: item.id, name: item.name, pass: !fail, detail: fail ?? 'pass' };
  });
}

export function paidProductReady(results = inspectPaidProduct()): boolean {
  return results.every((r) => r.pass);
}

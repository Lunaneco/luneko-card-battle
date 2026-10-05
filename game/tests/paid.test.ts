import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PAID_REVIEW_ITEMS, inspectPaidProduct, paidProductReady } from '../src/quality/paid';

describe('980-yen product review', () => {
  it('covers first-session refund-risk items as discrete checks', () => {
    const names = PAID_REVIEW_ITEMS.map((i) => i.name).join(' ');
    assert.ok(names.includes('起動'));
    assert.ok(names.includes('チュートリアル'));
    assert.ok(names.includes('次タップ'));
    assert.ok(names.includes('攻撃エフェクト'));
    assert.ok(names.includes('進化'));
    assert.ok(names.includes('弱点'));
    assert.ok(names.includes('どうぐ'));
    assert.ok(names.includes('ルール'));
    assert.ok(names.includes('攻撃順'));
    assert.ok(names.includes('セーブ'));
    assert.ok(names.includes('初回起動'));
    assert.ok(names.includes('ショップ'));
    assert.ok(names.includes('降参'));
    assert.ok(names.includes('敗北'));
  });

  it('every shipped review helper passes', () => {
    const results = inspectPaidProduct();
    const failed = results.filter((r) => !r.pass);
    assert.equal(failed.length, 0, failed.map((f) => `${f.id}:${f.detail}`).join('; '));
    assert.equal(paidProductReady(results), true);
  });
});

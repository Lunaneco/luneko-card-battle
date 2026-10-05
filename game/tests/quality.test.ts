import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QUALITY_ITEMS, allQualityPassed, inspectQuality } from '../src/quality/checklist';

describe('chief quality inspect', () => {
  it('defines discrete items for boot tutorial hint fx evo weak items', () => {
    const names = QUALITY_ITEMS.map((i) => i.name).join(' ');
    assert.ok(names.includes('起動'));
    assert.ok(names.includes('チュートリアル'));
    assert.ok(names.includes('次タップ'));
    assert.ok(names.includes('攻撃エフェクト'));
    assert.ok(names.includes('進化'));
    assert.ok(names.includes('弱点'));
    assert.ok(names.includes('どうぐ'));
    assert.ok(QUALITY_ITEMS.length >= 6);
    assert.ok(names.includes('攻撃順'));
    assert.ok(names.includes('設定'));
    assert.ok(names.includes('初回起動'));
    assert.ok(names.includes('ホーム'));
    assert.ok(names.includes('ショップ'));
    assert.ok(names.includes('図鑑'));
    assert.ok(names.includes('編成'));
    assert.ok(names.includes('降参'));
    assert.ok(names.includes('敗北'));
  });

  it('every shipped inspect helper passes', () => {
    const results = inspectQuality();
    const failed = results.filter((r) => !r.pass);
    assert.equal(failed.length, 0, failed.map((f) => `${f.id}:${f.detail}`).join('; '));
    assert.equal(allQualityPassed(results), true);
    for (const r of results) assert.equal(r.detail, 'pass');
  });

  it('would fail attack-order if 先攻 ignored the current turn', () => {
    const item = QUALITY_ITEMS.find((i) => i.id === 'attack-order');
    assert.ok(item);
    assert.equal(item!.inspect(), null);
    const ids = QUALITY_ITEMS.map((i) => i.id);
    assert.ok(ids.includes('settings-save'));
    assert.ok(ids.includes('first-session'));
  });

  it('would fail play-loop inspect if shop, 降参, or lose copy vanished', () => {
    const ids = QUALITY_ITEMS.map((i) => i.id);
    for (const id of ['home-loop', 'shop-loop', 'collection-loop', 'deck-loop', 'surrender-loop', 'result-loop']) {
      assert.ok(ids.includes(id), id);
      assert.equal(QUALITY_ITEMS.find((i) => i.id === id)!.inspect(), null, id);
    }
  });
});

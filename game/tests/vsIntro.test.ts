import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spawnBattleStart, spawnMoonGarb, spawnSummon } from '../src/fx/battlefield';
import { vsIntroHtml } from '../src/ui/vsIntro';

describe('battle start cinema', () => {
  it('shows both names, roles, VS, and 対戦開始', () => {
    const html = vsIntroHtml({
      youName: '灰拳',
      youFace: '/art/characters/ashfist_bust.jpg',
      meName: 'QA',
      meFace: '/art/partners/moonember.jpg',
      youRole: '後攻',
      meRole: '先攻',
      city: '灰庭',
      stage: '/art/stages/flame.jpg',
    });
    assert.ok(html.includes('id="vs-intro"'));
    assert.ok(html.includes('VS'));
    assert.ok(html.includes('対戦開始'));
    assert.ok(html.includes('灰拳') && html.includes('QA'));
    assert.ok(html.includes('先攻') && html.includes('後攻'));
    assert.ok(html.includes('コイントス'));
    assert.ok(html.includes('あなたが先攻'));
    assert.ok(html.includes('灰庭'));
    assert.ok(html.includes('/art/stages/flame.jpg'));
  });

  it('spawns a heavy opening burst', () => {
    const b = spawnBattleStart(390, 844);
    assert.ok(b.parts.length >= 40, `start parts ${b.parts.length}`);
    assert.ok(b.parts.some((p) => p.kind === 'ring'));
    assert.ok(b.parts.some((p) => p.kind === 'star'));
    assert.ok(b.shake >= 12 && b.flash >= 0.6);
  });

  it('summon and moon garb are visible bursts', () => {
    assert.ok(spawnSummon(390, 844, false).parts.length >= 20);
    const g = spawnMoonGarb(390, 844, true);
    assert.ok(g.parts.filter((p) => p.kind === 'ring').length >= 4);
    assert.ok(g.flash >= 0.5);
  });
});

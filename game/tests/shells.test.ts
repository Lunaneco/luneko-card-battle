import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHELL_JA, getCard } from '../src/data/cards';
import { SHELLS, SHELL_EXPLAIN, SHELL_EVO_JA, SHELL_KIND_JA, shellName } from '../src/data/shells';
import { LEVEL_JA } from '../src/engine/types';
import { STOREFRONT_RULES } from '../src/ui/copy';
import { inspectHtml } from '../src/ui/inspect';

const BANNED = ['デジメンタル', 'アーマー進化', '勇気のデジ', '友情のデジ', '愛情のデジ'];

describe('original moon shells', () => {
  it('names every shell uniquely and explains it', () => {
    const names = SHELLS.map((s) => s.name);
    assert.equal(new Set(names).size, names.length);
    assert.ok(SHELLS.length >= 11);
    for (const s of SHELLS) {
      assert.ok(s.name.endsWith('の殻'), s.id);
      assert.ok(s.blurb.includes('月装'), `${s.id} blurb missing 月装`);
      assert.ok(s.blurb.length >= 16, s.id);
      for (const bad of BANNED) assert.ok(!s.name.includes(bad) && !s.blurb.includes(bad), s.id);
    }
    assert.equal(SHELL_KIND_JA, '月殻');
    assert.equal(SHELL_EVO_JA, '月装');
    assert.ok(SHELL_EXPLAIN.includes('月殻'));
    assert.ok(SHELL_EXPLAIN.includes('月装'));
    assert.equal(shellName('embershell'), '炎月の殻');
    assert.equal(SHELL_JA.embershell, '炎月の殻');
  });

  it('renames the form and the storefront', () => {
    assert.equal(LEVEL_JA.MOON, '月装');
    assert.ok(STOREFRONT_RULES.includes('月装はパートナーのたねだけ'));
    assert.ok(STOREFRONT_RULES.includes('月殻'));
    assert.ok(STOREFRONT_RULES.includes('弱点'));
    assert.ok(STOREFRONT_RULES.includes('1.5'));
    for (const bad of BANNED) assert.ok(!STOREFRONT_RULES.includes(bad), bad);
    const breakCard = getCard('shellBreak');
    assert.equal(breakCard.name, '殻割り');
    if (breakCard.kind === 'option') assert.ok(breakCard.text.includes('月装'));
  });

  it('inspects partner and moon-garb cards with the new words', () => {
    const p = inspectHtml(getCard('moonember'));
    assert.ok(p.includes('月装'));
    assert.ok(p.includes('月殻'));
    assert.ok(p.includes('弱点'));
    assert.ok(p.includes('有利'));
    assert.ok(!p.includes('アーマー進化'));
    const a = inspectHtml(getCard('moonsaddle'));
    assert.ok(a.includes('炎月の殻'));
    assert.ok(a.includes('月装'));
  });
});

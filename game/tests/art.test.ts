import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { beasts } from '../src/data/cards';
import { cardArt } from '../src/ui/card';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function resolvedFile(art: string): string {
  return join(publicDir, art.replace(/^\//, ''));
}

function artStem(art: string): string {
  return (art.split('/').pop() ?? '').replace(/\.[^.]+$/, '').replace(/_bust$/, '');
}

describe('monster portraits', () => {
  it('every beast resolves to its own existing unique file', () => {
    const monsters = beasts();
    assert.ok(monsters.length > 50, `pool too small: ${monsters.length}`);
    const ids = new Set(monsters.map((c) => c.id));
    const seen = new Map<string, string>();
    for (const c of monsters) {
      const art = cardArt(c);
      assert.notEqual(art, '/art/ui/cardback.jpg', `${c.id} collapsed to cardback`);
      assert.ok(/\.(jpg|jpeg|png)$/i.test(art), `${c.id} still uses generic stand-in ${art}`);
      const owner = seen.get(art);
      assert.equal(owner, undefined, `${c.id} shares ${art} with ${owner}`);
      seen.set(art, c.id);
      const file = resolvedFile(art);
      assert.equal(existsSync(file), true, `${c.id} missing file ${art}`);
      const stem = artStem(art);
      if (stem && ids.has(stem)) {
        assert.equal(stem, c.id, `${c.id} points at another monster filename ${art}`);
      }
    }
  });

  it('no two monsters share identical portrait bytes', () => {
    const byHash = new Map<string, string>();
    for (const c of beasts()) {
      const art = cardArt(c);
      const file = resolvedFile(art);
      assert.equal(existsSync(file), true, `${c.id} missing ${art}`);
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
      const other = byHash.get(hash);
      assert.equal(other, undefined, `${c.id} has the same image bytes as ${other} (${art})`);
      byHash.set(hash, c.id);
    }
  });
});

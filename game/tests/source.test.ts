import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../src');

const BANNED = [
  'Digital Card Arena',
  'Digimon',
  'Digimental',
  'デジモン',
  'デジメンタル',
  'デジタルカードアリーナ',
  'armorEvolve',
  'ownedDigimentals',
  'unlockDigimental',
  'canArmorEvolve',
  'wargreynyan',
  'greynyan',
  'garurunyan',
  'meranyan',
  'gabunyan',
  'tentonyan',
  'patanyan',
  'lunadraco',
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.ts') || p.endsWith('.css')) acc.push(p);
  }
  return acc;
}

describe('source motif', () => {
  it('has no fusion engine or 合成 UI', () => {
    assert.equal(existsSync(join(srcRoot, 'engine/fusion.ts')), false);
    for (const file of walk(srcRoot)) {
      if (file.includes('/quality/')) continue;
      const text = readFileSync(file, 'utf8');
      assert.equal(text.includes("id=\"fuse\""), false, `${file} still has #fuse`);
      assert.equal(text.includes('合成工房'), false, `${file} still has 合成工房`);
      assert.equal(text.includes('FUSE_BLURB'), false, `${file} still has FUSE_BLURB`);
      assert.equal(/export function fuse\(/.test(text), false, `${file} still exports fuse`);
    }
  });

  it('keeps engine and data free of the old licensed names', () => {
    for (const file of walk(srcRoot)) {
      if (file.includes('/quality/')) continue;
      const text = readFileSync(file, 'utf8');
      for (const word of BANNED) {
        assert.equal(text.includes(word), false, `${file} still has ${word}`);
      }
    }
  });
});

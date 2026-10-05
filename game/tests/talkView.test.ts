import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { talkSceneHtml } from '../src/ui/talkView';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/styles/app.css'), 'utf8');

describe('story talk portrait frame', () => {
  it('builds a full-bleed scene with a cropped portrait and docked line', () => {
    const html = talkSceneHtml({
      city: 'スプラウトコート',
      title: 'ふえ〜、はじまり',
      stage: '/art/stages/beginner.jpg',
      face: '/art/characters/mochi_bust.jpg',
      speaker: 'モチニャフェ',
      text: 'ふえ〜。見つかっちゃった。',
    });
    assert.ok(html.includes('id="talk"'));
    assert.ok(html.includes('talk-art'));
    assert.ok(html.includes('talk-frame'));
    assert.ok(html.includes('talk-dock'));
    assert.ok(html.includes('talk-city'));
    assert.ok(html.includes('スプラウトコート'));
    assert.ok(html.includes('モチニャフェ'));
    assert.ok(html.includes('/art/characters/mochi_bust.jpg'));
    assert.ok(html.includes('タップで進む'));
  });

  it('swaps to an expression portrait when a mood is set', () => {
    const html = talkSceneHtml({
      city: 'スプラウトコート',
      title: 'ふえ〜、はじまり',
      stage: '/art/stages/beginner.jpg',
      face: '/art/characters/mochi_smile.jpg',
      fallback: '/art/characters/mochi_bust.jpg',
      speaker: 'モチニャフェ',
      text: 'ふえ〜。見つかっちゃった。',
      mood: 'smile',
    });
    assert.ok(html.includes('data-mood="smile"'));
    assert.ok(html.includes('mochi_smile.jpg'));
    assert.ok(html.includes('mochi_bust.jpg'));
    assert.match(css, /@keyframes\s+talkFaceIn/);
  });

  it('crops mixed bust ratios instead of letterboxing them', () => {
    assert.match(css, /\.talk-frame\s*\{[\s\S]{0,180}aspect-ratio:\s*4\s*\/\s*5/);
    assert.match(css, /\.talk-frame img[\s\S]{0,220}object-fit:\s*cover/);
    assert.match(css, /\.talk-frame img[\s\S]{0,280}object-position:\s*50%\s*30%/);
    assert.doesNotMatch(css, /\.talk-art img[^}]*object-fit:\s*contain/);
    assert.doesNotMatch(css, /\.talk-frame img[^}]*object-fit:\s*contain/);
  });
});

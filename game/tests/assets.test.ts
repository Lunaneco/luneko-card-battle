import assert from 'node:assert/strict';
import { it } from 'node:test';
import { publicHtml, publicUrl } from '../src/assets';

it('resolves runtime assets under a repository base without double prefixes', () => {
  const base = '/luneko-card-battle/';
  for (const path of ['/art/beasts/moonember.jpg', '/art/fx/attacks/moonember.gif?play=2', '/audio/voices/mochi-fhe.wav']) {
    assert.equal(publicUrl(path, base), base + path.slice(1));
    assert.equal(publicUrl(publicUrl(path, base), base), base + path.slice(1));
    assert.equal(publicUrl(path, '/'), path);
  }
  for (const path of ['https://example.com/image.png', '//example.com/image.png', 'data:image/png;base64,AAAA', './image.png']) {
    assert.equal(publicUrl(path, base), path);
  }
});

it('resolves generated portraits, inline backgrounds and fallback handlers', () => {
  const html = `<img src="/art/beasts/moonember.jpg" onerror="this.src='/art/ui/cardback.jpg'"><i style="background-image:url('/art/ui/city.jpg')"></i>`;
  const result = publicHtml(html, '/luneko-card-battle/');
  assert.equal(result, html.replaceAll('/art/', '/luneko-card-battle/art/'));
  assert.equal(publicHtml(result, '/luneko-card-battle/'), result);
  assert.equal(publicHtml(html, '/'), html);
});


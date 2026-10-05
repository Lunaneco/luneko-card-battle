import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const base = process.env.E2E_URL || 'http://127.0.0.1:5187/luneko-card-battle/';
const url = (path) => new URL(path.replace(/^\//, ''), base).href;
const failures = [];
const catalogResponse = await fetch(url('attack-catalog.json'));
assert.equal(catalogResponse.status, 200);
const catalog = await catalogResponse.json();
assert.equal(catalog.length, 170);
const manifestResponse = await fetch(url('manifest.json'));
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(new URL(manifest.start_url, url('manifest.json')).href, base);
const voiceResponse = await fetch(url('audio/voices/manifest.json'));
assert.equal(voiceResponse.status, 200);
const voices = await voiceResponse.json();
const assets = [...catalog.flatMap(card => [card.src, card.poster]), ...voices.map(voice => voice.src)];
for (let i = 0; i < assets.length; i += 12) {
  await Promise.all(assets.slice(i, i + 12).map(async path => {
    try {
      const response = await fetch(url(path));
      assert.equal(response.status, 200, path);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (path.endsWith('.gif')) assert.match(bytes.subarray(0, 6).toString(), /^GIF8[79]a$/);
      else if (path.endsWith('.png')) assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      else if (path.endsWith('.wav')) assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    } catch (error) { failures.push({ path, error: String(error) }); }
  }));
}
const report = { base, passed: failures.length === 0, motions: catalog.length, motionAssets: catalog.length * 2,
  voices: voices.length, assets: assets.length, failures };
if (process.env.DEPLOY_QA_REPORT) writeFileSync(process.env.DEPLOY_QA_REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;

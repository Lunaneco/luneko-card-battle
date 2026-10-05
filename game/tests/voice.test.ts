import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setMuted } from '../src/audio/synth';
import { installVoiceUnlock, playStoryVoice, stopVoice, storyVoiceSrc } from '../src/audio/voice';
import { STORY } from '../src/data/story';

class Source {
  buffer: unknown;
  onended: (() => void) | null = null;
  stopped = false;
  started = false;
  connect(node: unknown) { return node; }
  disconnect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; this.onended?.(); }
}

class Context {
  state = 'running';
  destination = {};
  static sources: Source[] = [];
  createBufferSource() { const source = new Source(); Context.sources.push(source); return source; }
  createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
  async decodeAudioData() { return {}; }
}

describe('recorded story voices', () => {
  it('maps only the frozen cast, with one shared Mochinyafe utterance', () => {
    assert.equal(storyVoiceSrc('tut-mochi', 'win'), '/audio/voices/mochi-fhe.wav');
    assert.equal(storyVoiceSrc('tut-mochi', 'lose'), storyVoiceSrc('tut-mochi', 'taunt'));
    assert.equal(storyVoiceSrc('flame-2', 'win'), '/audio/voices/flame-2-win.wav');
    assert.equal(storyVoiceSrc('flame-1', 'taunt'), null);
  });

  it('ships sixteen real WAVs with the current story text and immutable reference hashes', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/audio/voices/manifest.json', import.meta.url), 'utf8')) as Array<{
      id: string; fightId: string; cue: 'taunt' | 'win' | 'lose' | 'all'; text: string; src: string;
      duration: number; sampleRate: number; referenceSha256: string; sha256: string; speaker: string;
    }>;
    assert.equal(manifest.length, 16);
    const hashes: Record<string, string> = {
      'つきねこ': '6e6e4ab457714cf931f22c92b2ad229079383fa1b27acb1bcb3b9558c3adc6c8',
      'にゃんるな': '8f9a9bc819009daecaa04c22737adf1fba6e23efbebd54963b431c80b84e2e7d',
      'もちにゃふぇ': 'aab4af1ed9cffab9cb204fc93d47bd86b948c04357c41cc0b2f029cdba7b46cd',
    };
    for (const row of manifest) {
      const bytes = readFileSync(new URL(`../public${row.src}`, import.meta.url));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', row.id);
      assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', row.id);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.id);
      assert.equal(row.referenceSha256, hashes[row.speaker], row.id);
      assert.ok(row.duration >= 1 && row.duration < 10, row.id);
      assert.equal(row.sampleRate, 48000, row.id);
      const battle = STORY.find((n) => n.id === row.fightId)!.battle;
      if (row.cue === 'all') {
        assert.equal(row.text, 'ふぇ〜');
        assert.equal(battle.taunt, row.text);
        assert.equal(battle.winLine, row.text);
        assert.equal(battle.loseLine, row.text);
      } else {
        const field = { taunt: 'taunt', win: 'winLine', lose: 'loseLine' } as const;
        assert.equal(row.text, battle[field[row.cue]], row.id);
        assert.equal(storyVoiceSrc(row.fightId, row.cue), row.src, row.id);
      }
    }
  });

  it('requires a trusted player gesture, shares mute, cancels stale loads, and tolerates failures', async () => {
    const originalContext = globalThis.AudioContext;
    const originalFetch = globalThis.fetch;
    const listeners: Record<string, (event: Event) => void> = {};
    const document = { addEventListener(type: string, listener: (event: Event) => void) { listeners[type] = listener; } };
    globalThis.AudioContext = Context as unknown as typeof AudioContext;
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response;
    try {
      setMuted(false);
      assert.equal(await playStoryVoice('beg-luna', 'taunt'), false);
      installVoiceUnlock(document as unknown as Document);
      listeners.pointerdown!({ isTrusted: false } as Event);
      assert.equal(await playStoryVoice('beg-luna', 'taunt'), false);
      listeners.pointerdown!({ isTrusted: true } as Event);
      assert.equal(await playStoryVoice('beg-luna', 'taunt'), true);
      const first = Context.sources.at(-1)!;
      assert.ok(first.started);
      assert.equal(await playStoryVoice('beg-luna', 'win'), true);
      assert.ok(first.stopped, 'new voice must replace the previous voice');
      const second = Context.sources.at(-1)!;
      setMuted(true);
      assert.ok(second.stopped, 'mute must stop a voice already playing');
      assert.equal(await playStoryVoice('beg-luna', 'win'), false);
      setMuted(false);

      let resolveLoad!: (value: Response) => void;
      globalThis.fetch = () => new Promise<Response>((resolve) => { resolveLoad = resolve; });
      const stale = playStoryVoice('sky-2', 'taunt');
      const count = Context.sources.length;
      stopVoice();
      resolveLoad({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) } as Response);
      assert.equal(await stale, false);
      assert.equal(Context.sources.length, count, 'late downloads must not start after a screen change');

      globalThis.fetch = async () => { throw new Error('offline'); };
      assert.equal(await playStoryVoice('flame-2', 'lose'), false);
      globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }) as Response;
      assert.equal(await playStoryVoice('flame-2', 'lose'), true, 'a failed load must remain retryable');
      assert.equal(await playStoryVoice('flame-1', 'taunt'), false);
    } finally {
      stopVoice();
      setMuted(false);
      globalThis.AudioContext = originalContext;
      globalThis.fetch = originalFetch;
    }
  });
});

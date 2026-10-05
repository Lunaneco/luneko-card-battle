import { audioReady, isMuted, onMuteChange } from './synth';
import { publicUrl } from '../assets';

/** win / lose are from the player's perspective, as in StoryBattle. */
export type StoryVoiceCue = 'taunt' | 'win' | 'lose';
export const VOICED_STORY_FIGHTS = ['tut-mochi', 'beg-luna', 'sky-2', 'flame-2', 'dark-2', 'extra-tsuki'] as const;
const fights = new Set<string>(VOICED_STORY_FIGHTS);
const buffers = new Map<string, Promise<AudioBuffer>>();
let unlocked = false;
let installed = false;
let request = 0;
let playing: AudioBufferSourceNode | null = null;

export function storyVoiceSrc(fightId: string, cue: StoryVoiceCue): string | null {
  if (!fights.has(fightId)) return null;
  if (fightId === 'tut-mochi') return publicUrl('/audio/voices/mochi-fhe.wav');
  return publicUrl(`/audio/voices/${fightId}-${cue}.wav`);
}

/** Resume the shared audio context only inside a real player gesture. */
export function installVoiceUnlock(doc: Document = document): void {
  if (installed) return;
  installed = true;
  const unlock = (event: Event) => {
    if (!event.isTrusted || isMuted()) return;
    try {
      unlocked = audioReady().state !== 'closed';
    } catch {
      unlocked = false;
    }
  };
  doc.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  doc.addEventListener('keydown', unlock, { capture: true });
  // Keep listeners installed so the next player gesture can resume after backgrounding.
}

export function stopVoice(): void {
  request += 1;
  const old = playing;
  playing = null;
  if (old) {
    try { old.stop(); } catch { /* Already ended. */ }
    old.disconnect();
  }
}

onMuteChange((muted) => { if (muted) stopVoice(); });

function voiceBuffer(src: string, context: AudioContext): Promise<AudioBuffer> {
  const cached = buffers.get(src);
  if (cached) return cached;
  const pending = fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error('Voice asset unavailable');
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .catch((error: unknown) => {
      buffers.delete(src);
      throw error;
    });
  buffers.set(src, pending);
  return pending;
}

/** Missing audio, mute, autoplay restrictions, and stale loads never hold up play. */
export async function playStoryVoice(fightId: string, cue: StoryVoiceCue): Promise<boolean> {
  stopVoice();
  const src = storyVoiceSrc(fightId, cue);
  if (!src || !unlocked || isMuted()) return false;
  const ticket = request;
  try {
    const context = audioReady();
    const buffer = await voiceBuffer(src, context);
    if (ticket !== request || isMuted() || context.state !== 'running') return false;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    // WAVs have consistent -20 dB RMS and peak headroom; SE share the same mute.
    gain.gain.value = 0.85;
    source.connect(gain).connect(context.destination);
    source.onended = () => {
      if (playing === source) playing = null;
      source.disconnect();
      gain.disconnect();
    };
    playing = source;
    source.start();
    return true;
  } catch {
    return false;
  }
}

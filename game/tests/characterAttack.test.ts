import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ATTACK_MOTIONS } from '../src/data/attackMotions';
import { advanceCpu } from '../src/engine/ai';
import { prepareResolveDemo, submit } from '../src/engine/battle';
import { attackMotionFor, clearCharacterAttacks, playCharacterAttack } from '../src/fx/characterAttack';

class TestImage {
  className = '';
  dataset: Record<string, string> = {};
  src = '';
  alt = '';
  decoding = '';
  draggable = true;
  host: TestHost | null = null;
  listeners: Record<string, Array<() => void>> = {};
  classList = { add: (name: string) => { this.className += ` ${name}`; } };
  setAttribute() {}
  get isConnected() { return !!this.host?.children.includes(this); }
  addEventListener(event: string, fn: () => void) { (this.listeners[event] ??= []).push(fn); }
  emit(event: string) { for (const fn of this.listeners[event] ?? []) fn(); }
  remove() {
    if (this.host) this.host.children = this.host.children.filter((child) => child !== this);
  }
}

class TestHost {
  children: TestImage[] = [];
  appendChild(image: TestImage) { image.host = this; this.children.push(image); }
  querySelectorAll() { return this.children; }
}

function withDom(reduced: boolean, run: (host: TestHost, timers: Map<number, { fn: () => void; ms: number }>) => void) {
  const keys = ['document', 'window', 'matchMedia'] as const;
  const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  const host = new TestHost();
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextTimer = 0;
  const testGlobals = {
    document: { getElementById: () => host, createElement: () => new TestImage() },
    window: {
      setTimeout: (fn: () => void, ms: number) => { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
      clearTimeout: (id: number) => timers.delete(id),
    },
    matchMedia: () => ({ matches: reduced }),
  };
  ATTACK_MOTIONS['test-attack-fixture'] = {
    src: '/art/fx/attacks/test-attack-fixture.gif',
    poster: '/art/fx/attacks/test-attack-fixture.png',
    durationMs: 900,
  };
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, value: testGlobals[key] });
  try { run(host, timers); } finally {
    clearCharacterAttacks();
    delete ATTACK_MOTIONS['test-attack-fixture'];
    keys.forEach((key, i) => {
      if (descriptors[i]) Object.defineProperty(globalThis, key, descriptors[i]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}

describe('character attack playback', () => {
  it('leaves unregistered characters to the existing FX', () => {
    assert.equal(attackMotionFor('__proto__'), undefined);
    assert.equal(attackMotionFor('missing-motion-character'), undefined);
    withDom(false, (host) => {
      assert.equal(playCharacterAttack('missing-motion-character', 'circle', false, () => assert.fail()), false);
      assert.equal(host.children.length, 0);
    });
  });

  it('plays the actor GIF once, mirrors the opponent, and removes it after its duration', () => {
    withDom(false, (host, timers) => {
      assert.equal(playCharacterAttack('test-attack-fixture', 'cross', true, () => assert.fail()), true);
      const image = host.children[0];
      assert.match(image.src, /test-attack-fixture\.gif\?play=\d+$/);
      assert.match(image.className, /from-top/);
      assert.equal(image.dataset.slot, 'cross');
      image.emit('load');
      assert.match(image.className, /ready/);
      assert.equal(timers.size, 1);
      const end = [...timers.values()][0];
      assert.equal(end.ms, 900);
      end.fn();
      assert.equal(host.children.length, 0);
    });
  });

  it('falls back exactly once when a registered GIF fails or takes too long', () => {
    for (const failure of ['error', 'timeout']) withDom(false, (host, timers) => {
      let fallbacks = 0;
      playCharacterAttack('test-attack-fixture', 'triangle', false, () => fallbacks++);
      const image = host.children[0];
      if (failure === 'error') image.emit('error');
      else [...timers.values()][0].fn();
      image.emit('error');
      image.emit('load');
      assert.equal(fallbacks, 1, failure);
      assert.equal(host.children.length, 0, failure);
      assert.equal(timers.size, 0, failure);
    });
  });

  it('uses only a static poster for reduced motion, including a failed poster', () => {
    withDom(true, (host, timers) => {
      playCharacterAttack('test-attack-fixture', 'circle', false, () => assert.fail('animated fallback in reduced motion'));
      const image = host.children[0];
      assert.match(image.src, /test-attack-fixture\.png$/);
      assert.match(image.className, /still/);
      image.emit('load');
      assert.equal([...timers.values()][0].ms, 500);
      playCharacterAttack('test-attack-fixture', 'triangle', false, () => assert.fail('animated fallback in reduced motion'));
      assert.equal(host.children.length, 1, 'new attack replaces the old poster');
      host.children[0].emit('error');
      assert.equal(host.children.length, 0);
    });
  });

  it('restarts a repeated character attack with a new GIF playback clock', () => {
    withDom(false, (host) => {
      playCharacterAttack('test-attack-fixture', 'circle', false, () => assert.fail());
      const first = host.children[0].src;
      playCharacterAttack('test-attack-fixture', 'triangle', false, () => assert.fail());
      assert.equal(host.children.length, 1);
      assert.notEqual(host.children[0].src, first);
      assert.equal(host.children[0].dataset.slot, 'triangle');
    });
  });

  it('cancels loading and active attacks on navigation or an explicit skip', () => {
    withDom(false, (host, timers) => {
      let fallbacks = 0;
      playCharacterAttack('test-attack-fixture', 'circle', false, () => fallbacks++);
      const loading = host.children[0];
      clearCharacterAttacks();
      loading.emit('load');
      loading.emit('error');
      assert.equal(host.children.length, 0);
      assert.equal(timers.size, 0);
      assert.equal(fallbacks, 0, 'cancelled loading must not animate the next screen');
      playCharacterAttack('test-attack-fixture', 'cross', false, () => fallbacks++);
      host.children[0].emit('load');
      clearCharacterAttacks();
      assert.equal(host.children.length, 0);
      assert.equal(timers.size, 0);
    });
  });
});

describe('damage motion actor', () => {
  it('retains the attacking character and seat even when the victim is removed after KO', () => {
    const state = prepareResolveDemo(7);
    const damage = state.events.filter((event) => event.type === 'damage');
    assert.ok(damage.length > 0);
    for (const event of damage) {
      assert.notEqual(event.attacker, event.actor);
      assert.equal(event.cardId, state.players[event.attacker!].field?.cardId);
    }
    const fallen = state.players.find((player) => player.field && player.field.hp === 0)!;
    const taken = damage.find((event) => event.actor === fallen.id)!;
    const actorId = taken.cardId;
    const next = advanceCpu(submit(state, 0, { type: 'ackResolve' }), 0, 1, 'normal')!;
    assert.equal(next.players[fallen.id].field, null);
    assert.equal(taken.cardId, actorId);
    assert.ok(actorId);
  });
});

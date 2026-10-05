import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RULES_TEXT } from '../src/ui/inspect';
import {
  SHELL_TUTORIAL,
  TUTORIAL_STEPS,
  markShellTutorialPending,
  markShellTutorialSeen,
  markTutorialSeen,
  phaseNextTap,
  shellTutorialCovers,
  shouldStartShellTutorial,
  shouldStartTutorial,
  tutorialCoversBasics,
  tutorialForPhase,
  tutorialSpots,
  tutorialStep,
} from '../src/ui/tutorial';

describe('first-run tutorial', () => {
  it('covers たね ○△× 進化 どうぐ as steps, not RULES_TEXT', () => {
    assert.equal(tutorialCoversBasics(), true);
    assert.ok(TUTORIAL_STEPS.length >= 4);
    const blob = TUTORIAL_STEPS.map((s) => s.title + s.tap + s.body).join('\n');
    assert.ok(blob.includes('たね'));
    assert.ok(blob.includes('○'));
    assert.ok(blob.includes('進化'));
    assert.ok(blob.includes('どうぐ'));
    assert.notEqual(blob, RULES_TEXT);
    assert.ok(tutorialStep(0)?.id === 'tane');
  });

  it('is skippable and stays hidden after seen', () => {
    assert.equal(shouldStartTutorial({}, 0), true);
    assert.equal(shouldStartTutorial(undefined, 0), true);
    const seen = markTutorialSeen({}, false);
    assert.equal(shouldStartTutorial(seen, 0), false);
    const skipped = markTutorialSeen({}, true);
    assert.equal(shouldStartTutorial(skipped, 0), false);
    assert.equal(shouldStartTutorial({ tutorialSeen: false }, 3), false);
  });
});

describe('live play-screen tutorial', () => {
  it('teaches the 4 basics on real battle phases', () => {
    assert.equal(tutorialForPhase('summon')?.id, 'tane');
    assert.equal(tutorialForPhase('mulligan')?.id, 'tane');
    assert.equal(tutorialForPhase('attack')?.id, 'attack');
    assert.equal(tutorialForPhase('evo')?.id, 'evo');
    assert.equal(tutorialForPhase('support')?.id, 'item');
    assert.ok(tutorialSpots('summon').includes('hand-tane'));
    assert.ok(tutorialSpots('attack').includes('atk'));
    assert.ok(tutorialSpots('evo').includes('hand-beast'));
    assert.ok(tutorialSpots('support').includes('hand-item'));
    assert.ok((tutorialForPhase('summon')?.body ?? '').includes('たね'));
  });
});

describe('mid-story 月装 tutorial', () => {
  it('teaches 月殻 and 月装 on the real evo screen', () => {
    assert.equal(shellTutorialCovers(), true);
    assert.equal(tutorialForPhase('evo', 'shell')?.id, SHELL_TUTORIAL.id);
    assert.ok(tutorialSpots('evo', 'shell').includes('moon-garb'));
    assert.ok((tutorialForPhase('summon', 'shell')?.body ?? '').includes('たね'));
    assert.ok((tutorialForPhase('mulligan', 'shell')?.tap ?? '').includes('この手で行く'));
  });

  it('starts only after the first 月殻 lecture and hides after seen', () => {
    assert.equal(shouldStartShellTutorial({}), false);
    const pending = markShellTutorialPending({});
    assert.equal(shouldStartShellTutorial(pending), true);
    assert.equal(shouldStartShellTutorial(markShellTutorialSeen(pending, false)), false);
    assert.equal(shouldStartShellTutorial(markShellTutorialSeen(pending, true)), false);
    assert.equal(shouldStartShellTutorial({ shellTutorialSeen: true }), false);
    const already = markShellTutorialPending({ shellTutorialSeen: true });
    assert.equal(already.shellTutorialPending, undefined);
  });
});

describe('phase next-tap coach', () => {
  it('tells what to tap for summon attack evo support', () => {
    const summon = phaseNextTap('summon');
    const attack = phaseNextTap('attack');
    const evo = phaseNextTap('evo');
    const support = phaseNextTap('support');
    assert.ok(summon.includes('タップ') && summon.includes('たね'));
    assert.ok(attack.includes('タップ') && attack.includes('○'));
    assert.ok(evo.includes('進化'));
    assert.ok(support.includes('どうぐ') || support.includes('援護'));
  });
});

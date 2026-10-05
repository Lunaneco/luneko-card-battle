import type { Phase } from '../engine/types';

export interface TutorialStep {
  id: string;
  title: string;
  tap: string;
  body: string;
}

export type TutSpot = 'mulligan' | 'hand-tane' | 'hand-beast' | 'atk' | 'hand-item' | 'support' | 'opp-hand' | 'moon-garb';
export type TutorialKind = 'basic' | 'shell';

/** First-run coach on the real battle HUD. Elementary-school Japanese. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'tane',
    title: '① たねを出そう',
    tap: 'たねがあるなら「この手で行く」。つぎに、光っているたねをタップ',
    body: 'うえの小さいカードは、あいての手札だよ。かくしていない。自分の手札の「たね」（いちばん弱い姿）を場に出してね。',
  },
  {
    id: 'attack',
    title: '② ○△×でこうげき',
    tap: '下の ○・△・× のどれかをタップ',
    body: 'じゃんけんみたいに、ふたりが同時に選ぶよ。○がいちばんつよい。△はふつう。×はとくしゅ。先攻はコイントスのあとターンごとに入れ替わる。色の弱点は1.5倍（氷水→火炎→自然→氷水。暗黒→珍種→暗黒）。あいてが見えているカードから、予想してね。',
  },
  {
    id: 'evo',
    title: '③ 同じ色なら進化できる',
    tap: '金枠は進化。灰のPは進化ポイント。金カードのPを押すとポイントにもできる',
    body: '金色の「進化できる」が進化。灰色の「P+」は進化ポイントになる。同じ色の1段階上なら進化できる。ポイントが足りないと「P不足」と出る。月殻を持っていると、パートナーのたねから月装もできる。',
  },
  {
    id: 'item',
    title: '④ どうぐ',
    tap: '手札のどうぐ、または「山札の上を裏返す」。わからなければ「援護なし」',
    body: 'きずぐすりはたいりょくをなおすよ。力の月粉はこうげきを強くするよ。「山札の上」はいちかばちか。裏返すと名前と効果が見えるよ。',
  },
];

/** Mid-story coach after the first 月殻 lecture. Shown on the real evo screen. */
export const SHELL_TUTORIAL: TutorialStep = {
  id: 'moon',
  title: '月殻で月装する',
  tap: '金色の「月装」をタップ。手札はいらない',
  body: '月殻はデックに入れない石。パートナーのたねが出ているとき、持っている月殻の月装ができる。月装中はふつうの進化ができない。使わないなら「進化を終える」。',
};

export function tutorialStep(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] ?? null;
}

export function isLastTutorialStep(index: number): boolean {
  return index >= TUTORIAL_STEPS.length - 1;
}

export function tutorialCoversBasics(steps = TUTORIAL_STEPS): boolean {
  const blob = steps.map((s) => s.title + s.body + s.tap).join('');
  return blob.includes('たね') && blob.includes('○') && blob.includes('進化') && blob.includes('どうぐ');
}

export function shellTutorialCovers(step = SHELL_TUTORIAL): boolean {
  const blob = step.title + step.tap + step.body;
  return blob.includes('月殻') && blob.includes('月装') && blob.includes('たね');
}

/** Live battle phase → kid coach on the play screen. */
export function tutorialForPhase(phase: Phase, kind: TutorialKind = 'basic'): TutorialStep | null {
  if (kind === 'shell') {
    if (phase === 'evo') return SHELL_TUTORIAL;
    if (phase === 'summon' || phase === 'postKo') {
      return {
        id: 'moon-summon',
        title: 'パートナーのたねを出そう',
        tap: '手札のパートナーのたねをタップ',
        body: '月装はパートナーのたねからだけ。まずたねを場に出してね。',
      };
    }
    if (phase === 'mulligan') {
      return {
        id: 'moon-keep',
        title: 'たねを残そう',
        tap: 'パートナーのたねがあるなら「この手で行く」',
        body: '月装の練習だよ。たねを捨てないで。',
      };
    }
    if (phase === 'turnDraw') {
      return {
        id: 'moon-draw',
        title: '1枚引いた',
        tap: '「つづける」をタップ',
        body: '自分のターンは山札から1枚。手札は引き直せないよ。',
      };
    }
    return tutorialForPhase(phase, 'basic');
  }
  switch (phase) {
    case 'mulligan':
    case 'summon':
    case 'postKo':
      return tutorialStep(0);
    case 'turnDraw':
      return {
        id: 'draw',
        title: '1枚引いた',
        tap: '「つづける」をタップ',
        body: '自分のターンのはじめに、山札から1枚引くよ。開幕で決めた手札は、もう引き直せない。',
      };
    case 'attack':
      return tutorialStep(1);
    case 'evo':
      return tutorialStep(2);
    case 'support':
      return tutorialStep(3);
    case 'resolve':
      return {
        id: 'resolve',
        title: 'けっかを見よう',
        tap: 'カードの名前を見てから「次へ」',
        body: '山札の上を選んだら、いちかばちかでカードが裏返るよ。先制・カウンター・すいとるなどの特殊もここで光る。見てから次へ。',
      };
    case 'gameOver':
      return {
        id: 'end',
        title: 'おしまい',
        tap: '金色のボタンをタップ',
        body: 'ゴールドとカードがもらえるよ。ホームのショップでパックもひけるよ。',
      };
    default:
      return null;
  }
}

export function tutorialSpots(phase: Phase, kind: TutorialKind = 'basic'): TutSpot[] {
  if (kind === 'shell') {
    if (phase === 'evo') return ['moon-garb'];
    if (phase === 'summon' || phase === 'postKo') return ['hand-tane'];
    if (phase === 'mulligan') return ['mulligan'];
    if (phase === 'turnDraw') return [];
    return tutorialSpots(phase, 'basic');
  }
  switch (phase) {
    case 'mulligan':
      return ['mulligan', 'opp-hand'];
    case 'turnDraw':
      return ['opp-hand'];
    case 'summon':
    case 'postKo':
      return ['hand-tane'];
    case 'evo':
      return ['hand-beast'];
    case 'attack':
      return ['atk'];
    case 'support':
      return ['hand-item', 'support'];
    default:
      return [];
  }
}

export function shouldStartTutorial(flags: Record<string, boolean> | undefined, wins = 0): boolean {
  if (!flags) return true;
  if (flags.tutorialSeen || flags.tutorialSkipped) return false;
  if (wins > 0) return false;
  return true;
}

export function markTutorialSeen(flags: Record<string, boolean>, skipped: boolean): Record<string, boolean> {
  return { ...flags, tutorialSeen: true, tutorialSkipped: skipped };
}

export function shouldStartShellTutorial(flags: Record<string, boolean> | undefined): boolean {
  if (!flags?.shellTutorialPending) return false;
  if (flags.shellTutorialSeen || flags.shellTutorialSkipped) return false;
  return true;
}

export function markShellTutorialPending(flags: Record<string, boolean>): Record<string, boolean> {
  if (flags.shellTutorialSeen || flags.shellTutorialSkipped) return flags;
  return { ...flags, shellTutorialPending: true };
}

export function markShellTutorialSeen(flags: Record<string, boolean>, skipped: boolean): Record<string, boolean> {
  return { ...flags, shellTutorialPending: false, shellTutorialSeen: true, shellTutorialSkipped: skipped };
}

/** What to tap right now. Mid-battle coach, not the rules dump. */
export function phaseNextTap(phase: Phase): string {
  switch (phase) {
    case 'mulligan':
      return '手札にたね（いちばん弱い姿）があれば「この手で行く」。たねが1枚も無いときだけ「引き直す」';
    case 'turnDraw':
      return '山札から1枚引いた。「つづける」をタップ。手札はもう引き直せない';
    case 'summon':
    case 'postKo':
      return '手札のたねをタップして場に出す';
    case 'evo':
      return '金枠をタップで進化。灰のPは進化ポイント。「進化を終える」で次へ';
    case 'attack':
      return '○△×のどれかをタップしてこうげき';
    case 'support':
      return 'どうぐか「山札の上を裏返す」。使わないなら「援護なし」';
    case 'resolve':
      return '裏返ったカードと特殊を見てから「次へ」';
    case 'gameOver':
      return '金色のボタンをタップ';
    default:
      return '';
  }
}

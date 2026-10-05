import { CARD_BY_ID } from './cards';
import { nextFormId } from './lines';
import { matchingShellFor } from './shells';
import type { AiLevel } from '../engine/ai';
import type { AttackSlot, Specialty } from '../engine/types';

export const STORY_FACES = [
  'nyanluna',
  'tsukineko',
  'mochi',
  'player',
  'zero',
  'ashfist',
  'needswing',
  'thornbloom',
  'frostwolf',
  'tidewhale',
  'screwkit',
  'gearsmith',
  'nightsteward',
  'fireflytail',
  'slopedrake',
  'venomcrown',
  'margin',
  'snowlump',
  'threadless',
  'skyfeather',
] as const;

export type FaceId = (typeof STORY_FACES)[number];

export type FaceMood =
  | 'neutral'
  | 'smile'
  | 'tired'
  | 'stern'
  | 'sad'
  | 'smirk'
  | 'sleep'
  | 'pout'
  | 'wince'
  | 'cracked'
  | 'shock';

export interface Line {
  speaker: string;
  face?: FaceId;
  mood?: FaceMood;
  text: string;
}

export interface StoryBattle {
  id: string;
  opponentName: string;
  opponentFace: FaceId;
  /** Printed specialty the fight plays. `mix` is the exception-processor climax. */
  spec: Specialty | 'mix';
  /** One-line hand the player sees before the match. */
  deckTrait: string;
  deck: string[];
  ai: AiLevel;
  script?: AttackSlot[];
  noOptions?: boolean;
  reward: string[];
  xp: number;
  unlockPartner?: string;
  unlockShell?: string;
  cheat?: boolean;
  /** Shouted on the VS screen. */
  taunt?: string;
  /** Opponent's line on the finale screen. */
  winLine?: string;
  loseLine?: string;
}

export interface StoryNode {
  id: string;
  city: string;
  title: string;
  before: Line[];
  battle: StoryBattle;
  after: Line[];
}

export const CITIES = [
  { id: 'beginner', name: 'スプラウトコート', area: 'ロワーネット' },
  { id: 'flame', name: 'アッシュコート', area: 'ロワーネット' },
  { id: 'bloom', name: 'ブルームコート', area: 'ロワーネット' },
  { id: 'ice', name: 'フロストコート', area: 'ロワーネット' },
  { id: 'junk', name: 'ギアコート', area: 'ロワーネット' },
  { id: 'dark', name: 'シェードコート', area: 'ミッドネット' },
  { id: 'sky', name: 'ランプコート', area: 'ミッドネット' },
  { id: 'steep', name: 'スロープロード', area: 'アッパーネット' },
  { id: 'tower', name: 'クレフトタワー', area: 'アッパーネット' },
] as const;

export const CITY_ACT: Record<string, { act: number; label: string }> = {
  beginner: { act: 1, label: '第1幕　月使い誕生' },
  flame: { act: 1, label: '第1幕　月使い誕生' },
  bloom: { act: 2, label: '第2幕　バッジをあつめろ！' },
  ice: { act: 2, label: '第2幕　バッジをあつめろ！' },
  junk: { act: 3, label: '第3幕　ライバルの涙' },
  dark: { act: 3, label: '第3幕　ライバルの涙' },
  sky: { act: 4, label: '第4幕　ゼロの足音' },
  steep: { act: 4, label: '第4幕　ゼロの足音' },
  tower: { act: 5, label: '第5幕　決戦クレフトタワー' },
};

export function nextStoryNode(chapter: number): StoryNode | undefined {
  return STORY[Math.min(Math.max(0, chapter), STORY.length - 1)];
}

type DeckTier = 'early' | 'mid' | 'late';

/** Same-color IV / APEX only. Never たね (next-stage inject is explicit-only). Never 月装 / partner / セブンズ. */
const BEAST_PAD: Record<Specialty, Record<DeckTier, string[]>> = {
  flame: {
    early: [],
    mid: ['ashflare', 'flamewing', 'ashfist', 'foxblaze', 'redhowl', 'gobblaze', 'blazehound', 'magmajaw', 'tyrantail'],
    late: [
      'blazehound', 'foxblaze', 'ashfist', 'flamewing', 'magmajaw', 'redhowl',
      'infernox', 'volcanus', 'foxnova', 'emperordrake', 'vermilion',
    ],
  },
  ice: {
    early: [],
    mid: ['frostwolf', 'onehorn', 'seadrake', 'snowlump', 'snowfang', 'tidehorn', 'frosthorn', 'foamhorn', 'betajelly'],
    late: [
      'frosthorn', 'onehorn', 'snowlump', 'seadrake', 'foamhorn', 'snowfang',
      'steelfrost', 'tidewhale', 'glacier', 'blizzardon', 'snowking',
    ],
  },
  nature: {
    early: [],
    mid: ['shellbolt', 'thornball', 'lampenvoy', 'beastking', 'vinecat', 'silkwing', 'kunewhip', 'thornback', 'hornetcat'],
    late: [
      'beastking', 'lampenvoy', 'shellbolt', 'vinecat', 'hornetcat', 'silkwing',
      'skyfeather', 'lampdragon', 'thornbloom', 'forestor', 'lionheart',
    ],
  },
  dark: {
    early: [],
    mid: ['nightsteward', 'spiritcat', 'ironcat', 'nightblade', 'nightfang', 'bloodwing', 'grimalkin', 'wraithcat', 'bigshear'],
    late: [
      'nightsteward', 'ironcat', 'nightfang', 'grimalkin', 'nightblade', 'bloodwing',
      'bloodmarquis', 'venomcrown', 'calamycore', 'lastchapter', 'nosferan',
    ],
  },
  rare: {
    early: [],
    mid: ['filthorb', 'starball', 'songape', 'stoneward', 'gearcat', 'puffking', 'voltcore', 'orbcat'],
    late: [
      'gearcat', 'stoneward', 'filthorb', 'puffking', 'voltcore', 'songape',
      'threadless', 'goldape', 'superstar', 'chronos', 'puffnova',
    ],
  },
};

/** Role items for the color. セブンズ are explicit on bosses only. */
const ITEM_PAD: Record<Specialty, Record<DeckTier, string[]>> = {
  flame: {
    early: ['atkchip', 'pluginO', 'spicySeed', 'floppy'],
    mid: ['atkchip', 'pluginO', 'firstChip', 'honeyAtk', 'spicySeed'],
    late: ['superatkchip', 'pluginO', 'firstChip', 'honeyAtk', 'atkchip'],
  },
  ice: {
    early: ['floppy', 'miniHeal', 'defT', 'dropHeal'],
    mid: ['floppy', 'bigfloppy', 'dropHeal', 'defT', 'miniHeal'],
    late: ['bigfloppy', 'superfloppy', 'dropHeal', 'defT', 'floppy'],
  },
  nature: {
    early: ['speedEvo', 'floppy', 'pointCandy', 'atkchip'],
    mid: ['speedEvo', 'pointCandy', 'moonFeather', 'firstChip', 'floppy'],
    late: ['warpEvo', 'speedEvo', 'moonFeather', 'firstChip', 'dropHeal'],
  },
  dark: {
    early: ['defO', 'pluginX', 'atkchip', 'floppy'],
    mid: ['defO', 'hacking', 'jyureMist', 'handCrash', 'pluginX'],
    late: ['hacking', 'jyureMist', 'handCrash', 'defO', 'superatkchip'],
  },
  rare: {
    early: ['toyCore', 'dataCopy', 'floppy', 'luckyMushroom'],
    mid: ['toyCore', 'dataCopy', 'handCrash', 'luckyMushroom', 'defX'],
    late: ['toyCore', 'dataCopy', 'handCrash', 'luckyMushroom', 'defX'],
  },
};

const MIX_PAD = [
  'nightsteward', 'ashfist', 'lampenvoy', 'filthorb', 'frosthorn',
  'calamycore', 'infernox', 'lampdragon', 'glacier', 'goldape',
  'hacking', 'dataCopy', 'downloader', 'handCrash', 'superatkchip', 'jyureMist',
];

const FILL_ITEMS = [
  'floppy', 'atkchip', 'pluginO', 'pluginT', 'pluginX', 'miniHeal', 'dropHeal',
  'defO', 'defT', 'defX', 'pointCandy', 'luckyMushroom', 'spicySeed', 'honeyAtk', 'firstChip',
];

function capOf(id: string): number {
  const c = CARD_BY_ID[id];
  if (!c) return 0;
  if (c.kind === 'beast' && c.isPartner) return 1;
  if (c.kind === 'beast' && c.level === 'APEX') return 2;
  if (c.kind === 'option' && (c.id.endsWith('7') || c.name.includes('極月札'))) return 1;
  return 4;
}

function canPad(id: string, out: string[]): boolean {
  const c = CARD_BY_ID[id];
  if (!c) return false;
  if (c.kind === 'beast' && (c.level === 'MOON' || c.isPartner)) return false;
  if (c.kind === 'option' && (c.id.endsWith('7') || c.name.includes('極月札'))) return false;
  return out.filter((x) => x === id).length < capOf(id);
}

function fillFrom(out: string[], pad: string[], turns: number): void {
  if (!pad.length) return;
  let i = 0;
  while (out.length < 30 && i < turns) {
    const id = pad[i % pad.length]!;
    if (canPad(id, out)) out.push(id);
    i++;
  }
}

function fillPad(out: string[], pad: string[]): string[] {
  fillFrom(out, pad, 200);
  fillFrom(out, FILL_ITEMS, 200);
  return out.slice(0, 30);
}

function missingNextStages(ids: string[]): string[] {
  const have = new Set(ids);
  const miss: string[] = [];
  for (const id of have) {
    const next = nextFormId(id);
    if (next && CARD_BY_ID[next] && !have.has(next) && !miss.includes(next)) miss.push(next);
  }
  return miss;
}

/** Put the next stage of the fight's own たね / 1進化, swapping pad duplicates. */
function ensureLineStages(ids: string[], missRaw: string[], allowApex: boolean): string[] {
  const out = ids.slice(0, 30);
  const miss = missRaw.filter((next) => {
    const c = CARD_BY_ID[next];
    if (!c || c.kind !== 'beast') return false;
    if (c.level === 'APEX' && !allowApex) return false;
    return true;
  });
  for (const next of miss) {
    if (out.includes(next)) continue;
    if (out.filter((x) => x === next).length >= capOf(next)) continue;
    const slotOf = (beastsOnly: boolean): number => {
      for (let i = out.length - 1; i >= 0; i--) {
        const id = out[i]!;
        if (id === next) continue;
        if (out.filter((x) => x === id).length < 2) continue;
        const c = CARD_BY_ID[id];
        if (beastsOnly && (!c || c.kind !== 'beast')) continue;
        if (!beastsOnly && c && c.kind === 'beast') continue;
        return i;
      }
      return -1;
    };
    const slot = slotOf(true) >= 0 ? slotOf(true) : slotOf(false);
    if (slot < 0) continue;
    out[slot] = next;
  }
  return out;
}

function dTut(...ids: string[]): string[] {
  const out = ids.filter((id) => CARD_BY_ID[id]);
  const pad = ['waxcat', 'chickflare', 'gobflame', 'vinepup', 'floppy', 'atkchip', 'ennya', 'pluginO'];
  let i = 0;
  while (out.length < 30) {
    const id = pad[i % pad.length]!;
    if (CARD_BY_ID[id] && out.filter((x) => x === id).length < 4) out.push(id);
    i++;
    if (i > 120) break;
  }
  return out.slice(0, 30);
}

function d(tier: DeckTier, spec: Specialty, ...ids: string[]): string[] {
  const explicit = ids.filter((id) => CARD_BY_ID[id]);
  const pad = [...BEAST_PAD[spec][tier], ...ITEM_PAD[spec][tier]];
  const filled = fillPad(explicit.slice(), pad);
  return ensureLineStages(filled, missingNextStages(explicit), tier === 'late');
}

/** Climax exception deck: every color plus cheat options. */
function dMix(tier: DeckTier, ...ids: string[]): string[] {
  const explicit = ids.filter((id) => CARD_BY_ID[id]);
  const filled = fillPad(explicit.slice(), MIX_PAD);
  return ensureLineStages(filled, missingNextStages(explicit), tier === 'late');
}

export const STORY: StoryNode[] = [
  {
    id: 'tut-mochi',
    city: 'beginner',
    title: 'ふぇ〜！ はじめてのバトル',
    before: [
      { speaker: 'モチニャフェ', face: 'mochi', mood: 'smile', text: 'ふぇ〜' },
      { speaker: 'ニャンルナ（通信）', face: 'nyanluna', mood: 'smile', text: 'その子はモチニャフェ。メニューのうらに住んでる、練習の相手よ！' },
      { speaker: 'ニャンルナ（通信）', face: 'nyanluna', text: '○△×を、せーので出すの。相手の手を読んで、自分の技を選ぶ！' },
      { speaker: 'モチニャフェ', face: 'mochi', mood: 'pout', text: 'ふぇ〜' },
      { speaker: 'ニャンルナ（通信）', face: 'nyanluna', mood: 'smile', text: '手加減はしないって。さあ相棒と、初勝利をつかみなさい！' },
    ],
    battle: {
      id: 'tut-mochi',
      opponentName: 'モチニャフェ',
      opponentFace: 'mochi',
      spec: 'flame',
      deckTrait: 'れんしゅう用の火炎デック。たねばかりで、やさしいよ！',
      taunt: 'ふぇ〜',
      winLine: 'ふぇ〜',
      loseLine: 'ふぇ〜',
      deck: dTut('waxcat', 'waxcat', 'chickflare', 'ennya', 'gobflame', 'vinepup', 'floppy', 'floppy'),
      ai: 'tutorial',
      reward: ['jellpup', 'floppy', 'mochimemo'],
      xp: 25,
    },
    after: [
      { speaker: 'モチニャフェ', face: 'mochi', mood: 'pout', text: 'ふぇ〜' },
      { speaker: 'ニャンルナ（通信）', face: 'nyanluna', mood: 'smile', text: '初勝利、おめでとう！ 無敗で勝てたら、宝物の「ふえ〜メモ」ももらえるわ！' },
      { speaker: 'ニャンルナ（通信）', face: 'nyanluna', mood: 'stern', text: '最近「ERROR」が増えて、カードが勝手に暴れだしてる。次は、わたしのコートに来て！' },
      { speaker: 'モチニャフェ', face: 'mochi', mood: 'sleep', text: 'ふぇ〜' },
    ],
  },
  {
    id: 'beg-luna',
    city: 'beginner',
    title: '月の管理人ニャンルナ',
    before: [
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'smile', text: 'あなたが新しい月使いね。わたしはニャンルナ。このルナネットの管理人。ルナネットは、わたしの庭なの。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: '時間がないから、はっきり言うわ。いま、ネットが「ゼロ・ウイルス」に食われてる。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', text: 'ウイルスに取りつかれたカードは暴走して、持ち主の心まで熱くしすぎてしまうの。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: '止められるのは、カードで勝てる月使いだけ。……あなたにその力があるか、見せてもらうわ！' },
    ],
    battle: {
      id: 'beg-luna',
      opponentName: 'ニャンルナ',
      opponentFace: 'nyanluna',
      spec: 'nature',
      deckTrait: '自然デック。進化ポイントをためて、どんどん進化してくる！',
      taunt: '手は抜かないわ。全力で来なさい！',
      winLine: '……合格よ。あなた、本物ね。',
      loseLine: 'まだまだね。でも、目は悪くない。もう一度！',
      deck: d(
        'early',
        'nature',
        'vinepup',
        'vinepup',
        'needswing',
        'needswing',
        'sparkkit',
        'margin',
        'shellbolt',
        'lampenvoy',
        'beastking',
        'vinecat',
        'silkwing',
        'kunewhip',
        'speedEvo',
        'speedEvo',
        'floppy',
        'pointCandy',
      ),
      ai: 'normal',
      reward: ['needswing', 'speedEvo', 'gardenshears'],
      xp: 35,
    },
    after: [
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'smile', text: '合格よ！ 今日からあなたは月使い。スプラウトバッジを預けるわ！' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'smile', text: '引き直さず無敗で勝てたら、秘蔵の「庭師の鋏」もあなたのものよ！' },
      { speaker: 'ニャンルナ', face: 'nyanluna', text: 'バッジを8つ集めれば、ゼロ・ウイルスの出どころ……クレフトタワーの扉が開く。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: 'それから月殻（げっかく）を探しなさい。相棒をもっと強くする、月のかけらよ。最初の月殻は、次の街アッシュコートにあるはず！' },
    ],
  },
  {
    id: 'flame-1',
    city: 'flame',
    title: '燃える拳！ アッシュフィスト',
    before: [
      { speaker: 'アッシュフィスト', face: 'ashfist', text: 'おう！ 新入りか！ ここはアッシュコート、熱いやつしか生き残れねえ！' },
      { speaker: 'アッシュフィスト', face: 'ashfist', text: 'なんだか今日は、体の奥がボウボウ燃えて止まらねえんだ……！ 誰でもいい、ぶつかってこい！' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: '気をつけて！ あの目の赤い光……ウイルスに取りつかれてる！ 勝って目を覚まさせて！' },
    ],
    battle: {
      id: 'flame-1',
      opponentName: 'アッシュフィスト',
      opponentFace: 'ashfist',
      spec: 'flame',
      deckTrait: '火炎の速攻！ 先制でなぐってくる。HPは低いぞ！',
      taunt: '燃えてきたぜ！ 灰になるまでぶつかってこい！',
      winLine: 'ぐはっ……！ 頭の熱が、すーっと引いていく……！',
      loseLine: 'まだまだァ！ 燃え足りねえぞ、新入り！',
      deck: d(
        'mid',
        'flame',
        'ennya',
        'ennya',
        'flarecat',
        'flarecat',
        'foxfire',
        'foxfire',
        'redwolf',
        'embercub',
        'ashflare',
        'ashfist',
        'ashfist',
        'foxblaze',
        'flamewing',
        'atkchip',
        'atkchip',
        'pluginO',
        'firstChip',
      ),
      ai: 'normal',
      reward: ['foxfire', 'ashcrown', 'redwolf'],
      xp: 30,
      unlockPartner: 'moonember',
      unlockShell: 'embershell',
    },
    after: [
      { speaker: 'アッシュフィスト', face: 'ashfist', mood: 'wince', text: '……っは！ 俺、何してたんだ？ ……そうか、お前が止めてくれたのか。' },
      { speaker: 'アッシュフィスト', face: 'ashfist', mood: 'wince', text: '悪かったな。壊したコートは、俺が直す。礼だ、アッシュバッジと拾った月殻を持ってけ！' },
      { speaker: 'アッシュフィスト', face: 'ashfist', text: '無敗で勝てたら、アッシュクラウンもやるぜ！ 挑んでみな！' },
      { speaker: 'ニャンルナ', face: 'nyanluna', text: 'それが月殻よ。デックには入れない。パートナーのたねが場にいるとき、金色の「月装」ボタンを押すの。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'smile', text: '月装すれば、たねが一気に月のパワーをまとうわ。次のバトルで試してみなさい！' },
      { speaker: 'アッシュフィスト', face: 'ashfist', text: 'へっ、すげえ技だな。……気をつけろ。俺を燃やしたのは、黒いフードの男だった。' },
    ],
  },
  {
    id: 'flame-2',
    city: 'flame',
    title: 'ライバル登場！ ツキネコ',
    before: [
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smirk', text: 'へえ。アッシュフィストを止めたの、あんた？ ……ふーん、思ったより小さいじゃん。' },
      { speaker: 'ツキネコ', face: 'tsukineko', text: 'わたしはツキネコ。ゼロヒトってやつを追ってる。あんたより先にね。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smirk', text: '足手まといはいらない。わたしに勝てたら、ちょっとだけ認めてあげる！' },
    ],
    battle: {
      id: 'flame-2',
      opponentName: 'ツキネコ',
      opponentFace: 'tsukineko',
      spec: 'dark',
      deckTrait: '暗黒のジャマ！ ○を0にしたり、手札をこわしてくる！',
      taunt: 'わたしの闇に、ついてこれる？',
      winLine: 'うそ……わたしが負けた？ ……やるじゃん。',
      loseLine: 'ほらね。出直してきな、新入り！',
      deck: d(
        'mid',
        'dark',
        'littleshade',
        'littleshade',
        'shadehand',
        'shadehand',
        'blacktail',
        'duskpup',
        'nightsteward',
        'spiritcat',
        'ironcat',
        'nightblade',
        'venomcrown',
        'calamycore',
        'defO',
        'defO',
        'hacking',
        'jyureMist',
        'handCrash',
        'speedEvo',
      ),
      ai: 'rival',
      reward: ['littleshade', 'defO', 'nightsteward'],
      xp: 45,
      unlockShell: 'thundershell',
    },
    after: [
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'sad', text: '……負けた。くやしい。すっごく、くやしい！' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smile', text: 'でも、あんたの手、まっすぐで嫌いじゃない。雷月の殻、持っていきな。次は負けないから！' },
      { speaker: 'ツキネコ', face: 'tsukineko', text: 'ブルームコートで待ってる。……花はきれいだけど、トゲには気をつけなよ。' },
    ],
  },
  {
    id: 'bloom-1',
    city: 'bloom',
    title: '超スピード！ ニードスウィング',
    before: [
      { speaker: 'ニードスウィング', face: 'needswing', text: '待てない待てない待てない！ 考えるヒマがあったら、進化しちゃえばいいんだよ！' },
      { speaker: 'ニードスウィング', face: 'needswing', text: 'ウイルスのおかげで、オレ、めっちゃ速くなったんだ！ 止まれないけど！ あははは！' },
    ],
    battle: {
      id: 'bloom-1',
      opponentName: 'ニードスウィング',
      opponentFace: 'needswing',
      spec: 'nature',
      deckTrait: '自然の超速進化！ たねがいっぱい、すぐ大きくなる！',
      taunt: '一瞬で進化してやる！ ついてこれるか！',
      winLine: 'うわっ、止まった！ ……ブレーキって、大事なんだな。',
      loseLine: 'おっそーい！ 次はもっと速く来いよ！',
      deck: d(
        'mid',
        'nature',
        'needswing',
        'needswing',
        'leafkit',
        'leafkit',
        'vinepup',
        'whipbug',
        'mothlit',
        'sprout',
        'shellbolt',
        'vinecat',
        'kunewhip',
        'speedEvo',
        'speedEvo',
        'speedEvo',
        'pointCandy',
      ),
      ai: 'normal',
      reward: ['leafkit', 'speedEvo', 'mothlit'],
      xp: 35,
      unlockPartner: 'windfeather',
      unlockShell: 'bloomshell',
    },
    after: [
      { speaker: 'ニードスウィング', face: 'needswing', mood: 'tired', text: 'はぁ、はぁ……。速いだけじゃ、勝てないんだな……。' },
      { speaker: 'ニードスウィング', face: 'needswing', mood: 'tired', text: 'お礼にウィンドフェザーと花月の殻をあげる。速さは、使う人しだいだよ！' },
    ],
  },
  {
    id: 'bloom-2',
    city: 'bloom',
    title: 'トゲの女王ソーンブルーム',
    before: [
      { speaker: 'ソーンブルーム', face: 'thornbloom', text: 'ようこそ、ブルームコートへ。わたしはソーンブルーム、この街のコートマスターよ。' },
      { speaker: 'ソーンブルーム', face: 'thornbloom', text: 'ねえ、ゼロヒト様の仲間にならない？ ルールなんて全部消して、好きなだけ勝てる世界……すてきでしょう？' },
      { speaker: 'あなた', face: 'player', text: 'ことわる！ ルールがあるから、バトルは熱いんだ！' },
    ],
    battle: {
      id: 'bloom-2',
      opponentName: 'ソーンブルーム',
      opponentFace: 'thornbloom',
      spec: 'nature',
      deckTrait: 'トゲの誘惑！ 手札を捨てさせて、完成体でトドメ！',
      taunt: 'トゲの痛さ、教えてあげるわ。',
      winLine: 'わたしの誘惑が……きかない、なんて。',
      loseLine: 'ふふ。花はいつでも、勝った人のために咲くの。',
      deck: d(
        'mid',
        'nature',
        'vinepup',
        'vinepup',
        'sprout',
        'lampenvoy',
        'thornbloom',
        'thornbloom',
        'forestor',
        'lionheart',
        'roseSeduce',
        'roseSeduce',
        'speedEvo',
        'moonFeather',
      ),
      ai: 'rival',
      reward: ['roseSeduce', 'rosethorn', 'lampenvoy'],
      xp: 50,
      unlockShell: 'lampshell',
    },
    after: [
      { speaker: 'ソーンブルーム', face: 'thornbloom', mood: 'sad', text: '負けたわ。……本当は、ゼロヒト様の言葉が少しだけ怖かったの。' },
      { speaker: 'ソーンブルーム', face: 'thornbloom', mood: 'sad', text: 'ブルームバッジと灯月の殻よ。わたしが街の子を誘ったことは、なかったことにはならない。みんなには、自分で謝るわ。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'tired', text: '……彼女の弱さ、昔のわたしに少し似てる。でも、あなたが代わりに許してあげる必要はないわ。行きましょう。' },
    ],
  },
  {
    id: 'ice-1',
    city: 'ice',
    title: '氷の牙フロストウルフ',
    before: [
      { speaker: 'フロストウルフ', face: 'frostwolf', text: '焦るな、月使い。氷は溶けない。最後まで立っていた者が、勝つ。' },
      { speaker: 'フロストウルフ', face: 'frostwolf', text: 'ウイルスが街を冷やしすぎている。……俺の心までな。お前の熱で、試してみろ。' },
    ],
    battle: {
      id: 'ice-1',
      opponentName: 'フロストウルフ',
      opponentFace: 'frostwolf',
      spec: 'ice',
      deckTrait: '氷水の鉄壁！ HPが高くて回復もする。あせるな！',
      taunt: '凍りつけ。俺の壁は崩れん。',
      winLine: '……熱い。久しぶりに、熱い。',
      loseLine: '焦ったな。氷の前では、待てる者が勝つ。',
      deck: d(
        'mid',
        'ice',
        'fangpup',
        'fangpup',
        'snowkit',
        'sesame',
        'ripple',
        'frostwolf',
        'frostwolf',
        'onehorn',
        'onehorn',
        'snowfang',
        'tidehorn',
        'seadrake',
        'seadrake',
        'snowlump',
        'frosthorn',
        'floppy',
        'floppy',
        'dropHeal',
        'defT',
      ),
      ai: 'rival',
      reward: ['snowkit', 'floppy', 'ripple'],
      xp: 40,
      unlockPartner: 'fluffwing',
      unlockShell: 'dawnshell',
    },
    after: [
      { speaker: 'フロストウルフ', face: 'frostwolf', mood: 'smile', text: 'いい熱だった。氷が少し、溶けた気がする。' },
      { speaker: 'フロストウルフ', face: 'frostwolf', mood: 'smile', text: 'フラッフウィングと暁月の殻だ。夜明けの殻は、待てる者にだけ光る。持っていけ。' },
      { speaker: 'フロストウルフ', face: 'frostwolf', text: 'タイドホエールのおやじが海の底で待っている。……あいつは、俺より厚いぞ。' },
    ],
  },
  {
    id: 'ice-2',
    city: 'ice',
    title: '海の王タイドホエール',
    before: [
      { speaker: 'タイドホエール', face: 'tidewhale', mood: 'smile', text: 'わっはっは！ 来たな、ちび月使い！ わしはタイドホエール、フロストコートの主じゃ！' },
      { speaker: 'タイドホエール', face: 'tidewhale', text: 'ゼロヒトの手は、何度も同じ波を打ってくる。同じ手のくり返しじゃ。覚えておけ、きっと役に立つ！' },
    ],
    battle: {
      id: 'ice-2',
      opponentName: 'タイドホエール',
      opponentFace: 'tidewhale',
      spec: 'ice',
      deckTrait: 'もっと固い海の城！ 回復と△封じに注意！',
      taunt: 'わしの海は深いぞ！ 底まで来られるか！',
      winLine: 'わっはっは！ 見事！ 海が割れたわい！',
      loseLine: 'まだ浅い、浅い！ もっと深く読んでこい！',
      deck: d(
        'mid',
        'ice',
        'sesame',
        'penguin',
        'icicle',
        'bubblen',
        'seadrake',
        'tidewhale',
        'tidewhale',
        'frosthorn',
        'glacier',
        'blizzardon',
        'steelfrost',
        'defT',
        'defT',
        'bigfloppy',
        'dropHeal',
      ),
      ai: 'rival',
      reward: ['icicle', 'deepkeep', 'bubblen'],
      xp: 45,
      unlockShell: 'thickshell',
    },
    after: [
      { speaker: 'タイドホエール', face: 'tidewhale', mood: 'smile', text: 'わっはっは、見事じゃ！ フロストバッジと厚月の殻だ！ 無敗ならディープキープも持っていけ！' },
    ],
  },
  {
    id: 'junk-1',
    city: 'junk',
    title: 'ねじれ発明家スクリューキット',
    before: [
      { speaker: 'スクリューキット', face: 'screwkit', mood: 'smile', text: 'ねじれ〜！ ようこそギアコートへ！ ボクはスクリューキット、発明の天才さ！' },
      { speaker: 'スクリューキット', face: 'screwkit', text: '珍種のカードは数字が小さい。だからHPをぐにゃっとそろえて、勝負をひっくり返すんだ！' },
    ],
    battle: {
      id: 'junk-1',
      opponentName: 'スクリューキット',
      opponentFace: 'screwkit',
      spec: 'rare',
      deckTrait: '珍種のねじれ！ おたがいのHPをそろえてくる！',
      taunt: 'キミのHP、ぐにゃっとねじってあげる！',
      winLine: 'ありゃ〜！ ねじれ返された！',
      loseLine: 'ねじれ大成功〜！ また来てね！',
      deck: d(
        'mid',
        'rare',
        'screwkit',
        'screwkit',
        'puffball',
        'puffball',
        'clockbit',
        'marble',
        'puffking',
        'gearcat',
        'filthorb',
        'goldape',
        'toykings',
        'toyCore',
        'toyCore',
        'dataCopy',
      ),
      ai: 'rival',
      reward: ['clockbit', 'toykings', 'puffball'],
      xp: 45,
      unlockShell: 'clearshell',
    },
    after: [
      { speaker: 'スクリューキット', face: 'screwkit', mood: 'smile', text: 'ねじれ負けた〜！ 澄み月の殻、あげるよ！ 進化も月装もせず勝てたら、ネジキングスもね！' },
    ],
  },
  {
    id: 'junk-2',
    city: 'junk',
    title: '工房の親方ギアスミス',
    before: [
      { speaker: 'ギアスミス', face: 'gearsmith', text: 'おう、来たか。ここは工房だ。歯車は、噛み合う相手を間違えると粉々になる。' },
      { speaker: 'ギアスミス', face: 'gearsmith', text: 'ゼロヒトは昔、ここで一緒に歯車を作った仲間だった。……あいつは、ルールを作るのに飽きちまったんだ。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: '……知ってるわ。わたしも一緒に、ルールを書いたもの。' },
    ],
    battle: {
      id: 'junk-2',
      opponentName: 'ギアスミス',
      opponentFace: 'gearsmith',
      spec: 'rare',
      deckTrait: '工房の回転！ ドローと手札こわしでガンガン回す！',
      taunt: '俺の工房の回転、止められるか！',
      winLine: 'よし、ガッチリ噛み合った！ いい腕だ！',
      loseLine: '歯車がズレてるぞ。デックを組み直してこい！',
      deck: d(
        'mid',
        'rare',
        'gearsmith',
        'gearsmith',
        'glasscat',
        'slimekit',
        'sparkbit',
        'stoneward',
        'songape',
        'starball',
        'voltcore',
        'threadless',
        'chronos',
        'dataCopy',
        'dataCopy',
        'handCrash',
        'handCrash',
        'luckyMushroom',
        'speedEvo',
        'firstChip',
      ),
      ai: 'rival',
      reward: ['dataCopy', 'stoneward', 'speedEvo'],
      xp: 40,
      unlockPartner: 'shellwhite',
      unlockShell: 'chartshell',
    },
    after: [
      { speaker: 'ギアスミス', face: 'gearsmith', text: 'いい腕だ。ギアバッジ、シェルホワイト、それに図月の殻だ。殻ってやつは、歯車より正直だぜ。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'tired', text: '……ゼロヒトのことは、いつかちゃんと話す。今は先へ進みましょう。' },
    ],
  },
  {
    id: 'dark-1',
    city: 'dark',
    title: '闇の執事ナイトスチュワード',
    before: [
      { speaker: 'ナイトスチュワード', face: 'nightsteward', text: 'ようこそ、シェードコートへ。わたくしはナイトスチュワード。この闇の街の執事でございます。' },
      { speaker: 'ナイトスチュワード', face: 'nightsteward', mood: 'tired', text: 'ツキネコお嬢様が、ひとりでゼロヒトを追っておられます。……あの方は、無理をしすぎる。' },
    ],
    battle: {
      id: 'dark-1',
      opponentName: 'ナイトスチュワード',
      opponentFace: 'nightsteward',
      spec: 'dark',
      deckTrait: '重い暗黒！ 進化はおそいけど、一撃がでかい！',
      taunt: '闇の作法、たっぷりお見せいたしましょう。',
      winLine: 'お見事。……お嬢様を、よろしく頼みます。',
      loseLine: 'まだ闇に慣れておられませんな。',
      deck: d(
        'mid',
        'dark',
        'littleshade',
        'duskpup',
        'batling',
        'minishear',
        'nightsteward',
        'nightsteward',
        'nightfang',
        'bigshear',
        'bloodwing',
        'bloodmarquis',
        'calamycore',
        'atkchip',
        'pluginO',
        'speedEvo',
        'pointCandy',
      ),
      ai: 'rival',
      reward: ['duskpup', 'spiritcat', 'batling'],
      xp: 50,
      unlockPartner: 'shadebug',
      unlockShell: 'shadeshell',
    },
    after: [
      { speaker: 'ナイトスチュワード', face: 'nightsteward', mood: 'tired', text: 'お見事でございます。シェードバッジ、シェードバグ、そして影月の殻をどうぞ。' },
      { speaker: 'ナイトスチュワード', face: 'nightsteward', mood: 'tired', text: 'お嬢様の相棒カードは、ゼロヒトに消されたのです。名前の欄が、空っぽのまま……。どうか、お嬢様を。' },
    ],
  },
  {
    id: 'dark-2',
    city: 'dark',
    title: '決着！ ツキネコの本気',
    before: [
      { speaker: 'ツキネコ', face: 'tsukineko', text: 'また会ったね。……執事から聞いた？ わたしの相棒のこと。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'sad', text: 'そう。ゼロヒトに消された。カードの名前の欄は、ずっと空欄のまま。だから、わたしがあいつを倒す。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smirk', text: '止めたいなら、本気のわたしに勝ってからにしな！ 手加減なしの闇月札、くらいな！' },
    ],
    battle: {
      id: 'dark-2',
      opponentName: 'ツキネコ',
      opponentFace: 'tsukineko',
      spec: 'dark',
      deckTrait: 'ツキネコ本気の闇！ 封印・手札破壊・闇月札！',
      taunt: '今日のわたしは、本気だよ！',
      winLine: '……ずるいくらい、強くなったね。',
      loseLine: 'これがわたしの本気。あんたはまだ届かない！',
      deck: d(
        'late',
        'dark',
        'shadebug',
        'shadekit',
        'spook',
        'nightsteward',
        'grimalkin',
        'wraithcat',
        'bloodmarquis',
        'venomcrown',
        'calamycore',
        'lastchapter',
        'defO',
        'jyureMist',
        'handCrash',
        'dark7',
        'hacking',
        'speedEvo',
        'speedEvo',
        'shadekit',
        'shadekit',
        'spook',
      ),
      ai: 'boss',
      reward: ['jyureMist', 'bloodmarquis', 'dark7'],
      xp: 60,
      unlockShell: 'cleftshell',
    },
    after: [
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'sad', text: '……負けた。ひとりで勝てないなら、ひとりで行くのはただの意地っぱりだね。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smile', text: '欠け月の殻。欠けてても光る月。……いっしょに行こう、相棒。ゼロヒトをぶっ飛ばしに！' },
    ],
  },
  {
    id: 'sky-1',
    city: 'sky',
    title: '灯りの番人ファイアフライテイル',
    before: [
      { speaker: 'ファイアフライテイル', face: 'fireflytail', text: 'ニャン！ ランプコートの灯台係、ファイアフライテイルだよ！' },
      { speaker: 'ファイアフライテイル', face: 'fireflytail', text: 'ウイルスで街の灯りが消えかけてるの。わたしの灯は、闇を消すためじゃなくて、迷子を見つけるための灯なんだ。' },
    ],
    battle: {
      id: 'sky-1',
      opponentName: 'ファイアフライテイル',
      opponentFace: 'fireflytail',
      spec: 'nature',
      deckTrait: '灯りの自然！ 先制と回復でねばってくる！',
      taunt: 'この灯、消させないよ！',
      winLine: 'ニャン！ 灯りがもっと明るくなった！',
      loseLine: 'まだ暗いね。もう一回、照らしてあげる！',
      deck: d(
        'mid',
        'nature',
        'fireflytail',
        'sparkkit',
        'mothlit',
        'buzzkit',
        'lampenvoy',
        'lampenvoy',
        'fireflymoon',
        'silkwing',
        'hornetcat',
        'lampdragon',
        'fireflysaint',
        'moonmoth',
        'skyfeather',
        'lampwing',
        'firstChip',
        'dropHeal',
        'floppy',
      ),
      ai: 'rival',
      reward: ['lampwing', 'fireflymoon', 'floppy'],
      xp: 55,
      unlockPartner: 'fireflytail',
      unlockShell: 'tideshell',
    },
    after: [
      { speaker: 'ファイアフライテイル', face: 'fireflytail', text: 'ランプバッジと潮月の殻だよ！ わたしも一緒に戦う。無敗ならランプウィングも連れていけるよ！' },
    ],
  },
  {
    id: 'sky-2',
    city: 'sky',
    title: '最終試験！ ニャンルナの本気',
    before: [
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: 'ここまで来たなら、話すわ。ゼロヒトとわたしは、昔いっしょにこのルールを作ったの。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'tired', text: 'あいつは「もう飽きた」と言って、全部消そうとしている。……止められなかったのは、わたしの責任よ。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: 'だから最後の試験。わたしの本気のデックに勝てなければ、塔へは行かせない！' },
    ],
    battle: {
      id: 'sky-2',
      opponentName: 'ニャンルナ',
      opponentFace: 'nyanluna',
      spec: 'nature',
      deckTrait: '管理人の本気！ 月跳び進化とトゲの完成体！',
      taunt: '管理人の本気、受けてみなさい！',
      winLine: '……行きなさい。あなたなら、勝てる。',
      loseLine: 'まだよ。この程度じゃ、ゼロヒトには届かない！',
      deck: d(
        'late',
        'nature',
        'vinepup',
        'needswing',
        'sparkkit',
        'thornbloom',
        'thornbloom',
        'skyfeather',
        'lampdragon',
        'lionheart',
        'worldtree',
        'warpEvo',
        'warpEvo',
        'roseSeduce',
        'speedEvo',
        'holy7',
      ),
      ai: 'boss',
      reward: ['warpEvo', 'thornbloom', 'speedEvo'],
      xp: 70,
      unlockShell: 'cleftshell',
    },
    after: [
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'smile', text: '合格よ。ツキネコから預かった欠け月の殻、あなたが持ってなさい。それと、わたしの切り札「月跳び」も。' },
    ],
  },
  {
    id: 'steep-1',
    city: 'steep',
    title: '塔の門番スロープドレイク',
    before: [
      { speaker: 'スロープドレイク', face: 'slopedrake', text: '止まれ。この坂の先はクレフトタワー。8つのバッジを持たぬ者は通さん。' },
      { speaker: 'スロープドレイク', face: 'slopedrake', text: '……7つ、か。最後の1つは、この俺に勝って奪い取れ！' },
    ],
    battle: {
      id: 'steep-1',
      opponentName: 'スロープドレイク',
      opponentFace: 'slopedrake',
      spec: 'flame',
      deckTrait: '坂の獄炎！ 完成体と大パワーでぶんなぐる！',
      taunt: '坂の炎に焼かれて、落ちるがいい！',
      winLine: '見事……！ 最後のバッジは、お前のものだ。',
      loseLine: '落ちたな。だが、落ちた数だけ強くなれ。',
      deck: d(
        'late',
        'flame',
        'embercub',
        'cinder',
        'flarecat',
        'foxfire',
        'ashfist',
        'blazehound',
        'magmajaw',
        'foxblaze',
        'infernox',
        'volcanus',
        'foxnova',
        'emperordrake',
        'superatkchip',
        'superatkchip',
        'firstChip',
        'grand7',
      ),
      ai: 'boss',
      reward: ['embercub', 'superatkchip', 'infernox'],
      xp: 65,
      unlockShell: 'thundershell',
    },
    after: [
      { speaker: 'スロープドレイク', face: 'slopedrake', text: 'スロープバッジだ。これで8つ……塔の扉は開く。雷月の殻とインフェルノックスも持っていけ。' },
      { speaker: 'スロープドレイク', face: 'slopedrake', text: '塔の上では、ゼロヒトが同じ手を何度も打ってくる。……読み切れ。' },
    ],
  },
  {
    id: 'tower-venom',
    city: 'tower',
    title: '毒の女王ヴェノムクラウン',
    before: [
      { speaker: 'ヴェノムクラウン', face: 'venomcrown', text: 'よくぞ来た。だが、ここが貴様の終点だ。わたしこそ、ゼロヒト様の最高傑作！' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'tired', text: '……違う。あれは器よ。中にいるのは——' },
    ],
    battle: {
      id: 'tower-venom',
      opponentName: 'ヴェノムクラウン',
      opponentFace: 'venomcrown',
      spec: 'dark',
      deckTrait: '完成された毒！ 暗黒の完成体と闇月札！',
      taunt: '毒に沈め！ ここが貴様の終点だ！',
      winLine: 'ば、ばかな……器が、割れる……！',
      loseLine: 'ふははは！ 完成された毒の前に、ひれ伏せ！',
      deck: d(
        'late',
        'dark',
        'shadehand',
        'venompup',
        'blacktail',
        'spiritcat',
        'nightblade',
        'ironcat',
        'venomcrown',
        'venomcrown',
        'calamycore',
        'lastchapter',
        'bloodmarquis',
        'hacking',
        'dark7',
        'jyureMist',
        'speedEvo',
        'speedEvo',
        'warpEvo',
        'warpEvo',
        'shadehand',
        'venompup',
        'blacktail',
      ),
      ai: 'boss',
      reward: ['venomcrown', 'dark7', 'downloader'],
      xp: 80,
    },
    after: [
      { speaker: 'ヴェノムクラウン', face: 'venomcrown', mood: 'shock', text: '器が……割れた。中から、何かが——！' },
      { speaker: '？？？', face: 'zero', text: 'ERROR. ERROR. ……やあ。やっと会えたね、月使い。' },
    ],
  },
  {
    id: 'tower-zero',
    city: 'tower',
    title: '決戦！ ゼロヒト',
    before: [
      { speaker: 'ゼロヒト', face: 'zero', mood: 'smirk', text: 'ゼロヒトだ。このルナネットのルールを作った、もう一人の管理人さ。' },
      { speaker: 'ゼロヒト', face: 'zero', text: 'ルールを作って、遊んで、全部わかっちゃった。だから飽きた。飽きたものは、消す。それだけ。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: 'ふざけないで！ ここには、カードを大事にしてる子たちがいるの！ あなたのおもちゃじゃない！' },
      { speaker: 'ゼロヒト', face: 'zero', mood: 'smirk', text: '山札を並べ、手札を入れ替え、相棒を底に沈める。何度でも、同じ手で勝つ。見せてあげるよ。' },
      { speaker: 'ツキネコ', face: 'tsukineko', text: '聞いて！ あいつの攻撃は ○→○→×→△→○ のくり返し！ 同じ手なら、読み切れる！' },
      { speaker: 'あなた', face: 'player', text: 'いくぞ、相棒！ 読み切って、ぶっ飛ばす！！' },
    ],
    battle: {
      id: 'tower-zero',
      opponentName: 'ゼロヒト',
      opponentFace: 'zero',
      spec: 'mix',
      deckTrait: 'ズルい初手と山札！ 攻撃は ○→○→×→△→○ のくり返し！',
      taunt: '何度でも、同じ手で消してあげる。',
      winLine: 'ありえない……同じ手が、読まれた……？',
      loseLine: '残念。同じ手だよ。……また来る？',
      deck: dMix(
        'late',
        'littleshade',
        'embercub',
        'sparkkit',
        'screwkit',
        'icicle',
        'nightsteward',
        'ashfist',
        'lampenvoy',
        'filthorb',
        'frosthorn',
        'calamycore',
        'lastchapter',
        'twinpole',
        'venomcrown',
        'errorfang',
        'infernox',
        'downloader',
        'wild7',
        'holy7',
        'dark7',
        'hacking',
        'dataCopy',
        'samehand',
      ),
      ai: 'scripted',
      script: ['circle', 'circle', 'cross', 'triangle', 'circle'],
      cheat: true,
      reward: ['twinpole', 'errorfang', 'samehand', 'wild7'],
      xp: 120,
    },
    after: [
      { speaker: 'ゼロヒト', face: 'zero', mood: 'cracked', text: '……負けた。同じ手で、負けた。' },
      { speaker: 'ゼロヒト', face: 'zero', mood: 'cracked', text: '管理人の権限は返すよ。……ルールの中で負けるのって、こんなに悔しいんだね。' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'stern', text: '鍵は返してもらう。でも、あなたが消したデータも、壊した信頼も、すぐには戻らない。これから、ずっと直していくのよ。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'sad', text: '……相棒の欄は、空欄のまま。戻らないものも、ある。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smile', text: 'でもさ、空欄でもわたしは強い。それを証明できたのは、あんたのおかげ。ありがと、相棒！' },
      { speaker: 'モチニャフェ', face: 'mochi', mood: 'smile', text: 'ふぇ〜' },
      { speaker: 'ニャンルナ', face: 'nyanluna', mood: 'smile', text: 'ルナネットを取り戻したわ！ まだ強い月使いが隠れてる。相棒と、挑みに行きなさい！' },
    ],
  },
  {
    id: 'extra-tsuki',
    city: 'tower',
    title: 'ライバル再戦！ 空欄の刃',
    before: [
      { speaker: 'ツキネコ', face: 'tsukineko', text: 'ゼロヒトは、ネットの修理に行った。わたしは残る。……で、ヒマなんだよね。' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smile', text: '空欄のまま、最強の月使いとガチでやりたい。いいでしょ？' },
    ],
    battle: {
      id: 'extra-tsuki',
      opponentName: 'ツキネコ',
      opponentFace: 'tsukineko',
      spec: 'dark',
      deckTrait: '空欄の刃！ 反月札とハッキングで逆転をねらう！',
      taunt: '空欄の刃、なめないでよね！',
      winLine: 'あーあ、また負けた。……でも、最高に楽しかった！',
      loseLine: 'へへっ、ライバルはこうでなくっちゃ！',
      deck: d(
        'late',
        'dark',
        'shadebug',
        'shadekit',
        'blacktail',
        'shadeneedle',
        'grimalkin',
        'ironcat',
        'shadeend',
        'bloodmarquis',
        'calamycore',
        'blankfang',
        'reverse7',
        'hacking',
        'defO',
        'spiritcat',
        'speedEvo',
        'speedEvo',
      ),
      ai: 'boss',
      reward: ['reverse7', 'blankfang', 'hacking'],
      xp: 90,
      unlockShell: 'clearshell',
    },
    after: [
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'sad', text: '……また負けた！ ブランクファングは、空欄の名前の刃。引き直さず無敗なら、あんたに預ける！' },
      { speaker: 'ツキネコ', face: 'tsukineko', mood: 'smile', text: '澄み月の殻もつけといてあげる。アリーナはいつでも開いてるよ。オンラインの部屋で待ってる！' },
    ],
  },
  {
    id: 'extra-plot',
    city: 'beginner',
    title: 'すきまの番人マージン',
    before: [
      { speaker: 'マージン', face: 'margin', text: 'クリアおめでとう。おれはマージン、ルールのすきまに住んでる。すきまの速さ、見たくないか？' },
    ],
    battle: {
      id: 'extra-plot',
      opponentName: 'マージン',
      opponentFace: 'margin',
      spec: 'nature',
      deckTrait: 'すきまの速さ！ 迅月札で一気に進化する！',
      taunt: 'すきまから、一気に書き換える！',
      winLine: 'いい読みだ。すきまを突かれた。',
      loseLine: 'すきまだらけだったな。',
      deck: d(
        'mid',
        'nature',
        'margin',
        'margin',
        'leafkit',
        'leafkit',
        'vinepup',
        'whipbug',
        'beastking',
        'vinecat',
        'shellbolt',
        'lionheart',
        'skyfeather',
        'speedEvo',
        'speedEvo',
        'speed7',
      ),
      ai: 'rival',
      reward: ['margin', 'speed7', 'leafkit'],
      xp: 55,
    },
    after: [
      { speaker: 'マージン', face: 'margin', text: 'いい読みだ。全部「山札の上」の援護で勝てたら、迅月札をやる！ すきまの札だ。' },
    ],
  },
  {
    id: 'extra-yuki',
    city: 'ice',
    title: 'とけない雪だるまスノーランプ',
    before: [
      { speaker: 'スノーランプ', face: 'snowlump', mood: 'smile', text: 'ぼく、スノーランプ！ とけても、またかたまる！ 何回でも、ぶつかろ！' },
    ],
    battle: {
      id: 'extra-yuki',
      opponentName: 'スノーランプ',
      opponentFace: 'snowlump',
      spec: 'ice',
      deckTrait: 'とけない氷の城！ △封じと回復で、ずっと立ってる！',
      taunt: '何回とけても、またかたまる！',
      winLine: 'とけちゃった〜！ でも、またかたまるもん！',
      loseLine: 'まだまだ、とけないよ〜！',
      deck: d(
        'late',
        'ice',
        'snowlump',
        'snowkit',
        'tadpole',
        'icicle',
        'frosthorn',
        'snowfang',
        'glacier',
        'blizzardon',
        'snowking',
        'defT',
        'defT',
        'bigfloppy',
        'dropHeal',
      ),
      ai: 'boss',
      reward: ['snowlump', 'frosthorn', 'defT'],
      xp: 70,
      unlockShell: 'tideshell',
    },
    after: [
      { speaker: 'スノーランプ', face: 'snowlump', mood: 'smile', text: 'とけちゃった〜！ 潮月の殻、あげる！ またあそぼうね！' },
    ],
  },
  {
    id: 'extra-pino',
    city: 'junk',
    title: '糸なし人形スレッドレス',
    before: [
      { speaker: 'スレッドレス', face: 'threadless', mood: 'smirk', text: '糸がないとウソがつけない。だから、カードでウソをつくのさ。見破れるかな？' },
    ],
    battle: {
      id: 'extra-pino',
      opponentName: 'スレッドレス',
      opponentFace: 'threadless',
      spec: 'rare',
      deckTrait: 'ウソの珍種！ 霧月札と手札こわしでかく乱する！',
      taunt: 'ボクのウソ、見破れるかな？',
      winLine: '見破られたか。……ちょっと、うれしいかも。',
      loseLine: 'ウソにだまされたね！',
      deck: d(
        'late',
        'rare',
        'threadless',
        'threadless',
        'screwkit',
        'clockbit',
        'glasscat',
        'puffball',
        'starball',
        'filthorb',
        'toykings',
        'handCrash',
        'dataCopy',
        'toyCore',
        'misty7',
        'speedEvo',
        'firstChip',
      ),
      ai: 'boss',
      reward: ['threadless', 'misty7', 'dataCopy'],
      xp: 70,
    },
    after: [
      { speaker: 'スレッドレス', face: 'threadless', mood: 'smirk', text: '見破られたか。進化も月装もせず勝てたら、霧月札をあげる。いちばん正直なウソの札さ。' },
    ],
  },
  {
    id: 'extra-sera',
    city: 'sky',
    title: '空の羽根スカイフェザー',
    before: [
      { speaker: 'スカイフェザー', face: 'skyfeather', text: 'ファイアフライテイルの灯は、わたしの道しるべ。その灯の上を、わたしは飛ぶ！' },
    ],
    battle: {
      id: 'extra-sera',
      opponentName: 'スカイフェザー',
      opponentFace: 'skyfeather',
      spec: 'nature',
      deckTrait: '空の自然！ 聖月札と月跳びで舞い上がる！',
      taunt: '灯の上を、わたしは飛ぶ！',
      winLine: '羽根が折れた……でも、灯はまだついてる。',
      loseLine: '空の上までは、届かなかったね。',
      deck: d(
        'late',
        'nature',
        'skyfeather',
        'skyfeather',
        'sparkkit',
        'needswing',
        'lampenvoy',
        'beastking',
        'lampdragon',
        'lampwing',
        'holy7',
        'warpEvo',
        'warpEvo',
        'firstChip',
      ),
      ai: 'boss',
      reward: ['skyfeather', 'holy7', 'warpEvo'],
      xp: 80,
    },
    after: [
      { speaker: 'スカイフェザー', face: 'skyfeather', text: '羽根は折れた……でも灯は、まだついてる。無敗で勝てたら、聖月札もきみに！' },
    ],
  },
  {
    id: 'extra-giga',
    city: 'steep',
    title: '獄炎リベンジ！ スロープドレイク',
    before: [
      { speaker: 'スロープドレイク', face: 'slopedrake', text: '塔を降りた者よ、もう一度この坂を登るか。今度は本気の獄炎だ！' },
    ],
    battle: {
      id: 'extra-giga',
      opponentName: 'スロープドレイク',
      opponentFace: 'slopedrake',
      spec: 'flame',
      deckTrait: '本気の獄炎！ 地月札と完成体で焼きつくす！',
      taunt: '今度は本気の獄炎だ！',
      winLine: '二度も落ちなかったか……見事だ！',
      loseLine: 'まだ坂は高いぞ。',
      deck: d(
        'late',
        'flame',
        'embercub',
        'infernox',
        'infernox',
        'blazehound',
        'ashfist',
        'volcanus',
        'volcanus',
        'cinder',
        'foxnova',
        'ashcrown',
        'emperordrake',
        'superatkchip',
        'superatkchip',
        'grand7',
      ),
      ai: 'boss',
      reward: ['volcanus', 'grand7', 'cinder'],
      xp: 75,
    },
    after: [
      { speaker: 'スロープドレイク', face: 'slopedrake', text: '二度も落ちなかったか。引き直さず無敗なら、地月札はお前のものだ。坂は、いつでも待っている。' },
    ],
  },
];

const NAME_FACE: [string, FaceId][] = [
  ['ニャンルナ', 'nyanluna'],
  ['ツキネコ', 'tsukineko'],
  ['モチニャフェ', 'mochi'],
  ['ゼロヒト', 'zero'],
  ['アッシュフィスト', 'ashfist'],
  ['ニードスウィング', 'needswing'],
  ['ソーンブルーム', 'thornbloom'],
  ['フロストウルフ', 'frostwolf'],
  ['タイドホエール', 'tidewhale'],
  ['スクリューキット', 'screwkit'],
  ['ギアスミス', 'gearsmith'],
  ['ナイトスチュワード', 'nightsteward'],
  ['ファイアフライテイル', 'fireflytail'],
  ['スロープドレイク', 'slopedrake'],
  ['ヴェノムクラウン', 'venomcrown'],
  ['マージン', 'margin'],
  ['スノーランプ', 'snowlump'],
  ['スレッドレス', 'threadless'],
  ['スカイフェザー', 'skyfeather'],
  ['ニャンルナ', 'nyanluna'],
  ['ツキネコ', 'tsukineko'],
  ['もち', 'mochi'],
  ['ゼロ', 'zero'],
  ['灰拳', 'ashfist'],
  ['針翅', 'needswing'],
  ['棘花', 'thornbloom'],
  ['霜狼', 'frostwolf'],
  ['潮鯨', 'tidewhale'],
  ['捻子', 'screwkit'],
  ['歯車', 'gearsmith'],
  ['夜司', 'nightsteward'],
  ['蛍尾', 'fireflytail'],
  ['坂竜', 'slopedrake'],
  ['毒冕', 'venomcrown'],
  ['余白', 'margin'],
  ['雪だる', 'snowlump'],
  ['糸無', 'threadless'],
  ['天羽', 'skyfeather'],
];

export function faceIdOf(name: string, fallback?: string): FaceId | 'npc' {
  if (fallback && (STORY_FACES as readonly string[]).includes(fallback)) return fallback as FaceId;
  for (const [key, face] of NAME_FACE) {
    if (name.includes(key)) return face;
  }
  return 'npc';
}

export function stageSrc(cityId: string): string {
  if (CITIES.some((c) => c.id === cityId)) return `/art/stages/${cityId}.jpg`;
  return '/art/ui/battlefield.jpg';
}

export function storyCast(): { name: string; face: FaceId; city: string }[] {
  const seen = new Set<string>();
  const out: { name: string; face: FaceId; city: string }[] = [];
  for (const n of STORY) {
    const face = n.battle.opponentFace;
    if (seen.has(n.battle.opponentName)) continue;
    seen.add(n.battle.opponentName);
    out.push({ name: n.battle.opponentName, face, city: n.city });
  }
  return out;
}

export function nodeByIndex(i: number): StoryNode | undefined {
  return STORY[i];
}

export function cityNodes(cityId: string): StoryNode[] {
  return STORY.filter((n) => n.city === cityId);
}

/** Main-path 月殻 grants (not postgame extras). */
export function mainStoryShellUnlocks(): { fightId: string; shellId: string }[] {
  return STORY.filter((n) => !n.id.startsWith('extra-') && n.battle.unlockShell).map((n) => ({
    fightId: n.id,
    shellId: n.battle.unlockShell!,
  }));
}

/** First time each 月殻 drops on the main path. */
export function firstMainShellGrants(): { fightId: string; shellId: string }[] {
  const seen = new Set<string>();
  const out: { fightId: string; shellId: string }[] = [];
  for (const row of mainStoryShellUnlocks()) {
    if (seen.has(row.shellId)) continue;
    seen.add(row.shellId);
    out.push(row);
  }
  return out;
}

/**
 * Shells this fight actually hands the player.
 * flame-1 also gives the starter's matching 月殻 so the next-fight 月装 tutorial can fire.
 */
export function shellsGrantedByFight(fightId: string, starter: string): string[] {
  const n = STORY.find((x) => x.id === fightId);
  const ids: string[] = [];
  if (n?.battle.unlockShell) ids.push(n.battle.unlockShell);
  if (fightId === 'flame-1') {
    const match = matchingShellFor(starter);
    if (!ids.includes(match)) ids.push(match);
  }
  return ids;
}

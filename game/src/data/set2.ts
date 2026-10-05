import type { Attack, AttackEffectKind, BeastCard, OptionCard, Specialty, SupportEffect, Level } from '../engine/types';
import { kanaName } from './latinName';

function atk(power: number, effect: AttackEffectKind = 'none'): Attack {
  return { power, effect };
}

let no = 800;
const n = () => no++;

function beast(p: Omit<BeastCard, 'kind'>): BeastCard {
  return { kind: 'beast', ...p, name: kanaName(p.id, p.name) };
}

function option(p: Omit<OptionCard, 'kind'>): OptionCard {
  return { kind: 'option', ...p };
}

function line(
  spec: Specialty,
  stages: Array<{
    id: string;
    name: string;
    level: Level;
    hp: number;
    c: number;
    t: number;
    x: number;
    xe?: AttackEffectKind;
    dp: number;
    evo: number;
    support: SupportEffect;
    skill: string;
  }>,
): BeastCard[] {
  return stages.map((s) =>
    beast({
      id: s.id,
      no: n(),
      name: s.name,
      specialty: spec,
      level: s.level,
      hp: s.hp,
      circle: atk(s.c),
      triangle: atk(s.t),
      cross: atk(s.x, s.xe ?? 'none'),
      dp: s.dp,
      evoCost: s.evo,
      support: s.support,
      fusionValue: Math.round(s.hp / 20),
      resultValue: Math.round(s.hp / 10),
      skillName: s.skill,
      art: `/art/beasts/${s.id}.jpg`,
    }),
  );
}

export const SET2_BEASTS: BeastCard[] = [
  ...line('flame', [
    { id: 'foxfire', name: 'キツネビ', level: 'III', hp: 560, c: 350, t: 250, x: 160, xe: 'firstStrike', dp: 10, evo: 0, support: { kind: 'atkAll', amount: 70 }, skill: 'キツネ火' },
    { id: 'foxblaze', name: 'キツネフレア', level: 'IV', hp: 1040, c: 510, t: 370, x: 230, xe: 'firstStrike', dp: 20, evo: 30, support: { kind: 'atkAll', amount: 130 }, skill: '尾炎乱舞' },
    { id: 'foxnova', name: 'キツネノヴァ', level: 'APEX', hp: 1580, c: 730, t: 520, x: 310, xe: 'drain', dp: 20, evo: 60, support: { kind: 'atkAll', amount: 200 }, skill: '九尾爆炎' },
  ]),
  ...line('flame', [
    { id: 'redwolf', name: 'アカオオカミ', level: 'III', hp: 620, c: 340, t: 270, x: 170, xe: 'zeroCircle', dp: 10, evo: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 80 }, skill: '紅い遠吠え' },
    { id: 'redhowl', name: 'アカハウル', level: 'IV', hp: 1160, c: 500, t: 390, x: 250, xe: 'zeroCircle', dp: 20, evo: 30, support: { kind: 'atkSlot', slot: 'circle', amount: 140 }, skill: '紅月咆哮' },
    { id: 'redalpha', name: 'アカアルファ', level: 'APEX', hp: 1720, c: 700, t: 540, x: 330, xe: 'jam', dp: 20, evo: 60, support: { kind: 'atkAll', amount: 180 }, skill: '紅帝牙' },
  ]),
  ...line('ice', [
    { id: 'snowkit', name: 'ユキコ', level: 'III', hp: 780, c: 250, t: 230, x: 180, xe: 'drain', dp: 20, evo: 0, support: { kind: 'heal', amount: 140 }, skill: '粉雪キック' },
    { id: 'snowfang', name: 'ユキキバ', level: 'IV', hp: 1380, c: 390, t: 350, x: 260, xe: 'drain', dp: 20, evo: 30, support: { kind: 'heal', amount: 240 }, skill: '氷牙' },
    { id: 'snowking', name: 'ユキオウ', level: 'APEX', hp: 1960, c: 580, t: 520, x: 380, xe: 'jam', dp: 20, evo: 50, support: { kind: 'heal', amount: 360 }, skill: '絶対王雪' },
  ]),
  ...line('ice', [
    { id: 'ripple', name: 'リプル', level: 'III', hp: 800, c: 240, t: 230, x: 170, xe: 'counter', dp: 20, evo: 0, support: { kind: 'heal', amount: 150 }, skill: 'さざなみ' },
    { id: 'tidehorn', name: 'タイドホーン', level: 'IV', hp: 1440, c: 400, t: 360, x: 250, xe: 'counter', dp: 20, evo: 30, support: { kind: 'heal', amount: 250 }, skill: '潮流角' },
    { id: 'abyssion', name: 'アビシオン', level: 'APEX', hp: 2040, c: 560, t: 520, x: 360, xe: 'firstStrike', dp: 30, evo: 50, support: { kind: 'heal', amount: 400 }, skill: '深海衝角' },
  ]),
  ...line('nature', [
    { id: 'leafkit', name: 'リーフニャ', level: 'III', hp: 640, c: 280, t: 250, x: 170, xe: 'jam', dp: 30, evo: 0, support: { kind: 'pow', amount: 20 }, skill: '若葉パンチ' },
    { id: 'vinecat', name: '蔦猫', level: 'IV', hp: 1180, c: 430, t: 370, x: 250, xe: 'jam', dp: 30, evo: 20, support: { kind: 'pow', amount: 20 }, skill: '蔦しばり' },
    { id: 'forestor', name: 'フォレスター', level: 'APEX', hp: 1680, c: 650, t: 510, x: 330, xe: 'drain', dp: 30, evo: 40, support: { kind: 'heal', amount: 280 }, skill: '森の王牙' },
  ]),
  ...line('nature', [
    { id: 'mothlit', name: 'モスリット', level: 'III', hp: 600, c: 290, t: 240, x: 180, xe: 'firstStrike', dp: 30, evo: 0, support: { kind: 'pow', amount: 10 }, skill: '鱗粉' },
    { id: 'silkwing', name: 'シルクウイング', level: 'IV', hp: 1100, c: 450, t: 350, x: 240, xe: 'firstStrike', dp: 30, evo: 20, support: { kind: 'draw', amount: 1 }, skill: '絹の刃' },
    { id: 'moonmoth', name: 'ムーンモス', level: 'APEX', hp: 1600, c: 670, t: 490, x: 320, xe: 'counter', dp: 30, evo: 40, support: { kind: 'pow', amount: 30 }, skill: '月鱗乱舞' },
  ]),
  ...line('dark', [
    { id: 'duskpup', name: 'タソガレ', level: 'III', hp: 540, c: 350, t: 240, x: 150, xe: 'zeroCircle', dp: 10, evo: 0, support: { kind: 'atkAll', amount: 70 }, skill: '黄昏噛み' },
    { id: 'nightfang', name: 'ナイトファング', level: 'IV', hp: 1060, c: 540, t: 360, x: 220, xe: 'zeroCircle', dp: 10, evo: 40, support: { kind: 'atkAll', amount: 150 }, skill: '夜牙' },
    { id: 'voidhowl', name: 'ヴォイドハウル', level: 'APEX', hp: 1700, c: 790, t: 510, x: 300, xe: 'suicide', dp: 10, evo: 70, support: { kind: 'discardOpp', amount: 1 }, skill: '虚空遠吠え' },
  ]),
  ...line('dark', [
    { id: 'batling', name: 'コウモリリ', level: 'III', hp: 520, c: 340, t: 230, x: 160, xe: 'drain', dp: 10, evo: 0, support: { kind: 'heal', amount: 80 }, skill: '超音波' },
    { id: 'bloodwing', name: 'ブラッドウイング', level: 'IV', hp: 1020, c: 520, t: 350, x: 240, xe: 'drain', dp: 10, evo: 30, support: { kind: 'heal', amount: 160 }, skill: '血翼' },
    { id: 'nosferan', name: 'ノスフェラン', level: 'APEX', hp: 1660, c: 770, t: 500, x: 300, xe: 'drain', dp: 10, evo: 70, support: { kind: 'atkAll', amount: 210 }, skill: '夜宴' },
  ]),
  ...line('rare', [
    { id: 'clockbit', name: 'クロックビット', level: 'III', hp: 500, c: 250, t: 230, x: 190, xe: 'jam', dp: 20, evo: 0, support: { kind: 'pow', amount: 20 }, skill: '秒針突き' },
    { id: 'gearcat', name: 'ギアキャット', level: 'IV', hp: 1080, c: 410, t: 360, x: 270, xe: 'jam', dp: 20, evo: 30, support: { kind: 'pow', amount: 20 }, skill: '歯車噛み' },
    { id: 'chronos', name: '時猫', level: 'APEX', hp: 1620, c: 640, t: 500, x: 380, xe: 'firstStrike', dp: 20, evo: 50, support: { kind: 'draw', amount: 1 }, skill: '時戻し' },
  ]),
  ...line('rare', [
    { id: 'puffball', name: 'プフ', level: 'III', hp: 680, c: 220, t: 210, x: 200, xe: 'jam', dp: 20, evo: 0, support: { kind: 'setBothHp', amount: 260 }, skill: 'ふくらむ' },
    { id: 'puffking', name: 'プフキング', level: 'IV', hp: 1200, c: 380, t: 350, x: 280, xe: 'jam', dp: 20, evo: 30, support: { kind: 'setBothHp', amount: 280 }, skill: 'どんでん返し' },
    { id: 'puffnova', name: 'プフノヴァ', level: 'APEX', hp: 1740, c: 580, t: 500, x: 360, xe: 'counter', dp: 20, evo: 50, support: { kind: 'setBothHp', amount: 400 }, skill: '綿爆' },
  ]),
  ...line('flame', [
    { id: 'tyrantking', name: 'ティラキング', level: 'APEX', hp: 1740, c: 700, t: 560, x: 340, dp: 20, evo: 50, support: { kind: 'atkAll', amount: 160 }, skill: '暴君尾' },
  ]),
  ...line('ice', [
    { id: 'blizzardon', name: '吹雪城主', level: 'APEX', hp: 2080, c: 540, t: 510, x: 390, xe: 'jam', dp: 20, evo: 50, support: { kind: 'heal', amount: 420 }, skill: '吹雪城' },
  ]),
  ...line('nature', [
    { id: 'lionheart', name: 'ライオンハート', level: 'APEX', hp: 1780, c: 680, t: 540, x: 340, xe: 'zeroCircle', dp: 20, evo: 50, support: { kind: 'atkAll', amount: 150 }, skill: '百王牙拳' },
  ]),
  // Complete leftover set-1 seeds that had no next form
  ...line('flame', [
    { id: 'gobblaze', name: 'ゴブリンブレイズ', level: 'IV', hp: 1020, c: 500, t: 360, x: 220, xe: 'zeroCircle', dp: 10, evo: 30, support: { kind: 'atkAll', amount: 120 }, skill: 'ゴブリン炎槍' },
    { id: 'gobinferno', name: 'ゴブリンフェルノ', level: 'APEX', hp: 1660, c: 720, t: 520, x: 300, xe: 'firstStrike', dp: 10, evo: 60, support: { kind: 'atkAll', amount: 190 }, skill: '炎ゴブリン王' },
  ]),
  ...line('ice', [
    { id: 'betajelly', name: 'ベタジェリー', level: 'IV', hp: 1480, c: 360, t: 340, x: 250, xe: 'jam', dp: 20, evo: 30, support: { kind: 'heal', amount: 280 }, skill: '電撃ゼリー' },
    { id: 'betaking', name: 'ベタキング', level: 'APEX', hp: 2020, c: 540, t: 500, x: 370, xe: 'drain', dp: 20, evo: 50, support: { kind: 'heal', amount: 420 }, skill: '王海月' },
  ]),
  ...line('nature', [
    { id: 'kunewhip', name: 'クネウィップ', level: 'IV', hp: 1140, c: 450, t: 360, x: 230, xe: 'firstStrike', dp: 30, evo: 20, support: { kind: 'pow', amount: 30 }, skill: '鞭雷' },
    { id: 'kunestorm', name: 'クネストーム', level: 'APEX', hp: 1640, c: 670, t: 500, x: 320, xe: 'jam', dp: 30, evo: 40, support: { kind: 'pow', amount: 30 }, skill: '雷蛇嵐' },
  ]),
  ...line('dark', [
    { id: 'bigshear', name: '大鋏', level: 'IV', hp: 1120, c: 530, t: 370, x: 230, xe: 'firstStrike', dp: 10, evo: 40, support: { kind: 'atkAll', amount: 130 }, skill: '大鋏' },
    { id: 'shearking', name: '鋏王', level: 'APEX', hp: 1680, c: 780, t: 510, x: 300, xe: 'zeroCircle', dp: 10, evo: 70, support: { kind: 'atkAll', amount: 200 }, skill: '帝王鋏' },
  ]),
  // Set 3 — more same-character lines
  ...line('flame', [
    { id: 'embercub', name: 'ヒノコ', level: 'III', hp: 550, c: 360, t: 240, x: 150, xe: 'firstStrike', dp: 10, evo: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 90 }, skill: '火の粉' },
    { id: 'blazehound', name: 'ヒケモノ', level: 'IV', hp: 1080, c: 530, t: 370, x: 230, xe: 'firstStrike', dp: 20, evo: 30, support: { kind: 'atkAll', amount: 140 }, skill: '炎走' },
    { id: 'infernox', name: 'インフェルノックス', level: 'APEX', hp: 1660, c: 750, t: 530, x: 310, xe: 'zeroCircle', dp: 20, evo: 60, support: { kind: 'atkAll', amount: 210 }, skill: '獄炎牙' },
  ]),
  ...line('flame', [
    { id: 'cinder', name: 'シンダー', level: 'III', hp: 590, c: 330, t: 260, x: 170, xe: 'zeroTriangle', dp: 10, evo: 0, support: { kind: 'atkAll', amount: 60 }, skill: '残り火' },
    { id: 'magmajaw', name: 'マグマジョー', level: 'IV', hp: 1180, c: 490, t: 400, x: 250, xe: 'zeroTriangle', dp: 20, evo: 30, support: { kind: 'atkAll', amount: 110 }, skill: '溶岩顎' },
    { id: 'volcanus', name: 'ヴォルカヌス', level: 'APEX', hp: 1760, c: 700, t: 560, x: 340, xe: 'jam', dp: 20, evo: 50, support: { kind: 'atkAll', amount: 170 }, skill: '噴火王' },
  ]),
  ...line('ice', [
    { id: 'icicle', name: 'ツララコ', level: 'III', hp: 790, c: 250, t: 230, x: 180, xe: 'zeroTriangle', dp: 20, evo: 0, support: { kind: 'heal', amount: 150 }, skill: 'つらら投げ' },
    { id: 'frosthorn', name: 'フロストホーン', level: 'IV', hp: 1420, c: 400, t: 360, x: 260, xe: 'zeroTriangle', dp: 20, evo: 30, support: { kind: 'heal', amount: 250 }, skill: '氷角' },
    { id: 'glacier', name: '氷河猫', level: 'APEX', hp: 2000, c: 570, t: 520, x: 380, xe: 'jam', dp: 20, evo: 50, support: { kind: 'heal', amount: 380 }, skill: '氷河衝' },
  ]),
  ...line('ice', [
    { id: 'bubblen', name: '泡仔', level: 'III', hp: 820, c: 230, t: 220, x: 170, xe: 'drain', dp: 20, evo: 0, support: { kind: 'heal', amount: 160 }, skill: 'あわぶく' },
    { id: 'foamhorn', name: 'フォームホーン', level: 'IV', hp: 1460, c: 380, t: 350, x: 250, xe: 'drain', dp: 20, evo: 30, support: { kind: 'heal', amount: 270 }, skill: '泡角' },
    { id: 'tidelord', name: 'タイドロード', level: 'APEX', hp: 2060, c: 550, t: 510, x: 360, xe: 'counter', dp: 30, evo: 50, support: { kind: 'heal', amount: 430 }, skill: '潮王' },
  ]),
  ...line('nature', [
    { id: 'sprout', name: 'メバエ', level: 'III', hp: 650, c: 270, t: 250, x: 170, xe: 'counter', dp: 30, evo: 0, support: { kind: 'pow', amount: 20 }, skill: '新芽突き' },
    { id: 'thornback', name: 'ソーンバック', level: 'IV', hp: 1200, c: 420, t: 380, x: 260, xe: 'counter', dp: 30, evo: 20, support: { kind: 'pow', amount: 20 }, skill: '棘背' },
    { id: 'worldtree', name: 'ワールドツリー', level: 'APEX', hp: 1720, c: 640, t: 530, x: 350, xe: 'drain', dp: 30, evo: 40, support: { kind: 'heal', amount: 320 }, skill: '世界樹' },
  ]),
  ...line('nature', [
    { id: 'buzzkit', name: 'ハチニャ', level: 'III', hp: 610, c: 300, t: 240, x: 160, xe: 'firstStrike', dp: 30, evo: 0, support: { kind: 'pow', amount: 10 }, skill: '針刺し' },
    { id: 'hornetcat', name: '蜂猫', level: 'IV', hp: 1120, c: 460, t: 350, x: 240, xe: 'firstStrike', dp: 30, evo: 20, support: { kind: 'atkSlot', slot: 'circle', amount: 120 }, skill: '蜂襲' },
    { id: 'queensting', name: 'クイーンスティング', level: 'APEX', hp: 1580, c: 690, t: 490, x: 310, xe: 'jam', dp: 30, evo: 40, support: { kind: 'pow', amount: 30 }, skill: '女王針' },
  ]),
  ...line('dark', [
    { id: 'shadekit', name: 'カゲコ', level: 'III', hp: 530, c: 350, t: 230, x: 150, xe: 'jam', dp: 10, evo: 0, support: { kind: 'atkAll', amount: 70 }, skill: '影噛み' },
    { id: 'grimalkin', name: 'グリマルキン', level: 'IV', hp: 1040, c: 550, t: 350, x: 220, xe: 'jam', dp: 10, evo: 40, support: { kind: 'atkAll', amount: 150 }, skill: '呪猫' },
    { id: 'umbraking', name: 'アンブラキング', level: 'APEX', hp: 1680, c: 800, t: 500, x: 290, xe: 'suicide', dp: 10, evo: 70, support: { kind: 'discardOpp', amount: 1 }, skill: '影王' },
  ]),
  ...line('dark', [
    { id: 'spook', name: 'オバケコ', level: 'III', hp: 510, c: 340, t: 240, x: 160, xe: 'drain', dp: 10, evo: 0, support: { kind: 'heal', amount: 90 }, skill: 'ひやり' },
    { id: 'wraithcat', name: 'レイスキャット', level: 'IV', hp: 1000, c: 530, t: 360, x: 230, xe: 'drain', dp: 10, evo: 30, support: { kind: 'heal', amount: 170 }, skill: '霊追い' },
    { id: 'phantasm', name: 'ファンタズム', level: 'APEX', hp: 1640, c: 760, t: 500, x: 300, xe: 'firstStrike', dp: 10, evo: 70, support: { kind: 'atkAll', amount: 200 }, skill: '幽体乱舞' },
  ]),
  ...line('rare', [
    { id: 'sparkbit', name: 'スパークビット', level: 'III', hp: 490, c: 260, t: 230, x: 190, xe: 'firstStrike', dp: 20, evo: 0, support: { kind: 'pow', amount: 20 }, skill: '短絡' },
    { id: 'voltcore', name: 'ボルトコア', level: 'IV', hp: 1060, c: 420, t: 360, x: 280, xe: 'firstStrike', dp: 20, evo: 30, support: { kind: 'pow', amount: 20 }, skill: '電核' },
    { id: 'thunderforge', name: 'サンダーフォージ', level: 'APEX', hp: 1600, c: 650, t: 510, x: 370, xe: 'jam', dp: 20, evo: 50, support: { kind: 'draw', amount: 1 }, skill: '雷鍛冶' },
  ]),
  ...line('rare', [
    { id: 'marble', name: 'マーブル', level: 'III', hp: 640, c: 230, t: 220, x: 200, xe: 'counter', dp: 20, evo: 0, support: { kind: 'setBothHp', amount: 240 }, skill: '転がる' },
    { id: 'orbcat', name: 'オーブキャット', level: 'IV', hp: 1160, c: 390, t: 360, x: 280, xe: 'jam', dp: 20, evo: 30, support: { kind: 'setBothHp', amount: 280 }, skill: '玉転がし' },
    { id: 'cosmos', name: '星玉', level: 'APEX', hp: 1680, c: 600, t: 510, x: 370, xe: 'counter', dp: 20, evo: 50, support: { kind: 'setBothHp', amount: 360 }, skill: '星玉' },
  ]),
];

export const SET2_OPTIONS: OptionCard[] = [
  option({ id: 'honeyAtk', no: n(), name: 'ちからのハチミツ', optionType: 'battle', effect: { kind: 'atkAll', amount: 200 }, fusionValue: 10, resultValue: 20, text: '全攻撃 +200' }),
  option({ id: 'miniHeal', no: n(), name: 'げんきのかけら', optionType: 'battle', effect: { kind: 'heal', amount: 200 }, fusionValue: 6, resultValue: 12, text: 'HP+200' }),
  option({ id: 'dropHeal', no: n(), name: 'かいふくのしずく', optionType: 'battle', effect: { kind: 'heal', amount: 400 }, fusionValue: 10, resultValue: 20, text: 'HP+400' }),
  option({ id: 'pointCandy', no: n(), name: 'ポイントアメ', optionType: 'evolution', effect: { kind: 'addPow', amount: 20 }, fusionValue: 8, resultValue: 16, text: '進化P+20' }),
  option({ id: 'luckyMushroom', no: n(), name: 'ラッキーキノコ', optionType: 'battle', effect: { kind: 'draw', amount: 1 }, fusionValue: 10, resultValue: 20, text: '1枚引く' }),
  option({ id: 'moonFeather', no: n(), name: 'つきのハネ', optionType: 'evolution', effect: { kind: 'addPow', amount: 40 }, fusionValue: 12, resultValue: 24, text: '進化P+40' }),
  option({ id: 'spicySeed', no: n(), name: 'からいタネ', optionType: 'battle', effect: { kind: 'atkSlot', slot: 'circle', amount: 180 }, fusionValue: 8, resultValue: 16, text: '○攻撃 +180' }),
];

export const SET2_LINES: string[][] = [
  ['foxfire', 'foxblaze', 'foxnova'],
  ['redwolf', 'redhowl', 'redalpha'],
  ['snowkit', 'snowfang', 'snowking'],
  ['ripple', 'tidehorn', 'abyssion'],
  ['leafkit', 'vinecat', 'forestor'],
  ['mothlit', 'silkwing', 'moonmoth'],
  ['duskpup', 'nightfang', 'voidhowl'],
  ['batling', 'bloodwing', 'nosferan'],
  ['clockbit', 'gearcat', 'chronos'],
  ['puffball', 'puffking', 'puffnova'],
  ['waxcat', 'tyrantail', 'tyrantking'],
  ['tadpole', 'snowlump', 'blizzardon'],
  ['margin', 'beastking', 'lionheart'],
  ['gobflame', 'gobblaze', 'gobinferno'],
  ['jellpup', 'betajelly', 'betaking'],
  ['whipbug', 'kunewhip', 'kunestorm'],
  ['minishear', 'bigshear', 'shearking'],
  ['embercub', 'blazehound', 'infernox'],
  ['cinder', 'magmajaw', 'volcanus'],
  ['icicle', 'frosthorn', 'glacier'],
  ['bubblen', 'foamhorn', 'tidelord'],
  ['sprout', 'thornback', 'worldtree'],
  ['buzzkit', 'hornetcat', 'queensting'],
  ['shadekit', 'grimalkin', 'umbraking'],
  ['spook', 'wraithcat', 'phantasm'],
  ['sparkbit', 'voltcore', 'thunderforge'],
  ['marble', 'orbcat', 'cosmos'],
];

/** New-game and save-migrate grants so extra lines show up in the deck builder. */
export const SET2_GRANT: string[] = [
  'foxfire',
  'foxblaze',
  'redwolf',
  'snowkit',
  'ripple',
  'leafkit',
  'mothlit',
  'duskpup',
  'batling',
  'clockbit',
  'puffball',
  'embercub',
  'cinder',
  'icicle',
  'bubblen',
  'sprout',
  'buzzkit',
  'shadekit',
  'spook',
  'sparkbit',
  'marble',
  'honeyAtk',
  'miniHeal',
  'pointCandy',
  'dropHeal',
  'spicySeed',
];

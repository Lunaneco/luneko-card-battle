import type {
  Attack,
  AttackEffectKind,
  BeastCard,
  CardDef,
  OptionCard,
  Specialty,
  SupportEffect,
  Level,
} from '../engine/types';
import { EXCLUSIVE_BEASTS, EXCLUSIVE_OPTIONS } from './exclusives';
import { kanaName } from './latinName';
import { SET2_BEASTS, SET2_OPTIONS } from './set2';

function atk(power: number, effect: AttackEffectKind = 'none'): Attack {
  return { power, effect };
}

function beast(p: Omit<BeastCard, 'kind'>): BeastCard {
  return { kind: 'beast', ...p, name: kanaName(p.id, p.name) };
}

function option(p: Omit<OptionCard, 'kind'>): OptionCard {
  return { kind: 'option', ...p };
}

let no = 1;
const n = () => no++;

export const CARDS: CardDef[] = [
  // ——— Partners ———
  beast({
    id: 'moonember', no: n(), name: '月炎仔', specialty: 'flame', level: 'III',
    hp: 680, circle: atk(380), triangle: atk(280), cross: atk(180, 'zeroCircle'),
    dp: 20, evoCost: 0, support: { kind: 'atkAll', amount: 80 },
    fusionValue: 40, resultValue: 80, isPartner: true, partnerLine: 'moonember',
    art: '/art/partners/moonember.jpg', skillName: '月炎息',
  }),
  beast({
    id: 'moonsaddle', no: n(), name: '炎月騎', specialty: 'flame', level: 'MOON',
    hp: 980, circle: atk(520), triangle: atk(390), cross: atk(240, 'firstStrike'),
    dp: 20, evoCost: 0, support: { kind: 'atkAll', amount: 120 },
    fusionValue: 70, resultValue: 140, isPartner: true, partnerLine: 'moonember',
    garbOf: 'moonember', shellId: 'embershell', art: '/art/partners/moonsaddle.jpg',
    skillName: '炎月駆け',
  }),
  beast({
    id: 'thundersaddle', no: n(), name: '雷月騎', specialty: 'dark', level: 'MOON',
    hp: 920, circle: atk(540), triangle: atk(360), cross: atk(220, 'jam'),
    dp: 10, evoCost: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 180 },
    fusionValue: 70, resultValue: 140, isPartner: true, partnerLine: 'moonember',
    garbOf: 'moonember', shellId: 'thundershell', art: '/art/partners/thundersaddle.jpg', skillName: '雷角',
  }),
  beast({
    id: 'miracore', no: n(), name: '欠け核', specialty: 'flame', level: 'MOON',
    hp: 1200, circle: atk(640), triangle: atk(480), cross: atk(300, 'drain'),
    dp: 20, evoCost: 0, support: { kind: 'heal', amount: 300 },
    fusionValue: 110, resultValue: 220, isPartner: true, partnerLine: 'moonember',
    garbOf: 'moonember', shellId: 'cleftshell', art: '/art/partners/miracore.jpg',
    skillName: 'ミラクルバースト',
  }),
  beast({
    id: 'windfeather', no: n(), name: '風羽', specialty: 'nature', level: 'III',
    hp: 640, circle: atk(320), triangle: atk(260), cross: atk(160, 'firstStrike'),
    dp: 30, evoCost: 0, support: { kind: 'pow', amount: 20 },
    fusionValue: 36, resultValue: 72, isPartner: true, partnerLine: 'windfeather',
    art: '/art/partners/windfeather.jpg', skillName: '風爪',
  }),
  beast({
    id: 'blossomwing', no: n(), name: '花月翼', specialty: 'nature', level: 'MOON',
    hp: 900, circle: atk(460), triangle: atk(350), cross: atk(220, 'firstStrike'),
    dp: 30, evoCost: 0, support: { kind: 'pow', amount: 30 },
    fusionValue: 68, resultValue: 136, isPartner: true, partnerLine: 'windfeather',
    garbOf: 'windfeather', shellId: 'bloomshell', art: '/art/partners/blossomwing.jpg', skillName: '花雷投',
  }),
  beast({
    id: 'clearblade', no: n(), name: '澄月刃', specialty: 'rare', level: 'MOON',
    hp: 860, circle: atk(400), triangle: atk(340), cross: atk(260, 'zeroTriangle'),
    dp: 20, evoCost: 0, support: { kind: 'jam' },
    fusionValue: 68, resultValue: 136, isPartner: true, partnerLine: 'windfeather',
    garbOf: 'windfeather', shellId: 'clearshell', art: '/art/partners/clearblade.jpg', skillName: '千本手裏',
  }),
  beast({
    id: 'shellwhite', no: n(), name: '殻白', specialty: 'rare', level: 'III',
    hp: 760, circle: atk(280), triangle: atk(240), cross: atk(200, 'jam'),
    dp: 20, evoCost: 0, support: { kind: 'setBothHp', amount: 240 },
    fusionValue: 34, resultValue: 68, isPartner: true, partnerLine: 'shellwhite',
    art: '/art/partners/shellwhite.jpg', skillName: '殻突',
  }),
  beast({
    id: 'chartspike', no: n(), name: '図月錐', specialty: 'rare', level: 'MOON',
    hp: 1040, circle: atk(440), triangle: atk(360), cross: atk(240, 'zeroCircle'),
    dp: 20, evoCost: 0, support: { kind: 'setBothHp', amount: 200 },
    fusionValue: 66, resultValue: 132, isPartner: true, partnerLine: 'shellwhite',
    garbOf: 'shellwhite', shellId: 'chartshell', art: '/art/partners/chartspike.jpg', skillName: '図錐',
  }),
  beast({
    id: 'thickdive', no: n(), name: '厚月潜', specialty: 'ice', level: 'MOON',
    hp: 1180, circle: atk(380), triangle: atk(320), cross: atk(220, 'drain'),
    dp: 20, evoCost: 0, support: { kind: 'heal', amount: 280 },
    fusionValue: 66, resultValue: 132, isPartner: true, partnerLine: 'shellwhite',
    garbOf: 'shellwhite', shellId: 'thickshell', art: '/art/partners/thickdive.jpg', skillName: '厚矢',
  }),
  beast({
    id: 'fluffwing', no: n(), name: '綿羽', specialty: 'nature', level: 'III',
    hp: 620, circle: atk(300), triangle: atk(250), cross: atk(170, 'counter'),
    dp: 30, evoCost: 0, support: { kind: 'heal', amount: 150 },
    fusionValue: 35, resultValue: 70, isPartner: true, partnerLine: 'fluffwing',
    art: '/art/partners/fluffwing.jpg', skillName: '綿弾',
  }),
  beast({
    id: 'dawnwing', no: n(), name: '暁月翼', specialty: 'nature', level: 'MOON',
    hp: 940, circle: atk(450), triangle: atk(340), cross: atk(210, 'firstStrike'),
    dp: 30, evoCost: 0, support: { kind: 'heal', amount: 220 },
    fusionValue: 67, resultValue: 134, isPartner: true, partnerLine: 'fluffwing',
    garbOf: 'fluffwing', shellId: 'dawnshell', art: '/art/partners/dawnwing.jpg', skillName: '暁閃',
  }),
  beast({
    id: 'lampcloak', no: n(), name: '灯月衣', specialty: 'flame', level: 'MOON',
    hp: 900, circle: atk(500), triangle: atk(360), cross: atk(200, 'zeroCircle'),
    dp: 20, evoCost: 0, support: { kind: 'atkAll', amount: 140 },
    fusionValue: 67, resultValue: 134, isPartner: true, partnerLine: 'fluffwing',
    garbOf: 'fluffwing', shellId: 'lampshell', art: '/art/partners/lampcloak.jpg', skillName: '灯衣舞',
  }),
  beast({
    id: 'fireflytail', no: n(), name: '蛍尾', specialty: 'nature', level: 'III',
    hp: 700, circle: atk(310), triangle: atk(270), cross: atk(190, 'jam'),
    dp: 20, evoCost: 0, support: { kind: 'heal', amount: 180 },
    fusionValue: 38, resultValue: 76, isPartner: true, partnerLine: 'fireflytail',
    art: '/art/partners/fireflytail.jpg', skillName: '蛍拳',
  }),
  beast({
    id: 'lampqueen', no: n(), name: '灯月妃', specialty: 'nature', level: 'MOON',
    hp: 960, circle: atk(470), triangle: atk(360), cross: atk(230, 'firstStrike'),
    dp: 30, evoCost: 0, support: { kind: 'heal', amount: 260 },
    fusionValue: 72, resultValue: 144, isPartner: true, partnerLine: 'fireflytail',
    garbOf: 'fireflytail', shellId: 'lampshell', art: '/art/partners/lampqueen.jpg', skillName: '灯宝',
  }),
  beast({
    id: 'tidefin', no: n(), name: '潮月鰭', specialty: 'ice', level: 'MOON',
    hp: 1100, circle: atk(400), triangle: atk(330), cross: atk(240, 'drain'),
    dp: 20, evoCost: 0, support: { kind: 'heal', amount: 320 },
    fusionValue: 72, resultValue: 144, isPartner: true, partnerLine: 'fireflytail',
    garbOf: 'fireflytail', shellId: 'tideshell', art: '/art/partners/tidefin.jpg', skillName: '潮返し',
  }),
  beast({
    id: 'shadebug', no: n(), name: '影蟲', specialty: 'dark', level: 'III',
    hp: 600, circle: atk(340), triangle: atk(250), cross: atk(160, 'zeroCircle'),
    dp: 10, evoCost: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 100 },
    fusionValue: 32, resultValue: 64, isPartner: true, partnerLine: 'shadebug',
    art: '/art/partners/shadebug.jpg', skillName: '影網',
  }),
  beast({
    id: 'moonslash', no: n(), name: '影月爪', specialty: 'dark', level: 'MOON',
    hp: 880, circle: atk(530), triangle: atk(350), cross: atk(210, 'jam'),
    dp: 10, evoCost: 0, support: { kind: 'atkAll', amount: 150 },
    fusionValue: 64, resultValue: 128, isPartner: true, partnerLine: 'shadebug',
    garbOf: 'shadebug', shellId: 'shadeshell', art: '/art/partners/moonslash.jpg', skillName: '影炎弾',
  }),
  beast({
    id: 'shadecoil', no: n(), name: '影月環', specialty: 'ice', level: 'MOON',
    hp: 1020, circle: atk(420), triangle: atk(340), cross: atk(230, 'counter'),
    dp: 20, evoCost: 0, support: { kind: 'discardOpp', amount: 1 },
    fusionValue: 64, resultValue: 128, isPartner: true, partnerLine: 'shadebug',
    garbOf: 'shadebug', shellId: 'tideshell', art: '/art/partners/shadecoil.jpg', skillName: '環星墜',
  }),
  beast({
    id: 'moondrake', no: n(), name: '月炎竜', specialty: 'flame', level: 'IV',
    hp: 1080, circle: atk(520), triangle: atk(390), cross: atk(240, 'zeroCircle'),
    dp: 20, evoCost: 30, support: { kind: 'atkAll', amount: 120 },
    fusionValue: 70, resultValue: 140, isPartner: true, partnerLine: 'moonember',
    art: '/art/beasts/moondrake.jpg', skillName: '月炎綻',
  }),
  beast({
    id: 'moonfang', no: n(), name: '月炎牙', specialty: 'flame', level: 'APEX',
    hp: 1640, circle: atk(720), triangle: atk(520), cross: atk(320, 'firstStrike'),
    dp: 20, evoCost: 60, support: { kind: 'atkAll', amount: 200 },
    fusionValue: 110, resultValue: 220, isPartner: true, partnerLine: 'moonember',
    art: '/art/beasts/moonfang.jpg', skillName: '月炎獄',
  }),
  beast({
    id: 'windrush', no: n(), name: '風迅', specialty: 'nature', level: 'IV',
    hp: 980, circle: atk(460), triangle: atk(360), cross: atk(220, 'firstStrike'),
    dp: 30, evoCost: 20, support: { kind: 'pow', amount: 20 },
    fusionValue: 68, resultValue: 136, isPartner: true, partnerLine: 'windfeather',
    art: '/art/beasts/windrush.jpg', skillName: '風嵐爪',
  }),
  beast({
    id: 'windking', no: n(), name: '風王羽', specialty: 'nature', level: 'APEX',
    hp: 1520, circle: atk(660), triangle: atk(500), cross: atk(300, 'firstStrike'),
    dp: 30, evoCost: 40, support: { kind: 'pow', amount: 30 },
    fusionValue: 100, resultValue: 200, isPartner: true, partnerLine: 'windfeather',
    art: '/art/beasts/windking.jpg', skillName: '風王嵐',
  }),
  beast({
    id: 'shellguard', no: n(), name: '殻衛', specialty: 'rare', level: 'IV',
    hp: 1280, circle: atk(400), triangle: atk(340), cross: atk(260, 'jam'),
    dp: 20, evoCost: 30, support: { kind: 'setBothHp', amount: 220 },
    fusionValue: 66, resultValue: 132, isPartner: true, partnerLine: 'shellwhite',
    art: '/art/beasts/shellguard.jpg', skillName: '殻砕',
  }),
  beast({
    id: 'shellkeep', no: n(), name: '殻城', specialty: 'rare', level: 'APEX',
    hp: 1760, circle: atk(560), triangle: atk(480), cross: atk(340, 'jam'),
    dp: 20, evoCost: 50, support: { kind: 'setBothHp', amount: 200 },
    fusionValue: 96, resultValue: 192, isPartner: true, partnerLine: 'shellwhite',
    art: '/art/beasts/shellkeep.jpg', skillName: '殻砦',
  }),
  beast({
    id: 'fluffsail', no: n(), name: '綿翼', specialty: 'nature', level: 'IV',
    hp: 960, circle: atk(440), triangle: atk(340), cross: atk(210, 'counter'),
    dp: 30, evoCost: 20, support: { kind: 'heal', amount: 200 },
    fusionValue: 67, resultValue: 134, isPartner: true, partnerLine: 'fluffwing',
    art: '/art/beasts/fluffsail.jpg', skillName: '綿斬',
  }),
  beast({
    id: 'fluffsky', no: n(), name: '綿天羽', specialty: 'nature', level: 'APEX',
    hp: 1500, circle: atk(640), triangle: atk(480), cross: atk(280, 'counter'),
    dp: 30, evoCost: 40, support: { kind: 'heal', amount: 280 },
    fusionValue: 100, resultValue: 200, isPartner: true, partnerLine: 'fluffwing',
    art: '/art/beasts/fluffsky.jpg', skillName: '綿天翼',
  }),
  beast({
    id: 'fireflymoon', no: n(), name: '蛍月', specialty: 'nature', level: 'IV',
    hp: 1020, circle: atk(450), triangle: atk(360), cross: atk(230, 'jam'),
    dp: 20, evoCost: 20, support: { kind: 'heal', amount: 220 },
    fusionValue: 72, resultValue: 144, isPartner: true, partnerLine: 'fireflytail',
    art: '/art/beasts/fireflymoon.jpg', skillName: '蛍爪',
  }),
  beast({
    id: 'fireflysaint', no: n(), name: '蛍聖', specialty: 'nature', level: 'APEX',
    hp: 1580, circle: atk(650), triangle: atk(500), cross: atk(320, 'jam'),
    dp: 20, evoCost: 40, support: { kind: 'heal', amount: 300 },
    fusionValue: 110, resultValue: 220, isPartner: true, partnerLine: 'fireflytail',
    art: '/art/beasts/fireflysaint.jpg', skillName: '蛍聖月',
  }),
  beast({
    id: 'shadeneedle', no: n(), name: '影針', specialty: 'dark', level: 'IV',
    hp: 940, circle: atk(530), triangle: atk(350), cross: atk(200, 'zeroCircle'),
    dp: 10, evoCost: 30, support: { kind: 'atkSlot', slot: 'circle', amount: 140 },
    fusionValue: 64, resultValue: 128, isPartner: true, partnerLine: 'shadebug',
    art: '/art/beasts/shadeneedle.jpg', skillName: '影刺',
  }),
  beast({
    id: 'shadeend', no: n(), name: '影終', specialty: 'dark', level: 'APEX',
    hp: 1600, circle: atk(760), triangle: atk(500), cross: atk(280, 'zeroCircle'),
    dp: 10, evoCost: 70, support: { kind: 'atkAll', amount: 200 },
    fusionValue: 120, resultValue: 240, isPartner: true, partnerLine: 'shadebug',
    art: '/art/beasts/shadeend.jpg', skillName: '終網',
  }),

  // ——— Flame ———
  beast({ id: 'ennya', no: n(), name: '火芽', specialty: 'flame', level: 'III', hp: 540, circle: atk(360), triangle: atk(250), cross: atk(150, 'zeroCircle'), dp: 10, evoCost: 0, support: { kind: 'atkAll', amount: 60 }, fusionValue: 20, resultValue: 40, skillName: '火芽息', art: '/art/beasts/ennya.jpg' }),
  beast({ id: 'chickflare', no: n(), name: '雛炎', specialty: 'flame', level: 'III', hp: 500, circle: atk(330), triangle: atk(240), cross: atk(140, 'firstStrike'), dp: 20, evoCost: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 80 }, fusionValue: 18, resultValue: 36, skillName: '雛火' }),
  beast({ id: 'waxcat', no: n(), name: 'キャンドルニャ', specialty: 'flame', level: 'III', hp: 560, circle: atk(300), triangle: atk(260), cross: atk(180, 'zeroTriangle'), dp: 10, evoCost: 0, support: { kind: 'atkAll', amount: 50 }, fusionValue: 16, resultValue: 32, skillName: '蝋火' }),
  beast({ id: 'gobflame', no: n(), name: 'ゴブリンフレイム', specialty: 'flame', level: 'III', hp: 580, circle: atk(340), triangle: atk(230), cross: atk(130, 'none'), dp: 10, evoCost: 0, support: { kind: 'atkAll', amount: 70 }, fusionValue: 17, resultValue: 34, skillName: '小鬼撃' }),
  beast({ id: 'flarecat', no: n(), name: 'フレアキャット', specialty: 'flame', level: 'III', hp: 520, circle: atk(370), triangle: atk(240), cross: atk(140, 'zeroCircle'), dp: 10, evoCost: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 90 }, fusionValue: 22, resultValue: 44, skillName: '辛息' }),
  beast({ id: 'ashflare', no: n(), name: '灰炎', specialty: 'flame', level: 'IV', hp: 1100, circle: atk(520), triangle: atk(380), cross: atk(240, 'zeroCircle'), dp: 20, evoCost: 30, support: { kind: 'atkAll', amount: 120 }, fusionValue: 50, resultValue: 100, skillName: '灰炎砲', art: '/art/beasts/ashflare.jpg' }),
  beast({ id: 'flamewing', no: n(), name: '炎翼', specialty: 'flame', level: 'IV', hp: 980, circle: atk(500), triangle: atk(360), cross: atk(220, 'firstStrike'), dp: 20, evoCost: 20, support: { kind: 'atkSlot', slot: 'circle', amount: 140 }, fusionValue: 46, resultValue: 92, skillName: '炎翼墜' }),
  beast({ id: 'ashfist', no: n(), name: '灰拳', specialty: 'flame', level: 'IV', hp: 900, circle: atk(540), triangle: atk(340), cross: atk(200, 'jam'), dp: 10, evoCost: 20, support: { kind: 'atkAll', amount: 150 }, fusionValue: 44, resultValue: 88, skillName: '灰拳打' }),
  beast({ id: 'tyrantail', no: n(), name: '暴尾', specialty: 'flame', level: 'IV', hp: 1200, circle: atk(480), triangle: atk(400), cross: atk(260, 'none'), dp: 20, evoCost: 30, support: { kind: 'atkAll', amount: 100 }, fusionValue: 52, resultValue: 104, skillName: '暴尾炎' }),
  beast({ id: 'moonflareking', no: n(), name: '月炎王', specialty: 'flame', level: 'APEX', hp: 1680, circle: atk(740), triangle: atk(520), cross: atk(320, 'zeroCircle'), dp: 20, evoCost: 60, support: { kind: 'atkAll', amount: 200 }, fusionValue: 110, resultValue: 220, skillName: '月炎爆', art: '/art/beasts/moonflareking.jpg' }),
  beast({ id: 'vermilion', no: n(), name: '朱鳥', specialty: 'flame', level: 'APEX', hp: 1540, circle: atk(680), triangle: atk(500), cross: atk(340, 'firstStrike'), dp: 30, evoCost: 50, support: { kind: 'heal', amount: 250 }, fusionValue: 100, resultValue: 200, skillName: '朱鳥爆' }),
  beast({ id: 'emperordrake', no: n(), name: '皇炎竜', specialty: 'flame', level: 'APEX', hp: 1800, circle: atk(780), triangle: atk(560), cross: atk(360, 'drain'), dp: 20, evoCost: 70, support: { kind: 'atkAll', amount: 240 }, fusionValue: 130, resultValue: 260, skillName: '皇炎滅' }),

  // ——— Ice ———
  beast({ id: 'fangpup', no: n(), name: '牙仔', specialty: 'ice', level: 'III', hp: 820, circle: atk(260), triangle: atk(230), cross: atk(180, 'drain'), dp: 20, evoCost: 0, support: { kind: 'heal', amount: 120 }, fusionValue: 22, resultValue: 44, skillName: '牙火', art: '/art/beasts/fangpup.jpg' }),
  beast({ id: 'sesame', no: n(), name: '胡麻', specialty: 'ice', level: 'III', hp: 860, circle: atk(240), triangle: atk(220), cross: atk(170, 'zeroTriangle'), dp: 20, evoCost: 0, support: { kind: 'heal', amount: 160 }, fusionValue: 20, resultValue: 40, skillName: '胡麻行進' }),
  beast({ id: 'penguin', no: n(), name: '企鵝', specialty: 'ice', level: 'III', hp: 780, circle: atk(250), triangle: atk(230), cross: atk(190, 'counter'), dp: 10, evoCost: 0, support: { kind: 'heal', amount: 100 }, fusionValue: 16, resultValue: 32, skillName: '企鵝連打' }),
  beast({ id: 'tadpole', no: n(), name: '蝌蚪', specialty: 'ice', level: 'III', hp: 800, circle: atk(230), triangle: atk(220), cross: atk(160, 'none'), dp: 20, evoCost: 0, support: { kind: 'heal', amount: 140 }, fusionValue: 14, resultValue: 28, skillName: '飛び跳ねる' }),
  beast({ id: 'jellpup', no: n(), name: '海月仔', specialty: 'ice', level: 'III', hp: 900, circle: atk(220), triangle: atk(210), cross: atk(150, 'jam'), dp: 20, evoCost: 0, support: { kind: 'heal', amount: 180 }, fusionValue: 18, resultValue: 36, skillName: '電撃アワ' }),
  beast({ id: 'frostwolf', no: n(), name: '霜狼', specialty: 'ice', level: 'IV', hp: 1400, circle: atk(400), triangle: atk(360), cross: atk(260, 'drain'), dp: 20, evoCost: 30, support: { kind: 'heal', amount: 220 }, fusionValue: 54, resultValue: 108, skillName: '霜火' }),
  beast({ id: 'onehorn', no: n(), name: '一角', specialty: 'ice', level: 'IV', hp: 1500, circle: atk(380), triangle: atk(350), cross: atk(250, 'zeroTriangle'), dp: 20, evoCost: 30, support: { kind: 'heal', amount: 260 }, fusionValue: 56, resultValue: 112, skillName: '一角突' }),
  beast({ id: 'seadrake', no: n(), name: '海竜', specialty: 'ice', level: 'IV', hp: 1320, circle: atk(420), triangle: atk(340), cross: atk(240, 'firstStrike'), dp: 20, evoCost: 20, support: { kind: 'heal', amount: 200 }, fusionValue: 48, resultValue: 96, skillName: '海氷矢' }),
  beast({ id: 'snowlump', no: n(), name: '雪だる', specialty: 'ice', level: 'IV', hp: 1600, circle: atk(340), triangle: atk(320), cross: atk(280, 'jam'), dp: 20, evoCost: 30, support: { kind: 'heal', amount: 300 }, fusionValue: 50, resultValue: 100, skillName: '雪止め' }),
  beast({ id: 'steelfrost', no: n(), name: '鋼霜狼', specialty: 'ice', level: 'APEX', hp: 1900, circle: atk(620), triangle: atk(520), cross: atk(380, 'drain'), dp: 20, evoCost: 60, support: { kind: 'heal', amount: 350 }, fusionValue: 114, resultValue: 228, skillName: '鋼霜息' }),
  beast({ id: 'hammerwhale', no: n(), name: '鎚鯨', specialty: 'ice', level: 'APEX', hp: 2000, circle: atk(580), triangle: atk(540), cross: atk(400, 'zeroTriangle'), dp: 20, evoCost: 50, support: { kind: 'heal', amount: 400 }, fusionValue: 108, resultValue: 216, skillName: '鎚雷' }),
  beast({ id: 'tidewhale', no: n(), name: '潮鯨', specialty: 'ice', level: 'APEX', hp: 2100, circle: atk(540), triangle: atk(500), cross: atk(360, 'jam'), dp: 30, evoCost: 50, support: { kind: 'heal', amount: 450 }, fusionValue: 100, resultValue: 200, skillName: '潮矢' }),

  // ——— Nature ———
  beast({ id: 'needswing', no: n(), name: '針翅', specialty: 'nature', level: 'III', hp: 640, circle: atk(280), triangle: atk(250), cross: atk(170, 'firstStrike'), dp: 30, evoCost: 0, support: { kind: 'pow', amount: 20 }, fusionValue: 20, resultValue: 40, skillName: '針雷', art: '/art/beasts/needswing.jpg' }),
  beast({ id: 'vinepup', no: n(), name: '蔓仔', specialty: 'nature', level: 'III', hp: 660, circle: atk(270), triangle: atk(250), cross: atk(180, 'jam'), dp: 30, evoCost: 0, support: { kind: 'pow', amount: 20 }, fusionValue: 18, resultValue: 36, skillName: '蔓毒' }),
  beast({ id: 'sparkkit', no: n(), name: '雷仔', specialty: 'nature', level: 'III', hp: 600, circle: atk(300), triangle: atk(240), cross: atk(160, 'zeroCircle'), dp: 30, evoCost: 0, support: { kind: 'pow', amount: 10 }, fusionValue: 16, resultValue: 32, skillName: '雷仔閃' }),
  beast({ id: 'margin', no: n(), name: '余白', specialty: 'nature', level: 'III', hp: 680, circle: atk(260), triangle: atk(240), cross: atk(170, 'counter'), dp: 20, evoCost: 0, support: { kind: 'heal', amount: 120 }, fusionValue: 19, resultValue: 38, skillName: '余白拳' }),
  beast({ id: 'whipbug', no: n(), name: '鞭虫', specialty: 'nature', level: 'III', hp: 620, circle: atk(290), triangle: atk(230), cross: atk(150, 'none'), dp: 30, evoCost: 0, support: { kind: 'pow', amount: 30 }, fusionValue: 15, resultValue: 30, skillName: '鞭雷' }),
  beast({ id: 'shellbolt', no: n(), name: '甲雷', specialty: 'nature', level: 'IV', hp: 1180, circle: atk(440), triangle: atk(380), cross: atk(260, 'firstStrike'), dp: 30, evoCost: 20, support: { kind: 'pow', amount: 20 }, fusionValue: 48, resultValue: 96, skillName: '甲雷砲' }),
  beast({ id: 'thornball', no: n(), name: '棘丸', specialty: 'nature', level: 'IV', hp: 1240, circle: atk(400), triangle: atk(370), cross: atk(270, 'jam'), dp: 30, evoCost: 20, support: { kind: 'pow', amount: 20 }, fusionValue: 46, resultValue: 92, skillName: '棘弾' }),
  beast({ id: 'lampenvoy', no: n(), name: '灯使', specialty: 'nature', level: 'IV', hp: 1100, circle: atk(460), triangle: atk(360), cross: atk(240, 'counter'), dp: 30, evoCost: 20, support: { kind: 'heal', amount: 200 }, fusionValue: 50, resultValue: 100, skillName: '灯拳' }),
  beast({ id: 'beastking', no: n(), name: '百獣', specialty: 'nature', level: 'IV', hp: 1300, circle: atk(430), triangle: atk(390), cross: atk(250, 'zeroCircle'), dp: 20, evoCost: 30, support: { kind: 'atkAll', amount: 80 }, fusionValue: 52, resultValue: 104, skillName: '王牙拳' }),
  beast({ id: 'skyfeather', no: n(), name: '天羽', specialty: 'nature', level: 'APEX', hp: 1700, circle: atk(700), triangle: atk(520), cross: atk(340, 'firstStrike'), dp: 30, evoCost: 40, support: { kind: 'heal', amount: 300 }, fusionValue: 112, resultValue: 224, skillName: '天羽陣', art: '/art/beasts/skyfeather.jpg' }),
  beast({ id: 'lampdragon', no: n(), name: '聖灯竜', specialty: 'nature', level: 'APEX', hp: 1760, circle: atk(660), triangle: atk(540), cross: atk(360, 'drain'), dp: 30, evoCost: 50, support: { kind: 'heal', amount: 360 }, fusionValue: 118, resultValue: 236, skillName: '聖灯炎' }),
  beast({ id: 'thornbloom', no: n(), name: '棘花', specialty: 'nature', level: 'APEX', hp: 1620, circle: atk(640), triangle: atk(500), cross: atk(380, 'jam'), dp: 30, evoCost: 40, support: { kind: 'discardOpp', amount: 1 }, fusionValue: 106, resultValue: 212, skillName: '棘の免責' }),

  // ——— Dark ———
  beast({ id: 'littleshade', no: n(), name: '小影', specialty: 'dark', level: 'III', hp: 520, circle: atk(350), triangle: atk(230), cross: atk(140, 'zeroCircle'), dp: 10, evoCost: 0, support: { kind: 'atkSlot', slot: 'circle', amount: 80 }, fusionValue: 16, resultValue: 32, skillName: '小影針' }),
  beast({ id: 'shadehand', no: n(), name: '使い影', specialty: 'dark', level: 'III', hp: 540, circle: atk(330), triangle: atk(240), cross: atk(160, 'jam'), dp: 10, evoCost: 0, support: { kind: 'discardOpp', amount: 1 }, fusionValue: 17, resultValue: 34, skillName: '紫霧' }),
  beast({ id: 'venompup', no: n(), name: '毒仔', specialty: 'dark', level: 'III', hp: 500, circle: atk(360), triangle: atk(220), cross: atk(130, 'none'), dp: 10, evoCost: 0, support: { kind: 'atkAll', amount: 70 }, fusionValue: 14, resultValue: 28, skillName: '蟲毒' }),
  beast({ id: 'blacktail', no: n(), name: 'ブラックテイル', specialty: 'dark', level: 'III', hp: 580, circle: atk(320), triangle: atk(250), cross: atk(170, 'counter'), dp: 10, evoCost: 0, support: { kind: 'atkSlot', slot: 'cross', amount: 80 }, fusionValue: 19, resultValue: 38, skillName: '黒尾斬' }),
  beast({ id: 'minishear', no: n(), name: '小鋏', specialty: 'dark', level: 'III', hp: 560, circle: atk(340), triangle: atk(240), cross: atk(150, 'firstStrike'), dp: 10, evoCost: 0, support: { kind: 'atkAll', amount: 60 }, fusionValue: 18, resultValue: 36, skillName: '小鋏' }),
  beast({ id: 'nightsteward', no: n(), name: '夜司', specialty: 'dark', level: 'IV', hp: 1080, circle: atk(560), triangle: atk(360), cross: atk(220, 'zeroCircle'), dp: 10, evoCost: 40, support: { kind: 'atkAll', amount: 160 }, fusionValue: 52, resultValue: 104, skillName: '夜爪' }),
  beast({ id: 'spiritcat', no: n(), name: '霊猫', specialty: 'dark', level: 'IV', hp: 1000, circle: atk(480), triangle: atk(340), cross: atk(260, 'drain'), dp: 10, evoCost: 30, support: { kind: 'heal', amount: 180 }, fusionValue: 46, resultValue: 92, skillName: '霊術' }),
  beast({ id: 'ironcat', no: n(), name: '鉄猫', specialty: 'dark', level: 'IV', hp: 1160, circle: atk(500), triangle: atk(380), cross: atk(240, 'firstStrike'), dp: 10, evoCost: 40, support: { kind: 'atkAll', amount: 120 }, fusionValue: 50, resultValue: 100, skillName: '鉄潰' }),
  beast({ id: 'nightblade', no: n(), name: '夜刃竜', specialty: 'dark', level: 'IV', hp: 980, circle: atk(520), triangle: atk(350), cross: atk(280, 'firstStrike'), dp: 10, evoCost: 30, support: { kind: 'atkSlot', slot: 'cross', amount: 140 }, fusionValue: 48, resultValue: 96, skillName: '夜刃吼' }),
  beast({ id: 'bloodmarquis', no: n(), name: '血侯', specialty: 'dark', level: 'APEX', hp: 1660, circle: atk(760), triangle: atk(500), cross: atk(300, 'drain'), dp: 10, evoCost: 70, support: { kind: 'atkAll', amount: 220 }, fusionValue: 116, resultValue: 232, skillName: '血夜襲', art: '/art/beasts/bloodmarquis.jpg' }),
  beast({ id: 'venomcrown', no: n(), name: '毒冕', specialty: 'dark', level: 'APEX', hp: 1840, circle: atk(800), triangle: atk(540), cross: atk(320, 'suicide'), dp: 10, evoCost: 80, support: { kind: 'setBothHp', amount: 400 }, fusionValue: 128, resultValue: 256, skillName: '毒冕注' }),
  beast({ id: 'calamycore', no: n(), name: '災核', specialty: 'dark', level: 'APEX', hp: 1720, circle: atk(820), triangle: atk(500), cross: atk(280, 'jam'), dp: 10, evoCost: 80, support: { kind: 'discardOpp', amount: 2 }, fusionValue: 140, resultValue: 280, skillName: '災核砲' }),

  // ——— Rare ———
  beast({ id: 'screwkit', no: n(), name: '捻子', specialty: 'rare', level: 'III', hp: 480, circle: atk(240), triangle: atk(220), cross: atk(200, 'none'), dp: 20, evoCost: 0, support: { kind: 'setBothHp', amount: 200 }, fusionValue: 24, resultValue: 48, skillName: '捻子噛み', art: '/art/beasts/screwkit.jpg' }),
  beast({ id: 'gearsmith', no: n(), name: '歯車', specialty: 'rare', level: 'III', hp: 520, circle: atk(250), triangle: atk(230), cross: atk(190, 'jam'), dp: 20, evoCost: 0, support: { kind: 'pow', amount: 20 }, fusionValue: 18, resultValue: 36, skillName: '闇歯車' }),
  beast({ id: 'glasscat', no: n(), name: '透猫', specialty: 'rare', level: 'III', hp: 460, circle: atk(260), triangle: atk(210), cross: atk(180, 'counter'), dp: 20, evoCost: 0, support: { kind: 'draw', amount: 1 }, fusionValue: 16, resultValue: 32, skillName: '透熱' }),
  beast({ id: 'slimekit', no: n(), name: 'ぬめり', specialty: 'rare', level: 'III', hp: 700, circle: atk(200), triangle: atk(200), cross: atk(200, 'jam'), dp: 20, evoCost: 0, support: { kind: 'setBothHp', amount: 300 }, fusionValue: 12, resultValue: 24, skillName: '汚投' }),
  beast({ id: 'filthorb', no: n(), name: '汚玉', specialty: 'rare', level: 'IV', hp: 900, circle: atk(360), triangle: atk(330), cross: atk(300, 'jam'), dp: 20, evoCost: 30, support: { kind: 'discardOpp', amount: 1 }, fusionValue: 40, resultValue: 80, skillName: '汚玉投げ' }),
  beast({ id: 'starball', no: n(), name: '星猫', specialty: 'rare', level: 'IV', hp: 1040, circle: atk(420), triangle: atk(360), cross: atk(280, 'zeroCross'), dp: 20, evoCost: 30, support: { kind: 'atkAll', amount: 80 }, fusionValue: 44, resultValue: 88, skillName: '星雨' }),
  beast({ id: 'songape', no: n(), name: '歌猿', specialty: 'rare', level: 'IV', hp: 1120, circle: atk(380), triangle: atk(350), cross: atk(260, 'counter'), dp: 20, evoCost: 30, support: { kind: 'draw', amount: 1 }, fusionValue: 42, resultValue: 84, skillName: '歌猿曲' }),
  beast({ id: 'stoneward', no: n(), name: '石守', specialty: 'rare', level: 'IV', hp: 1280, circle: atk(400), triangle: atk(380), cross: atk(240, 'none'), dp: 20, evoCost: 40, support: { kind: 'shield', slot: 'circle' }, fusionValue: 46, resultValue: 92, skillName: '石爪' }),
  beast({ id: 'threadless', no: n(), name: '糸無', specialty: 'rare', level: 'APEX', hp: 1580, circle: atk(620), triangle: atk(500), cross: atk(400, 'jam'), dp: 20, evoCost: 50, support: { kind: 'discardOpp', amount: 2 }, fusionValue: 96, resultValue: 192, skillName: '糸操' }),
  beast({ id: 'goldape', no: n(), name: '金猿', specialty: 'rare', level: 'APEX', hp: 1700, circle: atk(600), triangle: atk(520), cross: atk(380, 'counter'), dp: 20, evoCost: 60, support: { kind: 'setBothHp', amount: 500 }, fusionValue: 104, resultValue: 208, skillName: '金猿霊' }),
  beast({ id: 'superstar', no: n(), name: '超星', specialty: 'rare', level: 'APEX', hp: 1500, circle: atk(680), triangle: atk(480), cross: atk(360, 'firstStrike'), dp: 20, evoCost: 50, support: { kind: 'atkAll', amount: 180 }, fusionValue: 100, resultValue: 200, skillName: '超星爆' }),
  beast({ id: 'twinpole', no: n(), name: '双極', specialty: 'rare', level: 'APEX', hp: 1880, circle: atk(760), triangle: atk(580), cross: atk(400, 'firstStrike'), dp: 30, evoCost: 80, support: { kind: 'atkAll', amount: 260 }, fusionValue: 228, resultValue: 456, skillName: '双極の月刃' }),
  beast({ id: 'lastchapter', no: n(), name: '終章', specialty: 'dark', level: 'APEX', hp: 2000, circle: atk(840), triangle: atk(560), cross: atk(360, 'suicide'), dp: 10, evoCost: 90, support: { kind: 'setBothHp', amount: 100 }, fusionValue: 160, resultValue: 320, skillName: '終章爆' }),

  // ——— Options: battle ———
  option({ id: 'atkchip', no: n(), name: '力の月粉', optionType: 'battle', effect: { kind: 'atkAll', amount: 150 }, fusionValue: 8, resultValue: 16, text: '全攻撃 +150' }),
  option({ id: 'superatkchip', no: n(), name: '大力の月粉', optionType: 'battle', effect: { kind: 'atkAll', amount: 300 }, fusionValue: 16, resultValue: 32, text: '全攻撃 +300' }),
  option({ id: 'pluginO', no: n(), name: 'まるい月実', optionType: 'battle', effect: { kind: 'atkSlot', slot: 'circle', amount: 250 }, fusionValue: 8, resultValue: 16, text: '○攻撃 +250' }),
  option({ id: 'pluginT', no: n(), name: 'あまい月実', optionType: 'battle', effect: { kind: 'atkSlot', slot: 'triangle', amount: 250 }, fusionValue: 8, resultValue: 16, text: '△攻撃 +250' }),
  option({ id: 'pluginX', no: n(), name: 'あかい月実', optionType: 'battle', effect: { kind: 'atkSlot', slot: 'cross', amount: 250 }, fusionValue: 8, resultValue: 16, text: '×攻撃 +250' }),
  option({ id: 'defO', no: n(), name: 'まひしびれごな', optionType: 'battle', effect: { kind: 'zeroSlot', slot: 'circle' }, fusionValue: 10, resultValue: 20, text: '相手の○を0に' }),
  option({ id: 'defT', no: n(), name: 'ねむりごな', optionType: 'battle', effect: { kind: 'zeroSlot', slot: 'triangle' }, fusionValue: 10, resultValue: 20, text: '相手の△を0に' }),
  option({ id: 'defX', no: n(), name: 'どくのこな', optionType: 'battle', effect: { kind: 'zeroSlot', slot: 'cross' }, fusionValue: 10, resultValue: 20, text: '相手の×を0に' }),
  option({ id: 'floppy', no: n(), name: 'きずぐすり', optionType: 'battle', effect: { kind: 'heal', amount: 300 }, fusionValue: 8, resultValue: 16, text: 'HP+300' }),
  option({ id: 'bigfloppy', no: n(), name: 'すごいキズぐすり', optionType: 'battle', effect: { kind: 'heal', amount: 600 }, fusionValue: 14, resultValue: 28, text: 'HP+600' }),
  option({ id: 'superfloppy', no: n(), name: 'まんたんのくすり', optionType: 'battle', effect: { kind: 'fullHeal' }, fusionValue: 22, resultValue: 44, text: 'HPを全回復' }),
  option({ id: 'jyureMist', no: n(), name: 'しろいハーブ', optionType: 'battle', effect: { kind: 'jamOptions' }, fusionValue: 18, resultValue: 36, text: '相手のどうぐを無効' }),
  option({ id: 'firstChip', no: n(), name: 'せんせいのこな', optionType: 'battle', effect: { kind: 'firstStrike' }, fusionValue: 14, resultValue: 28, text: 'このターン先制' }),
  option({ id: 'toyCore', no: n(), name: '捻子核', optionType: 'battle', effect: { kind: 'setBothHp', amount: 200 }, fusionValue: 20, resultValue: 40, text: '互いのHPを200に' }),
  option({ id: 'hacking', no: n(), name: 'ハッキング', optionType: 'battle', effect: { kind: 'hackPartnerBottom' }, fusionValue: 24, resultValue: 48, text: '相手パートナーを山札の底へ' }),
  option({ id: 'dataCopy', no: n(), name: 'データコピー', optionType: 'battle', effect: { kind: 'draw', amount: 2 }, fusionValue: 16, resultValue: 32, text: '2枚引く' }),
  option({ id: 'handCrash', no: n(), name: 'ハンドクラッシュ', optionType: 'battle', effect: { kind: 'discardBothHands' }, fusionValue: 20, resultValue: 40, text: '互いの手札を捨てる' }),
  option({ id: 'roseSeduce', no: n(), name: '棘の誘惑', optionType: 'battle', effect: { kind: 'discardBothHands', redraw: 1 }, fusionValue: 30, resultValue: 60, text: '互いの手札を捨て、自分は1枚引く' }),

  // ——— Options: evolution ———
  option({ id: 'speedEvo', no: n(), name: '高速進化', optionType: 'evolution', effect: { kind: 'addPow', amount: 30 }, fusionValue: 10, resultValue: 20, text: '進化P+30' }),
  option({ id: 'warpEvo', no: n(), name: '月跳び', optionType: 'evolution', effect: { kind: 'leapEvolve' }, fusionValue: 20, resultValue: 40, text: '1段階飛ばして進化可' }),
  option({ id: 'downloader', no: n(), name: 'ふしぎな月飴', optionType: 'evolution', effect: { kind: 'downloader' }, fusionValue: 28, resultValue: 56, text: '同じラインの手札へ進化' }),
  option({ id: 'shellBreak', no: n(), name: '殻割り', optionType: 'evolution', effect: { kind: 'shellBreak' }, fusionValue: 16, resultValue: 32, text: '月装をはがして、ふつうの進化ができるようにする' }),
  option({ id: 'freeEvo', no: n(), name: '特殊進化', optionType: 'evolution', effect: { kind: 'freeEvolve' }, fusionValue: 18, resultValue: 36, text: '属性無視で進化' }),
  option({ id: 'mutEvo', no: n(), name: 'ミューテーション', optionType: 'evolution', effect: { kind: 'addPow', amount: 50 }, fusionValue: 14, resultValue: 28, text: '進化P+50' }),

  // ——— Sevens ———
  option({ id: 'wild7', no: n(), name: '荒月札', optionType: 'battle', effect: { kind: 'atkAll', amount: 500 }, fusionValue: 40, resultValue: 80, text: '全攻撃 +500' }),
  option({ id: 'holy7', no: n(), name: '聖月札', optionType: 'battle', effect: { kind: 'fullHeal', firstStrike: true }, fusionValue: 40, resultValue: 80, text: 'HP全回復＋先制' }),
  option({ id: 'dark7', no: n(), name: '闇月札', optionType: 'battle', effect: { kind: 'setBothHp', amount: 100 }, fusionValue: 40, resultValue: 80, text: '互いのHPを100に' }),
  option({ id: 'grand7', no: n(), name: '地月札', optionType: 'battle', effect: { kind: 'atkAll', amount: 360, discardOpp: 1 }, fusionValue: 40, resultValue: 80, text: '全攻撃+360、相手手札1破棄' }),
  option({ id: 'misty7', no: n(), name: '霧月札', optionType: 'battle', effect: { kind: 'jamOptions', zeroSlot: 'circle' }, fusionValue: 40, resultValue: 80, text: 'オプション無効＋○を0' }),
  option({ id: 'speed7', no: n(), name: '迅月札', optionType: 'evolution', effect: { kind: 'addPow', amount: 80 }, fusionValue: 40, resultValue: 80, text: '進化P+80' }),
  option({ id: 'reverse7', no: n(), name: '反月札', optionType: 'battle', effect: { kind: 'zeroSlot', slot: 'circle', allSlots: true }, fusionValue: 40, resultValue: 80, text: '相手の○△×をすべて0に' }),

  ...SET2_BEASTS,
  ...SET2_OPTIONS,
  ...EXCLUSIVE_BEASTS.map((b) => ({ ...b, name: kanaName(b.id, b.name) })),
  ...EXCLUSIVE_OPTIONS,
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function getCard(id: string): CardDef {
  const c = CARD_BY_ID[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function getBeast(id: string): BeastCard {
  const c = getCard(id);
  if (c.kind !== 'beast') throw new Error(`Not a beast: ${id}`);
  return c;
}

export function beasts(): BeastCard[] {
  return CARDS.filter((c): c is BeastCard => c.kind === 'beast');
}

export function options(): OptionCard[] {
  return CARDS.filter((c): c is OptionCard => c.kind === 'option');
}

export function partners(): BeastCard[] {
  return beasts().filter((c) => c.isPartner && c.level === 'III');
}

/** Deck-legal partner cards of one line (たね + 進化。月装はデック外). */
export function partnerLineCards(line: string): BeastCard[] {
  return beasts().filter((c) => c.partnerLine === line && c.level !== 'MOON');
}

export function armorsOf(line: string): BeastCard[] {
  return beasts().filter((c) => c.partnerLine === line && c.level === 'MOON');
}

export function nextLevel(lv: Level): Level | null {
  if (lv === 'III') return 'IV';
  if (lv === 'IV') return 'APEX';
  return null;
}

export const SPECIALTY_COLOR: Record<Specialty, string> = {
  flame: '#ff5a3c',
  ice: '#4ec6ff',
  nature: '#4ade80',
  dark: '#a78bfa',
  rare: '#fbbf24',
};

export const STARTER_PARTNERS = ['moonember', 'windfeather', 'shellwhite'] as const;

export function starterDeck(partnerId: string): string[] {
  const cores: Record<string, string[]> = {
    moonember: [
      'moonember', 'moondrake', 'ennya', 'ennya', 'ashflare', 'ashflare',
      'flarecat', 'ashfist', 'chickflare', 'flamewing',
      'atkchip', 'atkchip', 'pluginO', 'floppy', 'floppy', 'speedEvo', 'defO',
      'dropHeal', 'firstChip', 'jyureMist', 'pluginT', 'bigfloppy',
      'foxfire', 'foxblaze', 'waxcat', 'tyrantail', 'honeyAtk',
      'flamewing', 'foxblaze', 'ashfist',
    ],
    windfeather: [
      'windfeather', 'windrush', 'needswing', 'needswing', 'shellbolt', 'shellbolt',
      'vinepup', 'thornball', 'sparkkit', 'lampenvoy',
      'speedEvo', 'speedEvo', 'floppy', 'floppy', 'atkchip', 'firstChip', 'defX',
      'dropHeal', 'pluginO', 'bigfloppy', 'defO', 'warpEvo',
      'leafkit', 'vinecat', 'margin', 'beastking',
      'sparkkit', 'vinecat', 'lampenvoy', 'beastking',
    ],
    shellwhite: [
      'shellwhite', 'shellguard', 'screwkit', 'screwkit', 'filthorb',
      'fangpup', 'fangpup', 'frostwolf', 'sesame', 'onehorn',
      'floppy', 'floppy', 'bigfloppy', 'toyCore', 'defO', 'atkchip',
      'dropHeal', 'speedEvo', 'pluginT', 'jyureMist', 'firstChip',
      'clockbit', 'gearcat', 'snowkit', 'snowfang', 'puffball', 'miniHeal',
      'filthorb', 'frostwolf', 'snowfang',
    ],
  };
  const deck = (cores[partnerId] ?? cores.moonember!).filter((id) => CARD_BY_ID[id]);
  while (deck.length < 30) {
    const fillers = ['ennya', 'floppy', 'atkchip', 'needswing', 'fangpup'];
    for (const f of fillers) {
      if (deck.length >= 30) break;
      if (deck.filter((x) => x === f).length < 4 && CARD_BY_ID[f]) deck.push(f);
    }
    if (deck.length < 30) deck.push('ennya');
  }
  return deck.slice(0, 30);
}

export { SHELL_JA, shellName } from './shells';

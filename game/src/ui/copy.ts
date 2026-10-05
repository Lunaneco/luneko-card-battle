export const PHASE_JA: Record<string, string> = {
  mulligan: '手札確認',
  summon: '召喚',
  turnDraw: 'ドロー',
  evo: '進化',
  attack: '攻撃',
  support: '援護',
  resolve: '結果',
  postKo: '次を出す',
  gameOver: '勝負あり',
};

export const TITLE_BRAND = 'ルナネコ式';
export const TITLE_START = 'はじめる';
export const TITLE_CONTINUE = 'つづきから';
export const TITLE_NEW = 'はじめから';
export const TITLE_NEW_WARN = 'いまのセーブを消してはじめからにしますか？物語もカードも戻ります。';
export const DEFAULT_PLAYER_NAME = 'ルナネコ';
export const TITLE_TAGLINE = '相棒と月の札で、ルナネットを取り戻せ！';
export const SETTINGS_FOOTER = '© ルナネコ式　オリジナルカードバトル';
export const SETTINGS_SAVE_LEAD = '進行データはこの端末にだけ保存されます。消すと物語もカードも戻ります。';
export const SETTINGS_WIPE = 'セーブを消す';
export const SETTINGS_WIPE_WARN = 'セーブを消しますか？この端末の進行がすべて消えます。';
export const SETTINGS_MUTE_ON = 'サウンドをオン';
export const SETTINGS_MUTE_OFF = 'サウンドをオフ';
export const COLLECTION_LEAD =
  'パックで並・月印・希少。パートナーは物語とパック。秘蔵はボス限定。『珍種』は色の名前（希少とは別）。';
export const RESULT_WIN_TITLE = 'WIN!!';
export const RESULT_LOSE_TITLE = 'LOSE';
export const RESULT_WIN = '3体撃破！ 役ボーナスでパートナーがもっと強くなる！';
export const RESULT_LOSE = '負けても経験値とゴールドはもらえる。次は勝てる！';
export const GIVEUP_LABEL = '降参';
export const GIVEUP_ASK = '降参する？';
export const GIVEUP_CONFIRM = 'このバトルは負けになります';
export const GIVEUP_YES = '降参する';
export const SHOP_BUY = 'パックをひく';
export const SHOP_POOR = 'ゴールド不足';

/** Opening deck color depends on the partner. Never say ice is missing from all starters. */
export const STARTER_BLURB: Record<string, string> = {
  moonember: '初期デックは火炎。火力寄り。',
  windfeather: '初期デックは自然。進化が速い。',
  shellwhite: '初期デックは珍種と氷水。援護で場をねじる。',
};

/** Player-facing storefront rules. Must match shipped evolve/items. */
export const STOREFRONT_RULES = [
  'デック30枚／手札4／オープンハンド。',
  '○必殺・△通常・×特殊を同時に出す読み合い。',
  '同じ属性の1段階上へ進化できる。金枠は進化、灰のPは進化ポイント。',
  '攻撃力＝ダメージ。弱点属性は×1.5（氷水→火炎→自然→氷水。暗黒→珍種→暗黒）。先攻はコイントスのあとターンごとに入れ替わる。援護で足し、先制・カウンターは当たる順番。',
  'どうぐ（きずぐすり・力の月粉）は攻撃の直前。',
  'パートナーカード（育成できるたねと進化）は各1枚まで。デックのパートナーたねは1体。月装はパートナーのたねだけ。月殻を持っているとデック外から月装できる。',
  '月殻はルナネットの月のかけら。月装中はふつうの進化ができない。殻割りではがせる。先に3体倒せば勝ち。',
  'ランクが1上がるたび HP+2 と ○△×+1。5ランクごとにもう一回り選べる。',
].join('\n');

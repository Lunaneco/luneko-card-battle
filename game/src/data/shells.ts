/** Luna-Net moon shells. */

export interface MoonShell {
  id: string;
  name: string;
  short: string;
  blurb: string;
}

export const SHELL_KIND_JA = '月殻';
export const SHELL_EVO_JA = '月装';
export const SHELL_BREAK_JA = '殻割り';

export const SHELL_EXPLAIN =
  '月殻はルナネットに落ちている月のかけら。パートナーのたねにはめると、手札を使わずに月装できる。月装中はふつうの進化ができない。どうぐ「殻割り」ではがせる。';

export const SHELLS: MoonShell[] = [
  {
    id: 'embershell',
    name: '炎月の殻',
    short: '炎月',
    blurb: '熱い月のかけら。ムーンエンバーをムーンサドルへ月装する。先制が乗りやすい。',
  },
  {
    id: 'thundershell',
    name: '雷月の殻',
    short: '雷月',
    blurb: 'つなぐ稲妻の月。ムーンエンバーをサンダーサドルへ月装する。',
  },
  {
    id: 'cleftshell',
    name: '欠け月の殻',
    short: '欠け月',
    blurb: '欠けたまま光る月。ムーンエンバーをミラコアへ月装する。',
  },
  {
    id: 'bloomshell',
    name: '花月の殻',
    short: '花月',
    blurb: '満開の月花。ウィンドフェザーをブロッサムウィングへ月装する。進化ポイントが貯まりやすい。',
  },
  {
    id: 'clearshell',
    name: '澄み月の殻',
    short: '澄み月',
    blurb: '濁りのない月。ウィンドフェザーをクリアブレードへ月装する。',
  },
  {
    id: 'chartshell',
    name: '図月の殻',
    short: '図月',
    blurb: '星図を刻んだ月。シェルホワイトをチャートスパイクへ月装する。',
  },
  {
    id: 'thickshell',
    name: '厚月の殻',
    short: '厚月',
    blurb: '沈んでも割れない月。シェルホワイトをシックダイブへ月装する。',
  },
  {
    id: 'dawnshell',
    name: '暁月の殻',
    short: '暁月',
    blurb: '夜の終わりの月。フラッフウィングをドーンウィングへ月装する。',
  },
  {
    id: 'lampshell',
    name: '灯月の殻',
    short: '灯月',
    blurb: '灯台の月。フラッフウィングをランプクロークへ、ファイアフライテイルをランプクイーンへ月装する。',
  },
  {
    id: 'tideshell',
    name: '潮月の殻',
    short: '潮月',
    blurb: '満ち引きの月。ファイアフライテイルをタイドフィンへ、シェードバグをシェードコイルへ月装する。',
  },
  {
    id: 'shadeshell',
    name: '影月の殻',
    short: '影月',
    blurb: '暗がりを歩く月。シェードバグをムーンスラッシュへ月装する。',
  },
];

export const SHELL_BY_ID: Record<string, MoonShell> = Object.fromEntries(SHELLS.map((s) => [s.id, s]));

export const SHELL_JA: Record<string, string> = Object.fromEntries(SHELLS.map((s) => [s.id, s.name]));

export function shellName(id: string): string {
  return SHELL_BY_ID[id]?.name ?? id;
}

export function shellOf(id: string | undefined): MoonShell | undefined {
  if (!id) return undefined;
  return SHELL_BY_ID[id];
}

/** Primary 月殻 that 月装s that partner's たね. */
export const MATCHING_SHELL: Record<string, string> = {
  moonember: 'embershell',
  windfeather: 'bloomshell',
  shellwhite: 'chartshell',
  fluffwing: 'dawnshell',
  fireflytail: 'tideshell',
  shadebug: 'shadeshell',
};

export function matchingShellFor(partnerId: string): string {
  return MATCHING_SHELL[partnerId] ?? 'embershell';
}

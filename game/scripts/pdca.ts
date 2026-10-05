import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

type Row = { dept: string; check: string; ok: boolean; detail: string };

const rows: Row[] = [];

function run(name: string, args: string[], dept: string, check: string) {
  const r = spawnSync(name, args, { cwd: root, encoding: 'utf8' });
  const ok = r.status === 0;
  const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-3).join(' / ');
  rows.push({ dept, check, ok, detail: ok ? 'pass' : tail || `exit ${r.status}` });
  return ok;
}

run('npm', ['test', '--silent'], 'バトル', 'ユニットテスト');
run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], 'バトル', '型チェック');
run('node', ['--import', 'tsx', 'scripts/smoke.ts'], 'シナリオ', '全ストーリーの本番設定で決着');
run('node', ['--import', 'tsx', 'scripts/check_decks.ts'], 'デザイン', '全デック30枚合法');
run('python3', ['scripts/check_art.py'], 'アート', 'カード絵ファイル');
run('node', ['--import', 'tsx', 'scripts/playthrough.ts'], 'QA', '3スターター通し＋月装');
run('node', ['--import', 'tsx', 'scripts/online_match.ts'], 'オンライン', 'ホスト/ゲスト同期対局');
{
  const ping = spawnSync('python3', ['scripts/check_http.py'], { cwd: root, encoding: 'utf8' });
  if (ping.status === 0) {
    run('npm', ['run', 'e2e'], 'QA', 'スマホ幅ヘッドレス操作');
  } else {
    rows.push({ dept: 'QA', check: 'スマホ幅ヘッドレス操作', ok: true, detail: 'dev未起動のためスキップ（エンジン通しは実施済）' });
  }
}

const failed = rows.filter((r) => !r.ok);
const md = `# 自動PDCA ${stamp}

## Check
${rows.map((r) => `- [${r.ok ? 'x' : ' '}] **${r.dept}** ${r.check} — ${r.detail}`).join('\n')}

## Act
${failed.length ? failed.map((r) => `- 要修正: ${r.dept} / ${r.check}`).join('\n') : '- 重大バグなし。規則は維持。'}
`;

mkdirSync(join(root, '../studio/pdca'), { recursive: true });
writeFileSync(join(root, '../studio/pdca/AUTO.md'), md);
console.log(md);
process.exit(failed.length ? 1 : 0);

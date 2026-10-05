export interface VsIntro {
  youName: string;
  youFace: string;
  meName: string;
  meFace: string;
  youRole: string;
  meRole: string;
  city: string;
  stage: string;
  meFirst?: boolean;
  trait?: string;
  /** Opponent's pre-battle shout. */
  taunt?: string;
  boss?: boolean;
}

/** Fighting-game intro: two diagonal panels crash together, coin toss, BATTLE START. */
export function vsIntroHtml(v: VsIntro): string {
  const meFirst = v.meFirst ?? v.meRole.includes('先攻');
  return `<div class="vs-intro${v.boss ? ' boss' : ''}" id="vs-intro" data-me-first="${meFirst ? '1' : '0'}">
    <div class="vs-stage" style="background-image:url('${v.stage}')"></div>
    <div class="vs-flash"></div>
    ${v.boss ? '<div class="vs-warning"><span>WARNING</span><b>ボスバトル</b><span>WARNING</span></div>' : ''}
    <div class="vs-city">${esc(v.city)}</div>
    <div class="vs-panel vs-you">
      <img src="${v.youFace}" alt=""/>
      <div class="vs-plate">
        <b>${esc(v.youName)}</b>
        <span class="role-badge toss-role ${v.youRole.includes('先攻') ? 'sen' : ''}">${esc(v.youRole)}</span>
      </div>
      ${v.taunt ? `<p class="vs-taunt">「${esc(v.taunt)}」</p>` : ''}
    </div>
    <div class="vs-mid">
      <div class="vs-mark">VS</div>
      <div class="coin-toss" id="coin-toss">
        <div class="coin ${meFirst ? 'heads' : 'tails'}" id="coin">
          <div class="coin-face coin-front">月</div>
          <div class="coin-face coin-back">星</div>
        </div>
        <p class="coin-call">コイントス</p>
        <p class="coin-result" id="coin-result">${meFirst ? 'あなたが先攻' : 'あいてが先攻'}</p>
      </div>
    </div>
    <div class="vs-panel vs-me">
      <img src="${v.meFace}" alt=""/>
      <div class="vs-plate">
        <b>${esc(v.meName)}</b>
        <span class="role-badge toss-role ${v.meRole.includes('先攻') ? 'sen' : ''}">${esc(v.meRole)}</span>
      </div>
    </div>
    ${v.trait ? `<p class="vs-trait">${esc(v.trait)}</p>` : ''}
    <div class="vs-go"><span>対戦開始</span><b>BATTLE START!!</b></div>
    <p class="vs-skip">タップでとばす</p>
  </div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Name-plate color per speaker face. */
const PLATE: Record<string, string> = {
  nyanluna: '#c4b5fd',
  tsukineko: '#a78bfa',
  mochi: '#f9a8d4',
  player: '#38d6ff',
  zero: '#ff3d3d',
  ashfist: '#ff7a59',
  needswing: '#4ade80',
  thornbloom: '#f472b6',
  frostwolf: '#7dd3fc',
  tidewhale: '#38bdf8',
  screwkit: '#fbbf24',
  gearsmith: '#f59e0b',
  nightsteward: '#818cf8',
  fireflytail: '#fde047',
  slopedrake: '#fb923c',
  venomcrown: '#c084fc',
};

export function talkSceneHtml(v: {
  city: string;
  title: string;
  stage: string;
  face: string;
  fallback?: string;
  speaker: string;
  text: string;
  mood?: string;
  faceId?: string;
  /** Shown as a big title card on the first line of a chapter. */
  chapter?: string;
  /** Line counter, e.g. 2/5. */
  progress?: string;
}): string {
  const fallback = v.fallback && v.fallback !== v.face ? v.fallback : '';
  const onerr = fallback
    ? ` onerror="this.onerror=null;this.src='${esc(fallback)}'"`
    : '';
  const mood = v.mood && v.mood !== 'neutral' ? ` data-mood="${esc(v.mood)}"` : '';
  const plate = PLATE[v.faceId ?? ''] ?? '#f5d48a';
  const loud = /[！!]{1,}/.test(v.text) ? ' loud' : '';
  return `<section class="screen talk" id="talk">
    <div class="talk-stage" style="background-image:url('${esc(v.stage)}')"></div>
    <div class="talk-veil"></div>
    <div class="talk-top">
      <p class="talk-city">${esc(v.city)}${v.title ? `　${esc(v.title)}` : ''}</p>
      <button type="button" class="talk-skip" id="talk-skip">スキップ ▶▶</button>
    </div>
    <div class="talk-art${loud}"><div class="talk-frame"${mood}><img class="talk-face" src="${esc(v.face)}" alt=""${onerr}/></div></div>
    <div class="talk-dock">
      <div class="bubble" style="--plate:${plate}"><div class="sp">${esc(v.speaker)}</div><div class="tx" data-full="${esc(v.text)}">${esc(v.text)}</div><i class="talk-next">▼</i></div>
      <p class="talk-hint">タップで進む${v.progress ? `　${esc(v.progress)}` : ''}</p>
    </div>
    ${
      v.chapter
        ? `<div class="talk-card"><span>${esc(v.chapter)}</span><b>${esc(v.title)}</b><small>${esc(v.city)}</small></div>`
        : ''
    }
  </section>`;
}

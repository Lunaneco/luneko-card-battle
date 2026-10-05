import {
  TITLE_BRAND,
  TITLE_CONTINUE,
  TITLE_NEW,
  TITLE_NEW_WARN,
  TITLE_START,
  TITLE_TAGLINE,
} from './copy';

export function titleScreenHtml(hasSave: boolean, newAsk = false): string {
  return `<section class="screen bg-splash" id="title-screen" style="background-image:url('/art/ui/title_splash.jpg')">
    <div class="spacer"></div>
    <div class="col" style="position:relative;z-index:1">
      <div class="logo">LUNNEKO CARD BATTLE</div>
      <h1 class="title title-logo"><span>${TITLE_BRAND}</span><b>月牌バトル</b></h1>
      <p class="sub title-tag">${TITLE_TAGLINE}</p>
      <div class="col" style="margin-top:18px">
        <button class="btn gold big title-start" id="start">${hasSave ? TITLE_CONTINUE : TITLE_START}</button>
        ${hasSave ? `<button class="btn ghost" id="new">${TITLE_NEW}</button>` : ''}
        <button class="btn ghost" id="how">ルール</button>
      </div>
    </div>
    ${
      newAsk
        ? `<div class="confirm-overlay on" id="title-new-overlay">
      <div class="confirm-sheet">
        <h3>${TITLE_NEW}</h3>
        <p class="sub">${TITLE_NEW_WARN}</p>
        <div class="row">
          <button class="btn ghost" id="new-no" type="button">やめる</button>
          <button class="btn" id="new-yes" type="button">${TITLE_NEW}</button>
        </div>
      </div>
    </div>`
        : ''
    }
  </section>`;
}

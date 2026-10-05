import { GIVEUP_ASK, GIVEUP_CONFIRM, GIVEUP_LABEL, GIVEUP_YES } from './copy';

export function giveupButtonHtml(): string {
  return `<button class="giveup-btn" id="giveup" type="button">${GIVEUP_LABEL}</button>`;
}

export function giveupOverlayHtml(ask: boolean): string {
  return `<div class="giveup-overlay ${ask ? 'on' : ''}" id="giveup-overlay">
      <div class="giveup-sheet">
        <h3>${GIVEUP_ASK}</h3>
        <p class="sub">${GIVEUP_CONFIRM}</p>
        <div class="row">
          <button class="btn ghost" id="giveup-no" type="button">やめる</button>
          <button class="btn" id="giveup-yes" type="button">${GIVEUP_YES}</button>
        </div>
      </div>
    </div>`;
}

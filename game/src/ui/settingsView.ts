import {
  SETTINGS_FOOTER,
  SETTINGS_MUTE_OFF,
  SETTINGS_MUTE_ON,
  SETTINGS_SAVE_LEAD,
  SETTINGS_WIPE,
  SETTINGS_WIPE_WARN,
} from './copy';

export function settingsScreenHtml(muted: boolean, wipeAsk = false): string {
  return `<section class="screen" id="settings-screen">
    <div class="topbar"><button class="btn sm ghost" id="back">戻る</button><h2>設定</h2></div>
    <p class="sub" style="text-align:left">${SETTINGS_SAVE_LEAD}</p>
    <button class="btn" id="mute">${muted ? SETTINGS_MUTE_ON : SETTINGS_MUTE_OFF}</button>
    <button class="btn danger" id="wipe" style="margin-top:12px">${SETTINGS_WIPE}</button>
    <p class="sub" style="margin-top:16px">${SETTINGS_FOOTER}</p>
    ${
      wipeAsk
        ? `<div class="confirm-overlay on" id="wipe-overlay">
      <div class="confirm-sheet">
        <h3>${SETTINGS_WIPE}</h3>
        <p class="sub">${SETTINGS_WIPE_WARN}</p>
        <div class="row">
          <button class="btn ghost" id="wipe-no" type="button">やめる</button>
          <button class="btn danger" id="wipe-yes" type="button">${SETTINGS_WIPE}</button>
        </div>
      </div>
    </div>`
        : ''
    }
  </section>`;
}

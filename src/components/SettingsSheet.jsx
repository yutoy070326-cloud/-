import React, { useState } from 'react';
import SpeedSwitch from './SpeedSwitch.jsx';
import {
  POS_CATEGORIES, DEFAULT_COLORS, COLOR_CHOICES, loadSettings, saveSettings,
} from '../lib/settings.js';

// ホームの「設定」。変更はすぐに保存される（このシートを閉じたあとに開く文章から反映）
export default function SettingsSheet({ onClose }) {
  const [st, setSt] = useState(loadSettings);
  const update = (patch) => setSt(saveSettings(patch));
  const setColor = (id, color) => update({ colors: { ...st.colors, [id]: color } });

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet settings-sheet" role="dialog" aria-label="設定" onClick={(e) => e.stopPropagation()} data-testid="settings-sheet">
        <h3 className="sheet-title">⚙ 設定</h3>

        <section className="set-section">
          <h4 className="set-h">単語のハイライト</h4>
          <label className="set-row">
            <span>品詞で色分けする</span>
            <input type="checkbox" checked={st.colorByPos} onChange={(e) => update({ colorByPos: e.target.checked })} data-testid="set-color-by-pos" />
          </label>

          {st.colorByPos && (
            <div className="set-colors">
              {POS_CATEGORIES.map((c) => (
                <div key={c.id} className="set-color" data-testid={`set-color-${c.id}`}>
                  <span className="set-color-name">
                    <span className="set-sample" style={{ background: st.colors[c.id] }}>{c.label}</span>
                  </span>
                  <span className="set-swatches">
                    {COLOR_CHOICES.map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={'swatch' + (st.colors[c.id].toLowerCase() === col ? ' on' : '')}
                        style={{ background: col }}
                        aria-label={`${c.label}の色を ${col} にする`}
                        onClick={() => setColor(c.id, col)}
                      />
                    ))}
                    <input
                      type="color"
                      className="swatch-input"
                      value={st.colors[c.id]}
                      aria-label={`${c.label}の色を選ぶ`}
                      onChange={(e) => setColor(c.id, e.target.value)}
                    />
                  </span>
                </div>
              ))}
              <button type="button" className="btn ghost small" onClick={() => update({ colors: DEFAULT_COLORS })} data-testid="set-colors-reset">
                色を初期設定に戻す
              </button>
            </div>
          )}
        </section>

        <section className="set-section">
          <h4 className="set-h">意味の小窓・単語テスト</h4>
          <label className="set-row">
            <span>読み（拼音・ローマ字）を表示する</span>
            <input type="checkbox" checked={st.showReading} onChange={(e) => update({ showReading: e.target.checked })} data-testid="set-show-reading" />
          </label>
          <label className="set-row">
            <span>「詳しく見る」を最初から開く</span>
            <input type="checkbox" checked={st.alwaysDetail} onChange={(e) => update({ alwaysDetail: e.target.checked })} data-testid="set-always-detail" />
          </label>
        </section>

        <section className="set-section">
          <h4 className="set-h">音声の速さ</h4>
          <div className="set-row"><span>🐢 ゆっくり ／ 🧑 ふつう ／ 🐇 はやい</span><SpeedSwitch /></div>
        </section>

        <section className="set-section">
          <h4 className="set-h">開始・終了のあいさつ</h4>
          <label className="set-row">
            <span>あいさつの声を出さない（テキストのみ）</span>
            <input type="checkbox" checked={st.muteGreeting} onChange={(e) => update({ muteGreeting: e.target.checked })} data-testid="set-mute-greeting" />
          </label>
        </section>

        <div className="sheet-actions">
          <button className="btn primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

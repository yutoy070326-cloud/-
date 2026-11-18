import React, { useState } from 'react';
import SpeedSwitch from './SpeedSwitch.jsx';
import { resetAllLearningData } from '../lib/reset.js';
import { t, UI_LANGS, getUiLang } from '../lib/i18n.js';
import {
  POS_CATEGORIES, DEFAULT_COLORS, COLOR_CHOICES, loadSettings, saveSettings,
} from '../lib/settings.js';

// ホームの「設定」。変更はすぐに保存される（このシートを閉じたあとに開く文章から反映）
export default function SettingsSheet({ onClose, onChangeLang }) {
  const [st, setSt] = useState(loadSettings);
  const [resetStep, setResetStep] = useState(0); // 0: 通常 / 1: 確認中
  const update = (patch) => setSt(saveSettings(patch));
  const setColor = (id, color) => update({ colors: { ...st.colors, [id]: color } });

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet settings-sheet" role="dialog" aria-label={t('home.settings', '設定')} onClick={(e) => e.stopPropagation()} data-testid="settings-sheet">
        <h3 className="sheet-title">{t('settings.title', '⚙ 設定')}</h3>

        <section className="set-section">
          <h4 className="set-h">{t('settings.language', '表示言語 / Language')}</h4>
          <label className="set-row">
            <span>{t('settings.uilang', '画面の言語')}</span>
            <select className="input" style={{ width: 'auto' }} value={getUiLang()} onChange={(e) => onChangeLang?.(e.target.value)} data-testid="set-ui-lang">
              {UI_LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
        </section>

        <section className="set-section">
          <h4 className="set-h">{t('settings.highlight', '単語のハイライト')}</h4>
          <label className="set-row">
            <span>{t('settings.colorbypos', '品詞で色分けする')}</span>
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
                {t('settings.colorreset', '色を初期設定に戻す')}
              </button>
            </div>
          )}
        </section>

        <section className="set-section">
          <h4 className="set-h">{t('settings.popup', '意味の小窓・単語テスト')}</h4>
          <label className="set-row">
            <span>{t('settings.reading', '読み（拼音・ローマ字）を表示する')}</span>
            <input type="checkbox" checked={st.showReading} onChange={(e) => update({ showReading: e.target.checked })} data-testid="set-show-reading" />
          </label>
          <label className="set-row">
            <span>{t('settings.alwaysdetail', '「詳しく見る」を最初から開く')}</span>
            <input type="checkbox" checked={st.alwaysDetail} onChange={(e) => update({ alwaysDetail: e.target.checked })} data-testid="set-always-detail" />
          </label>
        </section>

        <section className="set-section">
          <h4 className="set-h">{t('settings.speed', '音声の速さ')}</h4>
          <div className="set-row"><span>{t('settings.speed.row', '🐢 ゆっくり ／ 🧑 ふつう ／ 🐇 はやい')}</span><SpeedSwitch /></div>
        </section>

        <section className="set-section">
          <h4 className="set-h">{t('settings.greet', '開始・終了のあいさつ')}</h4>
          <label className="set-row">
            <span>{t('settings.mute', 'あいさつの声を出さない（テキストのみ）')}</span>
            <input type="checkbox" checked={st.muteGreeting} onChange={(e) => update({ muteGreeting: e.target.checked })} data-testid="set-mute-greeting" />
          </label>
        </section>

        <section className="set-section danger-zone" data-testid="reset-section">
          <h4 className="set-h">{t('settings.reset', 'データのリセット')}</h4>
          {resetStep === 0 ? (
            <button type="button" className="btn danger-text block" onClick={() => setResetStep(1)} data-testid="reset-open">
              {t('settings.reset.btn', '🗑 すべての学習データを削除する…')}
            </button>
          ) : (
            <div role="alertdialog" aria-label={t('settings.reset', 'データのリセット')} data-testid="reset-confirm">
              <p className="menu-confirm">
                {t('settings.reset.warn', '単語帳・文章・本・ファイル・達成ノート・メダル・スタンプ・積み木・総学習時間・連続学習日数を、すべて削除します。元に戻せません。（表示言語や色などの設定は残ります）')}
              </p>
              <p className="hint">{t('settings.reset.tip', '先にホームの「データの保管」でバックアップしておくと、あとで復元できます。')}</p>
              <div className="sheet-actions">
                <button type="button" className="btn" onClick={() => setResetStep(0)} data-testid="reset-cancel">{t('settings.reset.cancel', 'やめる')}</button>
                <button type="button" className="btn danger" onClick={() => { resetAllLearningData(); window.location.reload(); }} data-testid="reset-yes">{t('settings.reset.yes', 'すべて削除する')}</button>
              </div>
            </div>
          )}
        </section>

        <div className="sheet-actions">
          <button className="btn primary" onClick={onClose}>{t('common.close', '閉じる')}</button>
        </div>
      </div>
    </div>
  );
}

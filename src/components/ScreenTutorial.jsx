import React, { useState } from 'react';
import { SCREEN_TUTORIALS } from '../lib/tutorials.js';
import { t } from '../lib/i18n.js';

const SEEN_KEY = 'lingo-reader-tutorial-seen:v1'; // 画面ごとの「見た」記録（端末設定。バックアップ対象外）
const readSeen = () => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; }
};
export const hasSeen = (id) => !!readSeen()[id];
const markSeen = (id) => {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), [id]: true })); } catch { /* ignore */ }
};

// 画面の使い方。初めて開いた画面では必ず出し（閉じると「見た」になる）、あとは「使い方」ボタンで見られる
export function ScreenTutorial({ id, onClose }) {
  const slides = SCREEN_TUTORIALS[id] ?? [];
  const [i, setI] = useState(0);
  if (slides.length === 0) return null;
  const s = slides[i];
  const last = i === slides.length - 1;
  const close = () => { markSeen(id); onClose(); };
  return (
    <div className="sheet-backdrop tutorial-backdrop" style={{ zIndex: 150 }}>
      <div className="tutorial" role="dialog" aria-modal="true" aria-label={t('common.help', '使い方')} data-testid="screen-tutorial" data-id={id}>
        <button className="tutorial-skip" onClick={close} data-testid="screen-tutorial-skip">{last ? t('common.close', '閉じる') : t('tutorial.skip', 'スキップ ✕')}</button>
        <div className="tutorial-body" key={i} style={{ paddingTop: 22 }}>
          <div className="tutorial-ico" aria-hidden="true">{s.ico}</div>
          <h2 className="tutorial-title">{t(`tut.${id}.${i}.t`, s.title)}</h2>
          {s.body.map((b, j) => <p key={j} className="tutorial-text">{t(`tut.${id}.${i}.b${j}`, b)}</p>)}
        </div>
        {slides.length > 1 && (
          <div className="tutorial-dots">{slides.map((_, k) => <span key={k} className={'dot' + (k === i ? ' on' : '')} />)}</div>
        )}
        <div className="tutorial-nav">
          <button className="btn" onClick={() => setI(i - 1)} disabled={i === 0}>{t('common.prev', '戻る')}</button>
          {last
            ? <button className="btn primary" onClick={close} data-testid="screen-tutorial-done">{t('common.gotit', 'わかった')}</button>
            : <button className="btn primary" onClick={() => setI(i + 1)}>{t('common.next', '次へ')}</button>}
        </div>
      </div>
    </div>
  );
}

// 画面ごとの使い方の状態。初回は自動で開く。show() で、いつでも開き直せる
export function useScreenTutorial(id) {
  const [open, setOpen] = useState(() => !hasSeen(id));
  return {
    open,
    show: () => setOpen(true),
    node: open ? <ScreenTutorial id={id} onClose={() => setOpen(false)} /> : null,
  };
}

export function HelpButton({ onClick }) {
  return <button className="btn ghost help-btn" onClick={onClick} data-testid="help-btn" aria-label={t('common.help', '使い方')}>{t('common.help', '使い方')}</button>;
}

import React, { useState } from 'react';
import { PASTE_LANGUAGES } from '../lib/storyAI.js';
import { inputHints } from '../lib/langDetect.js';

// 本の初期設定（題名・言語・開始/終了ページ・1日の目標）を編集するシート
export default function BookEditSheet({ book, onSave, onClose }) {
  const [f, setF] = useState({
    title: book.title, lang: book.lang, startPage: String(book.startPage), endPage: String(book.endPage), dailyGoal: String(book.dailyGoal),
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const err = onSave(f);
    if (err) setError(err);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet sheet-form" role="dialog" aria-label="本の設定を編集" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="sheet-title">本の設定を編集</h3>
        <label className="field-label" htmlFor="be-title">本の題名</label>
        <input id="be-title" className="input" value={f.title} maxLength={60} onChange={set('title')} autoFocus {...inputHints(f.lang, { title: true })} />
        <label className="field-label" htmlFor="be-lang">学習する言語</label>
        <select id="be-lang" className="input" value={f.lang} onChange={set('lang')}>
          {PASTE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <div className="be-row">
          <div>
            <label className="field-label" htmlFor="be-start">開始ページ</label>
            <input id="be-start" className="input" type="number" inputMode="numeric" min={1} value={f.startPage} onChange={set('startPage')} />
          </div>
          <div>
            <label className="field-label" htmlFor="be-end">終了ページ</label>
            <input id="be-end" className="input" type="number" inputMode="numeric" min={1} value={f.endPage} onChange={set('endPage')} />
          </div>
        </div>
        <label className="field-label" htmlFor="be-goal">1日の目標ページ数</label>
        <input id="be-goal" className="input" type="number" inputMode="numeric" min={1} value={f.dailyGoal} onChange={set('dailyGoal')} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn primary" data-testid="be-save">保存する</button>
        </div>
      </form>
    </div>
  );
}

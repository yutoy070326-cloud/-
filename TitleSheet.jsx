import React, { useState } from 'react';

// 題名入力シート。画面の「上部」に出す（キーボードに隠れず、開いた瞬間に見える）。
// window.prompt は使えない環境があるため自前で用意。
export default function TitleSheet({ heading, initial, confirmLabel = '保存', error = '', onSave, onClose }) {
  const [value, setValue] = useState(initial);

  const submit = (e) => {
    e.preventDefault();
    const t = value.trim();
    if (t) onSave(t);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-label={heading}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 className="sheet-title">{heading}</h3>
        {/* autoFocus は表示と同時に React が行う（useEffect での遅延 focus/select は使わない） */}
        <input
          id="title-input"
          className="input"
          value={value}
          maxLength={60}
          autoFocus
          enterKeyHint="done"
          aria-label="タイトル"
          onChange={(e) => setValue(e.target.value)}
          placeholder="タイトルを入力"
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn primary" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

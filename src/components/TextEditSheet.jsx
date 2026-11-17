import React, { useState } from 'react';
import { inputHints } from '../lib/langDetect.js';

// 登録済みの文章（ページ）の編集：題名（任意で非表示）と本文
export default function TextEditSheet({ heading = '文章を編集', initialTitle, initialText, showTitle = true, lang, onSave, onClose }) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [text, setText] = useState(initialText ?? '');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const err = onSave({ title: title.trim(), text });
    if (err) setError(err);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet sheet-form" role="dialog" aria-label={heading} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="sheet-title">{heading}</h3>
        {showTitle && (
          <>
            <label className="field-label" htmlFor="title-input">題名</label>
            <input id="title-input" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} {...inputHints(lang, { title: true })} />
          </>
        )}
        <label className="field-label" htmlFor="text-edit">本文</label>
        <textarea id="text-edit" className="textarea" rows={9} {...inputHints(lang)} value={text} autoFocus={!showTitle}
          onChange={(e) => { setText(e.target.value); setError(''); }} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn primary" data-testid="text-save">変更する</button>
        </div>
      </form>
    </div>
  );
}

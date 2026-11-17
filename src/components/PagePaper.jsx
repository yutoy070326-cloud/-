import React, { useState } from 'react';
import { inputHints } from '../lib/langDetect.js';

// 本の1ページ分の本文を貼り付ける「紙」。ページ番号は変更できる（読む順に1ページずつ登録）。
export default function PagePaper({ book, page, onPageChange, onSubmit, fixedPage = false }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const err = onSubmit(text);
    if (err) setError(err);
  };

  return (
    <section className="paper" aria-label={`${page}ページ目`}>
      <div className="paper-head">
        <span className="paper-ribbon">
          {fixedPage ? (
            <b data-testid="page-no">{page}ページ目</b>
          ) : (
            <label>
              <input
                className="page-input"
                type="number"
                inputMode="numeric"
                min={book.startPage}
                max={book.endPage}
                value={page}
                onChange={(e) => onPageChange(e.target.value)}
                aria-label="ページ番号"
                data-testid="page-input"
              />
              <b>ページ目</b>
            </label>
          )}
        </span>
        <span className="paper-book">{book.title}</span>
      </div>
      <textarea
        id="page-text"
        className="textarea paper-text"
        rows={9}
        {...inputHints(book.lang)}
        placeholder={`${page}ページ目の本文をここに貼り付けてください`}
        value={text}
        onChange={(e) => { setText(e.target.value); setError(''); }}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn primary block" disabled={!text.trim()} onClick={submit} data-testid="page-submit">
        このページで学習をはじめる
      </button>
    </section>
  );
}

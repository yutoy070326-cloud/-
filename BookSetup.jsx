import React, { useEffect, useRef, useState } from 'react';
import { createBook, addBookPage } from '../lib/storage.js';
import { PASTE_LANGUAGES } from '../lib/storyAI.js';
import PagePaper from '../components/PagePaper.jsx';
import { detectLanguage, inputHints } from '../lib/langDetect.js';
import { langName } from '../lib/storyAI.js';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 新しい本の登録。白紙の本が開く → 詳細設定（見開き）→ ページがめくれて1ページ目 → 本文を貼り付け
export default function BookSetup({ onBack, onRead, onBooksChanged, onMaterialsChanged }) {
  const [phase, setPhase] = useState('closed'); // closed → opening → form → flipping → page
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState('en');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [goal, setGoal] = useState('');
  const [langTouched, setLangTouched] = useState(false);
  const [autoLang, setAutoLang] = useState(null);
  const [error, setError] = useState('');
  const [book, setBook] = useState(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(window.setTimeout(fn, reduced() ? Math.min(ms, 60) : ms));

  useEffect(() => {
    later(() => setPhase('opening'), 120);
    later(() => setPhase('form'), 1150);
    const ts = timers.current;
    return () => ts.forEach(window.clearTimeout);
  }, []);

  const total = Number(end) >= Number(start) && Number(start) > 0 ? Number(end) - Number(start) + 1 : 0;
  // 題名から言語を自動判定（言語を手動で選んだ後は変えない）
  const onTitle = (v) => {
    setTitle(v);
    if (langTouched) return;
    const code = detectLanguage(v);
    if (code && code !== lang && PASTE_LANGUAGES.some((l) => l.code === code)) {
      setLang(code);
      setAutoLang(code);
    }
  };
  const titleHints = inputHints(lang, { title: true });

  const days = total > 0 && Number(goal) > 0 ? Math.ceil(total / Number(goal)) : null;

  const register = (e) => {
    e.preventDefault();
    const r = createBook({ title, lang, startPage: start, endPage: end, dailyGoal: goal });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError('');
    setBook(r.book);
    onBooksChanged?.(r.list.length);
    setPhase('flipping'); // ページがパラパラとめくれる
    later(() => setPhase('page'), 1500);
  };

  const submitPage = (text) => {
    const r = addBookPage(book.id, book.startPage, text);
    if (!r.ok) return r.error;
    onMaterialsChanged?.();
    onRead(
      {
        title: r.material.title,
        text: r.material.text,
        lang: book.lang,
        meta: null,
        source: 'paste',
        materialId: r.material.id,
        kind: 'book',
        bookId: book.id,
        sourceKey: book.id,
        sourceTitle: book.title,
      },
      book.id,
    );
    return undefined;
  };

  const open = phase !== 'closed';
  const showSpread = phase !== 'page';

  return (
    <div className="screen bookscreen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title">新しい本</h2>
        <span className="topbar-spacer" />
      </header>

      <main className="content" data-phase={phase} data-testid="book-setup">
        {showSpread && (
          <form className="book-form" onSubmit={register}>
            <div className={'spread' + (open ? ' open' : '') + (phase === 'flipping' ? ' flipping' : '')} aria-label="本の見開き">
              <div className="pg pg-left">
                <div className="pg-fields">
                  <label className="mini-label" htmlFor="book-title">本の題名</label>
                  <input id="book-title" className="input" value={title} maxLength={60}
                    onChange={(e) => onTitle(e.target.value)} placeholder="例：Harry Potter" {...titleHints} />
                  <label className="mini-label" htmlFor="book-lang">学習する言語</label>
                  <select id="book-lang" className="input" value={lang} onChange={(e) => { setLang(e.target.value); setLangTouched(true); setAutoLang(null); }}>
                    {PASTE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  {autoLang && <p className="pg-note auto-lang" role="status" data-testid="auto-lang">題名から「{langName(autoLang)}」を選びました</p>}
                </div>
              </div>
              <div className="pg pg-right">
                <div className="pg-fields">
                  <label className="mini-label" htmlFor="book-start">開始ページ</label>
                  <input id="book-start" className="input" type="number" inputMode="numeric" min={1}
                    value={start} onChange={(e) => setStart(e.target.value)} placeholder="例：8" />
                  <label className="mini-label" htmlFor="book-end">終了ページ</label>
                  <input id="book-end" className="input" type="number" inputMode="numeric" min={1}
                    value={end} onChange={(e) => setEnd(e.target.value)} placeholder="例：298" />
                  <label className="mini-label" htmlFor="book-goal">1日の目標ページ数</label>
                  <input id="book-goal" className="input" type="number" inputMode="numeric" min={1}
                    value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="例：5" />
                  {days && <p className="pg-note" data-testid="book-days">全{total}ページ・1日{goal}ページで約{days}日</p>}
                </div>
              </div>
              <div className="spine" aria-hidden="true" />
              {/* 表紙（開くと左ページの裏になる） */}
              <div className="cover" aria-hidden="true">
                <div className="cover-front"><span>📖</span></div>
                <div className="cover-back" />
              </div>
              {/* めくれるページ */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="leaf" style={{ '--i': i }} aria-hidden="true">
                  <div className="leaf-front" /><div className="leaf-back" />
                </div>
              ))}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn primary block book-go" disabled={phase !== 'form'} data-testid="book-register">
              この本を登録してページを開く
            </button>
          </form>
        )}

        {phase === 'page' && book && (
          <div className="page-in">
            <PagePaper book={book} page={book.startPage} fixedPage onSubmit={submitPage} />
          </div>
        )}
      </main>
    </div>
  );
}

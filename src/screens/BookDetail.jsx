import React, { useState } from 'react';
import { loadBooks, loadMaterials, addBookPage, removeBook, bookProgress, bookWordCount, nextPageNumber, todayPages } from '../lib/storage.js';
import { langName } from '../lib/storyAI.js';
import PagePaper from '../components/PagePaper.jsx';
import TextEditSheet from '../components/TextEditSheet.jsx';
import { updateMaterial, removeMaterial } from '../lib/storage.js';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';

// 1冊の本：進捗・今日の目標・次のページの登録・登録済みページ一覧
export default function BookDetail({ bookId, onBack, onRead, onBooksChanged, onMaterialsChanged }) {
  const tut = useScreenTutorial('book');
  const [book, setBook] = useState(() => loadBooks().find((b) => b.id === bookId));
  const [materials, setMaterials] = useState(() => loadMaterials());
  const [page, setPage] = useState(() => (book ? nextPageNumber(book) : 1));
  const [confirm, setConfirm] = useState(false);
  const [editPage, setEditPage] = useState(null); // ページ番号
  const [delPage, setDelPage] = useState(null);

  if (!book) {
    return (
      <div className="screen">
        <header className="topbar">
          <button className="btn ghost" onClick={onBack}>← 戻る</button>
          <h2 className="title">本</h2><span className="topbar-spacer" />
        </header>
        <main className="content"><p className="empty">この本は見つかりませんでした。</p></main>
      </div>
    );
  }

  const prog = bookProgress(book);
  const wordCount = bookWordCount(book);
  const today = todayPages(book);
  const goalDone = today >= book.dailyGoal;
  const nums = Object.keys(book.pages).map(Number).sort((a, b) => a - b);
  const sessionOf = (m) => ({
    title: m.title, text: m.text, lang: book.lang, meta: null, source: 'paste', materialId: m.id,
    kind: 'book', bookId: book.id, sourceKey: book.id, sourceTitle: book.title,
  });

  const reloadBook = () => {
    const b = loadBooks().find((x) => x.id === bookId);
    setBook(b);
    if (b) setPage(nextPageNumber(b));
    setMaterials(loadMaterials());
    onMaterialsChanged?.();
  };
  const doDeletePage = (n) => {
    removeMaterial(book.pages[n]);
    setDelPage(null);
    reloadBook();
  };

  const openPage = (n) => {
    const m = loadMaterials().find((x) => x.id === book.pages[n]);
    if (m) onRead(sessionOf(m), book.id);
  };

  const submit = (text) => {
    const r = addBookPage(book.id, page, text);
    if (!r.ok) return r.error;
    onMaterialsChanged?.();
    onRead(sessionOf(r.material), book.id);
    return undefined;
  };

  const del = () => {
    const next = removeBook(book.id);
    onBooksChanged?.(next.length);
    onMaterialsChanged?.();
    onBack();
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title">{book.title}</h2>
        <HelpButton onClick={tut.show} />
      </header>
      <main className="content" data-testid="book-detail">
        <section className="book-card">
          <div className="book-card-top">
            <span className="word-lang">{langName(book.lang)}</span>
            <span className="book-pages" data-testid="book-progress">読んだページ {prog.done} / {book.totalPages}</span>
          </div>
          <div className="bar" role="progressbar" aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${prog.pct}%` }} />
          </div>
          <div className="book-meta">
            <span data-testid="book-range">範囲 p.{book.startPage}〜{book.endPage}</span>
            <span data-testid="book-words">🧠 覚えた単語 {wordCount}語</span>
          </div>
          <div className={'goal' + (goalDone ? ' done' : '')} data-testid="book-goal">
            {goalDone ? '✓ ' : ''}今日 {today} / {book.dailyGoal} ページ
            {goalDone ? '　目標達成！' : ''}
          </div>
          {prog.finished && <div className="finished">🎉 読み終わりました</div>}
        </section>

        {nums.length < book.totalPages ? (
          <>
            <h3 className="section-title">ページを追加して学ぶ</h3>
            <PagePaper book={book} page={page} onPageChange={(v) => { setPage(Number(v) || ''); }}
              onSubmit={submit} />
          </>
        ) : null}

        {nums.length > 0 && (
          <>
            <h3 className="section-title">登録したページ（{nums.length}）</h3>
            <ul className="page-list" data-testid="page-list">
              {nums.map((n) => {
                const m = materials.find((x) => x.id === book.pages[n]);
                return (
                  <li key={n} className="page-row" data-testid="page-row">
                    <button className="page-row-main" onClick={() => openPage(n)} aria-label={`${n}ページを開く`}>
                      <b className="page-row-no">{n}</b>
                      <span className="page-row-text">{m?.text ?? ''}</span>
                    </button>
                    <span className="page-row-actions">
                      <button className="btn ghost small" onClick={() => setEditPage(n)} aria-label={`${n}ページを編集`}>編集</button>
                      {delPage === n ? (
                        <>
                          <button className="btn danger small" onClick={() => doDeletePage(n)} data-testid="page-delete-yes">本当に削除</button>
                          <button className="btn ghost small" onClick={() => setDelPage(null)}>やめる</button>
                        </>
                      ) : (
                        <button className="btn ghost small" onClick={() => setDelPage(n)} aria-label={`${n}ページを削除`}>削除</button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="book-danger">
          {confirm ? (
            <>
              <p className="hint">この本と登録したページ（{nums.length}）を削除します。保存した単語は残ります。</p>
              <button className="btn danger small" onClick={del} data-testid="book-delete-confirm">本当に削除</button>
              <button className="btn ghost small" onClick={() => setConfirm(false)}>やめる</button>
            </>
          ) : (
            <button className="btn ghost small" onClick={() => setConfirm(true)} data-testid="book-delete">この本を削除</button>
          )}
        </div>
      </main>

      {editPage != null && (
        <TextEditSheet
          heading={`${editPage}ページを編集`}
          showTitle={false}
          lang={book.lang}
          initialText={materials.find((x) => x.id === book.pages[editPage])?.text ?? ''}
          onClose={() => setEditPage(null)}
          onSave={({ text }) => {
            const r = updateMaterial(book.pages[editPage], { text });
            if (!r.ok) return r.error;
            setEditPage(null);
            reloadBook();
            return undefined;
          }}
        />
      )}
      {tut.node}
    </div>
  );
}

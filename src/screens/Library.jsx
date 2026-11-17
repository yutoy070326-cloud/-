import React, { useMemo, useRef, useState } from 'react';
import { loadBooks, loadFiles, loadMaterials, loadWordbook, bookProgress, bookWordCount, todayPages, updateBook, removeBook, renameFile, removeFile } from '../lib/storage.js';
import ItemMenu from '../components/ItemMenu.jsx';
import KindPicker from '../components/KindPicker.jsx';
import BookEditSheet from '../components/BookEditSheet.jsx';
import TitleSheet from '../components/TitleSheet.jsx';
import { langName } from '../lib/storyAI.js';

const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const PALETTE = ['#9b3d3d', '#2f5d8a', '#3d7a5a', '#8a6a2f', '#5b4a8a', '#2f7a7a', '#a1546b', '#555f6e'];
const KIND_ICON = { article: '📰', lyrics: '🎵', exam: '📝', ai: '✨', other: '📁' };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// 本：ページ数が多いほど分厚く（高さ）・大きく（幅）。ページ数は 1〜数百を想定
const bookSize = (pages) => ({
  h: Math.round(clamp(26 + Math.sqrt(pages) * 3.4, 26, 88)),
  w: Math.round(clamp(58 + Math.sqrt(pages) * 2.2, 58, 100)),
});
// ファイル：中の文章の量（文字数）が多いほど分厚く。幅は一定
const fileSize = (chars) => ({ h: Math.round(clamp(26 + Math.sqrt(chars) * 0.75, 26, 88)), w: 90 });

// 本棚（ライブラリ）：本とファイルを縦に積み重ねる。本はページ数で、ファイルは中の文章の量で厚みが変わる。
// 本は読んだページの割合だけ色が塗られるので、積み重ねを見るだけで勉強の進み具合がわかる。
const LONG_PRESS_MS = 500;
const MOVE_TOL = 10;

export default function Library({ onBack, onOpenBook, onOpenFile, onAdd, onChanged, onShowTutorial }) {
  const [picker, setPicker] = useState(false);
  const [rev, setRev] = useState(0);
  const [menu, setMenu] = useState(null); // { type: 'book'|'file', id }
  const [mode, setMode] = useState(null); // 'edit' | null（メニューから編集を選んだ）
  const [fileError, setFileError] = useState('');
  const press = useRef({ t: null, fired: false, x: 0, y: 0 });

  // 長押し（タッチ・マウス）と右クリックでメニューを開く。長押しのあとに指を離しても「開く」は実行しない。
  const pressProps = (type, id, open) => ({
    onPointerDown: (e) => {
      press.current.fired = false;
      press.current.x = e.clientX;
      press.current.y = e.clientY;
      window.clearTimeout(press.current.t);
      press.current.t = window.setTimeout(() => {
        press.current.fired = true;
        navigator.vibrate?.(15);
        setMenu({ type, id });
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e) => {
      if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > MOVE_TOL) window.clearTimeout(press.current.t);
    },
    onPointerUp: () => window.clearTimeout(press.current.t),
    onPointerCancel: () => window.clearTimeout(press.current.t),
    onPointerLeave: () => window.clearTimeout(press.current.t),
    onContextMenu: (e) => {
      e.preventDefault();
      window.clearTimeout(press.current.t);
      press.current.fired = true;
      setMenu({ type, id });
    },
    onClick: () => {
      if (press.current.fired) {
        press.current.fired = false;
        return;
      }
      open();
    },
  });

  const changed = () => {
    setRev((r) => r + 1);
    onChanged?.();
  };
  const closeAll = () => { setMenu(null); setMode(null); setFileError(''); };

  const data = useMemo(() => {
    const books = loadBooks();
    const files = loadFiles();
    const mats = loadMaterials();
    const words = loadWordbook();
    const items = [
      ...books.map((b) => ({ type: 'book', id: b.id, at: b.createdAt ?? 0, book: b })),
      ...files.map((f) => ({ type: 'file', id: f.id, at: f.createdAt ?? 0, file: f, count: mats.filter((m) => m.fileId === f.id).length, chars: mats.filter((m) => m.fileId === f.id).reduce((n, m) => n + (m.text?.length ?? 0), 0) })),
    ].sort((a, b) => a.at - b.at);
    let pages = 0, finished = 0;
    for (const b of books) {
      const p = bookProgress(b);
      pages += p.done;
      if (p.finished) finished += 1;
    }
    return { books, files, items, words, stats: { pages, finished } };
  }, [rev]);
  // 積み重ね：古いものが下、新しいものが上
  const pile = [...data.items].reverse();
  const menuBook = menu?.type === 'book' ? data.books.find((b) => b.id === menu.id) : null;
  const menuFile = menu?.type === 'file' ? data.files.find((f) => f.id === menu.id) : null;

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title">ライブラリ</h2>
        <button className="btn ghost" onClick={onShowTutorial} data-testid="show-tutorial-library" aria-label="使い方を見る">使い方</button>
      </header>
      <main className="content library-main" data-testid="library">
        <section className="lib-stats four" data-testid="lib-stats">
          <div className="stat"><b data-testid="stat-books">{data.books.length}</b><span>本</span></div>
          <div className="stat"><b data-testid="stat-files">{data.files.length}</b><span>ファイル</span></div>
          <div className="stat"><b data-testid="stat-finished">{data.stats.finished}</b><span>読み終えた本</span></div>
          <div className="stat"><b data-testid="stat-pages">{data.stats.pages}</b><span>学んだページ</span></div>
        </section>

        <div className="stack" data-testid="shelf">
          {data.items.length === 0 ? (
            <p className="shelf-empty">まだ何もありません。<br />右下の「＋」から、本や記事を追加しましょう。</p>
          ) : (
            <div className="pile">
              {pile.map((it) => {
                if (it.type === 'book') {
                  const b = it.book;
                  const p = bookProgress(b);
                  const color = PALETTE[hash(b.title) % PALETTE.length];
                  const { h, w } = bookSize(b.totalPages ?? 1);
                  return (
                    <button key={b.id} className="stack-item book" data-testid="book-cover"
                      style={{ '--c': color, '--h': `${h}px`, '--w': `${w}%`, '--p': `${p.pct}%` }}
                      {...pressProps('book', b.id, () => onOpenBook(b.id))}
                      aria-label={`${b.title}（読んだページ ${p.done}/${b.totalPages}、覚えた単語 ${bookWordCount(b, data.words)}語）`}>
                      <span className="stack-fill" aria-hidden="true" />
                      <span className="stack-label">
                        <span className="stack-title">{p.finished && '★ '}{b.title}</span>
                        <span className="stack-info">{p.done}/{b.totalPages}p ・ {p.pct}%</span>
                      </span>
                    </button>
                  );
                }
                const f = it.file;
                const { h, w } = fileSize(it.chars);
                return (
                  <button key={f.id} className={`stack-item file k-${f.kind}`} data-testid="file-folder"
                    style={{ '--h': `${h}px`, '--w': `${w}%` }}
                    {...pressProps('file', f.id, () => onOpenFile(f.id))}
                    aria-label={`ファイル ${f.name}（${it.count}件、${it.chars}字）`}>
                    <span className="stack-label">
                      <span className="stack-title">{KIND_ICON[f.kind] ?? '📁'} {f.name}</span>
                      <span className="stack-info">{it.count}件 ・ {it.chars.toLocaleString()}字</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="board" />
        </div>

        {data.items.length > 0 && <p className="hint center">本・ファイルを長押し（右クリック）すると、編集・削除できます</p>}

        {data.books.length > 0 && (
          <>
            <h3 className="section-title">読書の進み具合</h3>
            <ul className="book-list">
              {data.books.map((b) => {
                const p = bookProgress(b);
                const t = todayPages(b);
                return (
                  <li key={b.id}>
                    <button className="book-row" onClick={() => onOpenBook(b.id)} data-testid="book-row">
                      <span className="book-row-title">{b.title}</span>
                      <span className="book-row-sub">
                        <span className="word-lang">{langName(b.lang)}</span>
                        <span data-testid="row-progress">読んだ {p.done} / {b.totalPages} ページ</span>
                        <span data-testid="row-words">🧠 {bookWordCount(b, data.words)}語</span>
                        <span className={t >= b.dailyGoal ? 'goal-ok' : ''}>今日 {t}/{b.dailyGoal}</span>
                      </span>
                      <span className="bar"><span style={{ width: `${p.pct}%` }} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="fab-wrap">
          <button className="fab" onClick={() => setPicker(true)} data-testid="add-fab" aria-label="追加する">＋</button>
        </div>
      </main>

      {picker && (
        <KindPicker
          onClose={() => setPicker(false)}
          onPick={(k) => {
            setPicker(false);
            onAdd(k);
          }}
        />
      )}

      {menu && !mode && (menuBook || menuFile) && (
        <ItemMenu
          title={menuBook ? menuBook.title : menuFile.name}
          detail={menuBook
            ? `登録したページ（${Object.keys(menuBook.pages ?? {}).length}）も削除されます。保存した単語は残ります。`
            : '中の文章もすべて削除されます。保存した単語は残ります。'}
          onEdit={() => setMode('edit')}
          onDelete={() => {
            if (menuBook) removeBook(menuBook.id);
            else removeFile(menuFile.id);
            closeAll();
            changed();
          }}
          onClose={closeAll}
        />
      )}
      {menuBook && mode === 'edit' && (
        <BookEditSheet
          book={menuBook}
          onClose={closeAll}
          onSave={(f) => {
            const r = updateBook(menuBook.id, f);
            if (!r.ok) return r.error;
            closeAll();
            changed();
            return undefined;
          }}
        />
      )}
      {menuFile && mode === 'edit' && (
        <TitleSheet
          heading="ファイル名を変更"
          initial={menuFile.name}
          confirmLabel="変更する"
          error={fileError}
          onClose={closeAll}
          onSave={(name) => {
            const r = renameFile(menuFile.id, name);
            if (!r.ok) { setFileError(r.error); return; }
            closeAll();
            changed();
          }}
        />
      )}
    </div>
  );
}

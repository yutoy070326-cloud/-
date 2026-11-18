import React, { useMemo, useState } from 'react';
import {
  loadWordbook,
  loadMaterials,
  loadFolders,
  loadBooks,
  createFolder,
  renameFolder,
  deleteFolder,
  healWordbookSources,
  removeFromWordbook,
  addManualWord,
  updateWord,
  toggleFavorite,
} from '../lib/storage.js';
import { langName } from '../lib/storyAI.js';
import { isDue, formatRemaining, STEP_LABELS } from '../lib/srs.js';
import { buildFolders, matchesFilter, folderKeyOf, moveTargets, folderPatch, NONE_KEY } from '../lib/folders.js';
import { useNow } from '../lib/useNow.js';
import StepBadge from '../components/StepBadge.jsx';
import WordForm from '../components/WordForm.jsx';
import FolderManager from '../components/FolderManager.jsx';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';
import ReviewSchedule from '../components/ReviewSchedule.jsx';
import { useBackHandler } from '../lib/backRegistry.js';

export default function Wordbook({ onBack, onChanged, initial = {}, onStartReview }) {
  const now = useNow();
  const [list, setList] = useState(() => healWordbookSources()); // 出典の無い古い単語は、例文から文章に自動で結びつく
  const [materials] = useState(() => loadMaterials());
  const [books] = useState(() => loadBooks());
  const [customFolders, setCustomFolders] = useState(() => loadFolders());
  const [manager, setManager] = useState(false);
  const tut = useScreenTutorial('wordbook');
  useBackHandler(onBack);
  const [view, setView] = useState(initial.view ?? 'list'); // 'list'（単語帳） | 'review'（復習）
  const [tab, setTab] = useState(initial.lang ?? 'all'); // 'all' | 言語コード
  const [source, setSource] = useState(initial.source ?? 'all'); // 'all' | 文章フォルダーのキー
  const [fav, setFav] = useState(initial.fav ?? false); // お気に入りのみ
  const [scope, setScope] = useState('due'); // 復習の対象：'due'（今日の復習） | 'all'（すべて）
  const [form, setForm] = useState(null); // { mode: 'add' | 'edit', word? }
  const [confirmId, setConfirmId] = useState(null); // 削除の確認中

  const sync = (next) => {
    setList(next);
    onChanged?.(next.length);
  };

  // ---- 絞り込み（言語 → 文章 → お気に入り。単語帳・復習で共通）----
  const langs = useMemo(() => {
    const counts = new Map();
    for (const w of list) counts.set(w.lang, (counts.get(w.lang) ?? 0) + 1);
    return Array.from(counts.entries()); // 新しく保存した言語が先
  }, [list]);
  const active = tab !== 'all' && langs.some(([l]) => l === tab) ? tab : 'all';

  const inLang = useMemo(() => (active === 'all' ? list : list.filter((w) => w.lang === active)), [list, active]);
  const folders = useMemo(() => buildFolders(inLang, materials, customFolders, books), [inLang, materials, customFolders, books]);
  const allFolders = useMemo(() => buildFolders(list, materials, customFolders, books), [list, materials, customFolders, books]);
  const targets = useMemo(() => moveTargets(list, materials, customFolders, books), [list, materials, customFolders, books]);
  const folderTitle = (w) => allFolders.find((f) => f.key === folderKeyOf(w))?.title ?? '未分類';
  const sourceActive = source !== 'all' && folders.some((f) => f.key === source) ? source : 'all';

  const filter = { lang: active, source: sourceActive, fav };
  const shown = useMemo(() => list.filter((w) => matchesFilter(w, filter)), [list, active, sourceActive, fav]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 復習の集計（絞り込み後の範囲）----
  const due = useMemo(() => shown.filter((w) => isDue(w, now)).sort((a, b) => a.dueAt - b.dueAt), [shown, now]);
  const upcoming = useMemo(
    () => shown.filter((w) => !w.mastered && !isDue(w, now)).sort((a, b) => a.dueAt - b.dueAt),
    [shown, now],
  );
  const masteredCount = shown.filter((w) => w.mastered).length;
  const allDueCount = list.filter((w) => isDue(w, now)).length;
  // 期限が来ているカードが無いときは「すべて」で始める
  const effScope = due.length > 0 ? scope : 'all';
  const startCount = effScope === 'due' ? due.length : shown.length;

  // ---- 操作 ----
  const remove = (id) => {
    sync(removeFromWordbook(id));
    setConfirmId(null);
  };
  const toggleFav = (id) => sync(toggleFavorite(id));

  // ---- フォルダー管理 ----
  const onCreateFolder = (name) => {
    const r = createFolder(name);
    if (!r.ok) return r.error;
    setCustomFolders(r.list);
    return undefined;
  };
  const onRenameFolder = (id, name) => {
    const r = renameFolder(id, name);
    if (!r.ok) return r.error;
    setCustomFolders(r.list);
    return undefined;
  };
  const onDeleteFolder = (id) => {
    const r = deleteFolder(id);
    setCustomFolders(r.folders);
    sync(r.words);
    if (source === id) setSource('all');
  };

  const saveForm = (fields) => {
    const { folder: folderKey, newFolderName, ...rest } = fields;
    // 新しいフォルダーをその場で作る場合
    let target = targets.find((f) => f.key === folderKey) ?? targets[0];
    if (newFolderName) {
      const c = createFolder(newFolderName);
      if (!c.ok) return c.error;
      setCustomFolders(c.list);
      target = { key: c.folder.id, title: c.folder.name, kind: 'custom' };
    }
    const patch = folderPatch(target);
    if (form.mode === 'add') {
      const r = addManualWord(rest, patch);
      if (!r.ok) return r.error;
      sync(r.list);
      // 追加した単語がすぐ見えるよう、絞り込みを解除して単語帳に切り替える
      setView('list');
      setTab(fields.lang);
      setSource('all');
      setFav(false);
    } else {
      const r = updateWord(form.word.id, { ...rest, ...patch });
      if (!r.ok) return r.error;
      sync(r.list);
    }
    setForm(null);
    return undefined;
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost back-btn" onClick={onBack} aria-label="戻る">
          ← 戻る
        </button>
        <h2 className="title">単語帳</h2>
        <HelpButton onClick={tut.show} />
      </header>

      {/* 単語帳 / 復習 */}
      <div className="seg" role="group" aria-label="表示">
        <button className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'}
          onClick={() => setView('list')} data-testid="view-list">
          単語帳
        </button>
        <button className={view === 'review' ? 'on' : ''} aria-pressed={view === 'review'}
          onClick={() => setView('review')} data-testid="view-review">
          復習
          {allDueCount > 0 && <span className="seg-badge">{allDueCount}</span>}
        </button>
      </div>

      {/* 言語タブ */}
      <nav className="tabs" role="tablist" aria-label="言語">
        <button role="tab" aria-selected={active === 'all'}
          className={'tab' + (active === 'all' ? ' on' : '')} onClick={() => setTab('all')}>
          すべて <span className="tab-count">{list.length}</span>
        </button>
        {langs.map(([code, n]) => (
          <button key={code} role="tab" aria-selected={active === code}
            className={'tab' + (active === code ? ' on' : '')} onClick={() => setTab(code)}>
            {langName(code)} <span className="tab-count">{n}</span>
          </button>
        ))}
      </nav>

      {/* 絞り込み：お気に入り／文章フォルダー（単語帳・復習で共通） */}
      {(list.length > 0 || customFolders.length > 0) && (
        <div className="filters">
          <button className={'fav-filter' + (fav ? ' on' : '')} aria-pressed={fav}
            onClick={() => setFav((f) => !f)} data-testid="filter-fav">
            {fav ? '★' : '☆'} お気に入り
          </button>
          {folders.length >= 2 && (
            <label className="folder-select">
              <span aria-hidden="true">📁</span>
              <select value={sourceActive} onChange={(e) => setSource(e.target.value)}
                aria-label="文章で絞り込み" data-testid="filter-source">
                <option value="all">すべての文章</option>
                {folders.map((f) => (
                  <option key={f.key} value={f.key}>{f.title}（{f.count}）</option>
                ))}
              </select>
            </label>
          )}
          <button className="manage-folders" onClick={() => setManager(true)} data-testid="manage-folders"
            aria-label="フォルダーを管理">
            ⚙ 管理
          </button>
        </div>
      )}

      <main className="content">
        {view === 'list' && (
          <>
            <button className="add-word" onClick={() => setForm({ mode: 'add' })} data-testid="add-word">
              ＋ 単語を追加
            </button>

            {list.length === 0 && (
              <p className="empty">
                まだ単語がありません。
                <br />
                読書画面で単語をハイライトして「保存」を押すか、上のボタンから追加できます。
              </p>
            )}
            {list.length > 0 && shown.length === 0 && (
              <p className="empty">条件に合う単語がありません。</p>
            )}

            <ul className="wordlist">
              {shown.map((w) => (
                <li key={w.id} className="word-item" data-testid="word-item">
                  <div className="word-head">
                    <span className="word-lemma">{w.lemma}</span>
                    {w.pos && w.pos !== '—' && <span className="word-pos">{w.pos}</span>}
                    {active === 'all' && <span className="word-lang">{langName(w.lang)}</span>}
                    <button
                      className={'star' + (w.favorite ? ' on' : '')}
                      aria-pressed={!!w.favorite}
                      aria-label={`${w.lemma} をお気に入り`}
                      onClick={() => toggleFav(w.id)}
                    >
                      {w.favorite ? '★' : '☆'}
                    </button>
                  </div>
                  <div className="word-meaning">{w.meaning}</div>
                  {w.text && w.text !== w.lemma && <div className="word-form">本文中: {w.text}</div>}
                  {w.conj && <div className="word-conj">{w.conj}</div>}
                  {w.context && <div className="word-context">“{w.context}”</div>}
                  {sourceActive === 'all' && folders.length >= 2 && (
                    <div className="word-folder">📁 {folderTitle(w)}</div>
                  )}
                  <div className="word-foot">
                    <StepBadge w={w} />
                    {!w.mastered && (
                      <span className={'due-text' + (isDue(w, now) ? ' due' : '')}>
                        {isDue(w, now) ? '復習の時間です' : formatRemaining(w.dueAt, now)}
                      </span>
                    )}
                    <span className="word-actions">
                      <button className="btn ghost small" onClick={() => setForm({ mode: 'edit', word: w })}
                        aria-label={`${w.lemma} を編集`}>
                        編集
                      </button>
                      {confirmId === w.id ? (
                        <>
                          <button className="btn danger small" onClick={() => remove(w.id)}>本当に削除</button>
                          <button className="btn ghost small" onClick={() => setConfirmId(null)}>やめる</button>
                        </>
                      ) : (
                        <button className="btn ghost small" onClick={() => setConfirmId(w.id)}
                          aria-label={`${w.lemma} を削除`}>
                          削除
                        </button>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {view === 'review' && list.length === 0 && (
          <p className="empty">
            まだ単語がありません。
            <br />
            保存した単語は、20分後から忘却曲線に沿って復習できます。
          </p>
        )}

        {view === 'review' && list.length > 0 && (
          <div className="review-home" data-testid="review-home">
            <section className="review-summary">
              <div className="stat"><b data-testid="stat-due">{due.length}</b><span>本日の復習</span></div>
              <div className="stat"><b data-testid="stat-learning">{upcoming.length}</b><span>学習中</span></div>
              <div className="stat"><b data-testid="stat-mastered">{masteredCount}</b><span>習得済み</span></div>
            </section>

            {/* テストの範囲：期限が来ているカードがあるときだけ切り替えを出す */}
            {due.length > 0 && (
              <div className="scope" role="group" aria-label="テストの範囲">
                <button className={effScope === 'due' ? 'on' : ''} aria-pressed={effScope === 'due'}
                  onClick={() => setScope('due')} data-testid="scope-due">
                  今日の復習 {due.length}
                </button>
                <button className={effScope === 'all' ? 'on' : ''} aria-pressed={effScope === 'all'}
                  onClick={() => setScope('all')} data-testid="scope-all">
                  すべて {shown.length}
                </button>
              </div>
            )}

            <button
              className="btn primary block"
              disabled={startCount === 0}
              onClick={() => onStartReview?.({ ...filter, scope: effScope })}
              data-testid="start-review"
            >
              {startCount === 0
                ? 'テストする単語がありません'
                : effScope === 'due'
                  ? `復習をはじめる（${startCount}枚）`
                  : `テストをはじめる（${startCount}枚）`}
            </button>
            {due.length === 0 && startCount > 0 && (
              <p className="hint center">
                復習の期限が来ているカードはありません
                {upcoming.length > 0 && `（次の復習：${formatRemaining(upcoming[0].dueAt, now)}）`}
                。いつでも全体でテストできます。
              </p>
            )}
            {effScope === 'all' && due.length > 0 && (
              <p className="hint center">期限が来ているカードを先に出題します</p>
            )}

            {/* 復習の予定：ステップ → 復習の時刻 → 単語、の順に開く。どの段でも、そのカテゴリーだけでテストできる */}
            <ReviewSchedule
              words={shown}
              now={now}
              showLang={active === 'all'}
              resetKey={JSON.stringify(filter)}
              onTest={(ids) => onStartReview?.({ ...filter, scope: 'all', ids })}
            />

            <details className="schedule-note">
              <summary>復習のスケジュール</summary>
              <ol className="schedule">
                <li>保存した時点が初回学習</li>
                {STEP_LABELS.map((label, i) => (
                  <li key={label}>
                    <span className={`step-badge s${i + 1}`}>ステップ{i + 1}</span>{' '}
                    {i === 0 ? '保存から' : '前回クリアから'} {label}
                  </li>
                ))}
                <li>ステップ5をクリアで<span className="step-badge mastered">習得済み</span></li>
              </ol>
              <p className="hint">「忘れた」はステップ1に戻ります。期限前のテストで「わかる」を押しても、予定は変わりません。</p>
            </details>
          </div>
        )}
      </main>

      {form && (
        <WordForm
          mode={form.mode}
          initial={
            form.mode === 'edit'
              ? { lemma: form.word.lemma, meaning: form.word.meaning, context: form.word.context, lang: form.word.lang, folder: folderKeyOf(form.word) }
              : { lang: active === 'all' ? 'en' : active, folder: sourceActive !== 'all' ? sourceActive : NONE_KEY }
          }
          folders={targets}
          onSave={saveForm}
          onClose={() => setForm(null)}
        />
      )}
      {manager && (
        <FolderManager
          folders={allFolders.filter((f) => f.kind === 'custom')}
          onCreate={onCreateFolder}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
          onClose={() => setManager(false)}
        />
      )}
      {tut.node}
    </div>
  );
}

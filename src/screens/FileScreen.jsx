import React, { useState } from 'react';
import { loadMaterials, loadFiles, removeMaterial, updateMaterial, renameFile, removeFile, ensureFile } from '../lib/storage.js';
import TextEditSheet from '../components/TextEditSheet.jsx';
import { langName } from '../lib/storyAI.js';
import TitleSheet from '../components/TitleSheet.jsx';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';
import { useBackHandler } from '../lib/backRegistry.js';

const KIND_LABEL = { article: '記事', lyrics: '歌詞', exam: '長文問題', ai: 'AI物語', other: 'ファイル' };

// ライブラリのファイルを開いたときの画面：中に入っている文章を選んで学習する
export default function FileScreen({ fileId, onBack, onOpen, onChanged }) {
  const tut = useScreenTutorial('file');
  useBackHandler(onBack);
  const [file, setFile] = useState(() => loadFiles().find((f) => f.id === fileId));
  const [list, setList] = useState(() => loadMaterials().filter((m) => m.fileId === fileId));
  const [renaming, setRenaming] = useState(null); // material
  const [renameFileOpen, setRenameFileOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmFile, setConfirmFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 言語コード

  if (!file) {
    return (
      <div className="screen">
        <header className="topbar">
          <button className="btn ghost back-btn" onClick={onBack}>← 戻る</button>
          <h2 className="title">ファイル</h2><span className="topbar-spacer" />
        </header>
        <main className="content"><p className="empty">このファイルは見つかりませんでした。</p></main>
      </div>
    );
  }

  // 言語ごとにまとめる（最初に出てきた言語の順）。タブで1言語に絞り込める
  const langs = [];
  for (const m of list) {
    const l = langs.find((x) => x[0] === m.lang);
    if (l) l[1] += 1;
    else langs.push([m.lang, 1]);
  }
  const active = tab === 'all' || langs.some(([c]) => c === tab) ? tab : 'all'; // 削除で言語が無くなったら「すべて」へ
  const shown = active === 'all' ? list : list.filter((m) => m.lang === active);
  const groups = [];
  for (const m of shown) {
    let g = groups.find((x) => x.lang === m.lang);
    if (!g) groups.push((g = { lang: m.lang, items: [] }));
    g.items.push(m);
  }

  const reload = () => {
    setList(loadMaterials().filter((m) => m.fileId === fileId));
    onChanged?.();
  };

  const doEdit = (f) => {
    const patch = { ...f };
    // 記事のトピック・歌詞のアーティストを変えたら、その名前のファイルに移す（なければ作る）
    if (file.kind === 'article' && f.topic && f.topic !== renaming.topic) patch.fileId = ensureFile('article', f.topic).file.id;
    if (file.kind === 'lyrics' && f.artist && f.artist !== renaming.artist) patch.fileId = ensureFile('lyrics', f.artist).file.id;
    const r = updateMaterial(renaming.id, patch);
    if (!r.ok) return r.error;
    setRenaming(null);
    reload();
    return undefined;
  };
  const doDelete = (id) => {
    removeMaterial(id);
    setConfirmId(null);
    reload();
  };
  const doRenameFile = (name) => {
    const r = renameFile(file.id, name);
    if (!r.ok) { setFileError(r.error); return; }
    setFile(r.list.find((f) => f.id === file.id));
    setFileError('');
    setRenameFileOpen(false);
    onChanged?.();
  };
  const doDeleteFile = () => {
    removeFile(file.id);
    onChanged?.();
    onBack();
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost back-btn" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title" data-testid="file-title">📁 {file.name}</h2>
        <HelpButton onClick={tut.show} />
      </header>

      {/* 言語タブ（単語帳と同じ） */}
      <nav className="tabs" role="tablist" aria-label="言語" data-testid="file-tabs">
        <button role="tab" aria-selected={active === 'all'} className={'tab' + (active === 'all' ? ' on' : '')} onClick={() => setTab('all')}>
          すべて <span className="tab-count">{list.length}</span>
        </button>
        {langs.map(([code, n]) => (
          <button key={code} role="tab" aria-selected={active === code} className={'tab' + (active === code ? ' on' : '')} onClick={() => setTab(code)}>
            {langName(code)} <span className="tab-count">{n}</span>
          </button>
        ))}
      </nav>

      <main className="content" data-testid="file-screen">
        <p className="hint">{KIND_LABEL[file.kind] ?? 'ファイル'} ・ {list.length}件。学習したい文章を選んでください。</p>

        {list.length === 0 && <p className="empty">このファイルには、まだ文章がありません。</p>}
        {groups.map(({ lang, items }) => (
          <section key={lang} className="lang-group" data-testid={`lang-group-${lang}`}>
            {active === 'all' && <h3 className="lang-group-title">{langName(lang)} <span className="badge">{items.length}</span></h3>}
            <ul className="wordlist">
              {items.map((m) => (
                <li key={m.id} className="material" data-testid="material-item">
                  <button className="material-main" onClick={() => onOpen(m)}>
                    <span className="material-title">{m.title}</span>
                    <span className="material-meta">
                      <span className="word-lang">{langName(m.lang)}</span>
                      <span>最後に学習した日 {new Date(m.lastStudiedAt ?? m.savedAt).toLocaleDateString('ja-JP')}</span>
                    </span>
                    <span className="material-preview">{m.text}</span>
                  </button>
                  <div className="material-actions">
                    <button className="btn ghost small" onClick={() => setRenaming(m)} aria-label={`${m.title} を編集`}>編集</button>
                    {confirmId === m.id ? (
                      <>
                        <button className="btn danger small" onClick={() => doDelete(m.id)}>本当に削除</button>
                        <button className="btn ghost small" onClick={() => setConfirmId(null)}>やめる</button>
                      </>
                    ) : (
                      <button className="btn ghost small" onClick={() => setConfirmId(m.id)}>削除</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="book-danger">
          <button className="btn ghost small" onClick={() => setRenameFileOpen(true)} data-testid="file-rename">ファイル名を変更</button>
          {confirmFile ? (
            <>
              <p className="hint">このファイルと中の文章（{list.length}）を削除します。保存した単語は残ります。</p>
              <button className="btn danger small" onClick={doDeleteFile} data-testid="file-delete-confirm">本当に削除</button>
              <button className="btn ghost small" onClick={() => setConfirmFile(false)}>やめる</button>
            </>
          ) : (
            <button className="btn ghost small" onClick={() => setConfirmFile(true)} data-testid="file-delete">ファイルを削除</button>
          )}
        </div>
      </main>

      {renaming && (
        <TextEditSheet heading="文章を編集" lang={renaming.lang} initialTitle={renaming.title} initialText={renaming.text}
          extra={{ kind: file.kind, lang: renaming.lang, topic: renaming.topic, artist: renaming.artist, fileId: renaming.fileId, files: loadFiles().filter((x) => x.kind === file.kind) }}
          onSave={doEdit} onClose={() => setRenaming(null)} />
      )}
      {renameFileOpen && (
        <TitleSheet heading="ファイル名を変更" initial={file.name} confirmLabel="変更する" error={fileError}
          onSave={doRenameFile} onClose={() => { setRenameFileOpen(false); setFileError(''); }} />
      )}
      {tut.node}
    </div>
  );
}

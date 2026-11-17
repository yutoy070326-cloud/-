import React, { useState } from 'react';
import { loadMaterials, loadFiles, removeMaterial, updateMaterial, renameFile, removeFile } from '../lib/storage.js';
import TextEditSheet from '../components/TextEditSheet.jsx';
import { langName } from '../lib/storyAI.js';
import TitleSheet from '../components/TitleSheet.jsx';

const SOURCE_LABEL = { paste: 'ペースト', ai: 'AI生成' };
const KIND_LABEL = { article: '記事', lyrics: '歌詞', exam: '長文問題', ai: 'AI物語', other: 'ファイル' };

// ライブラリのファイルを開いたときの画面：中に入っている文章を選んで学習する
export default function FileScreen({ fileId, onBack, onOpen, onChanged }) {
  const [file, setFile] = useState(() => loadFiles().find((f) => f.id === fileId));
  const [list, setList] = useState(() => loadMaterials().filter((m) => m.fileId === fileId));
  const [renaming, setRenaming] = useState(null); // material
  const [renameFileOpen, setRenameFileOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmFile, setConfirmFile] = useState(false);
  const [fileError, setFileError] = useState('');

  if (!file) {
    return (
      <div className="screen">
        <header className="topbar">
          <button className="btn ghost" onClick={onBack}>← 戻る</button>
          <h2 className="title">ファイル</h2><span className="topbar-spacer" />
        </header>
        <main className="content"><p className="empty">このファイルは見つかりませんでした。</p></main>
      </div>
    );
  }

  const reload = () => {
    setList(loadMaterials().filter((m) => m.fileId === fileId));
    onChanged?.();
  };

  const doEdit = ({ title, text }) => {
    const r = updateMaterial(renaming.id, { title, text });
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
        <button className="btn ghost" onClick={onBack} aria-label="戻る">← 戻る</button>
        <h2 className="title" data-testid="file-title">📁 {file.name}</h2>
        <span className="topbar-spacer" />
      </header>

      <main className="content" data-testid="file-screen">
        <p className="hint">{KIND_LABEL[file.kind] ?? 'ファイル'} ・ {list.length}件。学習したい文章を選んでください。</p>

        {list.length === 0 && <p className="empty">このファイルには、まだ文章がありません。</p>}
        <ul className="wordlist">
          {list.map((m) => (
            <li key={m.id} className="material" data-testid="material-item">
              <button className="material-main" onClick={() => onOpen(m)}>
                <span className="material-title">{m.title}</span>
                <span className="material-meta">
                  <span className="word-lang">{langName(m.lang)}</span>
                  <span>{SOURCE_LABEL[m.source] ?? ''}</span>
                  <span>{new Date(m.savedAt).toLocaleDateString('ja-JP')}</span>
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
        <TextEditSheet heading="文章を編集" lang={renaming.lang} initialTitle={renaming.title} initialText={renaming.text} onSave={doEdit} onClose={() => setRenaming(null)} />
      )}
      {renameFileOpen && (
        <TitleSheet heading="ファイル名を変更" initial={file.name} confirmLabel="変更する" error={fileError}
          onSave={doRenameFile} onClose={() => { setRenameFileOpen(false); setFileError(''); }} />
      )}
    </div>
  );
}

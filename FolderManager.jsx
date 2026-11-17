import React, { useState } from 'react';

// フォルダー管理シート（画面上部）：作成・名前変更・削除。
// 削除してもフォルダー内の単語は消えず、元の文章フォルダー（なければ未分類）に戻る。
// props: folders = [{ key, title, count }]（カスタムフォルダーのみ）
export default function FolderManager({ folders, onCreate, onRename, onDelete, onClose }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, value }
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState('');

  const run = (fn) => {
    const err = fn();
    setError(err ?? '');
    return !err;
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-form" role="dialog" aria-label="フォルダー管理" onClick={(e) => e.stopPropagation()}>
        <h3 className="sheet-title">フォルダー管理</h3>

        <form
          className="folder-create"
          onSubmit={(e) => {
            e.preventDefault();
            if (run(() => onCreate(name))) setName('');
          }}
        >
          <input className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)}
            placeholder="新しいフォルダー名" aria-label="新しいフォルダー名" id="folder-new" />
          <button type="submit" className="btn primary">作成</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}

        {folders.length === 0 ? (
          <p className="hint">自分で作ったフォルダーはまだありません。文章ごとのフォルダーは自動で作られます。</p>
        ) : (
          <ul className="folder-list" data-testid="folder-list">
            {folders.map((f) => (
              <li key={f.key} className="folder-row" data-testid="folder-row">
                {editing?.id === f.key ? (
                  <form
                    className="folder-edit"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (run(() => onRename(f.key, editing.value))) setEditing(null);
                    }}
                  >
                    <input className="input" value={editing.value} maxLength={30} autoFocus
                      aria-label="フォルダー名" onChange={(e) => setEditing({ id: f.key, value: e.target.value })} />
                    <button type="submit" className="btn primary small">保存</button>
                    <button type="button" className="btn ghost small" onClick={() => { setEditing(null); setError(''); }}>やめる</button>
                  </form>
                ) : confirmId === f.key ? (
                  <div className="folder-confirm">
                    <p>
                      「{f.title}」を削除しますか？
                      <br />
                      中の{f.count}語は消えず、元の文章フォルダー（なければ未分類）に戻ります。
                    </p>
                    <div className="folder-actions">
                      <button className="btn danger small" onClick={() => { onDelete(f.key); setConfirmId(null); }}>削除する</button>
                      <button className="btn ghost small" onClick={() => setConfirmId(null)}>やめる</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="folder-name">📁 {f.title}</span>
                    <span className="folder-count">{f.count}語</span>
                    <span className="folder-actions">
                      <button className="btn ghost small" aria-label={`${f.title} の名前を変更`}
                        onClick={() => { setEditing({ id: f.key, value: f.title }); setConfirmId(null); setError(''); }}>
                        名前変更
                      </button>
                      <button className="btn ghost small" aria-label={`${f.title} を削除`}
                        onClick={() => { setConfirmId(f.key); setEditing(null); setError(''); }}>
                        削除
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

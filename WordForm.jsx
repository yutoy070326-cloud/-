import React, { useState } from 'react';
import { PASTE_LANGUAGES } from '../lib/storyAI.js';

// 単語の追加・編集フォーム（画面の上部に出るシート）。
// onSave(fields) は、エラーがあればその文言を返し、成功なら何も返さない。
const NEW = '__new__';

export default function WordForm({ mode, initial, folders = [], onSave, onClose }) {
  const [lemma, setLemma] = useState(initial.lemma ?? '');
  const [meaning, setMeaning] = useState(initial.meaning ?? '');
  const [context, setContext] = useState(initial.context ?? '');
  const [lang, setLang] = useState(initial.lang ?? 'en');
  const [folder, setFolder] = useState(initial.folder ?? 'none');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!lemma.trim() || !meaning.trim()) {
      setError('単語と意味を入力してください');
      return;
    }
    if (folder === NEW && !newName.trim()) {
      setError('新しいフォルダーの名前を入力してください');
      return;
    }
    const err = onSave({
      lang,
      lemma: lemma.trim(),
      meaning: meaning.trim(),
      context: context.trim(),
      folder: folder === NEW ? null : folder,
      newFolderName: folder === NEW ? newName.trim() : '',
    });
    if (err) setError(err);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet sheet-form"
        role="dialog"
        aria-label={mode === 'add' ? '単語を追加' : '単語を編集'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 className="sheet-title">{mode === 'add' ? '単語を追加' : '単語を編集'}</h3>

        <label className="field-label" htmlFor="wf-lemma">単語・表現</label>
        <input id="wf-lemma" className="input" value={lemma} autoFocus maxLength={80}
          onChange={(e) => setLemma(e.target.value)} placeholder="例：look forward to" />

        <label className="field-label" htmlFor="wf-meaning">意味</label>
        <input id="wf-meaning" className="input" value={meaning} maxLength={120}
          onChange={(e) => setMeaning(e.target.value)} placeholder="例：〜を楽しみに待つ" />

        <label className="field-label" htmlFor="wf-context">例文（任意）</label>
        <textarea id="wf-context" className="input" rows={2} value={context} maxLength={300}
          onChange={(e) => setContext(e.target.value)} placeholder="例：I look forward to seeing you." />

        <label className="field-label" htmlFor="wf-lang">言語</label>
        <select id="wf-lang" className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
          {PASTE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <label className="field-label" htmlFor="wf-folder">フォルダー</label>
        <select id="wf-folder" className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
          {folders.map((f) => (
            <option key={f.key} value={f.key}>{f.kind === 'custom' ? '📁 ' : f.kind === 'source' ? '📄 ' : ''}{f.title}</option>
          ))}
          <option value={NEW}>＋ 新しいフォルダーを作る…</option>
        </select>
        {folder === NEW && (
          <input id="wf-newfolder" className="input" value={newName} maxLength={30} autoFocus
            onChange={(e) => setNewName(e.target.value)} placeholder="フォルダー名" />
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn primary">{mode === 'add' ? '追加する' : '保存する'}</button>
        </div>
      </form>
    </div>
  );
}

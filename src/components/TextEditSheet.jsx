import React, { useState } from 'react';
import { inputHints } from '../lib/langDetect.js';
import { PASTE_LANGUAGES } from '../lib/storyAI.js';
import { t } from '../lib/i18n.js';

// 登録済みの文章（ページ）の編集。ペーストのときの詳細設定（言語・種類に応じたアーティスト／トピック／入れるファイル）も、すべて変更できる。
// extra を渡したときだけ、それらの欄を出す: { kind, lang, topic, artist, fileId, files:[{id,name}] }
export default function TextEditSheet({ heading = '文章を編集', initialTitle, initialText, showTitle = true, lang, extra, onSave, onClose }) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [text, setText] = useState(initialText ?? '');
  const [language, setLanguage] = useState(extra?.lang ?? lang);
  const [topic, setTopic] = useState(extra?.topic ?? '');
  const [artist, setArtist] = useState(extra?.artist ?? '');
  const [fileId, setFileId] = useState(extra?.fileId ?? '');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const out = { title: title.trim(), text };
    if (extra) {
      out.lang = language;
      if (extra.kind === 'article') out.topic = topic.trim();
      if (extra.kind === 'lyrics') out.artist = artist.trim();
      if (fileId && fileId !== extra.fileId) out.fileId = fileId;
    }
    const err = onSave(out);
    if (err) setError(err);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet sheet-form" role="dialog" aria-label={heading} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="sheet-title">{heading}</h3>
        {extra && (
          <>
            <label className="field-label" htmlFor="te-lang">{t('form.lang', '学習する言語')}</label>
            <select id="te-lang" className="input" value={language} onChange={(e) => setLanguage(e.target.value)} data-testid="te-lang">
              {PASTE_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            {extra.kind === 'article' && (
              <>
                <label className="field-label" htmlFor="te-topic">{t('te.topic', '記事のトピック')}</label>
                <input id="te-topic" className="input" value={topic} maxLength={20} onChange={(e) => setTopic(e.target.value)} data-testid="te-topic" />
              </>
            )}
            {extra.kind === 'lyrics' && (
              <>
                <label className="field-label" htmlFor="te-artist">{t('te.artist', 'アーティスト')}</label>
                <input id="te-artist" className="input" value={artist} maxLength={60} onChange={(e) => setArtist(e.target.value)} data-testid="te-artist" />
              </>
            )}
            {extra.files?.length > 1 && (
              <>
                <label className="field-label" htmlFor="te-file">{t('te.file', 'ファイル（入れる場所）')}</label>
                <select id="te-file" className="input" value={fileId} onChange={(e) => setFileId(e.target.value)} data-testid="te-file">
                  {extra.files.map((f) => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
                </select>
              </>
            )}
          </>
        )}
        {showTitle && (
          <>
            <label className="field-label" htmlFor="title-input">{extra?.kind === 'lyrics' ? t('te.song', '曲名') : t('te.title', '題名')}</label>
            <input id="title-input" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} {...inputHints(language, { title: true })} />
          </>
        )}
        <label className="field-label" htmlFor="text-edit">{t('te.body', '本文')}</label>
        <textarea id="text-edit" className="textarea" rows={9} {...inputHints(language)} value={text} autoFocus={!showTitle}
          onChange={(e) => { setText(e.target.value); setError(''); }} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel', 'キャンセル')}</button>
          <button type="submit" className="btn primary" data-testid="text-save">{t('fedit.save', '変更する')}</button>
        </div>
      </form>
    </div>
  );
}

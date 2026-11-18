import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

const KINDS = [
  { code: 'article', label: '📰 記事', name: 'トピック' },
  { code: 'lyrics', label: '🎵 歌詞', name: 'アーティスト' },
  { code: 'exam', label: '📝 長文問題', name: 'ファイル名' },
  { code: 'other', label: 'その他', name: 'ファイル名' },
  { code: 'ai', label: '✨ AI物語', name: 'ファイル名' },
];

// ファイルの編集：ペーストのときの詳細設定（種類と、ファイル名／アーティスト／トピック）をすべて変更できる
export default function FileEditSheet({ file, error, onSave, onClose }) {
  const [name, setName] = useState(file.name);
  const [kind, setKind] = useState(file.kind);
  const nameLabel = KINDS.find((k) => k.code === kind)?.name ?? 'ファイル名';
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet sheet-form" role="dialog" aria-label={t('fedit.title', 'ファイルを編集')} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave({ name, kind }); }}>
        <h3 className="sheet-title">{t('fedit.title', 'ファイルを編集')}</h3>
        <label className="field-label" htmlFor="fe-kind">{t('fedit.kind', '種類')}</label>
        <select id="fe-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)} data-testid="fe-kind">
          {KINDS.map((k) => <option key={k.code} value={k.code}>{k.label}</option>)}
        </select>
        <label className="field-label" htmlFor="fe-name">{nameLabel}</label>
        <input id="fe-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-testid="fe-name" />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel', 'キャンセル')}</button>
          <button type="submit" className="btn primary" data-testid="fe-save">{t('fedit.save', '変更する')}</button>
        </div>
      </form>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import Chips from './Chips.jsx';
import { loadFiles, ensureFile, upsertMaterial } from '../lib/storage.js';
import { PASTE_LANGUAGES, langName, SAMPLE_PASTE } from '../lib/storyAI.js';
import { detectLanguage, inputHints } from '../lib/langDetect.js';

// ペーストした文章の仮タイトル（1行目の先頭24文字）
export function deriveTitle(text) {
  const first = text.split('\n').find((l) => l.trim()) ?? '';
  const t = first.trim();
  return t.length > 24 ? `${t.slice(0, 24)}…` : t || 'ペーストした文章';
}

const KINDS = [
  { code: 'book', label: '📖 本' },
  { code: 'article', label: '📰 記事' },
  { code: 'lyrics', label: '🎵 歌詞' },
  { code: 'exam', label: '📝 長文問題' },
  { code: 'other', label: 'その他' },
];
const DEFAULT_FILE = { exam: '長文問題', other: 'その他の文章' };
const TOPICS = ['政治', '芸能', '自己啓発', 'ビジネス', '専門・技術', 'その他'];
const NEW_ITEM = '__new__';

// 文章をペーストして登録するフォーム。
//  ・fixedKind があれば種類は固定（ライブラリの「＋」から来た場合）。なければ種類チップを表示（ホーム）
//  ・題名・本文から言語を自動判定し、「学習する言語」を連動して切り替える（手動で選んだ後は変えない）
//  ・選んだ言語を入力欄の lang 属性などに反映し、スマホのキーボード・変換を呼び出しやすくする
export default function PasteForm({ fixedKind, onStart, onOpenBookNew, onMaterialsChanged }) {
  const [kind, setKind] = useState(fixedKind ?? 'other');
  const [lang, setLang] = useState('en');
  const [langTouched, setLangTouched] = useState(false);
  const [autoLang, setAutoLang] = useState(null); // 自動で切り替えた言語（案内表示用）
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('政治');
  const [topicCustom, setTopicCustom] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [artistSel, setArtistSel] = useState('');
  const [artistNew, setArtistNew] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [fileSel, setFileSel] = useState('');
  const [fileNew, setFileNew] = useState('');
  const [error, setError] = useState('');

  const files = useMemo(() => loadFiles(), []);
  const artists = useMemo(() => files.filter((f) => f.kind === 'lyrics').map((f) => f.name), [files]);
  const usedTopics = useMemo(() => files.filter((f) => f.kind === 'article' && !TOPICS.includes(f.name)).map((f) => f.name), [files]);
  const kindFiles = useMemo(() => files.filter((f) => f.kind === kind).sort((a, b) => b.createdAt - a.createdAt), [files, kind]);
  const addingFile = kindFiles.length === 0 || fileSel === NEW_ITEM;
  const chosenFile = addingFile ? null : kindFiles.find((f) => f.id === fileSel) ?? kindFiles[0];
  const fileName = addingFile ? fileNew.trim() || DEFAULT_FILE[kind] || 'その他の文章' : chosenFile.name;
  const topicOptions = [...TOPICS.slice(0, -1), ...usedTopics, 'その他'];
  const addingArtist = artists.length === 0 || artistSel === NEW_ITEM || artistSel === '';
  const artistName = addingArtist ? artistNew.trim() : artistSel;

  // ---- 言語の自動判定 ----
  const detect = (value) => {
    if (langTouched) return;
    const code = detectLanguage(value);
    if (code && code !== lang && PASTE_LANGUAGES.some((l) => l.code === code)) {
      setLang(code);
      setAutoLang(code);
    }
  };
  const pickLang = (code) => {
    setLang(code);
    setLangTouched(true);
    setAutoLang(null);
  };
  const hints = inputHints(lang);
  const titleHints = inputHints(lang, { title: true });

  const pickKind = (k) => {
    setError('');
    setFileSel('');
    setFileNew('');
    if (k === 'book') {
      onOpenBookNew?.();
      return;
    }
    setKind(k);
  };

  const canStart = !!text.trim() && (kind !== 'lyrics' || !!artistName);

  const start = () => {
    const body = text.trim();
    if (!body) return;
    const go = (record, k) => {
      onMaterialsChanged?.();
      onStart({ title: record.title, text: body, lang, meta: null, source: 'paste', materialId: record.id, kind: k });
    };
    if (kind === 'article') {
      const t = articleTitle.trim() || deriveTitle(body);
      const tp = topic === 'その他' ? topicCustom.trim() || 'その他' : topic;
      const { file } = ensureFile('article', tp);
      const { record } = upsertMaterial({ title: t, text: body, lang, source: 'paste', kind: 'article', topic: tp, fileId: file.id });
      go(record, 'article');
      return;
    }
    if (kind === 'lyrics') {
      if (!artistName) { setError('アーティスト名を入力してください'); return; }
      const artist = artists.find((a) => a.toLowerCase() === artistName.toLowerCase()) ?? artistName;
      const t = songTitle.trim() || deriveTitle(body);
      const { file } = ensureFile('lyrics', artist);
      const { record } = upsertMaterial({ title: t, text: body, lang, source: 'paste', kind: 'lyrics', artist, fileId: file.id });
      go(record, 'lyrics');
      return;
    }
    const { file } = chosenFile ? { file: chosenFile } : ensureFile(kind, fileName);
    const { record } = upsertMaterial({ title: deriveTitle(body), text: body, lang, source: 'paste', kind, fileId: file.id });
    go(record, kind);
  };

  return (
    <section className="panel">
      {!fixedKind && (
        <>
          <label className="field-label">文章の種類</label>
          <Chips options={KINDS} value={kind} onChange={pickKind} />
        </>
      )}

      <label className="field-label">学習する言語</label>
      <Chips options={PASTE_LANGUAGES} value={lang} onChange={pickLang} />
      {autoLang && (
        <p className="auto-lang" role="status" data-testid="auto-lang">
          入力から「{langName(autoLang)}」を自動で選びました（変更できます）
        </p>
      )}

      {(kind === 'exam' || kind === 'other') && (
        <>
          <label className="field-label">ファイル（入れる場所）</label>
          {kindFiles.length > 0 && (
            <Chips
              options={[...kindFiles.map((f) => ({ code: f.id, label: `📁 ${f.name}` })), { code: NEW_ITEM, label: '＋ 新しいファイル' }]}
              value={fileSel || kindFiles[0].id}
              onChange={setFileSel}
            />
          )}
          {addingFile && (
            <input id="file-new" className="input" value={fileNew} maxLength={40} {...titleHints}
              onChange={(e) => setFileNew(e.target.value)} placeholder={`ファイル名（空欄なら「${DEFAULT_FILE[kind]}」）`} />
          )}
        </>
      )}

      {kind === 'article' && (
        <>
          <label className="field-label">記事のトピック</label>
          <Chips options={topicOptions.map((t) => ({ code: t, label: t }))} value={topic} onChange={setTopic} />
          {topic === 'その他' && (
            <input id="topic-custom" className="input" value={topicCustom} maxLength={20}
              onChange={(e) => setTopicCustom(e.target.value)} placeholder="トピックを入力（例：旅行）" />
          )}
          <label className="field-label" htmlFor="article-title">記事タイトル</label>
          <input id="article-title" className="input" value={articleTitle} maxLength={80} {...titleHints}
            onChange={(e) => { setArticleTitle(e.target.value); detect(e.target.value); }} placeholder="例：The future of remote work" />
        </>
      )}

      {kind === 'lyrics' && (
        <>
          <label className="field-label">アーティスト</label>
          {artists.length > 0 && (
            <Chips
              options={[...artists.map((a) => ({ code: a, label: a })), { code: NEW_ITEM, label: '＋ 新しいアーティスト' }]}
              value={artistSel}
              onChange={setArtistSel}
            />
          )}
          {addingArtist && (
            <input id="artist-input" className="input" value={artistNew} maxLength={60} {...titleHints}
              onChange={(e) => { setArtistNew(e.target.value); detect(e.target.value); }} placeholder="アーティスト名（フォルダー名になります）" />
          )}
          <label className="field-label" htmlFor="song-title">曲名</label>
          <input id="song-title" className="input" value={songTitle} maxLength={80} {...titleHints}
            onChange={(e) => { setSongTitle(e.target.value); detect(e.target.value); }} placeholder="例：Yesterday" />
        </>
      )}

      <label className="field-label" htmlFor="paste">
        {kind === 'lyrics' ? '歌詞' : kind === 'article' ? '記事の本文' : kind === 'exam' ? '長文' : '文章'}
      </label>
      <textarea
        id="paste"
        className="textarea"
        rows={9}
        {...hints}
        placeholder="ここに学びたい文章を貼り付けてください"
        value={text}
        onChange={(e) => { setText(e.target.value); detect(e.target.value); }}
      />
      <div className="row">
        <button className="btn link" type="button" onClick={() => { setLang('en'); setLangTouched(true); setAutoLang(null); setText(SAMPLE_PASTE.en); }}>
          サンプルを入れる
        </button>
      </div>
      <button className="btn primary block" disabled={!canStart} onClick={start}>
        この文章で学習をはじめる
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

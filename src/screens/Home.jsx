import BackupPanel from '../components/BackupPanel.jsx';
import React, { useMemo, useState } from 'react';
import { loadWordbook, ensureFile, upsertMaterial } from '../lib/storage.js';
import Chips from '../components/Chips.jsx';
import PasteForm from '../components/PasteForm.jsx';
import { isDue } from '../lib/srs.js';
import StudyBanner from '../components/StudyBanner.jsx';
import { useNow } from '../lib/useNow.js';
import {
  LANGUAGES,
  LEVELS,
  GENRES,
  generateStory,
} from '../lib/storyAI.js';

export default function Home({
  wordCount,
  shelfCount,
  onStart,
  onOpenWordbook,
  onOpenReview,
  onDataRestored,
  onOpenLibrary,
  onOpenBookNew,
  onMaterialsChanged,
  onShowTutorial,
  onOpenNotify,
}) {
  const now = useNow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dueCount = useMemo(() => loadWordbook().filter((w) => isDue(w, now)).length, [now, wordCount]);
  const [mode, setMode] = useState('paste'); // 'paste' | 'ai'

  // ai
  const [lang, setLang] = useState('en');
  const [level, setLevel] = useState('beginner');
  const [genre, setGenre] = useState('daily');
  const [loading, setLoading] = useState(false);

  const startAI = async () => {
    setLoading(true);
    try {
      const s = await generateStory({ lang, level, genre });
      const { file } = ensureFile('ai', 'AI物語');
      const { record } = upsertMaterial({ title: s.title, text: s.text, lang: s.lang, source: 'ai', level: s.level, genre: s.genre, kind: 'other', fileId: file.id });
      onMaterialsChanged?.();
      onStart({
        materialId: record.id,
        title: s.title,
        text: s.text,
        lang: s.lang,
        meta: s,
        source: 'ai',
        level: s.level,
        genre: s.genre,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen home">
      <header className="topbar">
        <h1 className="logo">Lingo Reader</h1>
        <div className="topbar-actions">
          <button className="btn ghost bell" onClick={onOpenNotify} data-testid="open-notify" aria-label="通知設定">
            🔔{dueCount > 0 && <span className="bell-dot" aria-hidden="true" />}
          </button>
          <button className="btn ghost" onClick={onOpenLibrary} data-testid="open-library">
            ライブラリ <span className="badge">{shelfCount}</span>
          </button>
          <button className="btn ghost" onClick={onOpenWordbook}>
            単語帳 <span className="badge">{wordCount}</span>
          </button>
        </div>
      </header>

      <main className="content">
        <p className="lead">好きな文章が、そのまま教科書になる。</p>

        <StudyBanner now={now} dueCount={dueCount} wordCount={wordCount} onOpenReview={onOpenReview} onOpenNotify={onOpenNotify} />

        <button
          className={'review-cta' + (dueCount > 0 ? ' has-due' : '')}
          onClick={onOpenReview}
          data-testid="home-review"
        >
          <span className="review-cta-ico">📝</span>
          <span className="review-cta-text">
            <b>今日の復習</b>
            <small>
              {wordCount === 0
                ? '保存した単語が、忘却曲線に沿って復習できます'
                : dueCount > 0
                  ? `${dueCount}枚の復習カードがあります`
                  : '今の復習対象はありません'}
            </small>
          </span>
          {dueCount > 0 && <span className="review-cta-badge">{dueCount}</span>}
        </button>

        <div className="mode-cards">
          <button
            className={'mode-card' + (mode === 'paste' ? ' on' : '')}
            onClick={() => setMode('paste')}
          >
            <span className="mode-ico">📋</span>
            <span className="mode-title">文章をペーストして学ぶ</span>
            <span className="mode-sub">読みたい記事・歌詞・小説の一節など</span>
          </button>
          <button
            className={'mode-card' + (mode === 'ai' ? ' on' : '')}
            onClick={() => setMode('ai')}
          >
            <span className="mode-ico">✨</span>
            <span className="mode-title">AIに物語を作ってもらう</span>
            <span className="mode-sub">言語・レベル・ジャンルを選ぶだけ</span>
          </button>
        </div>

        {mode === 'paste' && (
          <PasteForm onStart={onStart} onOpenBookNew={onOpenBookNew} onMaterialsChanged={onMaterialsChanged} />
        )}

        {mode === 'ai' && (
          <section className="panel">
            <label className="field-label">言語</label>
            <Chips options={LANGUAGES} value={lang} onChange={setLang} />
            <label className="field-label">レベル</label>
            <Chips options={LEVELS} value={level} onChange={setLevel} />
            <label className="field-label">ジャンル</label>
            <Chips options={GENRES} value={genre} onChange={setGenre} />
            <button className="btn primary block" disabled={loading} onClick={startAI}>
              {loading ? '物語を生成中…' : '物語を生成する'}
            </button>
            <p className="hint">※ いまはモックAIです（用意済みの短編を返します）。</p>
          </section>
        )}
        <button className="btn link tutorial-link" onClick={onShowTutorial} data-testid="show-tutorial-home">使い方を見る</button>
        <BackupPanel onRestored={onDataRestored} />
      </main>
    </div>
  );
}

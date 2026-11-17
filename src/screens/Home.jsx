import BackupPanel from '../components/BackupPanel.jsx';
import React, { useMemo, useState } from 'react';
import { loadWordbook, ensureFile, upsertMaterial } from '../lib/storage.js';
import { t } from '../lib/i18n.js';
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
  generateStoryFromWords,
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
  onOpenSettings,
  onOpenNotes,
  onOpenMedals,
  onOpenStamps,
  onFinishStudy,
}) {
  const now = useNow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dueCount = useMemo(() => loadWordbook().filter((w) => isDue(w, now)).length, [now, wordCount]);
  const [mode, setMode] = useState('paste'); // 'paste' | 'ai'

  // ai
  const [lang, setLang] = useState('en');
  const [level, setLevel] = useState('beginner');
  const [genre, setGenre] = useState('daily');
  const [aiSource, setAiSource] = useState('prepared'); // 'prepared'（おまかせ）| 'words'（単語帳の単語から）
  const [wordCount2, setWordCount2] = useState(5); // 使う単語の数
  const [loading, setLoading] = useState(false);

  // 単語帳から、選んだ言語の単語を何個かランダムにピックアップする（全部は使わない）
  const wordsOfLang = useMemo(() => loadWordbook().filter((w) => w.lang === lang), [lang, wordCount]);
  const pickWords = (n) => {
    const a = [...wordsOfLang];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  };
  const noWords = aiSource === 'words' && wordsOfLang.length === 0;

  const startAI = async () => {
    setLoading(true);
    try {
      const s = aiSource === 'words'
        ? await generateStoryFromWords({ lang, level, words: pickWords(wordCount2) })
        : await generateStory({ lang, level, genre });
      const { file } = ensureFile('ai', t('home.ai.file', 'AI物語'));
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
          <button className="btn ghost bell" onClick={onOpenNotify} data-testid="open-notify" aria-label={t('home.notify', '通知設定')}>
            🔔{dueCount > 0 && <span className="bell-dot" aria-hidden="true" />}
          </button>
          <button className="btn ghost bell" onClick={onOpenSettings} data-testid="open-settings" aria-label={t('home.settings', '設定')}>
            ⚙️
          </button>
          <button className="btn ghost" onClick={onOpenLibrary} data-testid="open-library">
            {t('home.library', 'ライブラリ')} <span className="badge">{shelfCount}</span>
          </button>
          <button className="btn ghost" onClick={onOpenWordbook}>
            {t('home.wordbook', '単語帳')} <span className="badge">{wordCount}</span>
          </button>
        </div>
      </header>

      <main className="content">
        <p className="lead">{t('home.lead', '好きな文章が、そのまま教科書になる。')}</p>

        <StudyBanner now={now} dueCount={dueCount} wordCount={wordCount} onOpenReview={onOpenReview} onOpenNotify={onOpenNotify} />

        <button
          className={'review-cta' + (dueCount > 0 ? ' has-due' : '')}
          onClick={onOpenReview}
          data-testid="home-review"
        >
          <span className="review-cta-ico">📝</span>
          <span className="review-cta-text">
            <b>{t('home.review', '今日の復習')}</b>
            <small>
              {wordCount === 0
                ? t('home.review.empty', '保存した単語が、忘却曲線に沿って復習できます')
                : dueCount > 0
                  ? t('home.review.due', '{n}枚の復習カードがあります', { n: dueCount })
                  : t('home.review.none', '今の復習対象はありません')}
            </small>
          </span>
          {dueCount > 0 && <span className="review-cta-badge">{dueCount}</span>}
        </button>

        <div className="home-actions">
          <button className="btn" onClick={onOpenNotes} data-testid="open-notes">{t('home.notes', '📓 達成ノート')}</button>
          <button className="btn" onClick={onOpenMedals} data-testid="open-medals">{t('home.medals', '🏅 メダル')}</button>
          <button className="btn" onClick={onOpenStamps} data-testid="open-stamps">{t('home.stamps', '🎴 スタンプ')}</button>
          <button className="btn primary" onClick={onFinishStudy} data-testid="finish-study">{t('home.finish', '🌙 学習を終える')}</button>
        </div>

        <div className="mode-cards">
          <button
            className={'mode-card' + (mode === 'paste' ? ' on' : '')}
            onClick={() => setMode('paste')}
          >
            <span className="mode-ico">📋</span>
            <span className="mode-title">{t('home.paste', '文章をペーストして学ぶ')}</span>
            <span className="mode-sub">{t('home.paste.sub', '読みたい記事・歌詞・小説の一節など')}</span>
          </button>
          <button
            className={'mode-card' + (mode === 'ai' ? ' on' : '')}
            onClick={() => setMode('ai')}
          >
            <span className="mode-ico">✨</span>
            <span className="mode-title">{t('home.ai', 'AIに物語を作ってもらい学習する')}</span>
            <span className="mode-sub">{t('home.ai.sub', '言語・題材・レベルを選ぶだけ')}</span>
          </button>
        </div>

        {mode === 'paste' && (
          <PasteForm onStart={onStart} onOpenBookNew={onOpenBookNew} onMaterialsChanged={onMaterialsChanged} />
        )}

        {mode === 'ai' && (
          <section className="panel">
            <label className="field-label" htmlFor="ai-lang">{t('form.lang', '学習する言語')}</label>
            <select id="ai-lang" className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <label className="field-label" htmlFor="ai-source">{t('home.ai.source', '題材')}</label>
            <select id="ai-source" className="input" value={aiSource} onChange={(e) => setAiSource(e.target.value)} data-testid="ai-source">
              <option value="prepared">{t('home.ai.prepared', 'おまかせ（レベルとジャンルで選ぶ）')}</option>
              <option value="words">{t('home.ai.words', '単語帳の単語から作る')}</option>
            </select>
            {aiSource === 'words' && (
              <>
                <label className="field-label" htmlFor="ai-count">{t('home.ai.count', '使う単語の数（ランダムに選びます）')}</label>
                <select id="ai-count" className="input" value={wordCount2} onChange={(e) => setWordCount2(Number(e.target.value))} data-testid="ai-count">
                  {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{t('home.ai.n', '{n}個', { n })}</option>)}
                </select>
                <p className="hint" data-testid="ai-words-hint">
                  {noWords
                    ? t('home.ai.nowords', 'この言語の単語が単語帳にありません。先に単語を保存してください。')
                    : t('home.ai.havewords', '単語帳のこの言語の単語 {n}個から、ランダムに選びます。', { n: wordsOfLang.length })}
                </p>
              </>
            )}
            <label className="field-label" htmlFor="ai-level">{t('home.ai.level', 'レベル')}</label>
            <select id="ai-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => <option key={l.code} value={l.code}>{t(`level.${l.code}`, l.label)}</option>)}
            </select>
            {aiSource === 'prepared' && (
              <>
                <label className="field-label" htmlFor="ai-genre">{t('home.ai.genre', 'ジャンル')}</label>
                <select id="ai-genre" className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
                  {GENRES.map((g) => <option key={g.code} value={g.code}>{t(`genre.${g.code}`, g.label)}</option>)}
                </select>
              </>
            )}
            <button className="btn primary block" disabled={loading || noWords} onClick={startAI} data-testid="ai-generate">
              {loading ? t('home.ai.loading', '物語を生成中…') : t('home.ai.go', '物語を生成する')}
            </button>
            <p className="hint">{t('home.ai.mock', '※ いまはモックAIです（用意済みの短編や、テンプレートの文を返します）。')}</p>
          </section>
        )}
        <button className="btn link tutorial-link" onClick={onShowTutorial} data-testid="show-tutorial-home">{t('home.tutorial', '使い方を見る')}</button>
        <BackupPanel onRestored={onDataRestored} />
      </main>
    </div>
  );
}

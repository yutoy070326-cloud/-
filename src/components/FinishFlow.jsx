import React, { useEffect, useMemo, useState } from 'react';
import Hanamaru from './Hanamaru.jsx';
import { FarewellScene } from './StartGate.jsx';
import { medalName, medalDesc } from '../lib/diary.js';
import { t, uiLocale } from '../lib/i18n.js';

const LINE_STEP = 1900; // 1行ごとの間隔（ms）：筆で花丸を描く時間ぶん
const LINE_START = 1300; // ノートが止まってから最初の行が出るまで（ms）

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 48 }, (_, i) => ({
      i,
      left: Math.random() * 100,
      delay: Math.random() * 1200,
      dur: 2200 + Math.random() * 1800,
      color: ['#ff5a5f', '#ffd21f', '#3b5bdb', '#2fb36d', '#c06cf0', '#ff9f43'][i % 6],
      rot: Math.random() * 360,
    })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}ms`, animationDuration: `${p.dur}ms`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

// メダル。medal.look = 色・飾りの派手さ（bronze / silver / gold / rainbow、deco で飾り）
export function Medal({ medal, big = false, locked = false }) {
  const look = (medal.look || 'gold').split(' ');
  return (
    <div className={'medal' + (big ? ' big' : '') + (locked ? ' is-locked' : '')} data-testid="medal">
      <div className="medal-ribbon" aria-hidden="true" />
      <div className={'medal-disc ' + look.join(' ')}>
        {look.includes('deco') && !locked && <span className="medal-sparkle" aria-hidden="true">✦</span>}
        <span className="medal-emoji">{locked ? '？' : medal.emoji}</span>
      </div>
      <div className="medal-title">{locked ? '？？？' : medalName(medal)}</div>
    </div>
  );
}

// ③ 終了時の演出：達成ノート（ズームイン＋筆で花丸）→ 自分で書く欄・一言日記 → メダル獲得 → お見送り
// lines: [{text}] / medals: 今回新しく獲得したメダル / farewellChar: お見送りのキャラクター
// onSaveExtras({ ownLines, diary }): 自分で書いた内容を保存
export default function FinishFlow({ lines, medals, farewellChar, onSaveExtras, onDone }) {
  const [stage, setStage] = useState('notebook'); // 'notebook' | 'medal' | 'bye'
  const [ready, setReady] = useState(false);
  const [own, setOwn] = useState([]); // 自分で書いた「達成したこと」
  const [draft, setDraft] = useState('');
  const [diary, setDiary] = useState('');
  const total = LINE_START + lines.length * LINE_STEP + 300;
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), total);
    return () => window.clearTimeout(t);
  }, [total]);

  if (stage === 'bye') return <FarewellScene char={farewellChar} onDone={onDone} />;

  const addOwn = () => {
    const t = draft.trim();
    if (!t) return;
    setOwn((o) => [...o, t]);
    setDraft('');
  };
  const next = () => {
    const pending = draft.trim();
    const ownLines = pending ? [...own, pending] : own; // 入力したまま「次へ」を押しても、書いた内容は残す
    onSaveExtras?.({ ownLines, diary });
    setStage(medals.length > 0 ? 'medal' : 'bye');
  };

  if (stage === 'medal') {
    return (
      <div className="finish medal-stage" data-testid="medal-stage">
        <Confetti />
        <div className="medal-card">
          <h2>{t('finish.medal.title', '🎉 記念メダルを獲得！')}</h2>
          <div className="medal-row">{medals.map((m) => <Medal key={m.id} medal={m} big />)}</div>
          {medals.map((m) => <p key={m.id} className="medal-desc">{medalDesc(m)}</p>)}
          <button className="btn primary block" onClick={() => setStage('bye')} data-testid="medal-next">{t('common.continue', 'つづける')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="finish" data-testid="finish">
      <div className="notebook" data-testid="notebook">
        <div className="notebook-rings" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div>
        <div className="notebook-paper">
          <h2 className="notebook-title">{t('finish.notebook', 'きょうの達成ノート')}</h2>
          <div className="notebook-date">{new Date().toLocaleDateString(uiLocale(), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
          {lines.length === 0 && <p className="note-none" data-testid="note-none">{t('finish.nonew', 'きょうの達成は、すでにノートに書いてあります。ほかに達成したことを書いてみよう！')}</p>}
          <ul className="notebook-lines">
            {lines.map((l, i) => (
              <li key={i} className="note-line" style={{ '--d': `${LINE_START + i * LINE_STEP}ms` }} data-testid="note-line">
                <span className="note-text">・{l.text}</span>
                <Hanamaru animate delay={LINE_START + i * LINE_STEP + 450} />
              </li>
            ))}
            {own.map((t, i) => (
              <li key={`own-${i}`} className="note-line own-line shown" data-testid="own-line">
                <span className="note-text">・{t}</span>
                <Hanamaru animate delay={150} />
              </li>
            ))}
          </ul>

          {ready && (
            <div className="own-box" data-testid="own-box">
              <label className="own-label" htmlFor="own-input">{t('finish.own', '✏️ 自分で書く「達成したこと」')}</label>
              <div className="own-row">
                <input id="own-input" className="input" value={draft} maxLength={60} placeholder={t('finish.own.ph', '例：映画を字幕なしで10分見た')}
                  onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOwn()} data-testid="own-input" />
                <button type="button" className="btn primary" onClick={addOwn} data-testid="own-add">{t('common.register', '登録')}</button>
              </div>
              <label className="own-label" htmlFor="diary-input">{t('finish.diary', '📔 一言日記')}</label>
              <input id="diary-input" className="input" value={diary} maxLength={80} placeholder={t('finish.diary.ph', '今日の一言')}
                onChange={(e) => setDiary(e.target.value)} data-testid="diary-input" />
            </div>
          )}
        </div>
        <button className={'btn primary notebook-next' + (ready ? ' show' : '')} disabled={!ready} onClick={next} data-testid="notebook-next">
          {medals.length > 0 ? t('finish.seemedal', 'メダルを見る') : t('common.next', 'つぎへ')}
        </button>
      </div>
    </div>
  );
}

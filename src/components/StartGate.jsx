import React, { useEffect, useMemo, useRef, useState } from 'react';
import Character from './Characters.jsx';
import { pickGreeting, timeOfDay } from '../lib/greetings.js';
import { speak, speechSupported } from '../lib/speech.js';
import { loadSettings } from '../lib/settings.js';
import { langName } from '../lib/storyAI.js';
import { t } from '../lib/i18n.js';

// ① スタート画面：「学習を開始する」のトグルをONにすると、開始時演出が始まる
export function StartGate({ onStart }) {
  const [on, setOn] = useState(false);
  const flip = () => {
    if (on) return;
    setOn(true);
    window.setTimeout(onStart, 320); // ノブが動いてから演出へ
  };
  return (
    <div className="gate" data-testid="gate">
      <div className="gate-logo">Lingo Reader</div>
      <p className="gate-lead">{t('home.lead', '好きな文章が、そのまま教科書になる。')}</p>
      <button type="button" role="switch" aria-checked={on} className={'gate-switch' + (on ? ' on' : '')} onClick={flip} data-testid="gate-switch" aria-label={t('gate.start', '学習を開始する')}>
        <span className="gate-knob" />
      </button>
      <div className="gate-label">{t('gate.start', '学習を開始する')}</div>
    </div>
  );
}

// 画面の声あいさつ：ミュート設定のとき、または端末が音声合成に対応していないときは、テキストだけ
function useSpoken(g) {
  useEffect(() => {
    if (loadSettings().muteGreeting || !speechSupported()) return undefined;
    speak(g.text, g.lang);
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } };
  }, [g]);
}

function Bubble({ g }) {
  return (
    <div className="bubble" data-testid="greeting">
      <div className="bubble-text" lang={g.lang} dir={g.lang === 'ar' ? 'rtl' : undefined}>{g.text}</div>
      {g.pron && <div className="bubble-pron">{g.pron.text}</div>}
      {g.gloss && <div className="bubble-gloss">{g.gloss}</div>}
      <div className="bubble-lang" data-testid="greeting-lang">{t('greet.lang', '{lang}のあいさつ', { lang: langName(g.lang) })}</div>
    </div>
  );
}

// ② 開始時の演出：画面中央の小さな円から広がる（アイリスイン）。手を振るキャラクターと、時間帯のあいさつ
export function IntroScene({ char, onDone }) {
  const g = useMemo(() => pickGreeting(timeOfDay()), []);
  useSpoken(g);
  const done = useRef(false);
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };
  useEffect(() => {
    const t = window.setTimeout(finish, 4600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scene-wrap">
      <div className="scene iris-in" onClick={finish} data-testid="intro" data-char={char}>
        <Character kind={char} />
        <Bubble g={g} />
        <button type="button" className="scene-skip" onClick={(e) => { e.stopPropagation(); finish(); }} data-testid="intro-skip">{t('common.skip', 'スキップ')}</button>
      </div>
    </div>
  );
}

// ③-② お見送り：反対のキャラクターが手を振り、最後に画面が小さな円になって閉じる（アイリスアウト）
export function FarewellScene({ char, onDone }) {
  const g = useMemo(() => pickGreeting('bye'), []);
  const [closing, setClosing] = useState(false);
  useSpoken(g);
  useEffect(() => {
    const t = window.setTimeout(() => setClosing(true), 3800);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="scene-wrap">
      <div
        className={'scene ' + (closing ? 'iris-out' : 'iris-in')}
        onClick={() => setClosing(true)}
        onAnimationEnd={(e) => { if (closing && e.animationName === 'iris-out') onDone(); }}
        data-testid="farewell"
        data-char={char}
      >
        <Character kind={char} />
        <Bubble g={g} />
        <button type="button" className="scene-skip" onClick={(e) => { e.stopPropagation(); setClosing(true); }} data-testid="farewell-skip">{t('common.skip', 'スキップ')}</button>
      </div>
    </div>
  );
}

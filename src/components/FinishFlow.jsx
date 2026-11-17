import React, { useEffect, useMemo, useState } from 'react';
import Hanamaru from './Hanamaru.jsx';
import { FarewellScene } from './StartGate.jsx';

const LINE_STEP = 1000; // 1行ごとの間隔（ms）
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

export function Medal({ medal, big = false }) {
  return (
    <div className={'medal' + (big ? ' big' : '')} data-testid="medal">
      <div className="medal-ribbon" aria-hidden="true" />
      <div className="medal-disc"><span>{medal.emoji}</span></div>
      <div className="medal-title">{medal.title}</div>
    </div>
  );
}

// ③ 終了時の演出：達成ノート（ズームイン＋花丸）→ メダル獲得 → お見送り
// lines: [{text}] / medals: 今回新しく獲得したメダル / farewellChar: お見送りのキャラクター
export default function FinishFlow({ lines, medals, farewellChar, onDone }) {
  const [stage, setStage] = useState('notebook'); // 'notebook' | 'medal' | 'bye'
  const [ready, setReady] = useState(false);
  const total = LINE_START + lines.length * LINE_STEP + 400;
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), total);
    return () => window.clearTimeout(t);
  }, [total]);

  if (stage === 'bye') return <FarewellScene char={farewellChar} onDone={onDone} />;

  const next = () => setStage(stage === 'notebook' && medals.length > 0 ? 'medal' : 'bye');

  if (stage === 'medal') {
    return (
      <div className="finish medal-stage" data-testid="medal-stage">
        <Confetti />
        <div className="medal-card">
          <h2>🎉 記念メダルを獲得！</h2>
          <div className="medal-row">{medals.map((m) => <Medal key={m.id} medal={m} big />)}</div>
          {medals.map((m) => <p key={m.id} className="medal-desc">{m.desc}</p>)}
          <button className="btn primary block" onClick={() => setStage('bye')} data-testid="medal-next">つづける</button>
        </div>
      </div>
    );
  }

  return (
    <div className="finish" data-testid="finish">
      <div className="notebook" data-testid="notebook">
        <div className="notebook-rings" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div>
        <div className="notebook-paper">
          <h2 className="notebook-title">きょうの達成ノート</h2>
          <div className="notebook-date">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
          <ul className="notebook-lines">
            {lines.map((l, i) => (
              <li key={i} className="note-line" style={{ '--d': `${LINE_START + i * LINE_STEP}ms` }} data-testid="note-line">
                <span className="note-text">・{l.text}</span>
                <Hanamaru animate delay={LINE_START + i * LINE_STEP + 500} />
              </li>
            ))}
          </ul>
        </div>
        <button className={'btn primary notebook-next' + (ready ? ' show' : '')} disabled={!ready} onClick={next} data-testid="notebook-next">
          {medals.length > 0 ? 'メダルを見る' : 'つぎへ'}
        </button>
      </div>
    </div>
  );
}

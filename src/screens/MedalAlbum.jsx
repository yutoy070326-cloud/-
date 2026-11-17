import React, { useEffect, useMemo } from 'react';
import { Medal } from '../components/FinishFlow.jsx';
import { loadMedals, markMedalsSeen, MEDAL_TIERS } from '../lib/diary.js';

// メダルアルバム：獲得したメダルが並ぶ。まだのメダルは「？？？」で、手に入れ方もわからない。
// 獲得して初めてアルバムを開いたときは、そのメダルに赤文字の「NEW」が付く。
export default function MedalAlbum({ onBack }) {
  const medals = useMemo(loadMedals, []);
  const fresh = useMemo(() => new Set(medals.filter((m) => m.seen === false).map((m) => m.id)), [medals]);
  useEffect(() => { markMedalsSeen(); }, []); // この画面を見たので、次からは NEW を外す
  const owned = new Set(medals.map((m) => m.id));
  const locked = MEDAL_TIERS.filter((t) => !owned.has(t.id));
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>← 戻る</button>
        <h2 className="title">🏅 メダルアルバム</h2>
        <span className="topbar-spacer" />
      </header>
      <main className="content" data-testid="medal-album">
        <p className="hint">獲得したメダル {medals.length}個</p>
        <div className="medal-grid">
          {medals.map((m) => (
            <div key={m.id} className="medal-cell" data-testid="medal-cell">
              {fresh.has(m.id) && <span className="new-badge" data-testid="new-badge">NEW</span>}
              <Medal medal={m} />
              <div className="medal-cell-desc">{m.desc}</div>
              <div className="medal-cell-date">{new Date(m.at).toLocaleDateString('ja-JP')}</div>
            </div>
          ))}
          {locked.map((t) => (
            <div key={t.id} className="medal-cell locked" data-testid="medal-locked">
              <Medal medal={t} locked />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

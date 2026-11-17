import React, { useMemo } from 'react';
import { Medal } from '../components/FinishFlow.jsx';
import { loadMedals, MEDAL_TIERS } from '../lib/diary.js';

// メダルアルバム：獲得した記念メダルが並ぶ。まだのメダルは、うすく表示（何をすると手に入るかも書いてある）
export default function MedalAlbum({ onBack }) {
  const medals = useMemo(loadMedals, []);
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
              <Medal medal={m} />
              <div className="medal-cell-desc">{m.desc}</div>
              <div className="medal-cell-date">{new Date(m.at).toLocaleDateString('ja-JP')}</div>
            </div>
          ))}
          {locked.map((t) => (
            <div key={t.id} className="medal-cell locked" data-testid="medal-locked">
              <Medal medal={{ ...t, emoji: '？' }} />
              <div className="medal-cell-desc">{t.desc}</div>
            </div>
          ))}
        </div>
        <p className="hint">本を最後まで読むと、その本の「読了メダル」も増えていきます。</p>
      </main>
    </div>
  );
}

import React, { useMemo } from 'react';
import StampCard from '../components/StampCard.jsx';
import ToyBlock from '../components/ToyBlock.jsx';
import { loadShelf } from '../lib/shelf.js';

export default function StampScreen({ onBack }) {
  const shelf = useMemo(loadShelf, []);
  const done = Math.floor(shelf.stamps.length / 10);
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost" onClick={onBack}>← 戻る</button>
        <h2 className="title">🎴 スタンプカード</h2>
        <span className="topbar-spacer" />
      </header>
      <main className="content" data-testid="stamp-screen">
        <p className="hint">はじめてログインした日と、毎週月曜日にログインした日に、スタンプが1つ押されて、積み木がもらえます。</p>
        <StampCard stamps={shelf.stamps} />
        <p className="hint">集めたスタンプ {shelf.stamps.length}個{done > 0 ? `（カード${done}枚コンプリート！）` : ''}</p>
        <h3 className="section-title">もらった積み木 {shelf.blocks.length}個</h3>
        <div className="block-grid">
          {shelf.blocks.length === 0 && <p className="empty">まだ積み木がありません。</p>}
          {shelf.blocks.map((b) => <ToyBlock key={b.id} shape={b.shape} color={b.color} size={52} />)}
        </div>
      </main>
    </div>
  );
}

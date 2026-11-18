import React, { useMemo } from 'react';
import { t } from '../lib/i18n.js';
import StampCard from '../components/StampCard.jsx';
import ToyBlock from '../components/ToyBlock.jsx';
import { loadShelf } from '../lib/shelf.js';
import { useScreenTutorial, HelpButton } from '../components/ScreenTutorial.jsx';
import { useBackHandler } from '../lib/backRegistry.js';

export default function StampScreen({ onBack }) {
  const tut = useScreenTutorial('stamps');
  useBackHandler(onBack);
  const shelf = useMemo(loadShelf, []);
  const done = Math.floor(shelf.stamps.length / 10);
  return (
    <div className="screen">
      <header className="topbar">
        <button className="btn ghost back-btn" onClick={onBack}>{t('common.back', '← 戻る')}</button>
        <h2 className="title">{t('stamp.title', '🎴 スタンプカード')}</h2>
        <HelpButton onClick={tut.show} />
      </header>
      <main className="content" data-testid="stamp-screen">
        <StampCard stamps={shelf.stamps} />
        <p className="hint">{t('stamp.count', '集めたスタンプ {n}個', { n: shelf.stamps.length })}{done > 0 ? t('stamp.complete', '（カード{n}枚コンプリート！）', { n: done }) : ''}</p>
        <h3 className="section-title">{t('stamp.blocks', 'もらった積み木 {n}個', { n: shelf.blocks.length })}</h3>
        <div className="block-grid">
          {shelf.blocks.length === 0 && <p className="empty">{t('stamp.noblocks', 'まだ積み木がありません。')}</p>}
          {shelf.blocks.map((b) => <ToyBlock key={b.id} shape={b.shape} color={b.color} size={52} />)}
        </div>
      </main>
      {tut.node}
    </div>
  );
}

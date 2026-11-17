import React from 'react';
import StampCard from './StampCard.jsx';
import ToyBlock from './ToyBlock.jsx';
import { BLOCK_SHAPES, loadShelf } from '../lib/shelf.js';
import { t } from '../lib/i18n.js';

// ログインスタンプ：スタンプが押される。積み木がもらえる日は、積み木も出る
export default function LoginBonus({ bonus, onClose }) {
  const stamps = loadShelf().stamps;
  const shape = bonus.block ? BLOCK_SHAPES.find((s) => s.id === bonus.block.shape)?.label ?? '' : '';
  return (
    <div className="sheet-backdrop bonus-backdrop" data-testid="login-bonus">
      <div className="bonus-card">
        <h2>{bonus.stamp.first ? t('bonus.first', '🎁 はじめてのログイン！') : t('bonus.today', '🎴 きょうのログインスタンプ！')}</h2>
        <StampCard stamps={stamps} animateIndex={bonus.index} />
        {bonus.block && (
          <div className="bonus-block">
            <div className="bonus-block-pop"><ToyBlock shape={bonus.block.shape} color={bonus.block.color} size={84} /></div>
            <p>{t('bonus.block', '積み木（{shape}）をゲット！', { shape })}<br /><small>{t('bonus.block.sub', 'ライブラリの山の間に置けるよ')}</small></p>
          </div>
        )}
        <button className="btn primary block" onClick={onClose} data-testid="bonus-close">{t('bonus.ok', 'やったー！')}</button>
      </div>
    </div>
  );
}

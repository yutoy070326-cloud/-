import React from 'react';
import StampCard from './StampCard.jsx';
import ToyBlock from './ToyBlock.jsx';
import { BLOCK_SHAPES, loadShelf } from '../lib/shelf.js';

// ログインボーナス：スタンプが押されて、積み木をもらう
export default function LoginBonus({ bonus, onClose }) {
  const stamps = loadShelf().stamps;
  const shape = BLOCK_SHAPES.find((s) => s.id === bonus.block.shape)?.label ?? '';
  return (
    <div className="sheet-backdrop bonus-backdrop" data-testid="login-bonus">
      <div className="bonus-card">
        <h2>{bonus.stamp.first ? '🎁 はじめてのログインボーナス！' : '🎁 月曜日のログインボーナス！'}</h2>
        <StampCard stamps={stamps} animateIndex={bonus.index} />
        <div className="bonus-block">
          <div className="bonus-block-pop"><ToyBlock shape={bonus.block.shape} color={bonus.block.color} size={84} /></div>
          <p>積み木（{shape}）をゲット！<br /><small>ライブラリの山の間に置けるよ</small></p>
        </div>
        <button className="btn primary block" onClick={onClose} data-testid="bonus-close">やったー！</button>
      </div>
    </div>
  );
}

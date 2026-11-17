import React from 'react';
import { STAMP_SLOTS } from '../lib/shelf.js';

// ログインボーナスのスタンプカード。stamps をマスに順に押していく（10個で1枚）。
// animateIndex のマスだけ、スタンプがポンと押されるアニメーションにする
export default function StampCard({ stamps, animateIndex = -1 }) {
  const cardNo = Math.floor(Math.max(0, stamps.length - 1) / STAMP_SLOTS); // 10個たまったら次のカード
  const start = cardNo * STAMP_SLOTS;
  const slots = Array.from({ length: STAMP_SLOTS }, (_, i) => ({ i, stamp: stamps[start + i], global: start + i }));
  return (
    <div className="stamp-card" data-testid="stamp-card">
      <div className="stamp-card-head">スタンプカード <span>{cardNo + 1}枚目</span></div>
      <div className="stamp-grid">
        {slots.map(({ i, stamp, global }) => (
          <div key={i} className={'stamp-slot' + (stamp ? ' filled' : '')} data-testid="stamp-slot">
            <span className="stamp-no">{i + 1}</span>
            {stamp && (
              <span className={'hanko' + (global === animateIndex ? ' press' : '')} data-testid="hanko">
                <b>{stamp.first ? '初' : '月'}</b>
                <small>{stamp.day.slice(5).replace('-', '/')}</small>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { stepInfo, MAX_STEP } from '../lib/srs.js';

// 習得ステップのカラーバッジ（ステップ1〜5 / 習得済み）。n = 次に受ける復習のステップ
export default function StepBadge({ w }) {
  const { mastered, n } = stepInfo(w);
  return mastered ? (
    <span className="step-badge mastered" data-step="mastered">習得済み ✓</span>
  ) : (
    <span className={`step-badge s${n}`} data-step={n} title={`ステップ${n}/${MAX_STEP}`}>
      ステップ{n}
    </span>
  );
}

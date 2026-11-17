import React, { useState } from 'react';
import { loadSettings, saveSettings } from '../lib/settings.js';

export const SPEEDS = [
  { v: 0.75, icon: '🐢', label: 'ゆっくり（0.75倍）' },
  { v: 1, icon: '🧑', label: 'ふつう' },
  { v: 1.25, icon: '🐇', label: 'はやい（1.25倍）' },
];

// 音声のスピード：亀＝0.75倍、人間＝ふつう、ウサギ＝1.25倍
export default function SpeedSwitch({ className = '' }) {
  const [rate, setRate] = useState(() => loadSettings().speechRate || 1);
  const pick = (v) => { setRate(v); saveSettings({ speechRate: v }); };
  return (
    <div className={'speed-switch ' + className} role="radiogroup" aria-label="音声の速さ" data-testid="speed-switch">
      {SPEEDS.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={rate === o.v} aria-label={o.label} title={o.label}
          className={'speed-btn' + (rate === o.v ? ' on' : '')} onClick={(e) => { e.stopPropagation(); pick(o.v); }} data-testid={`speed-${o.v}`}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}

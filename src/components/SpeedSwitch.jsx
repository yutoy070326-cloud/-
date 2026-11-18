import React, { useRef, useState } from 'react';
import { loadSettings, saveSettings } from '../lib/settings.js';
import { t } from '../lib/i18n.js';

// 音声のスピード：🐢 ←🏃‍♀️→ 🐇。🏃‍♀️をドラッグして、🐢側で遅く、🐇側で速くする。
export const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const SPEEDS = SPEED_STEPS;

const nearestIndex = (v) => SPEED_STEPS.reduce((best, s, i) => (Math.abs(s - v) < Math.abs(SPEED_STEPS[best] - v) ? i : best), 0);

// floating: 画面の右下に固定して出す
export default function SpeedSwitch({ className = '', floating = false }) {
  const [idx, setIdx] = useState(() => nearestIndex(loadSettings().speechRate || 1));
  const track = useRef(null);
  const drag = useRef(false);
  const last = SPEED_STEPS.length - 1;
  const apply = (i) => {
    const k = Math.max(0, Math.min(last, i));
    setIdx(k);
    saveSettings({ speechRate: SPEED_STEPS[k] });
  };
  const fromX = (x) => {
    const r = track.current.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (x - r.left) / r.width));
    apply(Math.round(f * last));
  };
  const onDown = (e) => {
    e.stopPropagation();
    drag.current = true;
    try { track.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    fromX(e.clientX);
  };
  const onMove = (e) => { if (drag.current) fromX(e.clientX); };
  const onUp = () => { drag.current = false; };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); apply(idx - 1); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); apply(idx + 1); }
  };
  const rate = SPEED_STEPS[idx];
  return (
    <div className={'speed-slider ' + (floating ? 'floating ' : '') + className} data-testid="speed-switch" onClick={(e) => e.stopPropagation()}>
      <span className="speed-end" aria-hidden="true">🐢</span>
      <div className="speed-track" ref={track} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-testid="speed-track">
        <div className="speed-rail" />
        {SPEED_STEPS.map((s, i) => <i key={s} className={'speed-notch' + (s === 1 ? ' one' : '')} style={{ left: `${(i / last) * 100}%` }} />)}
        <button type="button" className="speed-thumb" role="slider" aria-label={t('speed.label', '音声の速さ')} aria-valuemin={SPEED_STEPS[0]} aria-valuemax={SPEED_STEPS[last]} aria-valuenow={rate} aria-valuetext={`${rate}x`}
          style={{ left: `${(idx / last) * 100}%` }} onKeyDown={onKey} data-testid="speed-thumb">🏃‍♀️</button>
      </div>
      <span className="speed-end" aria-hidden="true">🐇</span>
      <b className="speed-val" data-testid="speed-val">{rate}x</b>
      <button type="button" className="speed-reset" onClick={() => apply(nearestIndex(1))} aria-label={t('speed.reset', '1倍速に戻す')} data-testid="speed-reset">↺</button>
    </div>
  );
}

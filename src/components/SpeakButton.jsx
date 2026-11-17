import React from 'react';
import { speak, speechSupported } from '../lib/speech.js';

// 🔊 発音を聞く（ブラウザ内蔵の音声合成。無料）。対応していない端末ではボタンを出さない。
export default function SpeakButton({ text, lang, className = '' }) {
  if (!speechSupported()) return null;
  return (
    <button
      type="button"
      className={'speak-btn ' + className}
      aria-label={`${text} の発音を聞く`}
      data-testid="speak"
      onClick={(e) => { e.stopPropagation(); speak(text, lang); }}
    >
      🔊
    </button>
  );
}

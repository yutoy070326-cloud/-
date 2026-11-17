import React from 'react';

// 読み（拼音・ローマ字）の表示。pron: { label, text }
export default function Reading({ pron, className = '' }) {
  if (!pron) return null;
  return (
    <div className={'pron-line ' + className} data-testid="reading">
      <span className="pron-label">{pron.label}</span>
      <span className="pron-text">{pron.text}</span>
    </div>
  );
}

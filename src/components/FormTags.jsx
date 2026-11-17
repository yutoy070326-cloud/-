import React from 'react';

// 何形か・何人称かのラベル。種類ごとに色が決まっている（tone → styles.css）。
// 活用表がある語（onToggle あり）は、ラベルを押すと活用表が開閉する。
export default function FormTags({ tags, onToggle, open }) {
  if (!tags || tags.length === 0) return null;
  const items = tags.map((t, i) => <span key={i} className={'ftag ' + t.tone}>{t.label}</span>);
  if (!onToggle) return <span className="ftags" data-testid="word-form">{items}</span>;
  return (
    <span
      className={'ftags tappable' + (open ? ' open' : '')}
      role="button"
      tabIndex={0}
      aria-expanded={!!open}
      aria-label="活用表を開く／閉じる"
      data-testid="word-form"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle(); } }}
    >
      {items}
      <span className="ftag-chev" aria-hidden="true">活用表 {open ? '▲' : '▼'}</span>
    </span>
  );
}

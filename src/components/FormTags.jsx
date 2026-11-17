import React from 'react';

// 何形か・何人称かのラベル。種類ごとに色が決まっている（tone → styles.css の .ftag.〇〇）
export default function FormTags({ tags }) {
  if (!tags || tags.length === 0) return null;
  return (
    <span className="ftags" data-testid="word-form">
      {tags.map((t, i) => (
        <span key={i} className={'ftag ' + t.tone}>{t.label}</span>
      ))}
    </span>
  );
}

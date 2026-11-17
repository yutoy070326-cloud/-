import React from 'react';

// 赤い花丸。animate のとき、手書きのように描かれる（delay はアニメーションの開始までの遅れ）
export default function Hanamaru({ animate = false, delay = 0, size = 34 }) {
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { cx: 24 + Math.cos(a) * 14, cy: 24 + Math.sin(a) * 14 };
  });
  return (
    <svg className={'hanamaru' + (animate ? ' draw' : '')} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ '--delay': `${delay}ms` }} data-testid="hanamaru">
      <g fill="none" stroke="#e0262a" strokeWidth="2.4" strokeLinecap="round">
        {petals.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r="7.5" pathLength="1" />)}
        <circle cx="24" cy="24" r="9" pathLength="1" />
        <circle cx="24" cy="24" r="4" pathLength="1" />
      </g>
    </svg>
  );
}

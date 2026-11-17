import React from 'react';

// 積み木。どの形も、底が平らで、60×60の枠の中に収まるように描いてある。
// 山に置くときは同じ高さの「台」に乗せるので、三角・丸・星でも安定して積み重なって見える。
const star = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 27 : 11.5;
    pts.push(`${(30 + Math.cos(a) * r).toFixed(1)},${(33 + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
})();
const hex = (() => {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(30 + Math.cos(a) * 27).toFixed(1)},${(33 + Math.sin(a) * 24).toFixed(1)}`);
  }
  return pts.join(' ');
})();

function Shape({ shape, color }) {
  const edge = { stroke: 'rgba(0,0,0,.28)', strokeWidth: 1.6, strokeLinejoin: 'round' };
  switch (shape) {
    case 'triangle': return <polygon points="4,56 56,56 30,8" fill={color} {...edge} />;
    case 'circle': return <circle cx="30" cy="31" r="25" fill={color} {...edge} />;
    case 'trapezoid': return <polygon points="3,56 57,56 45,12 15,12" fill={color} {...edge} />;
    case 'star': return <polygon points={star} fill={color} {...edge} />;
    case 'semicircle': return <path d="M4 56 A26 26 0 0 1 56 56 Z" fill={color} {...edge} />;
    case 'hexagon': return <polygon points={hex} fill={color} {...edge} />;
    case 'arch': return <path d="M6 56 V30 A24 24 0 0 1 54 30 V56 Z M20 56 V36 A10 10 0 0 1 40 36 V56 Z" fill={color} fillRule="evenodd" {...edge} />;
    default: return <rect x="6" y="8" width="48" height="48" rx="4" fill={color} {...edge} />;
  }
}

export default function ToyBlock({ shape, color, size = 52 }) {
  return (
    <svg className="toy" width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" data-shape={shape}>
      <ellipse cx="30" cy="57.5" rx="22" ry="2.6" fill="rgba(0,0,0,.2)" />
      <Shape shape={shape} color={color} />
      <ellipse cx="22" cy="22" rx="6" ry="3.4" fill="rgba(255,255,255,.35)" transform="rotate(-30 22 22)" />
    </svg>
  );
}

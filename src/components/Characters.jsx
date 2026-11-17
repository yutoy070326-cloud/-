import React from 'react';

// 手を振る男の子／女の子（SVG）。右手が肩を軸にゆれる（CSS: .wave-arm）。
export default function Character({ kind, size = 200 }) {
  const girl = kind === 'girl';
  const skin = '#ffd9b8';
  return (
    <svg className={'character ' + kind} width={size} height={size * 1.25} viewBox="0 0 200 250" role="img" aria-label={girl ? '手を振る女の子' : '手を振る男の子'} data-testid={`character-${kind}`}>
      {/* 体 */}
      {girl ? (
        <path d="M60 130 Q100 118 140 130 L158 228 L42 228 Z" fill="#f4799e" />
      ) : (
        <path d="M62 132 Q100 120 138 132 L146 228 L54 228 Z" fill="#4a8fe0" />
      )}
      {/* 足 */}
      <rect x="72" y="226" width="18" height="20" rx="6" fill={skin} />
      <rect x="110" y="226" width="18" height="20" rx="6" fill={skin} />
      {/* 左腕（下ろしている） */}
      <rect x="44" y="136" width="16" height="62" rx="8" fill={girl ? '#f4799e' : '#4a8fe0'} transform="rotate(8 52 140)" />
      <circle cx="56" cy="200" r="9" fill={skin} />
      {/* 右腕（手を振る）：肩(140,140)を軸に回る */}
      <g className="wave-arm" style={{ transformOrigin: '140px 140px' }}>
        <rect x="132" y="70" width="16" height="72" rx="8" fill={girl ? '#f4799e' : '#4a8fe0'} />
        <circle cx="140" cy="64" r="10" fill={skin} />
      </g>
      {/* 髪（後ろ） */}
      {girl ? (
        <>
          <circle cx="52" cy="92" r="20" fill="#5b3a29" />
          <circle cx="148" cy="92" r="20" fill="#5b3a29" />
          <circle cx="52" cy="80" r="7" fill="#ffd21f" />
          <circle cx="148" cy="80" r="7" fill="#ffd21f" />
        </>
      ) : null}
      {/* 顔 */}
      <circle cx="100" cy="88" r="40" fill={skin} />
      {/* 髪（前） */}
      {girl ? (
        <path d="M60 84 Q62 44 100 44 Q138 44 140 84 Q120 62 100 66 Q80 62 60 84 Z" fill="#5b3a29" />
      ) : (
        <path d="M60 80 Q60 44 100 44 Q140 44 140 80 Q126 64 112 66 Q100 56 86 66 Q70 62 60 80 Z" fill="#3b2a20" />
      )}
      {/* 目・口・ほっぺ */}
      <circle cx="86" cy="92" r="4.5" fill="#2b2118" />
      <circle cx="114" cy="92" r="4.5" fill="#2b2118" />
      <circle cx="75" cy="102" r="6" fill="#ffb3a0" opacity=".7" />
      <circle cx="125" cy="102" r="6" fill="#ffb3a0" opacity=".7" />
      <path d="M88 108 Q100 120 112 108" stroke="#c0504d" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

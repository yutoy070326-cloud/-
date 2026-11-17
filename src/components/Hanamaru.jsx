import React from 'react';

// 花丸の線：外側の花びら8枚を一筆でなぞって、そのあと内側の丸を2周。
// 64×64 の座標。pathLength=1 にしてあるので、stroke-dashoffset で「描かれていく」動きになる
function hanamaruPath() {
  const R = 19; const r = 8.6; const c = 32;
  const pt = (i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; return [c + Math.cos(a) * R, c + Math.sin(a) * R]; };
  const f = (n) => n.toFixed(2);
  let d = '';
  for (let i = 0; i < 8; i++) {
    const [x, y] = pt(i); const [nx, ny] = pt(i + 1);
    d += (i === 0 ? `M${f(x)} ${f(y)} ` : '') + `A${r} ${r} 0 0 1 ${f(nx)} ${f(ny)} `;
  }
  d += 'M32 23 A9 9 0 1 1 31.9 23 M32 27.5 A4.5 4.5 0 1 1 31.9 27.5';
  return d;
}
const D = hanamaruPath();

// animate: 筆が動いて、いま描いているように花丸が描かれる（delay は開始までの遅れ ms）。
// 筆つき（brush）は size=64 のとき。一覧など小さい表示では、描き終わった花丸だけを出す
export default function Hanamaru({ animate = false, delay = 0, size = 64, brush = animate }) {
  const dur = 1300;
  return (
    <span className={'hanamaru-wrap' + (animate ? ' draw' : '')} style={{ width: size, height: size, '--delay': `${delay}ms`, '--dur': `${dur}ms` }} data-testid="hanamaru">
      <svg className="hanamaru" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d={D} pathLength="1" fill="none" stroke="#e0262a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {animate && brush && <span className="brush" style={{ offsetPath: `path('${D}')`, WebkitOffsetPath: `path('${D}')` }} aria-hidden="true">🖌️</span>}
    </span>
  );
}

import React, { useLayoutEffect, useRef, useState } from 'react';

// 不安定な形の積み木の上に乗っているものを、まとめて揺らすかたまり（シーソー）。
// ・乗っているものが多い／高いほど、振れ幅は大きく、ゆっくり揺れる
// ・隣の山に被らないよう、かたまりの幅（横幅）を少し縮め（最大で72%）、足りなければ振れ幅を小さくする
const BASE = { triangle: 2.2, circle: 2.8, star: 1.6, semicircle: 1.4, arch: 1.4 }; // 形ごとの基本の振れ幅（度）
const GAP = 6; // 隣の山との、最低限のすきま（px）

export default function SeesawGroup({ shape, count, paused, children }) {
  const ref = useRef(null);
  const [st, setSt] = useState({ tilt: 3, width: 100 });

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return undefined;
    const measure = () => {
      const W = parent.clientWidth;
      const H = el.offsetHeight;
      if (!W || !H) return;
      // 高く・多く積むほど大きく揺らす（最大 9 度）
      const desired = Math.min(8, (BASE[shape] ?? 2) + 0.55 * count + H / 110);
      const need = H * Math.sin((desired * Math.PI) / 180); // 一番上の端が横に動く量
      // 幅を縮めて余白を作る。それでも足りなければ、振れ幅を小さくする
      const width = Math.max(0.72, Math.min(1, 1 - (2 * (need - GAP)) / W)); // 幅は72%までしか縮めない（題名が読めるように）
      const room = (W * (1 - width)) / 2 + GAP;
      const tilt = Math.min(desired, (Math.asin(Math.min(1, room / H)) * 180) / Math.PI);
      setSt((o) => (Math.abs(o.tilt - tilt) < 0.05 && Math.abs(o.width - width * 100) < 0.2 ? o : { tilt: Math.round(tilt * 100) / 100, width: Math.round(width * 1000) / 10 }));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(parent);
    return () => ro?.disconnect();
  }, [shape, count]);

  const period = Math.min(7.5, 2.4 + 0.55 * count); // たくさん乗っているほど、ゆっくり
  return (
    <div
      ref={ref}
      className={'seesaw-group' + (paused ? ' paused' : '')}
      data-testid="seesaw-group"
      data-count={count}
      style={{ width: `${st.width}%`, '--tilt': `${st.tilt}deg`, '--sp': `${period}s` }}
    >
      {children}
    </div>
  );
}

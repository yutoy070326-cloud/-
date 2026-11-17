import React from 'react';
import { BOOK_GENRES, BOOK_COLORS, genreOf, autoBookColor } from '../lib/bookStyle.js';

// 本のジャンルと表紙の色。ジャンルで色が自動で決まる。自分で色を選んだときだけ、その色になる。
// value: { genre: id|'' , color: '#rrggbb'|'' }（'' ＝ 自動）, title: 自動色の計算に使う
export default function BookStyleFields({ value, title, onChange, compact = false }) {
  const auto = autoBookColor({ genre: value.genre, title });
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className={'book-style' + (compact ? ' compact' : '')} data-testid="book-style">
      <label className={compact ? 'mini-label' : 'field-label'} htmlFor="bs-genre">ジャンル</label>
      <select id="bs-genre" className="input" value={value.genre || ''} onChange={(e) => set({ genre: e.target.value })} data-testid="bs-genre">
        <option value="">指定しない</option>
        {BOOK_GENRES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>

      <label className={compact ? 'mini-label' : 'field-label'}>表紙の色</label>
      <div className="bs-colors" role="radiogroup" aria-label="表紙の色">
        <button
          type="button"
          role="radio"
          aria-checked={!value.color}
          className={'bs-auto' + (!value.color ? ' on' : '')}
          onClick={() => set({ color: '' })}
          data-testid="bs-auto"
        >
          <span className="bs-chip" style={{ background: auto }} />
          自動{genreOf(value.genre) ? `（${genreOf(value.genre).label}）` : ''}
        </button>
        {BOOK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value.color === c}
            aria-label={`表紙を ${c} にする`}
            className={'swatch' + (value.color === c ? ' on' : '')}
            style={{ background: c }}
            onClick={() => set({ color: c })}
          />
        ))}
        <input
          type="color"
          className="swatch-input"
          value={value.color || auto}
          aria-label="表紙の色を選ぶ"
          onChange={(e) => set({ color: e.target.value })}
        />
      </div>
    </div>
  );
}

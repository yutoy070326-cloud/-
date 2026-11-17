import React from 'react';

export default function Chips({ options, value, onChange }) {
  return (
    <div className="chips" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          role="radio"
          aria-checked={value === o.code}
          className={'chip' + (value === o.code ? ' on' : '')}
          onClick={() => onChange(o.code)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

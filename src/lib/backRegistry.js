// いま開いている画面の「戻る」の動き。左下の戻るボタンが、左上のボタンと同じ動きをするために使う。
import { useEffect, useRef } from 'react';

let current = null;
export const runBack = () => { current?.(); };

export function useBackHandler(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = () => ref.current?.();
    current = h;
    return () => { if (current === h) current = null; };
  }, []);
}

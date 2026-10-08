import { useEffect, useRef } from 'react';

const ITEM = 52;

/** iOS-style scroll wheel. Snaps to an item; the centred item is the value. */
export function WheelPicker({
  values,
  value,
  onChange,
  unit,
  label,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  label: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Scroll to the initial value without animation.
  useEffect(() => {
    const i = values.indexOf(value);
    if (ref.current && i >= 0) ref.current.scrollTop = i * ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM)));
      if (values[i] !== value) onChange(values[i]);
    }, 80);
  };

  const pick = (i: number) => {
    ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
    onChange(values[i]);
  };

  const step = (delta: number) => {
    const i = Math.max(0, Math.min(values.length - 1, values.indexOf(value) + delta));
    pick(i);
  };

  return (
    <div className="wheel">
      <ul
        ref={ref}
        className="wheel__list"
        role="listbox"
        aria-label={label}
        aria-activedescendant={`wheel-${label}-${value}`}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
        }}
      >
        {values.map((v, i) => (
          <li
            key={v}
            id={`wheel-${label}-${v}`}
            role="option"
            aria-selected={v === value}
            className={`wheel__item${v === value ? ' is-active' : ''}`}
            onClick={() => pick(i)}
          >
            {v}
          </li>
        ))}
      </ul>
      <div className="wheel__band" aria-hidden />
      {unit && <div className="wheel__unit" aria-hidden>{unit}</div>}
    </div>
  );
}

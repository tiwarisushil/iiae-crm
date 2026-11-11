import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

// Text input with a filtered suggestion list (combobox). Typing filters the options;
// arrow keys / Enter pick one; Escape closes. Free text is kept so older records whose
// value is not in the list still display and submit.

const AutocompleteSelect = ({
  value,
  onChange,
  options = [],
  placeholder = '',
  disabled = false,
  className = '',
  emptyText = 'No matches',
  name,
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapper = useRef(null);
  const listId = useId();

  const text = String(value || '');
  const matches = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const list = needle
      ? options.filter((option) => option.toLowerCase().includes(needle))
      : options;
    // Prefix matches first, then the rest, capped to keep the list usable
    return [
      ...list.filter((option) => option.toLowerCase().startsWith(needle)),
      ...list.filter((option) => !option.toLowerCase().startsWith(needle)),
    ].slice(0, 60);
  }, [options, text]);

  useEffect(() => {
    const close = (event) => {
      if (wrapper.current && !wrapper.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (option) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event) => {
    if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(matches.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      if (active >= 0 && matches[active]) {
        event.preventDefault();
        pick(matches[active]);
      } else if (matches.length === 1) {
        event.preventDefault();
        pick(matches[0]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapper} className="relative">
      <input
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-slate-500">{emptyText}</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option}
                role="option"
                aria-selected={option === text}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer px-3 py-2 ${
                  index === active ? 'bg-blue-50 text-blue-700' : option === text ? 'font-semibold text-slate-900' : 'text-slate-700'
                }`}
              >
                {option}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteSelect;

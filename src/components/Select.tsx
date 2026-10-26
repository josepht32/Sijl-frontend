import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type OptionHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeText).join('');
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return '';
}

function extractOptions(children: ReactNode): SelectOption[] {
  const items: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== 'option') {
      return;
    }
    items.push({
      value: String(child.props.value ?? ''),
      label: nodeText(child.props.children).replace(/\s+/g, ' ').trim(),
      disabled: Boolean(child.props.disabled),
    });
  });
  return items;
}

function emitChange(
  onChange: SelectHTMLAttributes<HTMLSelectElement>['onChange'],
  next: string,
  name?: string,
  id?: string,
) {
  onChange?.({
    target: { value: next, name, id },
    currentTarget: { value: next, name, id },
  } as ChangeEvent<HTMLSelectElement>);
}

export function SelectInput({
  children,
  value,
  onChange,
  id,
  name,
  disabled,
  required,
  className = '',
  'aria-label': ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const { t } = useTranslation();
  const generatedId = useId();
  const triggerId = id || generatedId;
  const listId = `${triggerId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const options = useMemo(() => extractOptions(children), [children]);
  const currentValue = String(value ?? '');
  const selected = options.find((option) => option.value === currentValue);
  const searchable = options.length > 6;
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) => option.label.toLocaleLowerCase().includes(needle));
  }, [options, query]);

  const placeMenu = () => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const gutter = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gutter;
    const spaceAbove = rect.top - gutter;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : spaceBelow));
    const next: CSSProperties = {
      position: 'fixed',
      top: openUp ? Math.max(gutter, rect.top - maxHeight - 4) : rect.bottom + 4,
      left: Math.min(rect.left, Math.max(gutter, window.innerWidth - rect.width - gutter)),
      width: rect.width,
      maxHeight,
      visibility: 'visible',
    };
    menu.style.position = 'fixed';
    menu.style.top = `${next.top}px`;
    menu.style.left = `${next.left}px`;
    menu.style.width = `${next.width}px`;
    menu.style.maxHeight = `${next.maxHeight}px`;
    menu.style.visibility = 'visible';
    setMenuStyle(next);
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    placeMenu();
    const selectedIndex = options.findIndex((option) => option.value === currentValue);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    // Position and highlight only when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus({ preventScroll: true });
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const list = menuRef.current?.querySelector<HTMLElement>('.select-options');
    const active = list?.querySelector<HTMLElement>('.select-option.active');
    if (!list || !active) {
      return;
    }
    const listRect = list.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  }, [activeIndex, open, filtered]);

  const choose = (next: string) => {
    emitChange(onChange, next, name, id);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setQuery('');
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(filtered.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option && !option.disabled) {
        choose(option.value);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  };

  return (
    <div className={`select ${className}`.trim()}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-required={required}
        onClick={() => {
          if (disabled) {
            return;
          }
          setQuery('');
          setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`select-value${selected ? '' : ' placeholder'}`}>
          {selected?.label || t('common.select')}
        </span>
        <ChevronDown size={16} className={open ? 'select-chevron open' : 'select-chevron'} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="select-menu"
              style={menuStyle}
              onKeyDown={onMenuKeyDown}
            >
              {searchable ? (
                <input
                  ref={searchRef}
                  className="control select-search"
                  value={query}
                  placeholder={t('common.search')}
                  aria-label={t('common.search')}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                    }
                  }}
                />
              ) : null}
              <div className="select-options" role="listbox" id={listId} tabIndex={-1}>
                {!filtered.length ? (
                  <p className="select-empty">{t('common.noResults')}</p>
                ) : (
                  filtered.map((option, index) => (
                    <button
                      key={`${option.value}-${index}`}
                      type="button"
                      role="option"
                      disabled={option.disabled}
                      aria-selected={option.value === currentValue}
                      className={`select-option${option.value === currentValue ? ' selected' : ''}${
                        index === activeIndex ? ' active' : ''
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option.value)}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

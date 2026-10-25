export function MeterList({
  items,
  empty,
}: {
  items: Array<{
    key: string;
    label: string;
    value: number;
    hint?: string;
    tone?: 'accent' | 'danger' | 'warn' | 'info';
    onClick?: () => void;
  }>;
  empty: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) {
    return <p className="muted">{empty}</p>;
  }
  return (
    <ul className="meter-list">
      {items.map((item) => (
        <li key={item.key}>
          {item.onClick ? (
            <button type="button" className="meter-row meter-action" onClick={item.onClick}>
              <MeterBody item={item} max={max} />
            </button>
          ) : (
            <div className="meter-row">
              <MeterBody item={item} max={max} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function MeterBody({
  item,
  max,
}: {
  item: {
    label: string;
    value: number;
    hint?: string;
    tone?: 'accent' | 'danger' | 'warn' | 'info';
  };
  max: number;
}) {
  return (
    <>
      <div className="meter-copy">
        <strong>{item.label}</strong>
        {item.hint ? <span className="hint">{item.hint}</span> : null}
      </div>
      <div className="meter-track" aria-hidden>
        <span
          className={`meter-fill meter-${item.tone ?? 'accent'}`}
          style={{ width: `${Math.round((item.value / max) * 100)}%` }}
        />
      </div>
      <span className="meter-value">{item.value}</span>
    </>
  );
}

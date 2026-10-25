import type { ReactNode } from 'react';

export function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info';
  onClick?: () => void;
}) {
  const className = `card stat stat-${tone} ${onClick ? 'stat-action' : ''}`.trim();
  const body = (
    <>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <article className={className}>{body}</article>;
}

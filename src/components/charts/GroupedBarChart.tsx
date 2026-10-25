import { CHART_TONES, type ChartTone } from './chart-colors';

export function GroupedBarChart({
  items,
  series,
  empty,
  onSelect,
}: {
  items: Array<{ key: string; label: string; values: Record<string, number> }>;
  series: Array<{ key: string; label: string; tone: ChartTone }>;
  empty: string;
  onSelect?: (key: string) => void;
}) {
  const max = Math.max(
    1,
    ...items.flatMap((item) => series.map((entry) => item.values[entry.key] ?? 0)),
  );
  if (!items.length) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <div className="bar-chart">
      <ul className="chart-legend chart-legend-row">
        {series.map((entry) => (
          <li key={entry.key}>
            <span className="legend-swatch" style={{ background: CHART_TONES[entry.tone] }} />
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
      <div className="bar-track">
        {items.map((item) => {
          const body = (
            <>
              <div className="bar-group">
                {series.map((entry) => {
                  const value = item.values[entry.key] ?? 0;
                  return (
                    <span
                      key={entry.key}
                      className="bar-col"
                      style={{
                        height: `${Math.max(4, Math.round((value / max) * 100))}%`,
                        background: CHART_TONES[entry.tone],
                      }}
                      title={`${entry.label}: ${value}`}
                    />
                  );
                })}
              </div>
              <span className="bar-label">{item.label}</span>
            </>
          );
          if (!onSelect) {
            return (
              <div key={item.key} className="bar-item">
                {body}
              </div>
            );
          }
          return (
            <button key={item.key} type="button" className="bar-item bar-action" onClick={() => onSelect(item.key)}>
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}

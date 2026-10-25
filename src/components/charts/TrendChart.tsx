import { CHART_TONES } from './chart-colors';

type Series = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

export function TrendChart({
  labels,
  series,
  empty,
}: {
  labels: string[];
  series: Array<{ key: string; label: string; values: number[]; tone?: 'info' | 'ok' | 'accent' | 'warn' }>;
  empty: string;
}) {
  const plotted: Series[] = series.map((item) => ({
    ...item,
    color: CHART_TONES[item.tone ?? 'info'],
  }));
  const max = Math.max(1, ...plotted.flatMap((item) => item.values));
  if (!labels.length || plotted.every((item) => item.values.every((value) => value === 0))) {
    return <p className="muted">{empty}</p>;
  }

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

  const toPoint = (value: number, index: number) => {
    const x = pad.left + index * step;
    const y = pad.top + innerH - (value / max) * innerH;
    return `${x},${y}`;
  };

  const ticks = [0, 0.5, 1].map((ratio) => Math.round(max * ratio));

  return (
    <div className="trend-wrap" dir="ltr">
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img">
        {ticks.map((tick) => {
          const y = pad.top + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                className="trend-grid"
              />
              <text x={pad.left - 8} y={y + 4} className="trend-tick" textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
        {plotted.map((item) => (
          <g key={item.key}>
            <polyline
              fill="none"
              stroke={item.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={item.values.map((value, index) => toPoint(value, index)).join(' ')}
            />
            {item.values.map((value, index) => {
              const [x, y] = toPoint(value, index).split(',');
              return (
                <circle key={`${item.key}-${index}`} cx={x} cy={y} r="3.2" fill={item.color}>
                  <title>{`${item.label}: ${value}`}</title>
                </circle>
              );
            })}
          </g>
        ))}
        {labels.map((label, index) => {
          const show = labels.length <= 8 || index % Math.ceil(labels.length / 6) === 0 || index === labels.length - 1;
          if (!show) {
            return null;
          }
          const x = pad.left + index * step;
          return (
            <text key={label + index} x={x} y={height - 8} className="trend-label" textAnchor="middle">
              {label}
            </text>
          );
        })}
      </svg>
      <ul className="chart-legend chart-legend-row">
        {plotted.map((item) => (
          <li key={item.key}>
            <span className="legend-swatch" style={{ background: item.color }} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { DONUT_PALETTE } from './chart-colors';

export function DonutChart({
  items,
  empty,
  center,
}: {
  items: Array<{ key: string; label: string; value: number; color?: string }>;
  empty: string;
  center?: string;
}) {
  const visible = items.filter((item) => item.value > 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    return <p className="muted">{empty}</p>;
  }

  let angle = 0;
  const stops = visible.map((item, index) => {
    const slice = (item.value / total) * 360;
    const start = angle;
    angle += slice;
    const color = item.color ?? DONUT_PALETTE[index % DONUT_PALETTE.length];
    return `${color} ${start}deg ${angle}deg`;
  });

  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
        role="img"
        aria-label={center}
      >
        <div className="donut-hole">
          <strong>{total}</strong>
          {center ? <span>{center}</span> : null}
        </div>
      </div>
      <ul className="chart-legend">
        {items.map((item, index) => (
          <li key={item.key}>
            <span
              className="legend-swatch"
              style={{ background: item.color ?? DONUT_PALETTE[index % DONUT_PALETTE.length] }}
            />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HeatmapChart({
  rows,
  columns,
  empty,
  onSelect,
}: {
  rows: Array<{
    key: string;
    label: string;
    cells: Array<{ key: string; value: number }>;
  }>;
  columns: Array<{ key: string; label: string }>;
  empty: string;
  onSelect?: (rowKey: string, columnKey: string) => void;
}) {
  const max = Math.max(1, ...rows.flatMap((row) => row.cells.map((cell) => cell.value)));
  if (!rows.length) {
    return <p className="muted">{empty}</p>;
  }

  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap"
        style={{ gridTemplateColumns: `minmax(7rem, 12rem) repeat(${columns.length}, minmax(3.5rem, 1fr))` }}
      >
        <div />
        {columns.map((column) => (
          <div key={column.key} className="heatmap-head">
            {column.label}
          </div>
        ))}
        {rows.map((row) => (
          <div key={row.key} className="heatmap-row-contents">
            <div className="heatmap-label">{row.label}</div>
            {row.cells.map((cell) => {
              const intensity = cell.value / max;
              const style = {
                background: `color-mix(in srgb, var(--accent) ${Math.round(18 + intensity * 72)}%, var(--surface-2))`,
                color: intensity > 0.55 ? '#fff' : 'var(--ink)',
              };
              if (!onSelect) {
                return (
                  <div key={`${row.key}-${cell.key}`} className="heatmap-cell" style={style}>
                    {cell.value}
                  </div>
                );
              }
              return (
                <button
                  key={`${row.key}-${cell.key}`}
                  type="button"
                  className="heatmap-cell heatmap-action"
                  style={style}
                  onClick={() => onSelect(row.key, cell.key)}
                >
                  {cell.value}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

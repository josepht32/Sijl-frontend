export const CHART_TONES = {
  info: 'var(--info)',
  ok: 'var(--ok)',
  accent: 'var(--accent)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  muted: 'var(--line-strong)',
} as const;

export type ChartTone = keyof typeof CHART_TONES;

export const DONUT_PALETTE = [
  CHART_TONES.info,
  CHART_TONES.accent,
  CHART_TONES.ok,
  CHART_TONES.warn,
  CHART_TONES.danger,
  '#6b5a46',
  '#4a6d62',
  '#8a6a3a',
];

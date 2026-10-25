import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';
import type { TimelineStatus } from '../api/types';

const TONE: Record<TimelineStatus, 'ok' | 'warn' | 'danger'> = {
  on_track: 'ok',
  due_soon: 'warn',
  overdue: 'danger',
};

export function TimelineBadge({ status }: { status: TimelineStatus }) {
  const { t } = useTranslation();
  return <Badge tone={TONE[status]}>{t(`timeline.${status}`)}</Badge>;
}

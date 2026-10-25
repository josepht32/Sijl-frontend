import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AttentionCase } from '../api/types';
import { Badge } from './Badge';
import { StageBadge, WorkflowStateBadge } from './StageStepper';
import { TimelineBadge } from './TimelineBadge';
import { formatDate } from '../utils/format';

export function AttentionTable({
  items,
  empty,
}: {
  items: AttentionCase[];
  empty: string;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  if (!items.length) {
    return <p className="muted" style={{ padding: '1.25rem' }}>{empty}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>{t('cases.reference')}</th>
            <th>{t('cases.subject')}</th>
            <th>{t('cases.stage')}</th>
            <th>{t('cases.dueDate')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => navigate(`/cases/${item.id}`)}>
              <td className="mono">{item.referenceNumber}</td>
              <td>{item.title}</td>
              <td>
                <div className="stack" style={{ gap: '0.25rem' }}>
                  <StageBadge stage={item.currentStage} />
                  <WorkflowStateBadge state={item.workflowState} />
                </div>
              </td>
              <td>
                <div className="stack" style={{ gap: '0.25rem' }}>
                  <span>{formatDate(item.dueDate, i18n.language)}</span>
                  <TimelineBadge status={item.timelineStatus} />
                </div>
              </td>
              <td>
                <div className="reason-chips">
                  {item.reasons.map((reason) => (
                    <Badge
                      key={reason}
                      tone={
                        reason === 'severely_overdue' || reason === 'overdue'
                          ? 'danger'
                          : reason === 'due_soon' || reason === 'inactive'
                            ? 'warn'
                            : 'info'
                      }
                    >
                      {t(`attention.${reason}`)}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { OperationalDashboard } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { TimelineBadge } from '../components/TimelineBadge';
import { StageBadge, WorkflowStateBadge } from '../components/StageStepper';
import { KpiCard } from '../components/KpiCard';
import { AttentionTable } from '../components/AttentionTable';
import { formatDateTime, localizedName } from '../utils/format';
import { casesListPath } from '../utils/cases-href';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<OperationalDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get<OperationalDashboard>('/analytics/operational')
      .then((response) => setData(response.data))
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LoadingBlock />;
  }
  if (error) {
    return <ErrorBanner message={error} onRetry={load} />;
  }

  const kpis = data?.kpis;

  return (
    <div className="stack">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />
      <div className="stats stats-wide">
        <KpiCard
          label={t('dashboard.active')}
          value={kpis?.active ?? 0}
          hint={t('dashboard.openActive')}
          tone="info"
          onClick={() => navigate(casesListPath({ status: 'open' }))}
        />
        <KpiCard
          label={t('dashboard.awaitingAction')}
          value={kpis?.awaitingAction ?? 0}
          tone="warn"
        />
        <KpiCard
          label={t('dashboard.dueSoon')}
          value={kpis?.dueSoon ?? 0}
          hint={t('dashboard.openDueSoon')}
          tone="warn"
          onClick={() => navigate(casesListPath({ status: 'open', timelineStatus: 'due_soon' }))}
        />
        <KpiCard
          label={t('dashboard.overdue')}
          value={kpis?.overdue ?? 0}
          hint={t('dashboard.openOverdue')}
          tone="danger"
          onClick={() => navigate(casesListPath({ status: 'open', timelineStatus: 'overdue' }))}
        />
        <KpiCard
          label={t('dashboard.recentlyUpdated')}
          value={kpis?.recentlyUpdated ?? 0}
          tone="ok"
        />
      </div>

      <section className="card" id="attention">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
            {t('dashboard.attention')}
          </h2>
        </div>
        <AttentionTable items={data?.attention ?? []} empty={t('dashboard.attentionEmpty')} />
      </section>

      <section className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
            {t('dashboard.recent')}
          </h2>
        </div>
        {!data?.recent.length ? (
          <EmptyState message={t('dashboard.noRecent')} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('cases.reference')}</th>
                  <th>{t('cases.subject')}</th>
                  <th>{t('cases.category')}</th>
                  <th>{t('cases.stage')}</th>
                  <th>{t('cases.timeline')}</th>
                  <th>{t('cases.lastUpdate')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/cases/${item.id}`)}>
                    <td className="mono">{item.referenceNumber}</td>
                    <td>{item.title}</td>
                    <td>{localizedName(i18n.language, item.categoryNameEn, item.categoryNameAr)}</td>
                    <td>
                      <div className="stack" style={{ gap: '0.25rem' }}>
                        <StageBadge stage={item.currentStage} />
                        <WorkflowStateBadge state={item.workflowState} />
                      </div>
                    </td>
                    <td>
                      <TimelineBadge status={item.timelineStatus} />
                    </td>
                    <td>{formatDateTime(item.lastActivityAt, i18n.language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

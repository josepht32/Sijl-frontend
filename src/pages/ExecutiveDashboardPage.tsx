import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { ExecutiveDashboard } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { SelectInput } from '../components/Field';
import { ErrorBanner, LoadingBlock } from '../components/States';
import { KpiCard } from '../components/KpiCard';
import { MeterList } from '../components/MeterList';
import { AttentionTable } from '../components/AttentionTable';
import { DonutChart } from '../components/charts/DonutChart';
import { TrendChart } from '../components/charts/TrendChart';
import { GroupedBarChart } from '../components/charts/GroupedBarChart';
import { HeatmapChart } from '../components/charts/HeatmapChart';
import { CHART_TONES } from '../components/charts/chart-colors';
import { hasPermission, localizedName } from '../utils/format';
import { casesListPath } from '../utils/cases-href';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function periodRange(preset: string): { from?: string; to?: string } {
  if (preset === 'all') {
    return {};
  }
  const to = new Date();
  const from = new Date();
  const days = preset === '30' ? 30 : preset === '365' ? 365 : 90;
  from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(to) };
}

function rateLabel(value: number | null | undefined, empty: string) {
  return value == null ? empty : `${value}%`;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function ExecutiveDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = hasPermission(user?.permissions, 'analytics.executive');
  const [preset, setPreset] = useState('90');
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const range = useMemo(() => periodRange(preset), [preset]);
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en-GB';

  const load = () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get<ExecutiveDashboard>('/analytics/executive', { params: range })
      .then((response) => setData(response.data))
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, allowed]);

  const trendLabels = useMemo(() => {
    return (data?.trend ?? []).map((item) =>
      new Intl.DateTimeFormat(
        locale,
        item.grain === 'month'
          ? { month: 'short', year: '2-digit' }
          : { day: 'numeric', month: 'short' },
      ).format(new Date(item.start)),
    );
  }, [data?.trend, locale]);

  if (!allowed) {
    return <ErrorBanner message={t('executive.unauthorized')} />;
  }
  if (loading) {
    return <LoadingBlock />;
  }
  if (error) {
    return <ErrorBanner message={error} onRetry={load} />;
  }

  const current = data?.current;
  const period = data?.periodMetrics;
  const none = t('common.none');
  const days = (value: number | null | undefined) =>
    value == null ? none : t('executive.days', { value });
  const comparison = period?.comparison;
  const signals = buildSignals(data, t, i18n.language);

  return (
    <div className="stack">
      <PageHeader
        title={t('executive.title')}
        subtitle={t('executive.subtitle')}
        actions={
          <label className="field">
            <span>{t('executive.period')}</span>
            <SelectInput value={preset} onChange={(event) => setPreset(event.target.value)}>
              <option value="30">{t('executive.last30')}</option>
              <option value="90">{t('executive.last90')}</option>
              <option value="365">{t('executive.last365')}</option>
              <option value="all">{t('executive.allTime')}</option>
            </SelectInput>
          </label>
        }
      />

      {signals.length ? (
        <section className="card card-pad">
          <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
            {t('executive.signals')}
          </h2>
          <p className="hint">{t('executive.signalsHint')}</p>
          <ul className="signal-list">
            {signals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="hint">{t('executive.currentState')}</p>
      <div className="stats stats-wide">
        <KpiCard
          label={t('executive.active')}
          value={current?.active ?? 0}
          hint={
            current?.medianAgeDays == null
              ? undefined
              : t('executive.medianAge', { value: current.medianAgeDays })
          }
          tone="info"
          onClick={() => navigate(casesListPath({ status: 'open' }))}
        />
        <KpiCard
          label={t('executive.awaitingChairman')}
          value={current?.awaitingChairman ?? 0}
          hint={
            current?.chairmanMedianWaitDays == null
              ? undefined
              : t('executive.queueWait', { value: current.chairmanMedianWaitDays })
          }
          tone="warn"
          onClick={() =>
            navigate(casesListPath({ status: 'open', workflowState: 'awaiting_chairman' }))
          }
        />
        <KpiCard
          label={t('executive.overdue')}
          value={current?.overdue ?? 0}
          hint={t('executive.severeCount', { count: current?.severelyOverdue ?? 0 })}
          tone="danger"
          onClick={() => navigate(casesListPath({ status: 'open', timelineStatus: 'overdue' }))}
        />
        <KpiCard
          label={t('executive.compliance')}
          value={rateLabel(current?.timelineComplianceRate ?? null, none)}
          hint={t('executive.complianceHint')}
          tone="ok"
        />
        <KpiCard
          label={t('executive.inactive')}
          value={current?.inactive ?? 0}
          hint={t('executive.inactiveHint')}
          tone="warn"
          onClick={() => navigate(casesListPath({ status: 'open', inactiveDays: 14 }))}
        />
        <KpiCard
          label={t('executive.inExecution')}
          value={current?.inExecution ?? 0}
          hint={t('executive.stalledHint', { count: current?.stalledExecution ?? 0 })}
          tone="info"
          onClick={() => navigate(casesListPath({ status: 'open', workflowState: 'in_execution' }))}
        />
        <KpiCard
          label={t('executive.awaitingReport')}
          value={current?.awaitingReport ?? 0}
          tone="warn"
          onClick={() =>
            navigate(casesListPath({ status: 'open', workflowState: 'awaiting_report' }))
          }
        />
        <KpiCard
          label={t('executive.dueSoon')}
          value={current?.dueSoon ?? 0}
          tone="warn"
          onClick={() => navigate(casesListPath({ status: 'open', timelineStatus: 'due_soon' }))}
        />
      </div>

      <p className="hint">{t('executive.periodSnapshot')}</p>
      <div className="stats stats-wide">
        <KpiCard
          label={t('executive.created')}
          value={period?.created ?? 0}
          hint={comparison ? t('executive.vsPrevious', { value: signed(comparison.createdDelta) }) : undefined}
          tone="info"
          onClick={() => navigate(casesListPath({ dateFrom: range.from, dateTo: range.to }))}
        />
        <KpiCard
          label={t('executive.closed')}
          value={period?.closed ?? 0}
          hint={comparison ? t('executive.vsPrevious', { value: signed(comparison.closedDelta) }) : undefined}
          tone="neutral"
          onClick={() => navigate(casesListPath({ status: 'closed' }))}
        />
        <KpiCard
          label={t('executive.periodCompliance')}
          value={rateLabel(period?.timelineComplianceRate ?? null, none)}
          hint={
            comparison?.complianceDelta == null
              ? t('executive.periodComplianceHint')
              : t('executive.vsPreviousPct', { value: signed(comparison.complianceDelta) })
          }
          tone="ok"
        />
        <KpiCard
          label={t('executive.medianResolution')}
          value={days(period?.medianResolutionDays)}
          hint={t('executive.p90Resolution', { value: period?.p90ResolutionDays ?? none })}
        />
        <KpiCard
          label={t('executive.throughput')}
          value={rateLabel(period?.throughputRate ?? null, none)}
          hint={t('executive.throughputHint', { value: period?.netBacklog ?? 0 })}
          tone={(period?.netBacklog ?? 0) > 0 ? 'warn' : 'ok'}
        />
        <KpiCard
          label={t('executive.returnRate')}
          value={rateLabel(period?.returnRate ?? null, none)}
          hint={t('executive.returnHint', { count: period?.returns ?? 0 })}
          tone="warn"
        />
        <KpiCard
          label={t('executive.decisionsMade')}
          value={period?.decisions ?? 0}
          hint={t('executive.decisionWait', { value: period?.averageDaysToDecision ?? none })}
          tone="info"
        />
        <KpiCard
          label={t('executive.avgResolution')}
          value={days(period?.averageResolutionDays)}
          hint={t('executive.avgResolutionHint')}
        />
      </div>

      <div className="dash-grid dash-grid-wide">
        <section className="card card-pad stack chart-span">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.trend')}
            </h2>
            <p className="hint">{t('executive.trendHint')}</p>
          </div>
          <TrendChart
            empty={t('executive.emptyPeriod')}
            labels={trendLabels}
            series={[
              {
                key: 'created',
                label: t('executive.created'),
                values: (data?.trend ?? []).map((item) => item.created),
                tone: 'info',
              },
              {
                key: 'closed',
                label: t('executive.closed'),
                values: (data?.trend ?? []).map((item) => item.closed),
                tone: 'ok',
              },
              {
                key: 'decisions',
                label: t('executive.decisionsMade'),
                values: (data?.trend ?? []).map((item) => item.decisions),
                tone: 'accent',
              },
            ]}
          />
        </section>
        <section className="card card-pad stack">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.aging')}
            </h2>
            <p className="hint">{t('executive.agingHint')}</p>
          </div>
          <DonutChart
            empty={t('executive.agingEmpty')}
            center={t('executive.active')}
            items={(data?.aging ?? []).map((item) => ({
              key: item.bucket,
              label: t(`aging.${item.bucket}`),
              value: item.count,
              color:
                item.bucket === 'severely_overdue'
                  ? CHART_TONES.danger
                  : item.bucket === 'overdue'
                    ? '#c45b4a'
                    : item.bucket === 'approaching'
                      ? CHART_TONES.warn
                      : CHART_TONES.info,
            }))}
          />
        </section>
      </div>

      <div className="dash-grid">
        <section className="card card-pad stack">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.workflowMix')}
            </h2>
            <p className="hint">{t('executive.workflowMixHint')}</p>
          </div>
          <DonutChart
            empty={t('common.empty')}
            center={t('executive.active')}
            items={(data?.workflowMix ?? []).map((item) => ({
              key: item.state,
              label: t(`workflowState.${item.state}`),
              value: item.count,
            }))}
          />
        </section>
        <section className="card card-pad stack">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.decisionMix')}
            </h2>
            <p className="hint">{t('executive.decisionMixHint')}</p>
          </div>
          <DonutChart
            empty={t('executive.noDecisions')}
            center={t('executive.decisionsMade')}
            items={(data?.decisions ?? []).map((item) => ({
              key: item.type,
              label: t(`decision.${item.type}`),
              value: item.count,
              color:
                item.type === 'approval'
                  ? CHART_TONES.ok
                  : item.type === 'archive'
                    ? CHART_TONES.info
                    : CHART_TONES.warn,
            }))}
          />
        </section>
        <section className="card card-pad stack">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.composition')}
            </h2>
            <p className="hint">{t('executive.compositionHint')}</p>
          </div>
          <DonutChart
            empty={t('common.empty')}
            center={t('cases.type')}
            items={(data?.composition.types ?? []).map((item) => ({
              key: item.type,
              label: t(`type.${item.type}`),
              value: item.count,
            }))}
          />
          <DonutChart
            empty={t('common.empty')}
            center={t('cases.direction')}
            items={(data?.composition.directions ?? []).map((item) => ({
              key: item.direction,
              label: t(`direction.${item.direction}`),
              value: item.count,
            }))}
          />
        </section>
      </div>

      <section className="card">
        <div className="card-pad" style={{ borderBottom: '1px solid var(--line)' }}>
          <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
            {t('executive.attention')}
          </h2>
        </div>
        <AttentionTable items={data?.attention ?? []} empty={t('executive.attentionEmpty')} />
      </section>

      <div className="dash-grid">
        <section className="card card-pad stack">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.bottlenecks')}
            </h2>
            <p className="hint">{t('executive.bottlenecksHint')}</p>
          </div>
          <GroupedBarChart
            empty={t('common.empty')}
            series={[
              { key: 'waiting', label: t('executive.queue'), tone: 'info' },
              { key: 'overdue', label: t('dashboard.overdue'), tone: 'danger' },
            ]}
            items={(data?.stages ?? []).map((item) => ({
              key: item.stage,
              label: t(`stage.${item.stage}`),
              values: { waiting: item.waiting, overdue: item.overdueWaiting },
            }))}
            onSelect={(stage) => navigate(casesListPath({ status: 'open', currentStage: stage }))}
          />
          <MeterList
            empty={t('common.empty')}
            items={(data?.stages ?? []).map((item) => ({
              key: `${item.stage}-wait`,
              label: t(`stage.${item.stage}`),
              value: item.waiting,
              hint: [
                t('executive.waiting', { count: item.waiting }),
                t('executive.overdueWaiting', { count: item.overdueWaiting }),
                item.averageDays == null
                  ? t('executive.noStageSample')
                  : t('executive.avgStage', { days: item.averageDays }),
              ].join(' · '),
              tone: item.overdueWaiting > 0 ? 'danger' : 'accent',
              onClick: () => navigate(casesListPath({ status: 'open', currentStage: item.stage })),
            }))}
          />
        </section>
        <section className="card card-pad stack">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
              {t('executive.categoryVolume')}
            </h2>
            <p className="hint">{t('executive.categoriesHint')}</p>
          </div>
          <GroupedBarChart
            empty={t('executive.emptyPeriod')}
            series={[
              { key: 'active', label: t('dashboard.active'), tone: 'info' },
              { key: 'overdue', label: t('dashboard.overdue'), tone: 'danger' },
              { key: 'closed', label: t('executive.closed'), tone: 'ok' },
            ]}
            items={(data?.categories ?? []).map((item) => ({
              key: item.id,
              label: localizedName(i18n.language, item.nameEn, item.nameAr),
              values: {
                active: item.active,
                overdue: item.overdue,
                closed: item.closedInPeriod,
              },
            }))}
            onSelect={(categoryId) => navigate(casesListPath({ categoryId, status: 'open' }))}
          />
        </section>
      </div>

      <section className="card card-pad stack">
        <div>
          <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
            {t('executive.workload')}
          </h2>
          <p className="hint">{t('executive.workloadHint')}</p>
        </div>
        <GroupedBarChart
          empty={t('common.empty')}
          series={[
            { key: 'active', label: t('dashboard.active'), tone: 'info' },
            { key: 'overdue', label: t('dashboard.overdue'), tone: 'danger' },
            { key: 'execution', label: t('execution.title'), tone: 'warn' },
            { key: 'closed', label: t('executive.closed'), tone: 'ok' },
          ]}
          items={(data?.departments ?? []).map((item) => ({
            key: item.id,
            label: localizedName(i18n.language, item.nameEn, item.nameAr),
            values: {
              active: item.active,
              overdue: item.overdue,
              execution: item.awaitingExecution,
              closed: item.closedInPeriod,
            },
          }))}
          onSelect={(id) => navigate(casesListPath({ status: 'open', involvedDepartmentId: id }))}
        />
        <div>
          <h3 className="page-title" style={{ fontSize: '1rem' }}>
            {t('executive.heatmap')}
          </h3>
          <p className="hint">{t('executive.heatmapHint')}</p>
        </div>
        <HeatmapChart
          empty={t('common.empty')}
          columns={(data?.stages ?? []).map((item) => ({
            key: item.stage,
            label: t(`stage.${item.stage}`),
          }))}
          rows={(data?.heatmap ?? []).map((item) => ({
            key: item.id,
            label: localizedName(i18n.language, item.nameEn, item.nameAr),
            cells: item.stages.map((cell) => ({ key: cell.stage, value: cell.count })),
          }))}
          onSelect={(departmentId, stage) =>
            navigate(casesListPath({ status: 'open', involvedDepartmentId: departmentId, currentStage: stage }))
          }
        />
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('nav.departments')}</th>
                <th>{t('dashboard.active')}</th>
                <th>{t('dashboard.overdue')}</th>
                <th>{t('execution.title')}</th>
                <th>{t('executive.closed')}</th>
                <th>{t('executive.response')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.departments ?? []).map((item) => (
                <tr
                  key={item.id}
                  onClick={() =>
                    navigate(casesListPath({ status: 'open', involvedDepartmentId: item.id }))
                  }
                >
                  <td>{localizedName(i18n.language, item.nameEn, item.nameAr)}</td>
                  <td>{item.active}</td>
                  <td>{item.overdue}</td>
                  <td>{item.awaitingExecution}</td>
                  <td>{item.closedInPeriod}</td>
                  <td>
                    {item.averageResponseDays == null
                      ? none
                      : t('executive.days', { value: item.averageResponseDays })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{t('executive.performanceHint')}</p>
        <MeterList
          empty={t('executive.noPerformance')}
          items={(data?.departments ?? [])
            .filter((item) => item.active > 0)
            .map((item) => ({
              key: item.id,
              label: localizedName(i18n.language, item.nameEn, item.nameAr),
              value: item.overdue,
              hint:
                item.averageResponseDays == null
                  ? rateLabel(item.overdueRatio, none)
                  : `${rateLabel(item.overdueRatio, none)} · ${t('executive.days', {
                      value: item.averageResponseDays,
                    })}`,
              tone: (item.overdueRatio ?? 0) >= 40 ? 'danger' : 'warn',
              onClick: () =>
                navigate(casesListPath({ status: 'open', involvedDepartmentId: item.id })),
            }))}
        />
      </section>

      <section className="card card-pad stack">
        <div>
          <h2 className="page-title" style={{ fontSize: '1.1rem' }}>
            {t('executive.categories')}
          </h2>
          <p className="hint">{t('executive.categoriesHint')}</p>
        </div>
        {!data?.categories.length ? (
          <p className="muted">{t('executive.emptyPeriod')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('cases.category')}</th>
                  <th>{t('executive.created')}</th>
                  <th>{t('dashboard.active')}</th>
                  <th>{t('dashboard.overdue')}</th>
                  <th>{t('executive.periodCompliance')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.categories.map((item) => (
                  <tr key={item.id}>
                    <td>{localizedName(i18n.language, item.nameEn, item.nameAr)}</td>
                    <td>{item.createdInPeriod}</td>
                    <td>{item.active}</td>
                    <td>{item.overdue}</td>
                    <td>
                      {item.timelineComplianceRate == null
                        ? t('executive.noClosed')
                        : t('executive.closedOnTime', { rate: item.timelineComplianceRate })}
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(casesListPath({ categoryId: item.id, status: 'open' }))}
                      >
                        {t('common.view')}
                      </Button>
                    </td>
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

function buildSignals(
  data: ExecutiveDashboard | null,
  t: (key: string, options?: Record<string, unknown>) => string,
  language: string,
) {
  if (!data) {
    return [];
  }
  const items: string[] = [];
  const slowest = [...data.stages].sort(
    (left, right) => (right.averageDays ?? 0) - (left.averageDays ?? 0),
  )[0];
  const busiest = [...data.departments].sort((left, right) => right.active - left.active)[0];
  const riskiest = [...data.departments]
    .filter((item) => item.active > 0)
    .sort((left, right) => (right.overdueRatio ?? 0) - (left.overdueRatio ?? 0))[0];
  if (data.current.awaitingChairman) {
    items.push(
      t('executive.signalQueue', {
        count: data.current.awaitingChairman,
        days: data.current.chairmanMedianWaitDays ?? t('common.none'),
      }),
    );
  }
  if (slowest?.averageDays) {
    items.push(
      t('executive.signalStage', {
        stage: t(`stage.${slowest.stage}`),
        days: slowest.averageDays,
        overdue: slowest.overdueWaiting,
      }),
    );
  }
  if (riskiest) {
    items.push(
      t('executive.signalRisk', {
        department: localizedName(language, riskiest.nameEn, riskiest.nameAr),
        rate: riskiest.overdueRatio,
      }),
    );
  }
  if (busiest) {
    items.push(
      t('executive.signalLoad', {
        department: localizedName(language, busiest.nameEn, busiest.nameAr),
        count: busiest.active,
      }),
    );
  }
  if (data.current.stalledExecution) {
    items.push(t('executive.signalStalled', { count: data.current.stalledExecution }));
  }
  if (data.periodMetrics.netBacklog > 0) {
    items.push(t('executive.signalBacklog', { count: data.periodMetrics.netBacklog }));
  }
  return items.slice(0, 5);
}

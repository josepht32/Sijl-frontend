import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client';
import type { CaseRecord, Category, Department, Paginated } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { SelectInput } from '../components/Field';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { TimelineBadge } from '../components/TimelineBadge';
import { StageBadge, WorkflowStateBadge } from '../components/StageStepper';
import { Badge } from '../components/Badge';
import { formatDate, hasPermission, localizedName } from '../utils/format';
import { useAuth } from '../auth/AuthContext';

const FILTER_KEYS = [
  'search',
  'categoryId',
  'type',
  'timelineStatus',
  'dateFrom',
  'dateTo',
  'currentStage',
  'scope',
  'status',
  'workflowState',
  'involvedDepartmentId',
  'inactiveDays',
] as const;

type CaseFilters = Record<(typeof FILTER_KEYS)[number], string>;

const EMPTY_FILTERS: CaseFilters = {
  search: '',
  categoryId: '',
  type: '',
  timelineStatus: '',
  dateFrom: '',
  dateTo: '',
  currentStage: '',
  scope: '',
  status: '',
  workflowState: '',
  involvedDepartmentId: '',
  inactiveDays: '',
};

function filtersFromSearch(params: URLSearchParams): CaseFilters {
  const next = { ...EMPTY_FILTERS };
  FILTER_KEYS.forEach((key) => {
    next[key] = params.get(key) ?? '';
  });
  return next;
}

function searchFromFilters(filters: CaseFilters) {
  const params = new URLSearchParams();
  FILTER_KEYS.forEach((key) => {
    if (filters[key]) {
      params.set(key, filters[key]);
    }
  });
  return params;
}

export function CasesListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canReadAll = hasPermission(user?.permissions, 'cases.read_all');
  const queryKey = searchParams.toString();
  const applied = useMemo(() => filtersFromSearch(searchParams), [queryKey]);
  const [filters, setFilters] = useState<CaseFilters>(applied);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<CaseRecord> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setFilters(applied);
    setPage(1);
    // Reset paging when the URL filter set changes, not when local form state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    Promise.all([
      api.get<Category[]>('/categories?active=true'),
      api.get<Department[]>('/departments'),
    ]).then(([cats, depts]) => {
      setCategories(cats.data);
      setDepartments(depts.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = { page, pageSize: 12 };
    if (applied.search) params.search = applied.search;
    if (applied.categoryId) params.categoryId = applied.categoryId;
    if (applied.type) params.type = applied.type;
    if (applied.timelineStatus) params.timelineStatus = applied.timelineStatus;
    if (applied.dateFrom) params.dateFrom = applied.dateFrom;
    if (applied.dateTo) params.dateTo = applied.dateTo;
    if (applied.currentStage) params.currentStage = applied.currentStage;
    if (applied.scope) params.scope = applied.scope;
    if (applied.status) params.status = applied.status;
    if (applied.workflowState) params.workflowState = applied.workflowState;
    if (applied.involvedDepartmentId) params.involvedDepartmentId = applied.involvedDepartmentId;
    if (applied.inactiveDays) params.inactiveDays = Number(applied.inactiveDays);

    api
      .get<Paginated<CaseRecord>>('/cases', { params })
      .then((response) => setData(response.data))
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  }, [applied, page, t]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchParams(searchFromFilters(filters));
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title={t('cases.title')}
        subtitle={t('cases.subtitle')}
        actions={
          <Button type="button" onClick={() => navigate('/cases/new')}>
            <Plus size={16} />
            {t('cases.new')}
          </Button>
        }
      />
      <form className="filters" onSubmit={onSearch}>
        <div className="field">
          <label htmlFor="scope">{t('cases.scope')}</label>
          <SelectInput
            id="scope"
            value={filters.scope}
            onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value }))}
          >
            <option value="">{t('common.all')}</option>
            <option value="mine">{t('cases.scopeMine')}</option>
            <option value="department">{t('cases.scopeDepartment')}</option>
            <option value="assigned">{t('cases.scopeAssigned')}</option>
            <option value="granted">{t('cases.scopeGranted')}</option>
            {canReadAll ? <option value="all">{t('cases.scopeAll')}</option> : null}
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="search">{t('common.search')}</label>
          <input
            id="search"
            value={filters.search}
            placeholder={t('cases.searchPlaceholder')}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="category">{t('cases.category')}</label>
          <SelectInput
            id="category"
            value={filters.categoryId}
            onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
          >
            <option value="">{t('common.all')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {localizedName(i18n.language, category.nameEn, category.nameAr)}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="type">{t('cases.type')}</label>
          <SelectInput
            id="type"
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="">{t('common.all')}</option>
            <option value="internal">{t('type.internal')}</option>
            <option value="external">{t('type.external')}</option>
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="timeline">{t('cases.timeline')}</label>
          <SelectInput
            id="timeline"
            value={filters.timelineStatus}
            onChange={(event) =>
              setFilters((current) => ({ ...current, timelineStatus: event.target.value }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="on_track">{t('timeline.on_track')}</option>
            <option value="due_soon">{t('timeline.due_soon')}</option>
            <option value="overdue">{t('timeline.overdue')}</option>
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="stage">{t('cases.stage')}</label>
          <SelectInput
            id="stage"
            value={filters.currentStage}
            onChange={(event) =>
              setFilters((current) => ({ ...current, currentStage: event.target.value }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="secretariat">{t('stage.secretariat')}</option>
            <option value="studies_committee">{t('stage.studies_committee')}</option>
            <option value="technical_office">{t('stage.technical_office')}</option>
            <option value="chairman">{t('stage.chairman')}</option>
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="dateFrom">{t('cases.createdAt')}</label>
          <input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="dateTo">{t('cases.createdTo')}</label>
          <input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="status">{t('cases.status')}</label>
          <SelectInput
            id="status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">{t('common.all')}</option>
            <option value="open">{t('status.open')}</option>
            <option value="closed">{t('status.closed')}</option>
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="workflowState">{t('cases.workflowState')}</label>
          <SelectInput
            id="workflowState"
            value={filters.workflowState}
            onChange={(event) =>
              setFilters((current) => ({ ...current, workflowState: event.target.value }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="in_review">{t('workflowState.in_review')}</option>
            <option value="awaiting_info">{t('workflowState.awaiting_info')}</option>
            <option value="awaiting_chairman">{t('workflowState.awaiting_chairman')}</option>
            <option value="awaiting_report">{t('workflowState.awaiting_report')}</option>
            <option value="in_execution">{t('workflowState.in_execution')}</option>
            <option value="completed">{t('workflowState.completed')}</option>
            <option value="archived">{t('workflowState.archived')}</option>
          </SelectInput>
        </div>
        <div className="field">
          <label htmlFor="involvedDepartment">{t('cases.involvedDepartment')}</label>
          <SelectInput
            id="involvedDepartment"
            value={filters.involvedDepartmentId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, involvedDepartmentId: event.target.value }))
            }
          >
            <option value="">{t('common.all')}</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {localizedName(i18n.language, department.nameEn, department.nameAr)}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="toolbar">
          <Button type="submit" variant="secondary">
            {t('common.filter')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setSearchParams(new URLSearchParams());
              setPage(1);
            }}
          >
            {t('common.reset')}
          </Button>
        </div>
      </form>
      {applied.inactiveDays ? (
        <p className="hint">{t('cases.inactiveFilter', { days: applied.inactiveDays })}</p>
      ) : null}

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !error && !data?.items.length ? <EmptyState message={t('cases.empty')} /> : null}

      {!loading && data && data.items.length > 0 ? (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('cases.reference')}</th>
                  <th>{t('cases.subject')}</th>
                  <th>{t('cases.category')}</th>
                  <th>{t('cases.stage')}</th>
                  <th>{t('cases.status')}</th>
                  <th>{t('cases.dueDate')}</th>
                  <th>{t('cases.lastUpdate')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/cases/${item.id}`)}>
                    <td className="mono">{item.referenceNumber}</td>
                    <td>{item.title}</td>
                    <td>{localizedName(i18n.language, item.categoryNameEn, item.categoryNameAr)}</td>
                    <td>
                      <div className="stack" style={{ gap: '0.25rem' }}>
                        {item.currentStage ? <StageBadge stage={item.currentStage} /> : t('common.none')}
                        {item.workflowState ? <WorkflowStateBadge state={item.workflowState} /> : null}
                      </div>
                    </td>
                    <td>
                      <Badge tone={item.status === 'open' ? 'info' : 'neutral'}>
                        {t(`status.${item.status}`)}
                      </Badge>
                    </td>
                    <td>
                      <div className="stack" style={{ gap: '0.25rem' }}>
                        <span>{formatDate(item.dueDate, i18n.language)}</span>
                        <TimelineBadge status={item.timelineStatus} />
                      </div>
                    </td>
                    <td>{formatDate(item.lastActivityAt, i18n.language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {data.page} {t('common.of')} {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              {t('common.previous')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

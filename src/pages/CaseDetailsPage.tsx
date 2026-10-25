import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type {
  AuthUser,
  CaseDecisionRecord,
  CaseDocument,
  CaseGrantRecord,
  CaseMovementRecord,
  CaseRecord,
  CaseRelationRecord,
  ConcernedDepartmentRecord,
  DecisionType,
  Department,
  ExecutionActivityRecord,
  Paginated,
  RelatedCaseSuggestion,
  RelatedMatchField,
} from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { TimelineBadge } from '../components/TimelineBadge';
import { StageBadge, StageStepper, WorkflowStateBadge } from '../components/StageStepper';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { Modal } from '../components/Modal';
import { Field, SelectInput, TextArea, TextInput } from '../components/Field';
import { SignaturePad } from '../components/SignaturePad';
import { formatBytes, formatDate, formatDateTime, localizedName } from '../utils/format';
import { htmlHasContent } from '../utils/html';
import { DocumentComposer } from '../components/DocumentComposer';
import { useAuth } from '../auth/AuthContext';

function fileExtension(name: string) {
  const match = /\.([^.]+)$/.exec(name || '');
  return match ? match[1].toLowerCase() : '';
}

function downloadFileName(document: CaseDocument, disposition: string) {
  const starred = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const quoted = /filename="([^"]+)"/i.exec(disposition);
  const encoded = starred?.[1] || quoted?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  if (document.watermarkSupported && !document.mimeType.startsWith('image/')) {
    return document.originalFileName.replace(/\.[^.]+$/, '') + '.pdf';
  }
  return document.originalFileName;
}

function canPreview(document: CaseDocument) {
  if (document.mimeType.startsWith('image/') || document.mimeType === 'application/pdf') {
    return true;
  }
  if (document.watermarkSupported) {
    return true;
  }
  const ext = fileExtension(document.originalFileName);
  return (
    ext === 'txt' ||
    ext === 'md' ||
    ext === 'markdown' ||
    ext === 'docx' ||
    document.mimeType === 'text/plain' ||
    document.mimeType === 'text/markdown' ||
    document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

function matchFieldLabel(field: RelatedMatchField, t: (key: string) => string) {
  if (field === 'subject') {
    return t('workflow.matchedSubject');
  }
  if (field === 'summary') {
    return t('workflow.matchedSummary');
  }
  return t('workflow.matchedDocuments');
}

type ActionKind = 'forward' | 'return' | 'resubmit';
type ReturnDestination = 'originator' | 'department' | 'previous_stage';
type Panel = 'history' | 'execution';

const DECISION_TYPES: DecisionType[] = ['approval', 'archive', 'request_detailed_report'];

export function CaseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [history, setHistory] = useState<CaseMovementRecord[]>([]);
  const [relations, setRelations] = useState<CaseRelationRecord[]>([]);
  const [decisions, setDecisions] = useState<CaseDecisionRecord[]>([]);
  const [concerned, setConcerned] = useState<ConcernedDepartmentRecord[]>([]);
  const [activities, setActivities] = useState<ExecutionActivityRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [instruction, setInstruction] = useState('');
  const [returnTo, setReturnTo] = useState<ReturnDestination>('originator');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<CaseRecord[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<RelatedCaseSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [attachingId, setAttachingId] = useState('');
  const [linkCaseId, setLinkCaseId] = useState('');
  const [linkDocs, setLinkDocs] = useState<CaseDocument[]>([]);
  const [panel, setPanel] = useState<Panel>('history');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<DecisionType>('approval');
  const [decisionDepts, setDecisionDepts] = useState<string[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityComment, setActivityComment] = useState('');
  const [addDeptId, setAddDeptId] = useState('');
  const [grants, setGrants] = useState<CaseGrantRecord[]>([]);
  const [people, setPeople] = useState<AuthUser[]>([]);
  const [grantUserId, setGrantUserId] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [signEmpty, setSignEmpty] = useState(true);
  const [signDataUrl, setSignDataUrl] = useState('');
  const [signConfirmed, setSignConfirmed] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeHtml, setWriteHtml] = useState('');
  const [composeError, setComposeError] = useState('');

  const load = () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      api.get<CaseRecord>(`/cases/${id}`),
      api.get<CaseMovementRecord[]>(`/cases/${id}/history`),
      api.get<CaseRelationRecord[]>(`/cases/${id}/relations`),
      api.get<CaseDecisionRecord[]>(`/cases/${id}/decisions`),
      api.get<ConcernedDepartmentRecord[]>(`/cases/${id}/departments`),
      api.get<ExecutionActivityRecord[]>(`/cases/${id}/activities`),
      api.get<Department[]>('/departments'),
    ])
      .then(([caseRes, historyRes, relationsRes, decisionsRes, deptsRes, activitiesRes, orgDepts]) => {
        setRecord(caseRes.data);
        setHistory(historyRes.data);
        setRelations(relationsRes.data);
        setDecisions(decisionsRes.data);
        setConcerned(deptsRes.data);
        setActivities(activitiesRes.data);
        setDepartments(orgDepts.data);
        const docs = caseRes.data.documents ?? [];
        setSelectedId((current) =>
          current && docs.some((document) => document.id === current)
            ? current
            : (docs[0]?.id ?? null),
        );
        if (caseRes.data.canManageAccess) {
          void Promise.all([
            api.get<CaseGrantRecord[]>(`/cases/${id}/grants`),
            api.get<AuthUser[]>('/users'),
          ])
            .then(([grantRes, peopleRes]) => {
              setGrants(grantRes.data);
              setPeople(peopleRes.data);
            })
            .catch(() => {
              setGrants([]);
            });
        } else {
          setGrants([]);
        }
        if (
          caseRes.data.workflowState === 'in_execution' ||
          caseRes.data.workflowState === 'awaiting_report'
        ) {
          setPanel('execution');
        }
      })
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const query = linkSearch.trim();
    if (!id || !query) {
      setLinkResults([]);
      setLinkSearching(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLinkSearching(true);
    const timer = window.setTimeout(() => {
      api
        .get<Paginated<CaseRecord>>('/cases', {
          params: { search: query, pageSize: 8 },
          signal: controller.signal,
        })
        .then((response) => {
          if (!active) {
            return;
          }
          setLinkResults(response.data.items.filter((item) => item.id !== id));
        })
        .catch((err: { code?: string }) => {
          if (!active || err?.code === 'ERR_CANCELED') {
            return;
          }
          setLinkResults([]);
        })
        .finally(() => {
          if (active) {
            setLinkSearching(false);
          }
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [id, linkSearch]);

  const selected = useMemo(
    () => record?.documents?.find((document) => document.id === selectedId) ?? null,
    [record, selectedId],
  );

  const linkedCaseKey = relations
    .filter((relation) => relation.type === 'case')
    .map((relation) => relation.relatedCase?.id)
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    if (!id || !record) {
      setSuggestions([]);
      return;
    }
    if (record.status === 'closed' || record.workflowState === 'archived') {
      setSuggestions([]);
      return;
    }
    let active = true;
    setSuggestionsLoading(true);
    api
      .get<RelatedCaseSuggestion[]>(`/cases/${id}/related-suggestions`)
      .then((response) => {
        if (active) {
          setSuggestions(response.data);
        }
      })
      .catch(() => {
        if (active) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (active) {
          setSuggestionsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, record, linkedCaseKey]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    if (!selected || !canPreview(selected)) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewUrl(null);
    api
      .get(`/documents/${selected.id}/file`, { responseType: 'blob' })
      .then((response) => {
        if (!active) {
          return;
        }
        objectUrl = URL.createObjectURL(response.data);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) {
          setPreviewUrl(null);
        }
      })
      .finally(() => {
        if (active) {
          setPreviewLoading(false);
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selected]);

  const upload = async (list: FileList | null) => {
    if (!list?.length || !id) {
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(list).forEach((file) => form.append('files', file));
      await api.post(`/cases/${id}/documents`, form);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.uploadFailed')));
    } finally {
      setUploading(false);
    }
  };

  const openWriteDocument = () => {
    setWriteTitle('');
    setWriteHtml('');
    setComposeError('');
    setWriteOpen(true);
  };

  const submitComposedDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) {
      return;
    }
    if (!htmlHasContent(writeHtml)) {
      setComposeError(t('cases.writeEmpty'));
      return;
    }
    setUploading(true);
    setComposeError('');
    try {
      await api.post(`/cases/${id}/documents/compose`, {
        html: writeHtml,
        title: writeTitle.trim() || undefined,
        rtl: i18n.language.startsWith('ar'),
      });
      setWriteOpen(false);
      setWriteHtml('');
      setWriteTitle('');
      load();
    } catch (err) {
      setComposeError(apiErrorMessage(err, t('errors.composeFailed')));
    } finally {
      setUploading(false);
    }
  };

  const download = async (document: CaseDocument) => {
    const response = await api.get(`/documents/${document.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = downloadFileName(
      document,
      String(response.headers['content-disposition'] || ''),
    );
    link.click();
    URL.revokeObjectURL(url);
  };

  const grantAccess = async () => {
    if (!id || !grantUserId) {
      return;
    }
    try {
      await api.post(`/cases/${id}/grants`, { userId: grantUserId });
      setGrantUserId('');
      const grantsRes = await api.get<CaseGrantRecord[]>(`/cases/${id}/grants`);
      setGrants(grantsRes.data);
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.grantFailed')));
    }
  };

  const revokeAccess = async (grantId: string) => {
    if (!id) {
      return;
    }
    try {
      await api.delete(`/cases/${id}/grants/${grantId}`);
      setGrants((current) => current.filter((grant) => grant.id !== grantId));
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.grantFailed')));
    }
  };

  const openSign = () => {
    setSignEmpty(true);
    setSignDataUrl('');
    setSignConfirmed(false);
    setSignOpen(true);
  };

  const submitSignature = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || signEmpty || !signDataUrl || !signConfirmed) {
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post<CaseDocument>(`/documents/${selected.id}/sign`, {
        signatureDataUrl: signDataUrl,
      });
      setSignOpen(false);
      setSelectedId(response.data.id);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.signFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (kind: ActionKind) => {
    setAction(kind);
    setInstruction('');
    setFiles(null);
    setReturnTo(record?.previousStage ? 'previous_stage' : 'originator');
  };

  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !action) {
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('instruction', instruction);
      if (action === 'return') {
        form.append('returnTo', returnTo);
      }
      if (files?.length) {
        Array.from(files).forEach((file) => form.append('files', file));
      }
      const response = await api.post<CaseRecord>(`/cases/${id}/${action}`, form);
      setAction(null);
      setRecord(response.data);
      const stillAssigned =
        user?.role === 'admin' ||
        user?.id === response.data.createdById ||
        user?.id === response.data.assignedToId ||
        user?.workflowStages?.includes(response.data.currentStage) ||
        response.data.returnedToUserId === user?.id ||
        (user?.departmentId &&
          response.data.returnedToDepartmentId === user.departmentId);
      if (!stillAssigned) {
        navigate('/cases');
        return;
      }
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.actionFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const submitDecision = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) {
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('type', decisionType);
      form.append('instruction', instruction);
      if (decisionType !== 'archive') {
        decisionDepts.forEach((deptId) => form.append('departmentIds', deptId));
      }
      if (files?.length) {
        Array.from(files).forEach((file) => form.append('files', file));
      }
      await api.post(`/cases/${id}/decisions`, form);
      setDecisionOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.actionFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const submitActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) {
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('comment', activityComment);
      if (files?.length) {
        Array.from(files).forEach((file) => form.append('files', file));
      }
      await api.post(`/cases/${id}/activities`, form);
      setActivityOpen(false);
      setActivityComment('');
      setFiles(null);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.actionFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const linkCase = async (relatedCaseId: string) => {
    if (!id) {
      return;
    }
    setAttachingId(relatedCaseId);
    try {
      await api.post(`/cases/${id}/relations`, { type: 'case', relatedCaseId });
      setLinkSearch('');
      setLinkResults([]);
      setLinkCaseId('');
      setLinkDocs([]);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.actionFailed')));
    } finally {
      setAttachingId('');
    }
  };

  const chooseCaseForDocument = async (relatedCaseId: string) => {
    setLinkCaseId(relatedCaseId);
    const response = await api.get<CaseRecord>(`/cases/${relatedCaseId}`);
    setLinkDocs(response.data.documents ?? []);
  };

  const linkDocument = async (relatedDocumentId: string) => {
    if (!id) {
      return;
    }
    await api.post(`/cases/${id}/relations`, { type: 'document', relatedDocumentId });
    setLinkDocs([]);
    setLinkCaseId('');
    load();
  };

  if (loading) {
    return <LoadingBlock />;
  }
  if (error && !record) {
    return <ErrorBanner message={error} onRetry={load} />;
  }
  if (!record) {
    return <EmptyState message={t('common.empty')} />;
  }

  const language = i18n.language;
  const source =
    record.type === 'internal'
      ? localizedName(
          language,
          record.sourceDepartment?.nameEn,
          record.sourceDepartment?.nameAr,
        ) || t('common.none')
      : record.sourceEntity || t('common.none');

  const actions = record.availableActions ?? [];
  const decisionTypes = record.availableDecisionTypes ?? [];
  const latestDecision = decisions[0] ?? null;
  const latestReturn = [...history].reverse().find((item) => item.action === 'return');
  const lastMovement = history[history.length - 1];
  const returnedToPrevious =
    lastMovement?.action === 'return' && lastMovement.returnTarget === 'previous_stage';
  const showReturnBanner = record.workflowState === 'awaiting_info' || returnedToPrevious;
  const originalDocs = (record.documents ?? []).filter(
    (doc) => doc.source !== 'signed' && doc.source !== 'movement' && doc.source !== 'decision' && doc.source !== 'execution',
  );
  const movementDocs = (record.documents ?? []).filter(
    (doc) => doc.source === 'movement' || doc.source === 'decision',
  );
  const executionDocs = (record.documents ?? []).filter((doc) => doc.source === 'execution');
  const signedDocs = (record.documents ?? []).filter((doc) => doc.source === 'signed');
  const grantCandidates = people.filter(
    (person) =>
      person.id !== user?.id &&
      person.isActive &&
      !grants.some((grant) => grant.user?.id === person.id),
  );
  const eventLabel: Record<string, string> = {
    created: t('workflow.createdEvent'),
    forward: t('workflow.forwardEvent'),
    return: t('workflow.returnEvent'),
    resubmit: t('workflow.resubmitEvent'),
    decision: t('workflow.decisionEvent'),
  };
  const needsDepartments = decisionType !== 'archive';
  const availableToAdd = departments.filter(
    (department) => !concerned.some((item) => item.departmentId === department.id),
  );
  const executionTitle =
    record.workflowState === 'awaiting_report' ? t('execution.reportTitle') : t('execution.title');
  const executionSubtitle =
    record.workflowState === 'awaiting_report' ? t('execution.reportSubtitle') : t('execution.subtitle');
  const closed = record.status === 'closed' || record.workflowState === 'archived';

  const renderDocList = (docs: CaseDocument[], label: string) =>
    docs.length ? (
      <>
        <p className="hint">{label}</p>
        {docs.map((document) => (
          <button
            key={document.id}
            type="button"
            className={`doc-item ${selectedId === document.id ? 'active' : ''}`}
            onClick={() => setSelectedId(document.id)}
          >
            <strong className="file-name">{document.originalFileName}</strong>
            <span className="hint">
              {formatBytes(document.sizeBytes, language)} · {formatDateTime(document.uploadedAt, language)}
            </span>
            {document.signedStatus === 'signed' ? (
              <Badge tone="ok">{t('signing.signed')}</Badge>
            ) : null}
            {document.signedStatus === 'signed_copy' ? (
              <Badge tone="info">{t('signing.signedCopy')}</Badge>
            ) : null}
          </button>
        ))}
      </>
    ) : null;

  return (
    <div className="stack">
      <PageHeader
        kicker={record.referenceNumber}
        title={record.title}
        subtitle={t('cases.details')}
        actions={
          <div className="toolbar">
            {actions.includes('forward') ? (
              <Button type="button" onClick={() => openAction('forward')}>
                {t('workflow.forward')}
              </Button>
            ) : null}
            {actions.includes('return') ? (
              <Button type="button" variant="secondary" onClick={() => openAction('return')}>
                {t('workflow.return')}
              </Button>
            ) : null}
            {actions.includes('resubmit') ? (
              <Button type="button" onClick={() => openAction('resubmit')}>
                {t('workflow.resubmit')}
              </Button>
            ) : null}
            {decisionTypes.length ? (
              <Button
                type="button"
                onClick={() => {
                  setDecisionOpen(true);
                  setDecisionType(decisionTypes[0]);
                  setInstruction('');
                  setFiles(null);
                  setDecisionDepts(concerned.map((item) => item.departmentId));
                }}
              >
                {t('decision.record')}
              </Button>
            ) : null}
          </div>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}

      <section className="card card-pad">
        <StageStepper current={record.currentStage} workflowState={record.workflowState} />
        {showReturnBanner ? (
          <div className="callout warn return-banner">
            <p>
              {returnedToPrevious
                ? t('workflow.returnedToPrevious', {
                    stage: lastMovement?.toStage
                      ? t(`stage.${lastMovement.toStage}`)
                      : t('common.none'),
                  })
                : t('workflow.awaitingInfo')}
              {!returnedToPrevious && (record.returnedToUser || record.returnedToDepartment)
                ? ` ${t('workflow.waitingOn', {
                    name:
                      localizedName(
                        language,
                        record.returnedToUser?.nameEn || record.returnedToDepartment?.nameEn,
                        record.returnedToUser?.nameAr || record.returnedToDepartment?.nameAr,
                      ) || t('common.none'),
                  })}`
                : ''}
            </p>
            {latestReturn?.instruction ? (
              <blockquote className="return-request">
                <p className="return-request-label">{t('workflow.currentRequest')}</p>
                <p className="return-request-meta">
                  {t('workflow.returnRequestedBy', {
                    name:
                      localizedName(
                        language,
                        latestReturn.performedBy?.nameEn,
                        latestReturn.performedBy?.nameAr,
                      ) || t('common.none'),
                    stage: latestReturn.fromStage
                      ? t(`stage.${latestReturn.fromStage}`)
                      : t('common.none'),
                  })}
                  {latestReturn.createdAt
                    ? ` · ${formatDateTime(latestReturn.createdAt, language)}`
                    : ''}
                </p>
                <p className="return-request-body">{latestReturn.instruction}</p>
              </blockquote>
            ) : null}
          </div>
        ) : null}
        {record.workflowState === 'awaiting_chairman' ? (
          <p className="callout">{t('workflow.awaitingChairman')}</p>
        ) : null}
        {record.workflowState === 'awaiting_report' ? (
          <p className="callout warn">{t('workflow.awaitingReport')}</p>
        ) : null}
        {record.workflowState === 'in_execution' ? (
          <p className="callout">{t('workflow.inExecution')}</p>
        ) : null}
        {record.workflowState === 'archived' ? (
          <p className="callout warn">{t('workflow.archived')}</p>
        ) : null}
        {!actions.length && !decisionTypes.length && record.workflowState === 'in_review' ? (
          <p className="hint">{t('workflow.noActions')}</p>
        ) : null}

        <div className="case-hero">
          <div>
            <div className="ref-chip">{record.referenceNumber}</div>
            <h2 className="page-title" style={{ fontSize: '1.4rem', marginTop: '0.35rem' }}>
              {record.title}
            </h2>
          </div>
          <div className="toolbar">
            <StageBadge stage={record.currentStage} />
            <WorkflowStateBadge state={record.workflowState} />
            <Badge tone={record.status === 'open' ? 'info' : 'neutral'}>
              {t(`status.${record.status}`)}
            </Badge>
            <TimelineBadge status={record.timelineStatus} />
          </div>
        </div>
        <dl className="meta-grid">
          <div className="meta-item">
            <dt>{t('workflow.current')}</dt>
            <dd>{t(`stage.${record.currentStage}`)}</dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.workflowState')}</dt>
            <dd>{t(`workflowState.${record.workflowState}`)}</dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.category')}</dt>
            <dd>{localizedName(language, record.categoryNameEn, record.categoryNameAr)}</dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.classification')}</dt>
            <dd>
              {t(`type.${record.type}`)} · {t(`direction.${record.direction}`)}
            </dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.source')}</dt>
            <dd>{source}</dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.dueDate')}</dt>
            <dd>{formatDate(record.dueDate, language)}</dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.createdBy')}</dt>
            <dd>{localizedName(language, record.createdBy?.nameEn, record.createdBy?.nameAr)}</dd>
          </div>
          <div className="meta-item">
            <dt>{t('cases.createdAt')}</dt>
            <dd>{formatDateTime(record.createdAt, language)}</dd>
          </div>
        </dl>
        {record.description ? (
          <p style={{ marginTop: '1.1rem', maxWidth: '46rem' }}>{record.description}</p>
        ) : null}
      </section>

      {latestDecision ? (
        <section className="card card-pad stack">
          <h2 className="page-title" style={{ fontSize: '1.15rem' }}>
            {t('decision.title')}
          </h2>
          <div className="toolbar">
            <Badge tone="info">{t(`decision.${latestDecision.type}`)}</Badge>
            <span className="hint">{formatDateTime(latestDecision.createdAt, language)}</span>
          </div>
          <p className="hint">
            {t('workflow.by')}{' '}
            {localizedName(language, latestDecision.performedBy?.nameEn, latestDecision.performedBy?.nameAr)}
          </p>
          <div className="history-instruction">{latestDecision.instruction}</div>
        </section>
      ) : null}

      <section className="card card-pad stack">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 className="page-title" style={{ fontSize: '1.15rem' }}>
            {t('concerned.title')}
          </h2>
        </div>
        {!concerned.length ? <EmptyState message={t('concerned.empty')} /> : null}
        <div className="dept-chips">
          {concerned.map((item) => (
            <span key={item.id} className="dept-chip">
              {localizedName(language, item.department?.nameEn, item.department?.nameAr)}
              {record.canManageDepartments ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    void api.delete(`/cases/${id}/departments/${item.departmentId}`).then(load);
                  }}
                >
                  {t('concerned.remove')}
                </button>
              ) : null}
            </span>
          ))}
        </div>
        {record.canManageDepartments && availableToAdd.length ? (
          <div className="toolbar">
            <SelectInput value={addDeptId} onChange={(event) => setAddDeptId(event.target.value)}>
              <option value="">{t('concerned.select')}</option>
              {availableToAdd.map((department) => (
                <option key={department.id} value={department.id}>
                  {localizedName(language, department.nameEn, department.nameAr)}
                </option>
              ))}
            </SelectInput>
            <Button
              type="button"
              variant="secondary"
              disabled={!addDeptId}
              onClick={() => {
                void api
                  .post(`/cases/${id}/departments`, { departmentId: addDeptId })
                  .then(() => {
                    setAddDeptId('');
                    load();
                  });
              }}
            >
              {t('concerned.add')}
            </Button>
          </div>
        ) : null}
      </section>

      {record.canManageAccess ? (
        <section className="card card-pad stack">
          <h2 className="page-title" style={{ fontSize: '1.15rem' }}>
            {t('access.title')}
          </h2>
          {!grants.length ? <EmptyState message={t('access.empty')} /> : null}
          <div className="access-list">
            {grants.map((grant) => (
              <div key={grant.id} className="access-row">
                <div>
                  <strong>
                    {localizedName(language, grant.user?.nameEn, grant.user?.nameAr) || t('access.grantedTo')}
                  </strong>
                  <p className="hint">{formatDateTime(grant.createdAt, language)}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => void revokeAccess(grant.id)}>
                  {t('access.revoke')}
                </Button>
              </div>
            ))}
          </div>
          {grantCandidates.length ? (
            <div className="toolbar">
              <SelectInput value={grantUserId} onChange={(event) => setGrantUserId(event.target.value)}>
                <option value="">{t('access.selectUser')}</option>
                {grantCandidates.map((person) => (
                  <option key={person.id} value={person.id}>
                    {localizedName(language, person.nameEn, person.nameAr)}
                  </option>
                ))}
              </SelectInput>
              <Button type="button" variant="secondary" disabled={!grantUserId} onClick={() => void grantAccess()}>
                {t('access.grant')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="card card-pad stack">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2 className="page-title" style={{ fontSize: '1.15rem' }}>
            {t('cases.documents')}
          </h2>
          {!closed ? (
            <div className="toolbar">
              <label className="btn btn-secondary">
                {uploading && !writeOpen ? t('common.loading') : t('common.attach')}
                <input
                  type="file"
                  multiple
                  hidden
                  disabled={uploading}
                  onChange={(event) => {
                    void upload(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
              <Button type="button" variant="secondary" disabled={uploading} onClick={openWriteDocument}>
                {t('cases.writeDocument')}
              </Button>
            </div>
          ) : null}
        </div>
        {!record.documents?.length ? (
          <EmptyState message={t('cases.noDocuments')} />
        ) : (
          <div className="docs-layout">
            <div className="stack">
              {renderDocList(originalDocs, t('cases.originalDocuments'))}
              {renderDocList(movementDocs, t('cases.movementDocuments'))}
              {renderDocList(executionDocs, t('cases.executionDocuments'))}
              {renderDocList(signedDocs, t('cases.signedDocuments'))}
            </div>
            <div className="card card-pad stack" style={{ boxShadow: 'none' }}>
              {selected ? (
                <>
                  <div className="toolbar">
                    <strong className="file-name">{selected.originalFileName}</strong>
                    {selected.signedStatus === 'signed' ? (
                      <Badge tone="ok">{t('signing.signed')}</Badge>
                    ) : null}
                    {selected.signedStatus === 'signed_copy' ? (
                      <Badge tone="info">{t('signing.signedCopy')}</Badge>
                    ) : null}
                    {selected.signedVersionId ? (
                      <Button type="button" variant="secondary" onClick={() => setSelectedId(selected.signedVersionId!)}>
                        {t('signing.viewSigned')}
                      </Button>
                    ) : null}
                    {record.canSignDocuments &&
                    selected.signedStatus === 'unsigned' &&
                    selected.mimeType === 'application/pdf' ? (
                      <Button type="button" onClick={openSign}>
                        {t('signing.sign')}
                      </Button>
                    ) : null}
                    <Button type="button" variant="secondary" onClick={() => void download(selected)}>
                      {t('common.download')}
                    </Button>
                  </div>
                  {selected.watermarkSupported ? (
                    <p className="hint">{t('documents.watermarkedDownload')}</p>
                  ) : null}
                  {previewLoading ? (
                    <p className="hint">{t('documents.preparingPreview')}</p>
                  ) : canPreview(selected) && previewUrl ? (
                    selected.mimeType.startsWith('image/') ? (
                      <img className="preview-image" src={previewUrl} alt={selected.originalFileName} />
                    ) : (
                      <iframe className="preview-frame" title={selected.originalFileName} src={previewUrl} />
                    )
                  ) : (
                    <p className="muted">{t('common.noPreview')}</p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="card card-pad stack related-section">
        <h2 className="page-title" style={{ fontSize: '1.15rem' }}>
          {t('workflow.related')}
        </h2>
        {!relations.length ? <EmptyState message={t('workflow.relatedEmpty')} /> : null}
        <div className="related-list">
          {relations.map((relation) => (
            <div key={relation.id} className="related-item">
              <div className="related-item-main">
                {relation.type === 'case' && relation.relatedCase ? (
                  <Link to={`/cases/${relation.relatedCase.id}`}>
                    <strong className="mono">{relation.relatedCase.referenceNumber}</strong>{' '}
                    {relation.relatedCase.title}
                  </Link>
                ) : (
                  <strong className="file-name">{relation.relatedDocument?.originalFileName}</strong>
                )}
                {relation.relatedCase?.description ? (
                  <p className="related-summary">{relation.relatedCase.description}</p>
                ) : null}
                {relation.note ? <div className="hint">{relation.note}</div> : null}
              </div>
              {user?.id === relation.createdBy?.id || user?.role === 'admin' ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void api.delete(`/cases/${id}/relations/${relation.id}`).then(load);
                  }}
                >
                  {t('workflow.removeLink')}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {!closed ? (
          <>
            {!suggestionsLoading && suggestions.length ? (
              <div className="stack">
                <div>
                  <h3 className="page-title" style={{ fontSize: '1rem' }}>
                    {t('workflow.recommended')}
                  </h3>
                  <p className="hint">{t('workflow.recommendedHint')}</p>
                </div>
                <div className="related-list">
                  {suggestions.map((item) => (
                    <div key={item.id} className="related-item">
                      <div className="related-item-main">
                        <Link to={`/cases/${item.id}`}>
                          <strong className="mono">{item.referenceNumber}</strong> {item.title}
                        </Link>
                        {item.description ? <p className="related-summary">{item.description}</p> : null}
                        <div className="related-meta">
                          <span className="related-chip">
                            {t('workflow.similarity', { value: item.score })}
                          </span>
                          {item.matchedOn.map((field) => (
                            <span key={field} className="related-chip">
                              {matchFieldLabel(field, t)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="toolbar">
                        <Button
                          type="button"
                          onClick={() => void linkCase(item.id)}
                          disabled={attachingId === item.id}
                        >
                          {t('common.attach')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {suggestionsLoading ? <p className="hint">{t('common.loading')}</p> : null}
            {!suggestionsLoading && !suggestions.length && !linkSearch.trim() ? (
              <p className="hint">{t('workflow.noRecommendations')}</p>
            ) : null}

            <Field
              label={t('workflow.searchCases')}
              htmlFor="related-search"
              hint={t('workflow.searchCasesHint')}
              className="span-2"
            >
              <TextInput
                id="related-search"
                className="related-search"
                type="search"
                autoComplete="off"
                placeholder={t('workflow.searchPlaceholder')}
                value={linkSearch}
                onChange={(event) => setLinkSearch(event.target.value)}
              />
            </Field>
            {linkSearching ? <p className="hint">{t('common.loading')}</p> : null}
            {!linkSearching && linkSearch.trim() && !linkResults.length ? (
              <p className="hint">{t('workflow.searchEmpty')}</p>
            ) : null}
            <div className="related-list">
              {linkResults.map((item) => (
                <div key={item.id} className="related-item">
                  <div className="related-item-main">
                    <div>
                      <strong className="mono">{item.referenceNumber}</strong> {item.title}
                    </div>
                    {item.description ? <p className="related-summary">{item.description}</p> : null}
                  </div>
                  <div className="toolbar">
                    <Button
                      type="button"
                      onClick={() => void linkCase(item.id)}
                      disabled={attachingId === item.id}
                    >
                      {t('common.attach')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void chooseCaseForDocument(item.id)}
                    >
                      {t('workflow.linkDocument')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {linkCaseId && linkDocs.length ? (
              <div className="stack">
                <p className="hint">{t('workflow.selectDocument')}</p>
                {linkDocs.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    className="doc-item"
                    onClick={() => void linkDocument(document.id)}
                  >
                    <span className="file-name">{document.originalFileName}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="card card-pad stack">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="panel-tabs" role="tablist">
            <button
              type="button"
              className={`panel-tab ${panel === 'history' ? 'active' : ''}`}
              onClick={() => setPanel('history')}
            >
              {t('panel.history')}
            </button>
            <button
              type="button"
              className={`panel-tab ${panel === 'execution' ? 'active' : ''}`}
              onClick={() => setPanel('execution')}
            >
              {t('panel.execution')}
            </button>
          </div>
          {panel === 'execution' && record.canAddActivity ? (
            <Button
              type="button"
              onClick={() => {
                setActivityOpen(true);
                setActivityComment('');
                setFiles(null);
              }}
            >
              {t('execution.add')}
            </Button>
          ) : null}
        </div>

        {panel === 'history' ? (
          <>
            {!history.length ? <EmptyState message={t('workflow.historyEmpty')} /> : null}
            <div className="history-list">
              {history.map((item) => (
                <article key={item.id} className="history-item">
                  <header>
                    <strong>
                      {item.action === 'decision' && item.decisionType
                        ? `${t('workflow.decisionEvent')} · ${t(`decision.${item.decisionType}`)}`
                        : eventLabel[item.action] || item.action}
                    </strong>
                    <span className="hint">{formatDateTime(item.createdAt, language)}</span>
                  </header>
                  <p className="hint">
                    {t('workflow.by')} {localizedName(language, item.performedBy?.nameEn, item.performedBy?.nameAr)}
                    {item.fromStage ? ` · ${t('workflow.from')} ${t(`stage.${item.fromStage}`)}` : ''}
                    {item.toStage &&
                    (item.action === 'forward' ||
                      item.action === 'resubmit' ||
                      (item.action === 'return' && item.returnTarget === 'previous_stage'))
                      ? ` · ${t('workflow.to')} ${t(`stage.${item.toStage}`)}`
                      : ''}
                    {item.toUser
                      ? ` · ${t('workflow.returnedTo')} ${localizedName(language, item.toUser.nameEn, item.toUser.nameAr)}`
                      : ''}
                    {item.toDepartment
                      ? ` · ${t('workflow.returnedTo')} ${localizedName(language, item.toDepartment.nameEn, item.toDepartment.nameAr)}`
                      : ''}
                  </p>
                  {item.instruction ? <div className="history-instruction">{item.instruction}</div> : null}
                  {item.documents?.length ? (
                    <div className="stack" style={{ marginTop: '0.6rem', gap: '0.4rem' }}>
                      {item.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          className="doc-item"
                          onClick={() => setSelectedId(document.id)}
                        >
                          <span className="file-name">{document.originalFileName}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="hint">{executionSubtitle}</p>
            <h3 className="page-title" style={{ fontSize: '1.05rem' }}>
              {executionTitle}
            </h3>
            {!activities.length ? <EmptyState message={t('execution.empty')} /> : null}
            <div className="activity-feed">
              {activities.map((item) => (
                <article key={item.id} className="activity-item">
                  <header>
                    <strong>
                      {localizedName(language, item.author?.nameEn, item.author?.nameAr)}
                    </strong>
                    <span className="hint">{formatDateTime(item.createdAt, language)}</span>
                  </header>
                  <p className="hint">
                    {t('execution.department')}:{' '}
                    {localizedName(language, item.department?.nameEn, item.department?.nameAr) || t('common.none')}
                  </p>
                  <p style={{ marginTop: '0.55rem' }}>{item.comment}</p>
                  {item.documents?.length ? (
                    <div className="stack" style={{ marginTop: '0.6rem', gap: '0.4rem' }}>
                      {item.documents.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          className="doc-item"
                          onClick={() => setSelectedId(document.id)}
                        >
                          <span className="file-name">{document.originalFileName}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {action ? (
        <Modal
          wide
          title={
            action === 'forward'
              ? t('workflow.forwardTitle')
              : action === 'return'
                ? t('workflow.returnTitle')
                : t('workflow.resubmitTitle')
          }
          onClose={() => setAction(null)}
        >
          <form className="stack" onSubmit={submitAction}>
            {action === 'forward' && record.nextStage ? (
              <Field label={t('workflow.destination')}>
                <input className="control" readOnly value={t(`stage.${record.nextStage}`)} />
              </Field>
            ) : null}
            {action === 'resubmit' && latestReturn?.instruction ? (
              <blockquote className="return-request">
                <p className="return-request-label">{t('workflow.currentRequest')}</p>
                <p className="return-request-body">{latestReturn.instruction}</p>
              </blockquote>
            ) : null}
            {action === 'return' ? (
              <Field label={t('workflow.returnTo')} htmlFor="returnTo">
                <SelectInput
                  id="returnTo"
                  value={returnTo}
                  onChange={(event) =>
                    setReturnTo(event.target.value as ReturnDestination)
                  }
                >
                  {record.previousStage ? (
                    <option value="previous_stage">
                      {t('workflow.previousOffice', { stage: t(`stage.${record.previousStage}`) })}
                    </option>
                  ) : null}
                  <option value="originator">{t('workflow.originator')}</option>
                  <option value="department">{t('workflow.originatingDepartment')}</option>
                </SelectInput>
              </Field>
            ) : null}
            <Field label={t('workflow.instruction')} hint={t('workflow.instructionHint')} htmlFor="instruction">
              <TextArea
                id="instruction"
                required
                minLength={10}
                value={instruction}
                placeholder={
                  action === 'return'
                    ? t('workflow.returnPlaceholder')
                    : t('workflow.instructionPlaceholder')
                }
                onChange={(event) => setInstruction(event.target.value)}
              />
            </Field>
            <Field label={t('workflow.attachments')} htmlFor="action-files">
              <input
                id="action-files"
                type="file"
                multiple
                onChange={(event) => setFiles(event.target.files)}
              />
            </Field>
            <div className="toolbar">
              <Button type="submit" disabled={submitting}>
                {action === 'forward'
                  ? t('workflow.confirmForward')
                  : action === 'return'
                    ? t('workflow.confirmReturn')
                    : t('workflow.confirmResubmit')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setAction(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {decisionOpen ? (
        <Modal wide title={t('decision.recordTitle')} onClose={() => setDecisionOpen(false)}>
          <form className="stack" onSubmit={submitDecision}>
            <Field label={t('decision.type')} htmlFor="decisionType">
              <SelectInput
                id="decisionType"
                value={decisionType}
                onChange={(event) => setDecisionType(event.target.value as DecisionType)}
              >
                {DECISION_TYPES.filter((type) => decisionTypes.includes(type)).map((type) => (
                  <option key={type} value={type}>
                    {t(`decision.${type}`)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('decision.instruction')} hint={t('decision.instructionHint')} htmlFor="decisionInstruction">
              <TextArea
                id="decisionInstruction"
                required
                minLength={10}
                value={instruction}
                placeholder={
                  decisionType === 'archive'
                    ? t('decision.archivePlaceholder')
                    : decisionType === 'request_detailed_report'
                      ? t('decision.reportPlaceholder')
                      : t('decision.instructionPlaceholder')
                }
                onChange={(event) => setInstruction(event.target.value)}
              />
            </Field>
            {needsDepartments ? (
              <Field label={t('decision.departments')} hint={t('decision.departmentsHint')}>
                <div className="check-list">
                  {departments.map((department) => (
                    <label key={department.id}>
                      <input
                        type="checkbox"
                        checked={decisionDepts.includes(department.id)}
                        onChange={(event) => {
                          setDecisionDepts((current) =>
                            event.target.checked
                              ? [...current, department.id]
                              : current.filter((item) => item !== department.id),
                          );
                        }}
                      />
                      {localizedName(language, department.nameEn, department.nameAr)}
                    </label>
                  ))}
                </div>
              </Field>
            ) : null}
            <Field label={t('workflow.attachments')} htmlFor="decision-files">
              <input
                id="decision-files"
                type="file"
                multiple
                onChange={(event) => setFiles(event.target.files)}
              />
            </Field>
            <div className="toolbar">
              <Button type="submit" disabled={submitting || (needsDepartments && !decisionDepts.length)}>
                {t('decision.confirm')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDecisionOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activityOpen ? (
        <Modal wide title={t('execution.addTitle')} onClose={() => setActivityOpen(false)}>
          <form className="stack" onSubmit={submitActivity}>
            <Field label={t('execution.comment')} htmlFor="activityComment">
              <TextArea
                id="activityComment"
                required
                minLength={3}
                value={activityComment}
                placeholder={t('execution.commentPlaceholder')}
                onChange={(event) => setActivityComment(event.target.value)}
              />
            </Field>
            <Field label={t('workflow.attachments')} htmlFor="activity-files">
              <input
                id="activity-files"
                type="file"
                multiple
                onChange={(event) => setFiles(event.target.files)}
              />
            </Field>
            <div className="toolbar">
              <Button type="submit" disabled={submitting}>
                {t('execution.confirm')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setActivityOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {signOpen && selected ? (
        <Modal wide title={t('signing.title')} onClose={() => setSignOpen(false)}>
          <form className="stack" onSubmit={submitSignature}>
            <p className="hint">{t('signing.hint')}</p>
            <SignaturePad
              onChange={(empty, dataUrl) => {
                setSignEmpty(empty);
                setSignDataUrl(dataUrl);
              }}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={signConfirmed}
                onChange={(event) => setSignConfirmed(event.target.checked)}
              />
              {t('signing.confirm')}
            </label>
            <div className="toolbar">
              <Button type="submit" disabled={submitting || signEmpty || !signConfirmed}>
                {t('signing.apply')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSignOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {writeOpen ? (
        <Modal extraWide title={t('cases.writeDocument')} onClose={() => setWriteOpen(false)}>
          <form className="stack" onSubmit={submitComposedDocument}>
            {composeError ? <ErrorBanner message={composeError} /> : null}
            <DocumentComposer
              title={writeTitle}
              html={writeHtml}
              onTitleChange={setWriteTitle}
              onHtmlChange={setWriteHtml}
              disabled={uploading}
            />
            <div className="toolbar">
              <Button type="submit" disabled={uploading}>
                {uploading ? t('cases.converting') : t('cases.saveAsPdf')}
              </Button>
              <Button type="button" variant="secondary" disabled={uploading} onClick={() => setWriteOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

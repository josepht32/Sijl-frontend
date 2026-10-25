import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { CaseRecord, Category, Department } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, SelectInput, TextArea, TextInput } from '../components/Field';
import { ErrorBanner } from '../components/States';
import { DocumentComposer } from '../components/DocumentComposer';
import { DocumentSourceToggle, type DocumentSourceMode } from '../components/DocumentSourceToggle';
import { addDaysIso, formatDate, localizedName } from '../utils/format';
import { htmlHasContent } from '../utils/html';

export function CreateCasePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'internal' | 'external'>('internal');
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [sourceDepartmentId, setSourceDepartmentId] = useState('');
  const [sourceEntity, setSourceEntity] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [docMode, setDocMode] = useState<DocumentSourceMode>('upload');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeHtml, setWriteHtml] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Category[]>('/categories?active=true'),
      api.get<Department[]>('/departments'),
    ]).then(([categoryRes, departmentRes]) => {
      setCategories(categoryRes.data);
      setDepartments(departmentRes.data);
      if (categoryRes.data[0]) {
        setCategoryId(categoryRes.data[0].id);
      }
    });
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await api.post<CaseRecord>('/cases', {
        title,
        description: description || undefined,
        categoryId,
        type,
        direction,
        sourceDepartmentId: type === 'internal' ? sourceDepartmentId || undefined : undefined,
        sourceEntity: type === 'external' ? sourceEntity || undefined : undefined,
      });

      if (docMode === 'upload' && files?.length) {
        const form = new FormData();
        Array.from(files).forEach((file) => form.append('files', file));
        await api.post(`/cases/${created.data.id}/documents`, form);
      } else if (docMode === 'write' && htmlHasContent(writeHtml)) {
        await api.post(`/cases/${created.data.id}/documents/compose`, {
          html: writeHtml,
          title: writeTitle.trim() || title,
          rtl: i18n.language.startsWith('ar'),
        });
      }

      navigate(`/cases/${created.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('cases.createTitle')} subtitle={t('cases.createSubtitle')} />
      <form className="card card-pad stack" onSubmit={onSubmit}>
        {error ? <ErrorBanner message={error} /> : null}
        <div className="form-grid">
          <Field label={t('cases.subject')} htmlFor="title" className="span-2">
            <TextInput
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={3}
            />
          </Field>
          <Field label={t('cases.description')} htmlFor="description" className="span-2">
            <TextArea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label={t('cases.category')} htmlFor="category">
            <SelectInput
              id="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {localizedName(i18n.language, category.nameEn, category.nameAr)} —{' '}
                  {category.targetTimelineDays} {t('common.days')}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('cases.expectedDue')}>
            <input
              className="control"
              readOnly
              value={
                selectedCategory
                  ? `${formatDate(addDaysIso(selectedCategory.targetTimelineDays), i18n.language)} · ${selectedCategory.targetTimelineDays} ${t('common.days')}`
                  : ''
              }
            />
            {selectedCategory ? (
              <p className="hint">
                {t('cases.timelineHint', { days: selectedCategory.targetTimelineDays })}
              </p>
            ) : null}
          </Field>
          <Field label={t('cases.type')} htmlFor="type">
            <SelectInput
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value as 'internal' | 'external')}
            >
              <option value="internal">{t('type.internal')}</option>
              <option value="external">{t('type.external')}</option>
            </SelectInput>
          </Field>
          <Field label={t('cases.direction')} htmlFor="direction">
            <SelectInput
              id="direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value as 'incoming' | 'outgoing')}
            >
              <option value="incoming">{t('direction.incoming')}</option>
              <option value="outgoing">{t('direction.outgoing')}</option>
            </SelectInput>
          </Field>
          {type === 'internal' ? (
            <Field label={t('cases.sourceDepartment')} htmlFor="sourceDepartment" className="span-2">
              <SelectInput
                id="sourceDepartment"
                value={sourceDepartmentId}
                onChange={(event) => setSourceDepartmentId(event.target.value)}
              >
                <option value="">{t('common.optional')}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {localizedName(i18n.language, department.nameEn, department.nameAr)}
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <Field label={t('cases.sourceEntity')} htmlFor="sourceEntity" className="span-2">
              <TextInput
                id="sourceEntity"
                value={sourceEntity}
                onChange={(event) => setSourceEntity(event.target.value)}
              />
            </Field>
          )}
          <Field
            label={t('cases.documentSource')}
            hint={t('cases.documentSourceHint')}
            className="span-2"
          >
            <DocumentSourceToggle value={docMode} onChange={setDocMode} />
          </Field>
          {docMode === 'upload' ? (
            <Field
              label={t('cases.documents')}
              htmlFor="files"
              hint={t('cases.attachHint')}
              className="span-2 file-drop"
            >
              <input
                id="files"
                type="file"
                multiple
                onChange={(event) => setFiles(event.target.files)}
              />
            </Field>
          ) : (
            <div className="span-2">
              <DocumentComposer
                title={writeTitle}
                html={writeHtml}
                onTitleChange={setWriteTitle}
                onHtmlChange={setWriteHtml}
                disabled={submitting}
              />
            </div>
          )}
        </div>
        <div className="toolbar">
          <Button type="submit" disabled={submitting}>
            {submitting ? t('cases.submitting') : t('cases.new')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/cases')}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}

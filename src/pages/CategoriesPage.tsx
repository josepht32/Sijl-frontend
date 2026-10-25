import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { Category } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, TextArea, TextInput } from '../components/Field';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { useAuth } from '../auth/AuthContext';
import { hasPermission, localizedName } from '../utils/format';

interface CategoryForm {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  targetTimelineDays: string;
  retentionPeriodYears: string;
}

const EMPTY_FORM: CategoryForm = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  targetTimelineDays: '5',
  retentionPeriodYears: '7',
};

export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canManage = hasPermission(user?.permissions, 'categories.manage');
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get<Category[]>('/categories')
      .then((response) => setItems(response.data))
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (category: Category) => {
    setForm({
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      descriptionEn: category.descriptionEn || '',
      descriptionAr: category.descriptionAr || '',
      targetTimelineDays: String(category.targetTimelineDays),
      retentionPeriodYears: String(category.retentionPeriodYears),
    });
    setEditing(category);
    setCreating(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      targetTimelineDays: Number(form.targetTimelineDays),
      retentionPeriodYears: Number(form.retentionPeriodYears),
    };
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setCreating(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <div>
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              {t('categories.new')}
            </Button>
          ) : undefined
        }
      />
      <p className="hint" style={{ marginBottom: '1rem' }}>
        {t('categories.snapshotNote')}
      </p>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!items.length ? (
        <EmptyState message={t('categories.empty')} />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('cases.category')}</th>
                  <th>{t('categories.timelineDays')}</th>
                  <th>{t('categories.retentionYears')}</th>
                  <th>{t('users.status')}</th>
                  {canManage ? <th>{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => canManage && openEdit(item)}>
                    <td>
                      <strong>{localizedName(i18n.language, item.nameEn, item.nameAr)}</strong>
                      <div className="hint">
                        {i18n.language.startsWith('ar') ? item.descriptionAr : item.descriptionEn}
                      </div>
                    </td>
                    <td>
                      {item.targetTimelineDays} {t('common.days')}
                    </td>
                    <td>
                      {item.retentionPeriodYears} {t('common.years')}
                    </td>
                    <td>
                      <Badge tone={item.isActive ? 'ok' : 'neutral'}>
                        {item.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    {canManage ? (
                      <td>
                        <Button type="button" variant="secondary" onClick={() => openEdit(item)}>
                          {t('common.edit')}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creating ? (
        <Modal
          title={editing ? t('categories.edit') : t('categories.new')}
          onClose={() => setCreating(false)}
        >
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <Field label={t('categories.nameAr')} htmlFor="nameAr">
                <TextInput
                  id="nameAr"
                  value={form.nameAr}
                  onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
                  required
                />
              </Field>
              <Field label={t('categories.nameEn')} htmlFor="nameEn">
                <TextInput
                  id="nameEn"
                  value={form.nameEn}
                  onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
                  required
                />
              </Field>
              <Field label={t('categories.descriptionAr')} htmlFor="descriptionAr" className="span-2">
                <TextArea
                  id="descriptionAr"
                  value={form.descriptionAr}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descriptionAr: event.target.value }))
                  }
                />
              </Field>
              <Field label={t('categories.descriptionEn')} htmlFor="descriptionEn" className="span-2">
                <TextArea
                  id="descriptionEn"
                  value={form.descriptionEn}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descriptionEn: event.target.value }))
                  }
                />
              </Field>
              <Field label={t('categories.timelineDays')} htmlFor="days">
                <TextInput
                  id="days"
                  type="number"
                  min={1}
                  value={form.targetTimelineDays}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, targetTimelineDays: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label={t('categories.retentionYears')} htmlFor="years">
                <TextInput
                  id="years"
                  type="number"
                  min={1}
                  value={form.retentionPeriodYears}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, retentionPeriodYears: event.target.value }))
                  }
                  required
                />
              </Field>
            </div>
            <div className="toolbar">
              <Button type="submit" disabled={saving}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

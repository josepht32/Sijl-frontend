import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { AuthUser, Department } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, SelectInput, TextArea, TextInput } from '../components/Field';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { useAuth } from '../auth/AuthContext';
import { hasPermission, localizedName } from '../utils/format';

interface DepartmentForm {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  managerId: string;
}

const EMPTY_FORM: DepartmentForm = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  managerId: '',
};

export function DepartmentsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canManage = hasPermission(user?.permissions, 'departments.manage');
  const [items, setItems] = useState<Department[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get<Department[]>('/departments'), api.get<AuthUser[]>('/users')])
      .then(([departments, people]) => {
        setItems(departments.data);
        setUsers(people.data);
      })
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setForm({
      nameEn: department.nameEn,
      nameAr: department.nameAr,
      descriptionEn: department.descriptionEn || '',
      descriptionAr: department.descriptionAr || '',
      managerId: department.managerId || '',
    });
    setOpen(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      managerId: form.managerId || undefined,
    };
    try {
      if (editing) {
        await api.patch(`/departments/${editing.id}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      setOpen(false);
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
        title={t('departments.title')}
        subtitle={t('departments.subtitle')}
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              {t('departments.new')}
            </Button>
          ) : undefined
        }
      />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!items.length ? (
        <EmptyState message={t('departments.empty')} />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('departments.title')}</th>
                  <th>{t('departments.manager')}</th>
                  <th>{t('departments.employees')}</th>
                  {canManage ? <th>{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{localizedName(i18n.language, item.nameEn, item.nameAr)}</strong>
                    </td>
                    <td>
                      {item.manager
                        ? localizedName(i18n.language, item.manager.nameEn, item.manager.nameAr)
                        : t('departments.noManager')}
                    </td>
                    <td>{item.employees?.length ?? 0}</td>
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

      {open ? (
        <Modal
          title={editing ? t('departments.edit') : t('departments.new')}
          onClose={() => setOpen(false)}
        >
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <Field label={t('departments.nameAr')} htmlFor="nameAr">
                <TextInput
                  id="nameAr"
                  value={form.nameAr}
                  required
                  onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
                />
              </Field>
              <Field label={t('departments.nameEn')} htmlFor="nameEn">
                <TextInput
                  id="nameEn"
                  value={form.nameEn}
                  required
                  onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
                />
              </Field>
              <Field label={t('departments.descriptionAr')} htmlFor="descriptionAr" className="span-2">
                <TextArea
                  id="descriptionAr"
                  value={form.descriptionAr}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descriptionAr: event.target.value }))
                  }
                />
              </Field>
              <Field label={t('departments.descriptionEn')} htmlFor="descriptionEn" className="span-2">
                <TextArea
                  id="descriptionEn"
                  value={form.descriptionEn}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descriptionEn: event.target.value }))
                  }
                />
              </Field>
              <Field label={t('departments.manager')} htmlFor="manager" className="span-2">
                <SelectInput
                  id="manager"
                  value={form.managerId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, managerId: event.target.value }))
                  }
                >
                  <option value="">{t('common.optional')}</option>
                  {users.map((person) => (
                    <option key={person.id} value={person.id}>
                      {localizedName(i18n.language, person.nameEn, person.nameAr)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <div className="toolbar">
              <Button type="submit" disabled={saving}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

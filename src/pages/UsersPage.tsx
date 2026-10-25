import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { AuthUser, Department, OrgRole, Role, WorkflowStage } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, SelectInput, TextInput } from '../components/Field';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { useAuth } from '../auth/AuthContext';
import { displayRoleName, hasPermission, localizedName } from '../utils/format';

interface UserForm {
  nameEn: string;
  nameAr: string;
  email: string;
  password: string;
  role: Role;
  departmentId: string;
  isActive: boolean;
  workflowStages: WorkflowStage[];
}

const EMPTY_FORM: UserForm = {
  nameEn: '',
  nameAr: '',
  email: '',
  password: '',
  role: 'employee',
  departmentId: '',
  isActive: true,
  workflowStages: [],
};

const ALL_STAGES: WorkflowStage[] = [
  'secretariat',
  'studies_committee',
  'technical_office',
  'chairman',
];

export function UsersPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canManage = hasPermission(user?.permissions, 'users.manage');
  const [items, setItems] = useState<AuthUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const roleOptions = useMemo(
    () =>
      roles.length
        ? roles.filter((role) => role.isActive || role.slug === form.role)
        : [
            { slug: 'employee', nameEn: t('role.employee'), nameAr: t('role.employee') },
            {
              slug: 'department_manager',
              nameEn: t('role.department_manager'),
              nameAr: t('role.department_manager'),
            },
            { slug: 'admin', nameEn: t('role.admin'), nameAr: t('role.admin') },
          ],
    [roles, form.role, t],
  );

  const load = () => {
    setLoading(true);
    const requests: Promise<unknown>[] = [
      api.get<AuthUser[]>('/users').then((response) => setItems(response.data)),
      api.get<Department[]>('/departments').then((response) => setDepartments(response.data)),
    ];
    if (canManage) {
      requests.push(
        api
          .get<OrgRole[]>('/roles')
          .then((response) => setRoles(response.data))
          .catch(() => setRoles([])),
      );
    }
    Promise.all(requests)
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

  const openEdit = (person: AuthUser) => {
    setEditing(person);
    setForm({
      nameEn: person.nameEn,
      nameAr: person.nameAr,
      email: person.email,
      password: '',
      role: person.role,
      departmentId: person.departmentId || '',
      isActive: person.isActive,
      workflowStages: person.workflowStages ?? [],
    });
    setOpen(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, {
          nameEn: form.nameEn,
          nameAr: form.nameAr,
          role: form.role,
          departmentId: form.departmentId || null,
          isActive: form.isActive,
          workflowStages: form.workflowStages,
        });
      } else {
        await api.post('/users', {
          nameEn: form.nameEn,
          nameAr: form.nameAr,
          email: form.email,
          password: form.password,
          role: form.role,
          departmentId: form.departmentId || undefined,
          workflowStages: form.workflowStages,
        });
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
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              {t('users.new')}
            </Button>
          ) : undefined
        }
      />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!items.length ? (
        <EmptyState message={t('users.empty')} />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('users.nameEn')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.department')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('users.workflowOffices')}</th>
                  <th>{t('users.status')}</th>
                  {canManage ? <th>{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((person) => (
                  <tr key={person.id}>
                    <td>{localizedName(i18n.language, person.nameEn, person.nameAr)}</td>
                    <td>{person.email}</td>
                    <td>
                      {person.department
                        ? localizedName(
                            i18n.language,
                            person.department.nameEn,
                            person.department.nameAr,
                          )
                        : t('common.none')}
                    </td>
                    <td>
                      {displayRoleName(
                        i18n.language,
                        person.role,
                        person.roleNameEn,
                        person.roleNameAr,
                        t,
                      )}
                    </td>
                    <td>
                      {(person.workflowStages ?? [])
                        .map((stage) => t(`stage.${stage}`))
                        .join(' · ') || t('common.none')}
                    </td>
                    <td>
                      <Badge tone={person.isActive ? 'ok' : 'neutral'}>
                        {person.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    {canManage ? (
                      <td>
                        <Button type="button" variant="secondary" onClick={() => openEdit(person)}>
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
        <Modal title={editing ? t('users.edit') : t('users.new')} onClose={() => setOpen(false)}>
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <Field label={t('users.nameAr')} htmlFor="nameAr">
                <TextInput
                  id="nameAr"
                  value={form.nameAr}
                  required
                  onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
                />
              </Field>
              <Field label={t('users.nameEn')} htmlFor="nameEn">
                <TextInput
                  id="nameEn"
                  value={form.nameEn}
                  required
                  onChange={(event) => setForm((current) => ({ ...current, nameEn: event.target.value }))}
                />
              </Field>
              {!editing ? (
                <>
                  <Field label={t('users.email')} htmlFor="email">
                    <TextInput
                      id="email"
                      type="email"
                      value={form.email}
                      required
                      onChange={(event) =>
                        setForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label={t('users.password')} htmlFor="password">
                    <TextInput
                      id="password"
                      type="password"
                      value={form.password}
                      required
                      minLength={8}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                  </Field>
                </>
              ) : null}
              <Field label={t('users.role')} htmlFor="role">
                <SelectInput
                  id="role"
                  value={form.role}
                  onChange={(event) => {
                    const nextRole = event.target.value as Role;
                    const definition = roles.find(
                      (role) => role.slug === nextRole || role.id === nextRole,
                    );
                    setForm((current) => ({
                      ...current,
                      role: definition?.slug || nextRole,
                      workflowStages: definition?.workflowStages ?? current.workflowStages,
                    }));
                  }}
                >
                {roleOptions.map((role) => (
                    <option key={role.slug} value={role.slug}>
                      {localizedName(i18n.language, role.nameEn, role.nameAr)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label={t('users.department')} htmlFor="department">
                <SelectInput
                  id="department"
                  value={form.departmentId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, departmentId: event.target.value }))
                  }
                >
                  <option value="">{t('common.optional')}</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {localizedName(i18n.language, department.nameEn, department.nameAr)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <div className="field span-2">
                <span className="field-label">{t('users.workflowOffices')}</span>
                <div className="check-row">
                  {ALL_STAGES.map((stage) => (
                    <label key={stage}>
                      <input
                        type="checkbox"
                        checked={form.workflowStages.includes(stage)}
                        onChange={(event) => {
                          setForm((current) => ({
                            ...current,
                            workflowStages: event.target.checked
                              ? [...current.workflowStages, stage]
                              : current.workflowStages.filter((item) => item !== stage),
                          }));
                        }}
                      />
                      {t(`stage.${stage}`)}
                    </label>
                  ))}
                </div>
              </div>
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

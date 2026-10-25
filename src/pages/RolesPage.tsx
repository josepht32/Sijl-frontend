import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../api/client';
import type { OrgRole, RoleCatalog, WorkflowStage } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Field, SelectInput, TextArea, TextInput } from '../components/Field';
import { Badge } from '../components/Badge';
import { EmptyState, ErrorBanner, LoadingBlock } from '../components/States';
import { useAuth } from '../auth/AuthContext';
import { hasPermission, localizedName } from '../utils/format';

interface RoleForm {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  permissions: string[];
  workflowStages: WorkflowStage[];
  isActive: boolean;
}

const EMPTY_FORM: RoleForm = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  permissions: ['cases.create', 'cases.read', 'categories.read', 'departments.read', 'users.read'],
  workflowStages: [],
  isActive: true,
};

const ALL_STAGES: WorkflowStage[] = [
  'secretariat',
  'studies_committee',
  'technical_office',
  'chairman',
];

function formFromRole(role: OrgRole): RoleForm {
  return {
    nameEn: role.nameEn,
    nameAr: role.nameAr,
    descriptionEn: role.descriptionEn || '',
    descriptionAr: role.descriptionAr || '',
    permissions: [...role.permissions],
    workflowStages: [...role.workflowStages],
    isActive: role.isActive,
  };
}

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canManage = hasPermission(user?.permissions, 'roles.manage');
  const allowed = hasPermission(user?.permissions, 'roles.read') || canManage;
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [catalog, setCatalog] = useState<RoleCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = useMemo(
    () => roles.find((role) => role.id === selectedId) ?? null,
    [roles, selectedId],
  );

  const load = () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([api.get<OrgRole[]>('/roles'), api.get<RoleCatalog>('/roles/catalog')])
      .then(([roleResponse, catalogResponse]) => {
        setRoles(roleResponse.data);
        setCatalog(catalogResponse.data);
        setSelectedId((current) => current || roleResponse.data[0]?.id || '');
      })
      .catch((err) => setError(apiErrorMessage(err, t('errors.loadFailed'))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    if (creating) {
      setForm(EMPTY_FORM);
      setConfirmDelete(false);
      return;
    }
    if (selected) {
      setForm(formFromRole(selected));
      setConfirmDelete(false);
    }
  }, [selected, creating]);

  const openCreate = () => {
    setCreating(true);
    setSelectedId('');
    setForm(EMPTY_FORM);
  };

  const selectRole = (id: string) => {
    setCreating(false);
    setSelectedId(id);
  };

  const togglePermission = (permission: string, checked: boolean) => {
    if (selected?.slug === 'admin' && permission === 'roles.manage' && !checked) {
      return;
    }
    setForm((current) => ({
      ...current,
      permissions: checked
        ? [...current.permissions, permission]
        : current.permissions.filter((item) => item !== permission),
    }));
  };

  const setGroup = (permissions: string[], checked: boolean) => {
    setForm((current) => {
      const next = new Set(current.permissions);
      for (const permission of permissions) {
        if (selected?.slug === 'admin' && permission === 'roles.manage' && !checked) {
          continue;
        }
        if (checked) {
          next.add(permission);
        } else {
          next.delete(permission);
        }
      }
      return { ...current, permissions: [...next] };
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage) {
      return;
    }
    setSaving(true);
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      descriptionEn: form.descriptionEn || undefined,
      descriptionAr: form.descriptionAr || undefined,
      permissions: form.permissions,
      workflowStages: form.workflowStages,
      ...(creating ? {} : { isActive: form.isActive }),
    };
    try {
      if (creating) {
        const created = await api.post<OrgRole>('/roles', payload);
        setCreating(false);
        await refreshAndSelect(created.data.id);
      } else if (selected) {
        await api.patch(`/roles/${selected.id}`, payload);
        await refreshAndSelect(selected.id);
      }
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const refreshAndSelect = async (id: string) => {
    const response = await api.get<OrgRole[]>('/roles');
    setRoles(response.data);
    setSelectedId(id);
  };

  const onDelete = async () => {
    if (!selected || selected.isSystem) {
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/roles/${selected.id}`);
      setConfirmDelete(false);
      const response = await api.get<OrgRole[]>('/roles');
      setRoles(response.data);
      setSelectedId(response.data[0]?.id || '');
    } catch (err) {
      setError(apiErrorMessage(err, t('errors.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return <ErrorBanner message={t('errors.unauthorized')} />;
  }
  if (loading) {
    return <LoadingBlock />;
  }

  const groups = catalog?.groups ?? [];
  const stages = catalog?.stages?.length ? catalog.stages : ALL_STAGES;

  return (
    <div>
      <PageHeader
        title={t('roles.title')}
        subtitle={t('roles.subtitle')}
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              {t('roles.new')}
            </Button>
          ) : undefined
        }
      />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {!roles.length && !creating ? (
        <EmptyState message={t('roles.empty')} />
      ) : (
        <>
          <div className="roles-switcher">
            <Field label={t('roles.title')} htmlFor="roleSwitch">
              <SelectInput
                id="roleSwitch"
                value={creating ? 'new' : selectedId}
                onChange={(event) => {
                  if (event.target.value === 'new') {
                    openCreate();
                  } else {
                    selectRole(event.target.value);
                  }
                }}
              >
                {creating ? <option value="new">{t('roles.new')}</option> : null}
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {localizedName(i18n.language, role.nameEn, role.nameAr)}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="roles-layout">
            <aside className="roles-rail">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-nav-item ${!creating && role.id === selectedId ? 'active' : ''}`}
                  onClick={() => selectRole(role.id)}
                >
                  <strong>{localizedName(i18n.language, role.nameEn, role.nameAr)}</strong>
                  <span className="role-nav-meta">
                    <Badge tone={role.isSystem ? 'info' : 'neutral'}>
                      {role.isSystem ? t('roles.predefined') : t('roles.custom')}
                    </Badge>
                    <Badge tone={role.isActive ? 'ok' : 'neutral'}>
                      {role.isActive ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </span>
                  <span className="hint">
                    {t('roles.userCount', { count: role.userCount ?? 0 })}
                  </span>
                </button>
              ))}
            </aside>
            <section className="card card-pad">
              {!creating && !selected ? (
                <p className="muted">{t('roles.select')}</p>
              ) : (
                <form className="stack" onSubmit={onSubmit}>
                  <div>
                    <h2 className="page-title" style={{ fontSize: '1.15rem' }}>
                      {creating
                        ? t('roles.new')
                        : localizedName(i18n.language, form.nameEn, form.nameAr)}
                    </h2>
                    <p className="hint">
                      {creating
                        ? t('roles.newHint')
                        : selected?.isSystem
                          ? t('roles.predefinedHint')
                          : t('roles.customHint')}
                    </p>
                  </div>
                  <div className="form-grid">
                    <Field label={t('roles.nameAr')} htmlFor="roleNameAr">
                      <TextInput
                        id="roleNameAr"
                        value={form.nameAr}
                        required
                        disabled={!canManage}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, nameAr: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label={t('roles.nameEn')} htmlFor="roleNameEn">
                      <TextInput
                        id="roleNameEn"
                        value={form.nameEn}
                        required
                        disabled={!canManage}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, nameEn: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label={t('roles.descriptionAr')} htmlFor="roleDescAr" className="span-2">
                      <TextArea
                        id="roleDescAr"
                        value={form.descriptionAr}
                        disabled={!canManage}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            descriptionAr: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label={t('roles.descriptionEn')} htmlFor="roleDescEn" className="span-2">
                      <TextArea
                        id="roleDescEn"
                        value={form.descriptionEn}
                        disabled={!canManage}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            descriptionEn: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div>
                    <h3 className="page-title" style={{ fontSize: '1rem' }}>
                      {t('roles.permissions')}
                    </h3>
                    <p className="hint">{t('roles.permissionsHint')}</p>
                  </div>
                  <div className="permission-groups">
                    {groups.map((group) => {
                      const allOn = group.permissions.every((permission) =>
                        form.permissions.includes(permission),
                      );
                      return (
                        <div key={group.id} className="permission-group">
                          <header>
                            <strong>{t(`permissionGroup.${group.id}`)}</strong>
                            {canManage ? (
                              <label>
                                <input
                                  type="checkbox"
                                  checked={allOn}
                                  onChange={(event) =>
                                    setGroup(group.permissions, event.target.checked)
                                  }
                                />
                                {t('roles.selectGroup')}
                              </label>
                            ) : null}
                          </header>
                          <div className="check-list">
                            {group.permissions.map((permission) => (
                              <label key={permission}>
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(permission)}
                                  disabled={
                                    !canManage ||
                                    (selected?.slug === 'admin' && permission === 'roles.manage')
                                  }
                                  onChange={(event) =>
                                    togglePermission(permission, event.target.checked)
                                  }
                                />
                                {t(`permission.${permission}`)}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <h3 className="page-title" style={{ fontSize: '1rem' }}>
                      {t('roles.access')}
                    </h3>
                    <p className="hint">{t('roles.accessHint')}</p>
                    <div className="check-row">
                      {stages.map((stage) => (
                        <label key={stage}>
                          <input
                            type="checkbox"
                            checked={form.workflowStages.includes(stage)}
                            disabled={!canManage}
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

                  {!creating && selected?.slug !== 'admin' ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        disabled={!canManage}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />{' '}
                      {t('common.active')}
                    </label>
                  ) : null}

                  {canManage ? (
                    <div className="toolbar">
                      <Button type="submit" disabled={saving}>
                        {t('common.save')}
                      </Button>
                      {creating ? (
                        <Button type="button" variant="secondary" onClick={() => selectRole(roles[0]?.id || '')}>
                          {t('common.cancel')}
                        </Button>
                      ) : null}
                      {!creating && selected && !selected.isSystem ? (
                        confirmDelete ? (
                          <>
                            <Button type="button" variant="danger" disabled={saving} onClick={onDelete}>
                              {t('roles.confirmDelete')}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
                              {t('common.cancel')}
                            </Button>
                          </>
                        ) : (
                          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
                            {t('common.delete')}
                          </Button>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </form>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

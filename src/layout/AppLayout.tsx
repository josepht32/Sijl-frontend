import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Building2,
  Files,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { displayRoleName, hasPermission, localizedName } from '../utils/format';

const NAV: Array<{
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  permission?: string;
}> = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  {
    to: '/executive',
    labelKey: 'nav.executive',
    icon: BarChart3,
    permission: 'analytics.executive',
  },
  { to: '/cases', labelKey: 'nav.cases', icon: Files },
  { to: '/categories', labelKey: 'nav.categories', icon: FolderTree },
  { to: '/departments', labelKey: 'nav.departments', icon: Building2 },
  { to: '/employees', labelKey: 'nav.employees', icon: Users },
  { to: '/roles', labelKey: 'nav.roles', icon: Shield, permission: 'roles.manage' },
];

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const language = i18n.language;

  const toggleLanguage = () => {
    void i18n.changeLanguage(language.startsWith('ar') ? 'en' : 'ar');
  };

  return (
    <div className="shell">
      {open ? <div className="scrim" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            س
          </div>
          <div>
            <div className="brand-name">{t('app.shortName')}</div>
            <div className="brand-tag">{t('app.name')}</div>
          </div>
        </div>
        <nav className="nav-list" aria-label={t('app.name')}>
          {NAV.filter(
            (item) => !item.permission || hasPermission(user?.permissions, item.permission),
          ).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={1.75} />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        {user ? (
          <div className="sidebar-user">
            <strong>{localizedName(language, user.nameEn, user.nameAr)}</strong>
            <span>
              {displayRoleName(
                language,
                user.role,
                user.roleNameEn,
                user.roleNameAr,
                t,
              )}
            </span>
          </div>
        ) : null}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen((value) => !value)}
            aria-label={t('common.menu')}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div />
          <div className="topbar-actions">
            <button type="button" className="lang-btn" onClick={toggleLanguage}>
              {language.startsWith('ar') ? t('common.english') : t('common.arabic')}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={16} />
              {t('auth.logout')}
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

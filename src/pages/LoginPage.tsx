import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Field, TextInput } from '../components/Field';
import { apiErrorMessage } from '../api/client';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('admin@sijil.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(apiErrorMessage(err, t('auth.invalid')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-panel">
        <div>
          <div className="login-mark">س</div>
          <h1 className="page-title" style={{ color: '#fffcf6' }}>
            {t('app.name')}
          </h1>
          <p className="page-subtitle" style={{ color: '#b3aa9c' }}>
            {t('app.tagline')}
          </p>
        </div>
        <button
          type="button"
          className="ghost-btn"
          style={{ width: 'fit-content', background: 'transparent', color: '#efe8dc', borderColor: '#3a342c' }}
          onClick={() => void i18n.changeLanguage(i18n.language.startsWith('ar') ? 'en' : 'ar')}
        >
          {i18n.language.startsWith('ar') ? t('common.english') : t('common.arabic')}
        </button>
      </section>
      <section className="login-form-wrap">
        <form className="login-form stack" onSubmit={onSubmit}>
          <div>
            <p className="page-kicker">{t('app.shortName')}</p>
            <h2 className="page-title">{t('auth.welcome')}</h2>
            <p className="page-subtitle">{t('auth.subtitle')}</p>
          </div>
          {error ? <div className="error-banner">{error}</div> : null}
          <Field label={t('auth.email')} htmlFor="email">
            <TextInput
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label={t('auth.password')} htmlFor="password">
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
          <div className="demo-accounts">
            <strong>{t('auth.demo')}</strong>
            <span>{t('auth.demoAdmin')}: admin@sijil.local</span>
            <span>{t('auth.demoSecretariat')}: nora@sijil.local</span>
            <span>{t('auth.demoStudies')}: fahad@sijil.local</span>
            <span>{t('auth.demoTechnical')}: hind@sijil.local</span>
            <span>{t('auth.demoChairman')}: khalid@sijil.local</span>
            <span>{t('auth.demoEmployee')}: omar@sijil.local</span>
            <span>Admin123!</span>
          </div>
        </form>
      </section>
    </div>
  );
}

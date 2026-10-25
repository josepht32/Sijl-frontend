import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div className="loading-block">
      <div className="spinner" />
      <p>{t('common.loading')}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>;
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="error-banner">
      <p>{message}</p>
      {onRetry ? (
        <div style={{ marginTop: '0.75rem' }}>
          <Button variant="secondary" type="button" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

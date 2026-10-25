import { useTranslation } from 'react-i18next';

export type DocumentSourceMode = 'upload' | 'write';

export function DocumentSourceToggle({
  value,
  onChange,
}: {
  value: DocumentSourceMode;
  onChange: (value: DocumentSourceMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="choice-toggle" role="radiogroup" aria-label={t('cases.documentSource')}>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'upload'}
        className={value === 'upload' ? 'active' : ''}
        onClick={() => onChange('upload')}
      >
        {t('cases.uploadDocument')}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'write'}
        className={value === 'write' ? 'active' : ''}
        onClick={() => onChange('write')}
      >
        {t('cases.writeDocument')}
      </button>
    </div>
  );
}

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function Modal({
  title,
  children,
  onClose,
  wide = false,
  extraWide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  extraWide?: boolean;
}) {
  const { t } = useTranslation();
  const sizeClass = extraWide ? 'extra-wide' : wide ? 'wide' : '';
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal card card-pad ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h2 id="modal-title" className="page-title" style={{ fontSize: '1.25rem' }}>
            {title}
          </h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

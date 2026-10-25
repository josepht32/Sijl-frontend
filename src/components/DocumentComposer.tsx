import { useTranslation } from 'react-i18next';
import { Field, TextInput } from './Field';
import { SummernoteEditor } from './SummernoteEditor';

export function DocumentComposer({
  title,
  html,
  onTitleChange,
  onHtmlChange,
  disabled = false,
}: {
  title: string;
  html: string;
  onTitleChange: (value: string) => void;
  onHtmlChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="stack">
      <Field label={t('cases.documentTitle')} htmlFor="composed-doc-title">
        <TextInput
          id="composed-doc-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t('cases.documentTitlePlaceholder')}
          disabled={disabled}
          maxLength={200}
        />
      </Field>
      <div className="field">
        <span className="field-label">{t('cases.documentBody')}</span>
        <p className="hint">{t('cases.writeDocumentHint')}</p>
        <SummernoteEditor value={html} onChange={onHtmlChange} disabled={disabled} />
      </div>
    </div>
  );
}

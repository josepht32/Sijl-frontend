import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import $ from 'jquery';
import 'summernote/dist/summernote-lite.css';

let summernoteReady: Promise<void> | null = null;

function loadSummernote() {
  if (!summernoteReady) {
    window.jQuery = window.$ = $;
    summernoteReady = import('summernote/dist/summernote-lite.js').then(() =>
      import('summernote/dist/lang/summernote-ar-AR.js'),
    ).then(() => undefined);
  }
  return summernoteReady;
}

export function SummernoteEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const holderRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;
  const rtl = i18n.language.startsWith('ar');

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) {
      return;
    }
    let active = true;
    let $el: JQuery | null = null;

    void loadSummernote().then(() => {
      if (!active || !holderRef.current) {
        return;
      }
      $el = $(holderRef.current);
      $el.summernote({
        height: 280,
        lang: rtl ? 'ar-AR' : 'en-US',
        direction: rtl ? 'rtl' : 'ltr',
        placeholder: t('cases.writePlaceholder'),
        dialogsInBody: true,
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
          ['fontsize', ['fontsize']],
          ['color', ['color']],
          ['para', ['ul', 'ol', 'paragraph']],
          ['table', ['table']],
          ['insert', ['link', 'picture', 'hr']],
        ],
        callbacks: {
          onChange(contents: string) {
            onChangeRef.current(contents);
          },
        },
      });
      $el.next('.note-editor').find('button').attr('type', 'button');
      if (!active) {
        $el.summernote('destroy');
        return;
      }
      if (valueRef.current) {
        $el.summernote('code', valueRef.current);
      }
      if (disabled) {
        $el.summernote('disable');
      }
    });

    return () => {
      active = false;
      if ($el && $el.next('.note-editor').length) {
        $el.summernote('destroy');
      }
    };
    // Re-init when language changes; value is applied from the latest ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtl, i18n.language, t]);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || !$(holder).next('.note-editor').length) {
      return;
    }
    $(holder).summernote(disabled ? 'disable' : 'enable');
  }, [disabled]);

  return <div ref={holderRef} className="summernote-host" />;
}

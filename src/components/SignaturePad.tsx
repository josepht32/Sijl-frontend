import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function SignaturePad({
  onChange,
}: {
  onChange: (empty: boolean, dataUrl: string) => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const empty = useRef(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 560;
    const height = canvas.clientHeight || 180;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.strokeStyle = '#2b241c';
    context.fillStyle = '#fffcf6';
    context.fillRect(0, 0, width, height);
    onChangeRef.current(true, '');
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    onChange(empty.current, empty.current ? '' : canvas.toDataURL('image/png'));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    empty.current = false;
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) {
      return;
    }
    const context = canvasRef.current?.getContext('2d');
    if (!context) {
      return;
    }
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const onPointerUp = () => {
    drawing.current = false;
    emit();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }
    const width = canvas.clientWidth || 560;
    const height = canvas.clientHeight || 180;
    context.fillStyle = '#fffcf6';
    context.fillRect(0, 0, width, height);
    empty.current = true;
    emit();
  };

  return (
    <div className="signature-pad" dir="ltr">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div className="toolbar">
        <Button type="button" variant="secondary" onClick={clear}>
          {t('signing.clear')}
        </Button>
      </div>
    </div>
  );
}

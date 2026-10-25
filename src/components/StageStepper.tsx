import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';
import type { WorkflowStage, WorkflowState } from '../api/types';

const STAGE_TONE: Record<WorkflowStage, 'info' | 'ok' | 'warn' | 'neutral'> = {
  secretariat: 'info',
  studies_committee: 'info',
  technical_office: 'ok',
  chairman: 'warn',
};

export function StageBadge({ stage }: { stage: WorkflowStage }) {
  const { t } = useTranslation();
  return <Badge tone={STAGE_TONE[stage]}>{t(`stage.${stage}`)}</Badge>;
}

export function WorkflowStateBadge({ state }: { state: WorkflowState }) {
  const { t } = useTranslation();
  const tone =
    state === 'awaiting_info' || state === 'awaiting_report'
      ? 'warn'
      : state === 'archived'
        ? 'neutral'
        : state === 'in_execution' || state === 'awaiting_chairman'
          ? 'info'
          : 'ok';
  return <Badge tone={tone}>{t(`workflowState.${state}`)}</Badge>;
}

const STAGES: WorkflowStage[] = [
  'secretariat',
  'studies_committee',
  'technical_office',
  'chairman',
];

export function StageStepper({
  current,
  workflowState,
}: {
  current: WorkflowStage;
  workflowState?: WorkflowState;
}) {
  const { t } = useTranslation();
  const currentIndex = Math.max(0, STAGES.indexOf(current));
  const decided =
    workflowState === 'in_execution' ||
    workflowState === 'awaiting_report' ||
    workflowState === 'archived';

  return (
    <div className="stage-stepper" aria-label={t('workflow.title')}>
      {STAGES.map((stage, index) => {
        const status = decided || index < currentIndex ? 'done' : index === currentIndex ? 'current' : '';
        return (
          <div key={stage} className={`stage-step ${status}`}>
            <small>{String(index + 1).padStart(2, '0')}</small>
            <strong>{t(`stage.${stage}`)}</strong>
          </div>
        );
      })}
    </div>
  );
}

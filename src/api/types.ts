export type Role = string;
export type CaseType = 'internal' | 'external';
export type CaseDirection = 'incoming' | 'outgoing';
export type CaseStatus = 'open' | 'closed';
export type TimelineStatus = 'on_track' | 'due_soon' | 'overdue';
export type WorkflowStage =
  | 'secretariat'
  | 'studies_committee'
  | 'technical_office'
  | 'chairman';
export type WorkflowState =
  | 'in_review'
  | 'awaiting_info'
  | 'awaiting_chairman'
  | 'awaiting_report'
  | 'in_execution'
  | 'completed'
  | 'archived';
export type AvailableWorkflowAction = 'forward' | 'return' | 'resubmit';
export type WorkflowActionType = 'created' | 'forward' | 'return' | 'resubmit' | 'decision' | 'complete';
export type DecisionType = 'approval' | 'archive' | 'request_detailed_report';
export type DocumentSource = 'original' | 'movement' | 'decision' | 'execution' | 'signed';
export type SignedStatus = 'unsigned' | 'signed' | 'signed_copy';
export type CaseAccessScope = 'mine' | 'department' | 'assigned' | 'granted' | 'all';

export interface DepartmentRef {
  id: string;
  nameEn: string;
  nameAr: string;
}

export interface UserRef {
  id: string;
  nameEn: string;
  nameAr: string;
  email?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nameEn: string;
  nameAr: string;
  role: Role;
  roleId?: string | null;
  roleNameEn?: string | null;
  roleNameAr?: string | null;
  isActive: boolean;
  organizationId: string;
  departmentId: string | null;
  department: DepartmentRef | null;
  workflowStages: WorkflowStage[];
  permissions: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  targetTimelineDays: number;
  retentionPeriodYears: number;
  isActive: boolean;
  organizationId: string;
}

export interface Department {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  organizationId: string;
  managerId: string | null;
  manager: AuthUser | UserRef | null;
  employees?: AuthUser[];
  createdAt: string;
}

export interface OrgRole {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  permissions: string[];
  workflowStages: WorkflowStage[];
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  userCount?: number;
}

export interface RoleCatalog {
  groups: Array<{ id: string; permissions: string[] }>;
  permissions: string[];
  stages: WorkflowStage[];
}

export interface CaseDocument {
  id: string;
  caseId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  isOriginal: boolean;
  uploadedById: string;
  uploadedBy: UserRef | null;
  uploadedAt: string;
  movementId?: string | null;
  decisionId?: string | null;
  activityId?: string | null;
  source?: DocumentSource;
  parentDocumentId?: string | null;
  signedById?: string | null;
  signedBy?: UserRef | null;
  signedAt?: string | null;
  signedStatus?: SignedStatus;
  signedVersionId?: string | null;
  signedVersionName?: string | null;
  watermarkSupported?: boolean;
}

export interface CaseRecord {
  id: string;
  referenceNumber: string;
  title: string;
  description: string | null;
  type: CaseType;
  direction: CaseDirection;
  status: CaseStatus;
  categoryId: string;
  categoryNameEn: string;
  categoryNameAr: string;
  targetTimelineDays: number;
  retentionPeriodYears: number;
  dueDate: string;
  retentionUntil: string | null;
  timelineStatus: TimelineStatus;
  sourceDepartmentId: string | null;
  sourceDepartment: DepartmentRef | null;
  sourceEntity: string | null;
  createdById: string;
  createdBy: UserRef | null;
  ownerDepartmentId: string | null;
  ownerDepartment: DepartmentRef | null;
  assignedToId: string | null;
  assignedTo: UserRef | null;
  currentStage: WorkflowStage;
  workflowState: WorkflowState;
  returnedFromStage: WorkflowStage | null;
  returnedToUserId: string | null;
  returnedToUser: UserRef | null;
  returnedToDepartmentId: string | null;
  returnedToDepartment: DepartmentRef | null;
  createdAt: string;
  lastActivityAt: string;
  updatedAt: string;
  documentCount?: number;
  documents?: CaseDocument[];
  availableActions?: AvailableWorkflowAction[];
  availableDecisionTypes?: DecisionType[];
  canManageDepartments?: boolean;
  canAddActivity?: boolean;
  canComplete?: boolean;
  canManageAccess?: boolean;
  canSignDocuments?: boolean;
  nextStage?: WorkflowStage | null;
  previousStage?: WorkflowStage | null;
}

export interface CaseMovementRecord {
  id: string;
  caseId: string;
  action: WorkflowActionType;
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage | null;
  instruction: string | null;
  performedById: string;
  performedBy: UserRef | null;
  toUser: UserRef | null;
  toDepartment: DepartmentRef | null;
  returnTarget: 'originator' | 'department' | 'previous_stage' | null;
  decisionType?: DecisionType | string | null;
  documents: CaseDocument[];
  createdAt: string;
}

export interface CaseRelationRecord {
  id: string;
  type: 'case' | 'document';
  note: string | null;
  createdAt: string;
  createdBy: UserRef | null;
  relatedCase: { id: string; referenceNumber: string; title: string; description?: string | null } | null;
  relatedDocument: CaseDocument | null;
}

export type RelatedMatchField = 'subject' | 'summary' | 'documents';

export interface RelatedCaseSuggestion {
  id: string;
  referenceNumber: string;
  title: string;
  description: string | null;
  score: number;
  matchedOn: RelatedMatchField[];
}

export interface CaseDecisionRecord {
  id: string;
  caseId: string;
  type: DecisionType;
  instruction: string;
  performedBy: UserRef | null;
  documents: CaseDocument[];
  createdAt: string;
}

export interface ConcernedDepartmentRecord {
  id: string;
  departmentId: string;
  department: DepartmentRef | null;
  assignedBy: UserRef | null;
  createdAt: string;
}

export interface ExecutionActivityRecord {
  id: string;
  caseId: string;
  comment: string;
  author: UserRef | null;
  department: DepartmentRef | null;
  documents: CaseDocument[];
  createdAt: string;
}

export interface CaseGrantRecord {
  id: string;
  caseId: string;
  accessLevel: string;
  createdAt: string;
  user: UserRef | null;
  grantedBy: UserRef | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  total: number;
  active: number;
  overdue: number;
  recent: CaseRecord[];
}

export type AttentionReason =
  | 'awaiting_chairman'
  | 'awaiting_action'
  | 'overdue'
  | 'severely_overdue'
  | 'due_soon'
  | 'inactive'
  | 'assigned';

export type AgingBucket = 'within_timeline' | 'approaching' | 'overdue' | 'severely_overdue';

export interface AttentionCase extends CaseRecord {
  reasons: AttentionReason[];
}

export interface OperationalDashboard {
  scope: 'accessible';
  kpis: {
    active: number;
    awaitingAction: number;
    dueSoon: number;
    overdue: number;
    recentlyUpdated: number;
  };
  attention: AttentionCase[];
  recent: CaseRecord[];
}

export interface ExecutiveDashboard {
  scope: 'organization';
  period: { from: string | null; to: string | null };
  current: {
    active: number;
    awaitingChairman: number;
    overdue: number;
    onTrack: number;
    dueSoon: number;
    severelyOverdue: number;
    inactive: number;
    inExecution: number;
    awaitingReport: number;
    stalledExecution: number;
    timelineComplianceRate: number | null;
    medianAgeDays: number | null;
    chairmanMedianWaitDays: number | null;
    chairmanP90WaitDays: number | null;
  };
  periodMetrics: {
    created: number;
    closed: number;
    closedOnTime: number;
    returns: number;
    resubmits: number;
    forwards: number;
    timelineComplianceRate: number | null;
    averageResolutionDays: number | null;
    medianResolutionDays: number | null;
    p90ResolutionDays: number | null;
    returnRate: number | null;
    throughputRate: number | null;
    netBacklog: number;
    decisions: number;
    averageDaysToDecision: number | null;
    comparison: {
      createdDelta: number;
      closedDelta: number;
      complianceDelta: number | null;
    } | null;
  };
  attention: AttentionCase[];
  aging: { bucket: AgingBucket; count: number }[];
  workflowMix: { state: string; count: number }[];
  composition: {
    types: { type: string; count: number }[];
    directions: { direction: string; count: number }[];
  };
  decisions: { type: string; count: number }[];
  trend: {
    key: string;
    start: string;
    grain: 'week' | 'month';
    created: number;
    closed: number;
    closedOnTime: number;
    decisions: number;
  }[];
  stages: {
    stage: WorkflowStage;
    waiting: number;
    overdueWaiting: number;
    averageDays: number | null;
    sampleSize: number;
  }[];
  departments: {
    id: string;
    nameEn: string;
    nameAr: string;
    active: number;
    overdue: number;
    awaitingExecution: number;
    closedInPeriod: number;
    overdueRatio: number | null;
    averageResponseDays: number | null;
    responseSampleSize: number;
  }[];
  heatmap: {
    id: string;
    nameEn: string;
    nameAr: string;
    stages: { stage: WorkflowStage; count: number }[];
  }[];
  categories: {
    id: string;
    nameEn: string;
    nameAr: string;
    createdInPeriod: number;
    active: number;
    overdue: number;
    closedInPeriod: number;
    closedOnTime: number;
    overdueRatio: number | null;
    timelineComplianceRate: number | null;
  }[];
}

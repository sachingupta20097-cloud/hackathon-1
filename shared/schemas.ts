import { z } from 'zod';

export const RequestCategoryEnum = z.enum(['EQUIPMENT', 'LEAVE', 'TRAVEL', 'SUPPLIES']);
export type RequestCategory = z.infer<typeof RequestCategoryEnum>;

export const RequestStatusEnum = z.enum([
  'DRAFT',
  'PARSING',
  'NEEDS_INFO',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
]);
export type RequestStatus = z.infer<typeof RequestStatusEnum>;

export const PriorityLevelEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type PriorityLevel = z.infer<typeof PriorityLevelEnum>;

export const UserRoleEnum = z.enum(['EMPLOYEE', 'APPROVER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const ApprovalActionTypeEnum = z.enum(['APPROVE', 'REJECT', 'REQUEST_INFO', 'ESCALATE']);
export type ApprovalActionType = z.infer<typeof ApprovalActionTypeEnum>;

// Section 16 Zod Validation Requirements
export const IntakeRequestSchema = z.object({
  rawInput: z.string().min(10, 'Request text must be at least 10 characters long.'),
  fallbackCategory: RequestCategoryEnum.optional(),
  department: z.string().optional()
});
export type IntakeRequestInput = z.infer<typeof IntakeRequestSchema>;

export const ApprovalActionSchema = z.object({
  requestId: z.string().uuid(),
  action: ApprovalActionTypeEnum,
  comments: z.string().min(2, 'Comments are required for audit tracking.')
});
export type ApprovalActionInput = z.infer<typeof ApprovalActionSchema>;

export const RuleConfigurationSchema = z.object({
  category: RequestCategoryEnum,
  ruleName: z.string().min(3, 'Rule name must be at least 3 characters.'),
  conditions: z.object({
    maxCost: z.number().optional(),
    minCost: z.number().optional(),
    maxDays: z.number().optional(),
    minDays: z.number().optional(),
    requiresManagerApproval: z.boolean().default(true)
  }),
  autoApprove: z.boolean().default(false),
  assignedApproverRole: UserRoleEnum
});
export type RuleConfigurationInput = z.infer<typeof RuleConfigurationSchema>;

export const SupplementRequestSchema = z.object({
  supplementData: z.record(z.string(), z.any()),
  additionalNotes: z.string().optional()
});
export type SupplementRequestInput = z.infer<typeof SupplementRequestSchema>;

// Data Model Interfaces
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  manager_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedMetadata {
  item_names?: string[];
  start_date?: string;
  end_date?: string;
  destination?: string;
  business_justification?: string;
  vendor?: string;
  duration_days?: number;
  specifications?: string;
  additional_notes?: string;
}

export interface AIExtractionResult {
  category: RequestCategory;
  title: string;
  summary: string;
  estimated_cost: number | null;
  urgency: PriorityLevel;
  extracted_metadata: ExtractedMetadata;
  missing_fields: string[];
  confidence_score: number;
  reasoning: string;
  policy_risks?: string[];
}

export interface RequestItem {
  id: string;
  request_number: number;
  employee_id: string;
  category: RequestCategory;
  title: string;
  raw_input: string;
  extracted_data: AIExtractionResult;
  missing_fields: string[];
  ai_confidence_score: number;
  ai_reasoning: string;
  status: RequestStatus;
  priority: PriorityLevel;
  total_estimated_cost: number | null;
  current_approver_id: string | null;
  created_at: string;
  updated_at: string;
  employee?: UserProfile;
  approver?: UserProfile | null;
  approval_actions?: ApprovalActionRecord[];
}

export interface ApprovalActionRecord {
  id: string;
  request_id: string;
  approver_id: string;
  action: ApprovalActionType;
  comments: string;
  created_at: string;
  approver?: UserProfile;
}

export interface WorkflowRule {
  id: string;
  category: RequestCategory;
  rule_name: string;
  conditions: {
    max_cost?: number;
    min_cost?: number;
    maxCost?: number;
    minCost?: number;
    max_days?: number;
    min_days?: number;
    requiresManagerApproval?: boolean;
    requires_manager_approval?: boolean;
    [key: string]: any;
  };
  requires_approval: boolean;
  auto_approve: boolean;
  assigned_approver_role: UserRole;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryItem {
  id: string;
  code: RequestCategory;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  request_id?: string | null;
  actor_id?: string | null;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
  actor?: UserProfile | null;
  request?: {
    request_number: number;
    title: string;
    category: RequestCategory;
  } | null;
}

// Section 9 Domain Config
export interface DomainConfig {
  domain: RequestCategory;
  requiredFields: string[];
  autoApprovalThresholdLimit: number;
  approvalLevels: string[];
}

export const DOMAIN_CONFIGS: Record<RequestCategory, DomainConfig> = {
  EQUIPMENT: {
    domain: 'EQUIPMENT',
    requiredFields: ['item_names', 'business_justification'],
    autoApprovalThresholdLimit: 200,
    approvalLevels: ['Direct Manager', 'IT Procurement Lead', 'VP of Ops']
  },
  LEAVE: {
    domain: 'LEAVE',
    requiredFields: ['start_date', 'end_date'],
    autoApprovalThresholdLimit: 0,
    approvalLevels: ['Direct Manager', 'HR Operations']
  },
  TRAVEL: {
    domain: 'TRAVEL',
    requiredFields: ['destination', 'start_date', 'end_date', 'business_justification'],
    autoApprovalThresholdLimit: 0,
    approvalLevels: ['Direct Manager', 'Finance Controller', 'VP of Dept']
  },
  SUPPLIES: {
    domain: 'SUPPLIES',
    requiredFields: ['item_names', 'business_justification'],
    autoApprovalThresholdLimit: 150,
    approvalLevels: ['Direct Manager', 'Office Admin Lead']
  }
};

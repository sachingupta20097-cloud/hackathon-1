import { 
  AIExtractionResult, 
  RequestStatus, 
  UserRole, 
  WorkflowRule, 
  DOMAIN_CONFIGS 
} from '../../../shared/schemas.js';

export interface RuleEvaluationResult {
  nextStatus: RequestStatus;
  matchedRule: WorkflowRule | null;
  ruleReasoning: string;
  isAutoApproved: boolean;
  assignedRole: UserRole;
  requiresHumanReview: boolean;
  policyViolations: string[];
}

export function evaluateRequestRules(
  extraction: AIExtractionResult, 
  activeRules: WorkflowRule[],
  employeeRole: UserRole = 'EMPLOYEE'
): RuleEvaluationResult {
  const category = extraction.category;
  const cost = extraction.estimated_cost ?? 0;
  const missing = extraction.missing_fields || [];
  const confidence = extraction.confidence_score ?? 0;
  const domainConfig = DOMAIN_CONFIGS[category];

  // 1. Check for Missing Info or critically low confidence (< 0.65)
  if (missing.length > 0 || confidence < 0.65) {
    return {
      nextStatus: 'NEEDS_INFO',
      matchedRule: null,
      ruleReasoning: `Request is missing mandatory information: [${missing.join(', ')}] with confidence score ${confidence}. Requires employee supplement before routing.`,
      isAutoApproved: false,
      assignedRole: 'APPROVER',
      requiresHumanReview: false,
      policyViolations: [`Missing required fields: ${missing.join(', ')}`]
    };
  }

  // 2. Filter rules applicable to this category, sorted by priority ascending
  const categoryRules = activeRules
    .filter(r => r.category === category && r.is_active)
    .sort((a, b) => a.priority - b.priority);

  // 3. Evaluate configured workflow rules
  for (const rule of categoryRules) {
    const conditions = rule.conditions || {};
    const maxCost = conditions.max_cost ?? conditions.maxCost;
    const minCost = conditions.min_cost ?? conditions.minCost;

    let costMatches = true;
    if (maxCost !== undefined && cost > maxCost) {
      costMatches = false;
    }
    if (minCost !== undefined && cost < minCost) {
      costMatches = false;
    }

    if (costMatches) {
      if (rule.auto_approve) {
        return {
          nextStatus: 'APPROVED',
          matchedRule: rule,
          ruleReasoning: `Auto-approved by rule "${rule.rule_name}". Total estimated cost ($${cost}) is within auto-approval threshold ($${maxCost ?? 'unlimited'}).`,
          isAutoApproved: true,
          assignedRole: rule.assigned_approver_role || 'APPROVER',
          requiresHumanReview: false,
          policyViolations: []
        };
      } else {
        return {
          nextStatus: 'PENDING_APPROVAL',
          matchedRule: rule,
          ruleReasoning: `Routed to review queue under rule "${rule.rule_name}". Assigned to ${rule.assigned_approver_role}.`,
          isAutoApproved: false,
          assignedRole: rule.assigned_approver_role || 'APPROVER',
          requiresHumanReview: true,
          policyViolations: cost > 1000 ? [`High value expense requiring ${rule.assigned_approver_role} sign-off.`] : []
        };
      }
    }
  }

  // 4. Default fallback domain check if no custom rule matched
  if (domainConfig && cost <= domainConfig.autoApprovalThresholdLimit && domainConfig.autoApprovalThresholdLimit > 0) {
    return {
      nextStatus: 'APPROVED',
      matchedRule: null,
      ruleReasoning: `Auto-approved under default domain policy for ${category} (Cost $${cost} <= Threshold $${domainConfig.autoApprovalThresholdLimit}).`,
      isAutoApproved: true,
      assignedRole: 'APPROVER',
      requiresHumanReview: false,
      policyViolations: []
    };
  }

  // 5. Default is PENDING_APPROVAL
  return {
    nextStatus: 'PENDING_APPROVAL',
    matchedRule: null,
    ruleReasoning: `Standard review required for ${category} request (Estimated cost: $${cost}).`,
    isAutoApproved: false,
    assignedRole: cost > 2500 ? 'ADMIN' : 'APPROVER',
    requiresHumanReview: true,
    policyViolations: []
  };
}

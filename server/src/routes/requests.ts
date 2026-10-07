import { Router, Request, Response } from 'express';
import { IntakeRequestSchema, SupplementRequestSchema, RequestStatus } from '../../../shared/schemas.js';
import { parseEmployeeRequest } from '../services/aiExtractor.js';
import { evaluateRequestRules } from '../services/rulesEngine.js';
import { db, DEMO_PROFILES } from '../db/repository.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Apply auth to all request routes
router.use(authenticate);

/**
 * POST /api/requests/intake
 * Receives raw text/form, invokes Gemini parser, runs rule engine, creates request record
 */
router.post('/intake', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = IntakeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: parseResult.error.format() 
      });
      return;
    }

    const { rawInput, fallbackCategory } = parseResult.data;
    const currentUser = req.user!;

    // 1. AI Extraction using Gemini 3.8 Flash (with strict JSON schema)
    const extraction = await parseEmployeeRequest(rawInput, fallbackCategory);

    // 2. Fetch Active Workflow Rules for evaluation
    const rules = await db.getWorkflowRules();

    // 3. Dynamic Rule Evaluation & State Transition
    const evaluation = evaluateRequestRules(extraction, rules, currentUser.role);

    // 4. Determine Approver assignment if pending approval
    let assignedApproverId: string | null = null;
    if (evaluation.nextStatus === 'PENDING_APPROVAL') {
      // Find approver matching role
      const approvers = (await db.getProfiles()).filter(p => p.role === evaluation.assignedRole);
      assignedApproverId = approvers.length > 0 ? approvers[0].id : DEMO_PROFILES[1].id;
    }

    // 5. Create Request in Database
    const createdRequest = await db.createRequest({
      employee_id: currentUser.id,
      category: extraction.category,
      title: extraction.title,
      raw_input: rawInput,
      extracted_data: extraction,
      missing_fields: extraction.missing_fields,
      ai_confidence_score: extraction.confidence_score,
      ai_reasoning: extraction.reasoning,
      status: evaluation.nextStatus,
      priority: extraction.urgency,
      total_estimated_cost: extraction.estimated_cost,
      current_approver_id: assignedApproverId
    });

    // 6. Record Immutable Audit Log
    await db.createAuditLog({
      request_id: createdRequest.id,
      actor_id: currentUser.id,
      event_type: 'REQUEST_CREATED',
      payload: {
        raw_input: rawInput,
        initial_status: evaluation.nextStatus,
        ai_confidence: extraction.confidence_score,
        matched_rule: evaluation.matchedRule?.rule_name || null,
        is_auto_approved: evaluation.isAutoApproved,
        rule_reasoning: evaluation.ruleReasoning,
        missing_fields: extraction.missing_fields
      }
    });

    res.status(201).json({
      success: true,
      request: createdRequest,
      extraction,
      evaluation
    });
  } catch (error: any) {
    console.error('Error handling intake request:', error);
    res.status(500).json({ error: 'Internal server error during request intake', message: error.message });
  }
});

/**
 * GET /api/requests
 * Lists requests scoped to current user's role
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const status = req.query.status as RequestStatus | undefined;

    const requests = await db.getRequests({
      employeeId: currentUser.id,
      role: currentUser.role,
      status
    });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch requests', message: error.message });
  }
});

/**
 * GET /api/requests/:id
 * Fetches single request detail, extraction metadata, and workflow history
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const request = await db.getRequestById(req.params.id);

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Role-based data isolation
    if (currentUser.role === 'EMPLOYEE' && request.employee_id !== currentUser.id) {
      res.status(403).json({ error: 'Forbidden: You cannot view requests submitted by other employees.' });
      return;
    }

    const auditLogs = await db.getAuditLogs({ requestId: request.id });

    res.json({
      success: true,
      request,
      auditLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch request details', message: error.message });
  }
});

/**
 * PATCH /api/requests/:id/supplement
 * Accepts missing field responses from employee, re-evaluates request
 */
router.patch('/:id/supplement', async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const request = await db.getRequestById(req.params.id);

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (currentUser.role === 'EMPLOYEE' && request.employee_id !== currentUser.id) {
      res.status(403).json({ error: 'Forbidden: You can only supplement your own requests.' });
      return;
    }

    const parseResult = SupplementRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      return;
    }

    const { supplementData, additionalNotes } = parseResult.data;

    // Merge supplied data into existing metadata
    const updatedMetadata = {
      ...(request.extracted_data?.extracted_metadata || {}),
      ...supplementData
    };

    // Recalculate cost if supplied
    let updatedCost = request.total_estimated_cost;
    if (supplementData.estimated_cost !== undefined) {
      updatedCost = Number(supplementData.estimated_cost);
    }

    // Re-calculate missing fields
    const remainingMissing = (request.missing_fields || []).filter(
      field => supplementData[field] === undefined || supplementData[field] === ''
    );

    // Re-evaluate extraction payload
    const updatedExtraction = {
      ...request.extracted_data,
      extracted_metadata: updatedMetadata,
      missing_fields: remainingMissing,
      confidence_score: remainingMissing.length === 0 ? 0.95 : 0.70,
      estimated_cost: updatedCost,
      reasoning: `${request.extracted_data?.reasoning || ''} (Supplements provided by employee).`
    };

    // Re-run rules engine
    const rules = await db.getWorkflowRules();
    const evaluation = evaluateRequestRules(updatedExtraction, rules, currentUser.role);

    let assignedApproverId = request.current_approver_id;
    if (evaluation.nextStatus === 'PENDING_APPROVAL' && !assignedApproverId) {
      const approvers = (await db.getProfiles()).filter(p => p.role === evaluation.assignedRole);
      assignedApproverId = approvers.length > 0 ? approvers[0].id : DEMO_PROFILES[1].id;
    }

    const updatedRequest = await db.updateRequest(request.id, {
      extracted_data: updatedExtraction,
      missing_fields: remainingMissing,
      ai_confidence_score: updatedExtraction.confidence_score,
      total_estimated_cost: updatedCost,
      status: evaluation.nextStatus,
      current_approver_id: assignedApproverId
    });

    // Record Audit Log
    await db.createAuditLog({
      request_id: request.id,
      actor_id: currentUser.id,
      event_type: 'INFO_SUPPLEMENTED',
      payload: {
        supplemented_fields: Object.keys(supplementData),
        additional_notes: additionalNotes || null,
        new_status: evaluation.nextStatus,
        rule_evaluation: evaluation.ruleReasoning
      }
    });

    res.json({
      success: true,
      request: updatedRequest,
      evaluation
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to supplement request', message: error.message });
  }
});

export default router;

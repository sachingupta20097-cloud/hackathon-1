import { Router, Request, Response } from 'express';
import { ApprovalActionSchema, RequestStatus } from '../../../shared/schemas.js';
import { db, DEMO_PROFILES } from '../db/repository.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/approvals
 * Lists requests awaiting review in the Approver Queue
 */
router.get('/', requireRole(['APPROVER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const allRequests = await db.getRequests();
    const pendingQueue = allRequests.filter(r => r.status === 'PENDING_APPROVAL');

    res.json({
      success: true,
      count: pendingQueue.length,
      requests: pendingQueue
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch approval queue', message: error.message });
  }
});

/**
 * POST /api/approvals/action
 * Executes an approval decision (APPROVE, REJECT, REQUEST_INFO, ESCALATE)
 */
router.post('/action', requireRole(['APPROVER', 'ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = ApprovalActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      return;
    }

    const { requestId, action, comments } = parseResult.data;
    const currentUser = req.user!;

    const request = await db.getRequestById(requestId);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Determine target status
    let nextStatus: RequestStatus = request.status;
    let nextApproverId: string | null = request.current_approver_id;
    let nextPriority = request.priority;

    switch (action) {
      case 'APPROVE':
        nextStatus = 'APPROVED';
        break;
      case 'REJECT':
        nextStatus = 'REJECTED';
        break;
      case 'REQUEST_INFO':
        nextStatus = 'NEEDS_INFO';
        break;
      case 'ESCALATE':
        nextStatus = 'PENDING_APPROVAL';
        nextPriority = 'URGENT';
        // Assign to Admin
        const admins = (await db.getProfiles()).filter(p => p.role === 'ADMIN');
        nextApproverId = admins.length > 0 ? admins[0].id : DEMO_PROFILES[2].id;
        break;
    }

    // 1. Record Approval Action
    const actionRecord = await db.createApprovalAction({
      request_id: requestId,
      approver_id: currentUser.id,
      action,
      comments
    });

    // 2. Update Request Status
    const updatedRequest = await db.updateRequest(requestId, {
      status: nextStatus,
      priority: nextPriority,
      current_approver_id: nextApproverId
    });

    // 3. Record System Audit Log
    await db.createAuditLog({
      request_id: requestId,
      actor_id: currentUser.id,
      event_type: `APPROVAL_ACTION_${action}`,
      payload: {
        action,
        comments,
        previous_status: request.status,
        new_status: nextStatus,
        approver_role: currentUser.role
      }
    });

    res.json({
      success: true,
      action: actionRecord,
      request: updatedRequest
    });
  } catch (error: any) {
    console.error('Error executing approval action:', error);
    res.status(500).json({ error: 'Failed to process approval action', message: error.message });
  }
});

export default router;

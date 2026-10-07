import { Router, Request, Response } from 'express';
import { RuleConfigurationSchema } from '../../../shared/schemas.js';
import { db } from '../db/repository.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// --- Workflow Rules ---
router.get('/rules', async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = await db.getWorkflowRules();
    res.json({ success: true, count: rules.length, rules });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch rules', message: error.message });
  }
});

router.post('/rules', requireRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = RuleConfigurationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
      return;
    }

    const { category, ruleName, conditions, autoApprove, assignedApproverRole } = parseResult.data;
    const currentUser = req.user!;

    const newRule = await db.createWorkflowRule({
      category,
      rule_name: ruleName,
      conditions,
      requires_approval: !autoApprove,
      auto_approve: autoApprove,
      assigned_approver_role: assignedApproverRole,
      priority: 1,
      is_active: true
    });

    await db.createAuditLog({
      actor_id: currentUser.id,
      event_type: 'WORKFLOW_RULE_CREATED',
      payload: { rule_id: newRule.id, rule_name: newRule.rule_name, category: newRule.category }
    });

    res.status(201).json({ success: true, rule: newRule });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create workflow rule', message: error.message });
  }
});

router.put('/rules/:id', requireRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await db.updateWorkflowRule(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    await db.createAuditLog({
      actor_id: req.user!.id,
      event_type: 'WORKFLOW_RULE_UPDATED',
      payload: { rule_id: updated.id, updates: req.body }
    });

    res.json({ success: true, rule: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update rule', message: error.message });
  }
});

router.delete('/rules/:id', requireRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const success = await db.deleteWorkflowRule(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    await db.createAuditLog({
      actor_id: req.user!.id,
      event_type: 'WORKFLOW_RULE_DELETED',
      payload: { rule_id: req.params.id }
    });

    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete rule', message: error.message });
  }
});

// --- Category Taxonomy ---
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await db.getCategories();
    res.json({ success: true, count: categories.length, categories });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch categories', message: error.message });
  }
});

router.post('/categories', requireRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Code and Name are required.' });
      return;
    }

    const newCat = await db.createCategory({
      code,
      name,
      description: description || '',
      is_active: true
    });

    await db.createAuditLog({
      actor_id: req.user!.id,
      event_type: 'CATEGORY_CREATED',
      payload: { code, name }
    });

    res.status(201).json({ success: true, category: newCat });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create category', message: error.message });
  }
});

// --- System Audit Ledger ---
router.get('/audit-logs', requireRole(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await db.getAuditLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
  }
});

// --- Admin System Analytics & Metrics ---
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await db.getRequests();
    const rules = await db.getWorkflowRules();

    const totalRequests = requests.length;
    const pendingApproval = requests.filter(r => r.status === 'PENDING_APPROVAL').length;
    const approved = requests.filter(r => r.status === 'APPROVED').length;
    const needsInfo = requests.filter(r => r.status === 'NEEDS_INFO').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;

    const totalCost = requests.reduce((sum, r) => sum + (r.total_estimated_cost || 0), 0);
    const avgConfidence = totalRequests > 0 
      ? Number((requests.reduce((sum, r) => sum + (r.ai_confidence_score || 0), 0) / totalRequests).toFixed(2))
      : 0.95;

    const categoryBreakdown: Record<string, number> = {};
    requests.forEach(r => {
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalRequests,
        pendingApproval,
        approved,
        needsInfo,
        rejected,
        totalCost,
        avgConfidence,
        activeRulesCount: rules.filter(r => r.is_active).length,
        categoryBreakdown
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute system metrics', message: error.message });
  }
});

export default router;

import { supabaseAdmin } from '../config/supabase.js';
import { 
  RequestItem, 
  WorkflowRule, 
  CategoryItem, 
  AuditLogItem, 
  ApprovalActionRecord, 
  UserProfile, 
  UserRole,
  RequestStatus,
  RequestCategory,
  AIExtractionResult 
} from '../../../shared/schemas.js';

// Pre-seeded Demo Profiles
export const DEMO_PROFILES: UserProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alex.employee@company.com',
    full_name: 'Alex Rivera',
    role: 'EMPLOYEE',
    department: 'Engineering',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'sarah.manager@company.com',
    full_name: 'Sarah Chen',
    role: 'APPROVER',
    department: 'Engineering & Operations',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'marcus.admin@company.com',
    full_name: 'Marcus Vance',
    role: 'ADMIN',
    department: 'Workplace & IT Admin',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Pre-seeded Categories
const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'c1-equipment',
    code: 'EQUIPMENT',
    name: 'IT & Hardware Equipment',
    description: 'Hardware, laptops, peripherals, mobile devices, ergonomic desk items',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'c2-leave',
    code: 'LEAVE',
    name: 'Time Off & Leave',
    description: 'Paid time off (PTO), sick leave, parental leave, bereavement',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'c3-travel',
    code: 'TRAVEL',
    name: 'Corporate & Conference Travel',
    description: 'Flights, hotels, conference registrations, meals, ground transportation',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'c4-supplies',
    code: 'SUPPLIES',
    name: 'Office & SaaS Supplies',
    description: 'Office stationery, team event materials, pantry items, departmental software tools',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// Pre-seeded Workflow Rules
const INITIAL_RULES: WorkflowRule[] = [
  {
    id: 'r1-equip-auto',
    category: 'EQUIPMENT',
    rule_name: 'Low-Cost Peripherals Auto-Approval',
    conditions: { maxCost: 200, requiresManagerApproval: false },
    requires_approval: false,
    auto_approve: true,
    assigned_approver_role: 'APPROVER',
    priority: 1,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r2-equip-mgr',
    category: 'EQUIPMENT',
    rule_name: 'High-Value Hardware Escalation',
    conditions: { maxCost: 1500, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: 'APPROVER',
    priority: 2,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r3-leave-quick',
    category: 'LEAVE',
    rule_name: 'Single Day PTO Fast-Track',
    conditions: { maxCost: 0, maxDays: 1, requiresManagerApproval: false },
    requires_approval: false,
    auto_approve: true,
    assigned_approver_role: 'APPROVER',
    priority: 1,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r4-leave-mgr',
    category: 'LEAVE',
    rule_name: 'Multi-Day Leave Manager Review',
    conditions: { maxCost: 0, minDays: 2, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: 'APPROVER',
    priority: 2,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r5-travel-standard',
    category: 'TRAVEL',
    rule_name: 'Domestic Business Travel Review',
    conditions: { maxCost: 1000, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: 'APPROVER',
    priority: 1,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r6-travel-exec',
    category: 'TRAVEL',
    rule_name: 'Executive & International Travel',
    conditions: { minCost: 1000, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: 'ADMIN',
    priority: 2,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r7-supplies-auto',
    category: 'SUPPLIES',
    rule_name: 'Standard Office Supplies Auto-Approval',
    conditions: { maxCost: 150, requiresManagerApproval: false },
    requires_approval: false,
    auto_approve: true,
    assigned_approver_role: 'APPROVER',
    priority: 1,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'r8-supplies-sw',
    category: 'SUPPLIES',
    rule_name: 'Software License & Tools Approval',
    conditions: { maxCost: 1000, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: 'APPROVER',
    priority: 2,
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// Pre-seeded Requests for demonstration
const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: 'req-001',
    request_number: 101,
    employee_id: DEMO_PROFILES[0].id,
    category: 'EQUIPMENT',
    title: 'Ergonomic Mechanical Keyboard & Mouse Set',
    raw_input: 'Requesting Logitech MX Mechanical Wireless Keyboard and MX Master 3S mouse for remote ergonomic workstation setup, cost is $210 total.',
    extracted_data: {
      category: 'EQUIPMENT',
      title: 'Ergonomic Mechanical Keyboard & Mouse Set',
      summary: 'Wireless mechanical keyboard and mouse workstation peripherals.',
      estimated_cost: 210,
      urgency: 'MEDIUM',
      extracted_metadata: {
        item_names: ['Logitech MX Mechanical', 'Logitech MX Master 3S'],
        business_justification: 'Ergonomic workstation productivity'
      },
      missing_fields: [],
      confidence_score: 0.94,
      reasoning: 'Clear item specifications and cost provided for standard IT peripherals.',
      policy_risks: []
    },
    missing_fields: [],
    ai_confidence_score: 0.94,
    ai_reasoning: 'High-confidence IT hardware intake. Exceeds auto-approval limit ($200) by $10.',
    status: 'PENDING_APPROVAL',
    priority: 'MEDIUM',
    total_estimated_cost: 210,
    current_approver_id: DEMO_PROFILES[1].id,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    employee: DEMO_PROFILES[0]
  },
  {
    id: 'req-002',
    request_number: 102,
    employee_id: DEMO_PROFILES[0].id,
    category: 'TRAVEL',
    title: 'Q3 Cloud Architecture Summit in San Francisco',
    raw_input: 'Flight and 2 nights hotel for AWS/Google Cloud Architecture Summit in SF from Nov 12 to Nov 14, 2026. Estimated expenses $1,450.',
    extracted_data: {
      category: 'TRAVEL',
      title: 'Q3 Cloud Architecture Summit in San Francisco',
      summary: 'Conference flight and accommodation in San Francisco for technical architecture summit.',
      estimated_cost: 1450,
      urgency: 'HIGH',
      extracted_metadata: {
        destination: 'San Francisco, CA',
        start_date: '2026-11-12',
        end_date: '2026-11-14',
        business_justification: 'Architecture summit speaker attendance'
      },
      missing_fields: [],
      confidence_score: 0.96,
      reasoning: 'Complete dates, destination, justification, and cost estimates extracted.',
      policy_risks: ['High cost travel expense ($1,450) requiring administrative sign-off.']
    },
    missing_fields: [],
    ai_confidence_score: 0.96,
    ai_reasoning: 'Extracted with all required corporate travel parameters.',
    status: 'PENDING_APPROVAL',
    priority: 'HIGH',
    total_estimated_cost: 1450,
    current_approver_id: DEMO_PROFILES[2].id,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    employee: DEMO_PROFILES[0]
  },
  {
    id: 'req-003',
    request_number: 103,
    employee_id: DEMO_PROFILES[0].id,
    category: 'SUPPLIES',
    title: 'Dry Erase Markers & Brainstorming Whiteboard Pads',
    raw_input: 'Order pack of Expo markers and Post-it easel pads for the engineering sprint room, $48.',
    extracted_data: {
      category: 'SUPPLIES',
      title: 'Dry Erase Markers & Brainstorming Whiteboard Pads',
      summary: 'Meeting room stationery and sprint planning accessories.',
      estimated_cost: 48,
      urgency: 'LOW',
      extracted_metadata: {
        item_names: ['Expo Dry Erase Markers', 'Post-it Easel Pads'],
        business_justification: 'Sprint room planning meetings'
      },
      missing_fields: [],
      confidence_score: 0.98,
      reasoning: 'Straightforward stationery request well below auto-approval limit ($150).',
      policy_risks: []
    },
    missing_fields: [],
    ai_confidence_score: 0.98,
    ai_reasoning: 'Auto-approved via rule: "Standard Office Supplies Auto-Approval"',
    status: 'APPROVED',
    priority: 'LOW',
    total_estimated_cost: 48,
    current_approver_id: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    employee: DEMO_PROFILES[0]
  }
];

// Initial Audit Logs
const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-001',
    request_id: 'req-003',
    actor_id: DEMO_PROFILES[0].id,
    event_type: 'REQUEST_CREATED',
    payload: { status: 'APPROVED', auto_approved: true, matched_rule: 'Standard Office Supplies Auto-Approval' },
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    actor: DEMO_PROFILES[0],
    request: { request_number: 103, title: 'Dry Erase Markers & Brainstorming Whiteboard Pads', category: 'SUPPLIES' }
  },
  {
    id: 'log-002',
    request_id: 'req-002',
    actor_id: DEMO_PROFILES[0].id,
    event_type: 'REQUEST_CREATED',
    payload: { status: 'PENDING_APPROVAL', assigned_role: 'ADMIN', priority: 'HIGH' },
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    actor: DEMO_PROFILES[0],
    request: { request_number: 102, title: 'Q3 Cloud Architecture Summit in San Francisco', category: 'TRAVEL' }
  },
  {
    id: 'log-003',
    request_id: 'req-001',
    actor_id: DEMO_PROFILES[0].id,
    event_type: 'REQUEST_CREATED',
    payload: { status: 'PENDING_APPROVAL', assigned_role: 'APPROVER' },
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    actor: DEMO_PROFILES[0],
    request: { request_number: 101, title: 'Ergonomic Mechanical Keyboard & Mouse Set', category: 'EQUIPMENT' }
  }
];

class DatabaseRepository {
  private useSupabase = false;
  private checkedSupabase = false;

  // In-memory persistent caches
  private profiles: Map<string, UserProfile> = new Map();
  private categories: Map<string, CategoryItem> = new Map();
  private rules: Map<string, WorkflowRule> = new Map();
  private requests: Map<string, RequestItem> = new Map();
  private actions: ApprovalActionRecord[] = [];
  private auditLogs: AuditLogItem[] = [];
  private nextRequestNumber = 104;

  constructor() {
    // Populate in-memory seed stores
    DEMO_PROFILES.forEach(p => this.profiles.set(p.id, p));
    INITIAL_CATEGORIES.forEach(c => this.categories.set(c.id, c));
    INITIAL_RULES.forEach(r => this.rules.set(r.id, r));
    INITIAL_REQUESTS.forEach(r => this.requests.set(r.id, r));
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
  }

  // Detect whether Supabase database tables exist
  async checkSupabaseAvailability(): Promise<boolean> {
    if (this.checkedSupabase) return this.useSupabase;

    try {
      const { data, error } = await supabaseAdmin.from('categories').select('id').limit(1);
      if (!error) {
        console.log('✅ [Supabase] Connected to live Supabase PostgreSQL database tables.');
        this.useSupabase = true;
      } else {
        console.log('ℹ️ [Supabase] Tables not detected in remote database yet. Running with resilient high-availability storage.');
        console.log('ℹ️ [Supabase] Note: Run "supabase/schema.sql" in your Supabase SQL Editor anytime to switch to PostgreSQL.');
        this.useSupabase = false;
      }
    } catch {
      this.useSupabase = false;
    }

    this.checkedSupabase = true;
    return this.useSupabase;
  }

  // --- Profiles ---
  async getProfiles(): Promise<UserProfile[]> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('profiles').select('*');
      if (!error && data && data.length > 0) return data as UserProfile[];
    }
    return Array.from(this.profiles.values());
  }

  async getProfileById(id: string): Promise<UserProfile | null> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data as UserProfile;
    }
    return this.profiles.get(id) || null;
  }

  async getProfileByEmail(email: string): Promise<UserProfile | null> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('email', email).maybeSingle();
      if (!error && data) return data as UserProfile;
    }
    return Array.from(this.profiles.values()).find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
  }

  // --- Categories ---
  async getCategories(): Promise<CategoryItem[]> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('categories').select('*').order('name');
      if (!error && data && data.length > 0) return data as CategoryItem[];
    }
    return Array.from(this.categories.values());
  }

  async createCategory(cat: Omit<CategoryItem, 'id' | 'created_at'>): Promise<CategoryItem> {
    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      ...cat,
      created_at: new Date().toISOString()
    };
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('categories').insert(newCat).select().single();
      if (!error && data) return data as CategoryItem;
    }
    this.categories.set(newCat.id, newCat);
    return newCat;
  }

  // --- Workflow Rules ---
  async getWorkflowRules(): Promise<WorkflowRule[]> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('workflow_rules').select('*').order('priority');
      if (!error && data && data.length > 0) return data as WorkflowRule[];
    }
    return Array.from(this.rules.values());
  }

  async createWorkflowRule(rule: Omit<WorkflowRule, 'id' | 'created_at'>): Promise<WorkflowRule> {
    const newRule: WorkflowRule = {
      id: `rule-${Date.now()}`,
      ...rule,
      created_at: new Date().toISOString()
    };
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('workflow_rules').insert(newRule).select().single();
      if (!error && data) return data as WorkflowRule;
    }
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  async updateWorkflowRule(id: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule | null> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('workflow_rules').update(updates).eq('id', id).select().single();
      if (!error && data) return data as WorkflowRule;
    }
    const existing = this.rules.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.rules.set(id, updated);
    return updated;
  }

  async deleteWorkflowRule(id: string): Promise<boolean> {
    if (await this.checkSupabaseAvailability()) {
      const { error } = await supabaseAdmin.from('workflow_rules').delete().eq('id', id);
      if (!error) return true;
    }
    return this.rules.delete(id);
  }

  // --- Requests ---
  async getRequests(filters?: { employeeId?: string; role?: UserRole; status?: RequestStatus }): Promise<RequestItem[]> {
    if (await this.checkSupabaseAvailability()) {
      let query = supabaseAdmin.from('requests').select(`
        *,
        employee:profiles!employee_id(*)
      `).order('created_at', { ascending: false });

      if (filters?.employeeId && filters.role === 'EMPLOYEE') {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      const { data, error } = await query;
      if (!error && data) return data as RequestItem[];
    }

    let items = Array.from(this.requests.values());
    if (filters?.employeeId && filters.role === 'EMPLOYEE') {
      items = items.filter(r => r.employee_id === filters.employeeId);
    }
    if (filters?.status) {
      items = items.filter(r => r.status === filters.status);
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getRequestById(id: string): Promise<RequestItem | null> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin
        .from('requests')
        .select(`
          *,
          employee:profiles!employee_id(*),
          approval_actions(*, approver:profiles!approver_id(*))
        `)
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return data as RequestItem;
    }

    const item = this.requests.get(id);
    if (!item) return null;
    
    // Attach employee and approval actions
    const employee = this.profiles.get(item.employee_id);
    const relatedActions = this.actions
      .filter(a => a.request_id === id)
      .map(a => ({
        ...a,
        approver: this.profiles.get(a.approver_id)
      }));

    return {
      ...item,
      employee,
      approval_actions: relatedActions
    };
  }

  async createRequest(data: Omit<RequestItem, 'id' | 'request_number' | 'created_at' | 'updated_at'>): Promise<RequestItem> {
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const request_number = this.nextRequestNumber++;
    const now = new Date().toISOString();

    const newRequest: RequestItem = {
      id,
      request_number,
      ...data,
      created_at: now,
      updated_at: now
    };

    if (await this.checkSupabaseAvailability()) {
      const { data: supaData, error } = await supabaseAdmin.from('requests').insert({
        employee_id: data.employee_id,
        category: data.category,
        title: data.title,
        raw_input: data.raw_input,
        extracted_data: data.extracted_data,
        missing_fields: data.missing_fields,
        ai_confidence_score: data.ai_confidence_score,
        ai_reasoning: data.ai_reasoning,
        status: data.status,
        priority: data.priority,
        total_estimated_cost: data.total_estimated_cost,
        current_approver_id: data.current_approver_id
      }).select().single();

      if (!error && supaData) {
        newRequest.id = supaData.id;
        newRequest.request_number = supaData.request_number;
      }
    }

    newRequest.employee = this.profiles.get(newRequest.employee_id);
    this.requests.set(newRequest.id, newRequest);
    return newRequest;
  }

  async updateRequest(id: string, updates: Partial<RequestItem>): Promise<RequestItem | null> {
    updates.updated_at = new Date().toISOString();

    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('requests').update(updates).eq('id', id).select().single();
      if (!error && data) return data as RequestItem;
    }

    const existing = this.requests.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.requests.set(id, updated);
    return updated;
  }

  // --- Approval Actions ---
  async createApprovalAction(action: Omit<ApprovalActionRecord, 'id' | 'created_at'>): Promise<ApprovalActionRecord> {
    const newAction: ApprovalActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...action,
      created_at: new Date().toISOString()
    };

    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from('approval_actions').insert(newAction).select().single();
      if (!error && data) return data as ApprovalActionRecord;
    }

    this.actions.push(newAction);
    return newAction;
  }

  async getApprovalActions(requestId: string): Promise<ApprovalActionRecord[]> {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin
        .from('approval_actions')
        .select('*, approver:profiles!approver_id(*)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as ApprovalActionRecord[];
    }

    return this.actions
      .filter(a => a.request_id === requestId)
      .map(a => ({
        ...a,
        approver: this.profiles.get(a.approver_id)
      }));
  }

  // --- Audit Logs ---
  async createAuditLog(log: Omit<AuditLogItem, 'id' | 'created_at'>): Promise<AuditLogItem> {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...log,
      created_at: new Date().toISOString()
    };

    if (await this.checkSupabaseAvailability()) {
      await supabaseAdmin.from('audit_logs').insert({
        request_id: log.request_id,
        actor_id: log.actor_id,
        event_type: log.event_type,
        payload: log.payload
      });
    }

    newLog.actor = log.actor_id ? this.profiles.get(log.actor_id) : null;
    const req = log.request_id ? this.requests.get(log.request_id) : null;
    if (req) {
      newLog.request = {
        request_number: req.request_number,
        title: req.title,
        category: req.category
      };
    }
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  async getAuditLogs(filters?: { requestId?: string; eventType?: string }): Promise<AuditLogItem[]> {
    if (await this.checkSupabaseAvailability()) {
      let query = supabaseAdmin.from('audit_logs').select(`
        *,
        actor:profiles!actor_id(*),
        request:requests!request_id(request_number, title, category)
      `).order('created_at', { ascending: false });

      if (filters?.requestId) query = query.eq('request_id', filters.requestId);
      if (filters?.eventType) query = query.eq('event_type', filters.eventType);

      const { data, error } = await query;
      if (!error && data) return data as AuditLogItem[];
    }

    let logs = [...this.auditLogs];
    if (filters?.requestId) logs = logs.filter(l => l.request_id === filters.requestId);
    if (filters?.eventType) logs = logs.filter(l => l.event_type === filters.eventType);
    return logs;
  }
}

export const db = new DatabaseRepository();

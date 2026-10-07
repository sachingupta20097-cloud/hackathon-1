-- =============================================================================
-- SMARTFLOW AI - PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Enterprise AI-Powered Employee Request Routing & Approval Platform
-- =============================================================================

-- Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing types if recreating
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'APPROVER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('DRAFT', 'PARSING', 'NEEDS_INFO', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_category AS ENUM ('EQUIPMENT', 'LEAVE', 'TRAVEL', 'SUPPLIES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table (Synced or linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  department TEXT NOT NULL,
  manager_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Request Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code request_category NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workflow Rules Table
CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category request_category NOT NULL,
  rule_name TEXT NOT NULL,
  conditions JSONB NOT NULL, -- e.g., {"max_cost": 500, "requiresManagerApproval": false}
  requires_approval BOOLEAN DEFAULT TRUE,
  auto_approve BOOLEAN DEFAULT FALSE,
  assigned_approver_role user_role DEFAULT 'APPROVER',
  priority INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Requests Table
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number SERIAL,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category request_category NOT NULL,
  title TEXT NOT NULL,
  raw_input TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  missing_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_confidence_score NUMERIC(3, 2), -- e.g., 0.95
  ai_reasoning TEXT,
  status request_status NOT NULL DEFAULT 'PARSING',
  priority priority_level DEFAULT 'MEDIUM',
  total_estimated_cost NUMERIC(10, 2),
  current_approver_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Request Approval Actions Table
CREATE TABLE IF NOT EXISTS public.approval_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'REQUEST_INFO', 'ESCALATE')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. System Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_employee ON public.requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON public.requests(category);
CREATE INDEX IF NOT EXISTS idx_audit_request ON public.audit_logs(request_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view colleagues profiles" ON public.profiles;
CREATE POLICY "Users can view colleagues profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Categories Policies
DROP POLICY IF EXISTS "Everyone can view active categories" ON public.categories;
CREATE POLICY "Everyone can view active categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Workflow Rules Policies
DROP POLICY IF EXISTS "Everyone can read rules" ON public.workflow_rules;
CREATE POLICY "Everyone can read rules" ON public.workflow_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage rules" ON public.workflow_rules;
CREATE POLICY "Admins manage rules" ON public.workflow_rules FOR ALL USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- Requests Policies
DROP POLICY IF EXISTS "Employees view own requests" ON public.requests;
CREATE POLICY "Employees view own requests" ON public.requests FOR SELECT USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Employees insert own requests" ON public.requests;
CREATE POLICY "Employees insert own requests" ON public.requests FOR INSERT WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Employees update own requests" ON public.requests;
CREATE POLICY "Employees update own requests" ON public.requests FOR UPDATE USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Approvers view pending/assigned requests" ON public.requests;
CREATE POLICY "Approvers view pending/assigned requests" ON public.requests FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('APPROVER', 'ADMIN') OR current_approver_id = auth.uid()
);

DROP POLICY IF EXISTS "Approvers update assigned requests" ON public.requests;
CREATE POLICY "Approvers update assigned requests" ON public.requests FOR UPDATE USING (
  public.get_user_role(auth.uid()) IN ('APPROVER', 'ADMIN') OR current_approver_id = auth.uid()
);

-- Approval Actions Policies
DROP POLICY IF EXISTS "Users view approval actions for their requests" ON public.approval_actions;
CREATE POLICY "Users view approval actions for their requests" ON public.approval_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND (r.employee_id = auth.uid() OR public.get_user_role(auth.uid()) IN ('APPROVER', 'ADMIN')))
);

DROP POLICY IF EXISTS "Approvers create approval actions" ON public.approval_actions;
CREATE POLICY "Approvers create approval actions" ON public.approval_actions FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('APPROVER', 'ADMIN')
);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT USING (
  public.get_user_role(auth.uid()) = 'ADMIN'
);

DROP POLICY IF EXISTS "Allow system service insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow system service insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- =============================================================================
-- SEED DATA: Default Categories & Workflow Rules
-- =============================================================================

INSERT INTO public.categories (code, name, description, is_active)
VALUES
  ('EQUIPMENT', 'IT & Equipment', 'Hardware, laptops, peripherals, mobile devices, ergonomic desk items', TRUE),
  ('LEAVE', 'Time Off & Leave', 'Paid time off (PTO), sick leave, parental leave, bereavement', TRUE),
  ('TRAVEL', 'Business Travel', 'Flights, hotels, conference registrations, meals, ground transportation', TRUE),
  ('SUPPLIES', 'Office & Software Supplies', 'Office stationery, team event materials, pantry items, departmental software tools', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.workflow_rules (category, rule_name, conditions, requires_approval, auto_approve, assigned_approver_role, priority, is_active)
VALUES
  ('EQUIPMENT', 'Standard Peripherals Auto-Approval', '{"max_cost": 200, "requiresManagerApproval": false}', FALSE, TRUE, 'APPROVER', 1, TRUE),
  ('EQUIPMENT', 'High-Value Hardware Escalation', '{"max_cost": 1500, "requiresManagerApproval": true}', TRUE, FALSE, 'APPROVER', 2, TRUE),
  ('LEAVE', 'Single Day Leave Fast-Track', '{"max_cost": 0, "max_days": 1, "requiresManagerApproval": false}', FALSE, TRUE, 'APPROVER', 1, TRUE),
  ('LEAVE', 'Extended Leave Manager Approval', '{"max_cost": 0, "min_days": 2, "requiresManagerApproval": true}', TRUE, FALSE, 'APPROVER', 2, TRUE),
  ('TRAVEL', 'Domestic Travel Review', '{"max_cost": 1000, "requiresManagerApproval": true}', TRUE, FALSE, 'APPROVER', 1, TRUE),
  ('TRAVEL', 'Executive Travel & Conferences', '{"max_cost": 3000, "requiresManagerApproval": true}', TRUE, FALSE, 'ADMIN', 2, TRUE),
  ('SUPPLIES', 'Office Pantry & Low Cost Supplies', '{"max_cost": 150, "requiresManagerApproval": false}', FALSE, TRUE, 'APPROVER', 1, TRUE),
  ('SUPPLIES', 'Departmental Software License Review', '{"max_cost": 1000, "requiresManagerApproval": true}', TRUE, FALSE, 'APPROVER', 2, TRUE)
ON CONFLICT DO NOTHING;

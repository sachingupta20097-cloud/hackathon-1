import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function seedDatabase() {
  console.log('🌱 Starting Supabase live database seeding...');

  // 1. Ensure Auth Users & Profiles
  const demoUsers = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'alex.employee@company.com',
      password: 'Password123!',
      full_name: 'Alex Rivera',
      role: 'EMPLOYEE' as const,
      department: 'Engineering'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'sarah.manager@company.com',
      password: 'Password123!',
      full_name: 'Sarah Chen',
      role: 'APPROVER' as const,
      department: 'Engineering & Operations'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'marcus.admin@company.com',
      password: 'Password123!',
      full_name: 'Marcus Vance',
      role: 'ADMIN' as const,
      department: 'Workplace & IT Admin'
    }
  ];

  for (const u of demoUsers) {
    // Check if auth user exists
    const { data: userData } = await supabase.auth.admin.getUserById(u.id);
    if (!userData?.user) {
      const { error: authErr } = await supabase.auth.admin.createUser({
        id: u.id,
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role, department: u.department }
      });
      if (authErr) {
        console.warn(`Auth user creation note for ${u.email}:`, authErr.message);
      } else {
        console.log(`✅ Auth user created: ${u.email}`);
      }
    }

    // Upsert Profile
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      department: u.department
    });
    if (profileErr) {
      console.error(`Error creating profile for ${u.email}:`, profileErr);
    } else {
      console.log(`✅ Profile upserted: ${u.full_name} (${u.role})`);
    }
  }

  // 2. Check if requests already exist
  const { count: requestCount } = await supabase.from('requests').select('*', { count: 'exact', head: true });
  if (!requestCount || requestCount === 0) {
    console.log('📦 Seeding initial demo requests...');
    const demoRequests = [
      {
        employee_id: '11111111-1111-1111-1111-111111111111',
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
        current_approver_id: '22222222-2222-2222-2222-222222222222'
      },
      {
        employee_id: '11111111-1111-1111-1111-111111111111',
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
        current_approver_id: '33333333-3333-3333-3333-333333333333'
      },
      {
        employee_id: '11111111-1111-1111-1111-111111111111',
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
        current_approver_id: null
      }
    ];

    for (const req of demoRequests) {
      const { data: inserted, error: reqErr } = await supabase.from('requests').insert(req).select().single();
      if (reqErr) {
        console.error('Error inserting demo request:', reqErr);
      } else if (inserted) {
        console.log(`✅ Request seeded: #${inserted.request_number} - ${inserted.title}`);
        // Create initial audit log
        await supabase.from('audit_logs').insert({
          request_id: inserted.id,
          actor_id: inserted.employee_id,
          event_type: 'REQUEST_CREATED',
          payload: { status: inserted.status, title: inserted.title }
        });
      }
    }
  } else {
    console.log(`ℹ️ Requests table already contains ${requestCount} records.`);
  }

  console.log('🎉 Supabase live database seeding complete!');
}

seedDatabase().catch(err => {
  console.error('Seed execution error:', err);
  process.exit(1);
});

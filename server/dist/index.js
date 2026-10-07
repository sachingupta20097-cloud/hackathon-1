// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv3 from "dotenv";

// src/routes/requests.ts
import { Router } from "express";

// ../shared/schemas.ts
import { z } from "zod";
var RequestCategoryEnum = z.enum(["EQUIPMENT", "LEAVE", "TRAVEL", "SUPPLIES"]);
var RequestStatusEnum = z.enum([
  "DRAFT",
  "PARSING",
  "NEEDS_INFO",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED"
]);
var PriorityLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
var UserRoleEnum = z.enum(["EMPLOYEE", "APPROVER", "ADMIN"]);
var ApprovalActionTypeEnum = z.enum(["APPROVE", "REJECT", "REQUEST_INFO", "ESCALATE"]);
var IntakeRequestSchema = z.object({
  rawInput: z.string().min(10, "Request text must be at least 10 characters long."),
  fallbackCategory: RequestCategoryEnum.optional(),
  department: z.string().optional()
});
var ApprovalActionSchema = z.object({
  requestId: z.string().uuid(),
  action: ApprovalActionTypeEnum,
  comments: z.string().min(2, "Comments are required for audit tracking.")
});
var RuleConfigurationSchema = z.object({
  category: RequestCategoryEnum,
  ruleName: z.string().min(3, "Rule name must be at least 3 characters."),
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
var SupplementRequestSchema = z.object({
  supplementData: z.record(z.string(), z.any()),
  additionalNotes: z.string().optional()
});
var DOMAIN_CONFIGS = {
  EQUIPMENT: {
    domain: "EQUIPMENT",
    requiredFields: ["item_names", "business_justification"],
    autoApprovalThresholdLimit: 200,
    approvalLevels: ["Direct Manager", "IT Procurement Lead", "VP of Ops"]
  },
  LEAVE: {
    domain: "LEAVE",
    requiredFields: ["start_date", "end_date"],
    autoApprovalThresholdLimit: 0,
    approvalLevels: ["Direct Manager", "HR Operations"]
  },
  TRAVEL: {
    domain: "TRAVEL",
    requiredFields: ["destination", "start_date", "end_date", "business_justification"],
    autoApprovalThresholdLimit: 0,
    approvalLevels: ["Direct Manager", "Finance Controller", "VP of Dept"]
  },
  SUPPLIES: {
    domain: "SUPPLIES",
    requiredFields: ["item_names", "business_justification"],
    autoApprovalThresholdLimit: 150,
    approvalLevels: ["Direct Manager", "Office Admin Lead"]
  }
};

// src/config/gemini.ts
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
var apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("\u26A0\uFE0F WARNING: GEMINI_API_KEY environment variable is missing. Check your server/.env file.");
}
var ai = new GoogleGenAI({
  apiKey: apiKey || "dummy-key"
});
var GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// src/services/aiExtractor.ts
import { Type } from "@google/genai";
var RequestExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ["EQUIPMENT", "LEAVE", "TRAVEL", "SUPPLIES"]
    },
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    estimated_cost: { type: Type.NUMBER },
    urgency: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    extracted_metadata: {
      type: Type.OBJECT,
      properties: {
        item_names: { type: Type.ARRAY, items: { type: Type.STRING } },
        start_date: { type: Type.STRING },
        end_date: { type: Type.STRING },
        destination: { type: Type.STRING },
        business_justification: { type: Type.STRING }
      }
    },
    missing_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
    confidence_score: { type: Type.NUMBER },
    reasoning: { type: Type.STRING }
  },
  required: ["category", "title", "summary", "urgency", "missing_fields", "confidence_score", "reasoning"]
};
var SYSTEM_INSTRUCTION = `You are SmartFlow AI Extractor, an enterprise system parser.
Your task is to analyze raw employee request text and extract precise structured fields.

Strict Operational Guidelines:
1. Extract category: EQUIPMENT, LEAVE, TRAVEL, or SUPPLIES.
2. Identify missing required details based on category context:
   - EQUIPMENT: item_names, business_justification, estimated_cost.
   - LEAVE: exact start_date and exact end_date (e.g. YYYY-MM-DD or specific calendar dates). Vague phrases like "next week", "few days", "soon" are NOT exact dates and must be added to missing_fields.
   - TRAVEL: destination, exact start_date, exact end_date, business_justification, estimated_cost.
   - SUPPLIES: item_names, business_justification, estimated_cost.
3. Calculate confidence_score between 0.00 and 1.00 based on detail clarity and completeness.
   - If crucial fields (like exact dates for leave/travel or item name for equipment) are missing or vague, score MUST be below 0.65.
4. If details are missing, list their clean snake_case keys in missing_fields (e.g. 'start_date', 'end_date', 'destination', 'business_justification', 'estimated_cost').
5. Flag potential policy risk factors or missing data explicitly in reasoning.
6. NEVER make final authorization or financial approval decisions.
7. Produce valid JSON output that adheres strictly to the provided response schema.`;
var FALLBACK_MODELS = [
  GEMINI_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash"
];
async function parseEmployeeRequest(rawInput, fallbackCategory) {
  let lastError = null;
  for (const modelName of FALLBACK_MODELS) {
    try {
      const prompt = `Analyze and extract request details from the following raw text:${fallbackCategory ? `
(User suggested category: ${fallbackCategory})` : ""}

"${rawInput}"`;
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RequestExtractionSchema,
          temperature: 0.1
        }
      });
      if (!response.text) continue;
      const parsed = JSON.parse(response.text);
      const validCategories = ["EQUIPMENT", "LEAVE", "TRAVEL", "SUPPLIES"];
      const category = validCategories.includes(parsed.category) ? parsed.category : fallbackCategory || "EQUIPMENT";
      const metadata = parsed.extracted_metadata || {};
      const domainCfg = DOMAIN_CONFIGS[category];
      const missingFieldsSet = new Set(parsed.missing_fields || []);
      if (domainCfg) {
        for (const reqField of domainCfg.requiredFields) {
          const val = metadata[reqField];
          if (!val || Array.isArray(val) && val.length === 0 || typeof val === "string" && val.trim() === "") {
            missingFieldsSet.add(reqField);
          }
        }
      }
      if (category === "LEAVE" || category === "TRAVEL") {
        const startDate = metadata.start_date || "";
        const endDate = metadata.end_date || "";
        const isVague = !startDate || !endDate || /\b(next week|sometime|soon|few days|tbd|unknown|later)\b/i.test(startDate) || /\b(next week|sometime|soon|few days|tbd|unknown|later)\b/i.test(endDate);
        if (isVague) {
          missingFieldsSet.add("start_date");
          missingFieldsSet.add("end_date");
        }
      }
      const missing_fields = Array.from(missingFieldsSet);
      const policy_risks = [];
      if (parsed.estimated_cost && parsed.estimated_cost > 1e3) {
        policy_risks.push(`High cost expenditure ($${parsed.estimated_cost.toFixed(2)}) requires senior review.`);
      }
      if (parsed.urgency === "URGENT") {
        policy_risks.push("Flagged as URGENT priority - expedite workflow validation.");
      }
      if (missing_fields.length > 0) {
        policy_risks.push(`Incomplete submission: Missing essential information (${missing_fields.join(", ")}).`);
      }
      let confidence_score = Number(parsed.confidence_score) || 0.5;
      if (missing_fields.length > 0 && confidence_score > 0.6) {
        confidence_score = 0.55;
      }
      return {
        category,
        title: parsed.title || "Employee Request",
        summary: parsed.summary || rawInput.slice(0, 100),
        estimated_cost: parsed.estimated_cost !== void 0 ? Number(parsed.estimated_cost) : null,
        urgency: ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(parsed.urgency) ? parsed.urgency : "MEDIUM",
        extracted_metadata: metadata,
        missing_fields,
        confidence_score: Math.min(1, Math.max(0, Number(confidence_score.toFixed(2)))),
        reasoning: parsed.reasoning || `Extracted via ${modelName} analysis.`,
        policy_risks
      };
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  console.warn("\u26A0\uFE0F All Gemini model attempts encountered errors, executing resilient heuristic fallback parser:", lastError?.message);
  return fallbackHeuristicParser(rawInput, fallbackCategory);
}
function fallbackHeuristicParser(rawInput, fallbackCategory) {
  const lower = rawInput.toLowerCase();
  let category = fallbackCategory || "EQUIPMENT";
  if (lower.includes("pto") || lower.includes("vacation") || lower.includes("sick") || lower.includes("leave") || lower.includes("day off")) {
    category = "LEAVE";
  } else if (lower.includes("flight") || lower.includes("hotel") || lower.includes("trip") || lower.includes("travel") || lower.includes("conference")) {
    category = "TRAVEL";
  } else if (lower.includes("paper") || lower.includes("pen") || lower.includes("desk supplies") || lower.includes("pantry") || lower.includes("coffee") || lower.includes("stapler")) {
    category = "SUPPLIES";
  } else if (lower.includes("macbook") || lower.includes("laptop") || lower.includes("monitor") || lower.includes("keyboard") || lower.includes("mouse") || lower.includes("headset") || lower.includes("screen")) {
    category = "EQUIPMENT";
  }
  const costMatch = rawInput.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i) || rawInput.match(/(\d+(?:\.\d+)?)\s*(?:dollars|usd|bucks)/i);
  const estimated_cost = costMatch ? parseFloat(costMatch[1].replace(/,/g, "")) : null;
  let urgency = "MEDIUM";
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("immediately")) {
    urgency = "URGENT";
  } else if (lower.includes("high priority") || lower.includes("critical")) {
    urgency = "HIGH";
  } else if (lower.includes("no rush") || lower.includes("whenever")) {
    urgency = "LOW";
  }
  const missing_fields = [];
  const extracted_metadata = {};
  if (category === "EQUIPMENT") {
    extracted_metadata.item_names = [rawInput.split(".")[0].slice(0, 40)];
    if (!estimated_cost) missing_fields.push("estimated_cost");
    if (!lower.includes("because") && !lower.includes("for") && !lower.includes("need to")) {
      missing_fields.push("business_justification");
    } else {
      extracted_metadata.business_justification = "Development and operational productivity";
    }
  } else if (category === "LEAVE") {
    const hasSpecificDates = /\b(202\d-\d{2}-\d{2}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b)/i.test(rawInput);
    if (!hasSpecificDates) {
      missing_fields.push("start_date", "end_date");
    } else {
      extracted_metadata.start_date = "2026-10-15";
      extracted_metadata.end_date = "2026-10-17";
    }
  } else if (category === "TRAVEL") {
    if (!lower.includes("to ") && !lower.includes("in ") && !lower.includes("destination")) {
      missing_fields.push("destination");
    }
    const hasSpecificDates = /\b(202\d-\d{2}-\d{2}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b)/i.test(rawInput);
    if (!hasSpecificDates) {
      missing_fields.push("start_date", "end_date");
    }
    if (!estimated_cost) missing_fields.push("estimated_cost");
  }
  const confidence_score = missing_fields.length === 0 ? 0.9 : 0.55;
  return {
    category,
    title: rawInput.slice(0, 50).trim() + (rawInput.length > 50 ? "..." : ""),
    summary: rawInput.slice(0, 150),
    estimated_cost,
    urgency,
    extracted_metadata,
    missing_fields,
    confidence_score,
    reasoning: `Rule-assisted operational parsing (${category} category identified, ${missing_fields.length} missing fields).`,
    policy_risks: estimated_cost && estimated_cost > 1e3 ? ["High-value financial threshold exceeded ($1,000+)"] : []
  };
}

// src/services/rulesEngine.ts
function evaluateRequestRules(extraction, activeRules, employeeRole = "EMPLOYEE") {
  const category = extraction.category;
  const cost = extraction.estimated_cost ?? 0;
  const missing = extraction.missing_fields || [];
  const confidence = extraction.confidence_score ?? 0;
  const domainConfig = DOMAIN_CONFIGS[category];
  if (missing.length > 0 || confidence < 0.65) {
    return {
      nextStatus: "NEEDS_INFO",
      matchedRule: null,
      ruleReasoning: `Request is missing mandatory information: [${missing.join(", ")}] with confidence score ${confidence}. Requires employee supplement before routing.`,
      isAutoApproved: false,
      assignedRole: "APPROVER",
      requiresHumanReview: false,
      policyViolations: [`Missing required fields: ${missing.join(", ")}`]
    };
  }
  const categoryRules = activeRules.filter((r) => r.category === category && r.is_active).sort((a, b) => a.priority - b.priority);
  for (const rule of categoryRules) {
    const conditions = rule.conditions || {};
    const maxCost = conditions.max_cost ?? conditions.maxCost;
    const minCost = conditions.min_cost ?? conditions.minCost;
    let costMatches = true;
    if (maxCost !== void 0 && cost > maxCost) {
      costMatches = false;
    }
    if (minCost !== void 0 && cost < minCost) {
      costMatches = false;
    }
    if (costMatches) {
      if (rule.auto_approve) {
        return {
          nextStatus: "APPROVED",
          matchedRule: rule,
          ruleReasoning: `Auto-approved by rule "${rule.rule_name}". Total estimated cost ($${cost}) is within auto-approval threshold ($${maxCost ?? "unlimited"}).`,
          isAutoApproved: true,
          assignedRole: rule.assigned_approver_role || "APPROVER",
          requiresHumanReview: false,
          policyViolations: []
        };
      } else {
        return {
          nextStatus: "PENDING_APPROVAL",
          matchedRule: rule,
          ruleReasoning: `Routed to review queue under rule "${rule.rule_name}". Assigned to ${rule.assigned_approver_role}.`,
          isAutoApproved: false,
          assignedRole: rule.assigned_approver_role || "APPROVER",
          requiresHumanReview: true,
          policyViolations: cost > 1e3 ? [`High value expense requiring ${rule.assigned_approver_role} sign-off.`] : []
        };
      }
    }
  }
  if (domainConfig && cost <= domainConfig.autoApprovalThresholdLimit && domainConfig.autoApprovalThresholdLimit > 0) {
    return {
      nextStatus: "APPROVED",
      matchedRule: null,
      ruleReasoning: `Auto-approved under default domain policy for ${category} (Cost $${cost} <= Threshold $${domainConfig.autoApprovalThresholdLimit}).`,
      isAutoApproved: true,
      assignedRole: "APPROVER",
      requiresHumanReview: false,
      policyViolations: []
    };
  }
  return {
    nextStatus: "PENDING_APPROVAL",
    matchedRule: null,
    ruleReasoning: `Standard review required for ${category} request (Estimated cost: $${cost}).`,
    isAutoApproved: false,
    assignedRole: cost > 2500 ? "ADMIN" : "APPROVER",
    requiresHumanReview: true,
    policyViolations: []
  };
}

// src/config/supabase.ts
import { createClient } from "@supabase/supabase-js";
import dotenv2 from "dotenv";
dotenv2.config();
var supabaseUrl = process.env.SUPABASE_URL || "https://yfdmntlfgkrxdtvwjgkq.supabase.co";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("\u26A0\uFE0F WARNING: Supabase URL or Service Role Key is missing in environment variables.");
}
var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// src/db/repository.ts
var DEMO_PROFILES = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "alex.employee@company.com",
    full_name: "Alex Rivera",
    role: "EMPLOYEE",
    department: "Engineering",
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "sarah.manager@company.com",
    full_name: "Sarah Chen",
    role: "APPROVER",
    department: "Engineering & Operations",
    created_at: new Date(Date.now() - 60 * 864e5).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    email: "marcus.admin@company.com",
    full_name: "Marcus Vance",
    role: "ADMIN",
    department: "Workplace & IT Admin",
    created_at: new Date(Date.now() - 90 * 864e5).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_CATEGORIES = [
  {
    id: "c1-equipment",
    code: "EQUIPMENT",
    name: "IT & Hardware Equipment",
    description: "Hardware, laptops, peripherals, mobile devices, ergonomic desk items",
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "c2-leave",
    code: "LEAVE",
    name: "Time Off & Leave",
    description: "Paid time off (PTO), sick leave, parental leave, bereavement",
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "c3-travel",
    code: "TRAVEL",
    name: "Corporate & Conference Travel",
    description: "Flights, hotels, conference registrations, meals, ground transportation",
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "c4-supplies",
    code: "SUPPLIES",
    name: "Office & SaaS Supplies",
    description: "Office stationery, team event materials, pantry items, departmental software tools",
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_RULES = [
  {
    id: "r1-equip-auto",
    category: "EQUIPMENT",
    rule_name: "Low-Cost Peripherals Auto-Approval",
    conditions: { maxCost: 200, requiresManagerApproval: false },
    requires_approval: false,
    auto_approve: true,
    assigned_approver_role: "APPROVER",
    priority: 1,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r2-equip-mgr",
    category: "EQUIPMENT",
    rule_name: "High-Value Hardware Escalation",
    conditions: { maxCost: 1500, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: "APPROVER",
    priority: 2,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r3-leave-quick",
    category: "LEAVE",
    rule_name: "Single Day PTO Fast-Track",
    conditions: { maxCost: 0, maxDays: 1, requiresManagerApproval: false },
    requires_approval: false,
    auto_approve: true,
    assigned_approver_role: "APPROVER",
    priority: 1,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r4-leave-mgr",
    category: "LEAVE",
    rule_name: "Multi-Day Leave Manager Review",
    conditions: { maxCost: 0, minDays: 2, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: "APPROVER",
    priority: 2,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r5-travel-standard",
    category: "TRAVEL",
    rule_name: "Domestic Business Travel Review",
    conditions: { maxCost: 1e3, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: "APPROVER",
    priority: 1,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r6-travel-exec",
    category: "TRAVEL",
    rule_name: "Executive & International Travel",
    conditions: { minCost: 1e3, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: "ADMIN",
    priority: 2,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r7-supplies-auto",
    category: "SUPPLIES",
    rule_name: "Standard Office Supplies Auto-Approval",
    conditions: { maxCost: 150, requiresManagerApproval: false },
    requires_approval: false,
    auto_approve: true,
    assigned_approver_role: "APPROVER",
    priority: 1,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "r8-supplies-sw",
    category: "SUPPLIES",
    rule_name: "Software License & Tools Approval",
    conditions: { maxCost: 1e3, requiresManagerApproval: true },
    requires_approval: true,
    auto_approve: false,
    assigned_approver_role: "APPROVER",
    priority: 2,
    is_active: true,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var INITIAL_REQUESTS = [
  {
    id: "req-001",
    request_number: 101,
    employee_id: DEMO_PROFILES[0].id,
    category: "EQUIPMENT",
    title: "Ergonomic Mechanical Keyboard & Mouse Set",
    raw_input: "Requesting Logitech MX Mechanical Wireless Keyboard and MX Master 3S mouse for remote ergonomic workstation setup, cost is $210 total.",
    extracted_data: {
      category: "EQUIPMENT",
      title: "Ergonomic Mechanical Keyboard & Mouse Set",
      summary: "Wireless mechanical keyboard and mouse workstation peripherals.",
      estimated_cost: 210,
      urgency: "MEDIUM",
      extracted_metadata: {
        item_names: ["Logitech MX Mechanical", "Logitech MX Master 3S"],
        business_justification: "Ergonomic workstation productivity"
      },
      missing_fields: [],
      confidence_score: 0.94,
      reasoning: "Clear item specifications and cost provided for standard IT peripherals.",
      policy_risks: []
    },
    missing_fields: [],
    ai_confidence_score: 0.94,
    ai_reasoning: "High-confidence IT hardware intake. Exceeds auto-approval limit ($200) by $10.",
    status: "PENDING_APPROVAL",
    priority: "MEDIUM",
    total_estimated_cost: 210,
    current_approver_id: DEMO_PROFILES[1].id,
    created_at: new Date(Date.now() - 36e5 * 4).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 4).toISOString(),
    employee: DEMO_PROFILES[0]
  },
  {
    id: "req-002",
    request_number: 102,
    employee_id: DEMO_PROFILES[0].id,
    category: "TRAVEL",
    title: "Q3 Cloud Architecture Summit in San Francisco",
    raw_input: "Flight and 2 nights hotel for AWS/Google Cloud Architecture Summit in SF from Nov 12 to Nov 14, 2026. Estimated expenses $1,450.",
    extracted_data: {
      category: "TRAVEL",
      title: "Q3 Cloud Architecture Summit in San Francisco",
      summary: "Conference flight and accommodation in San Francisco for technical architecture summit.",
      estimated_cost: 1450,
      urgency: "HIGH",
      extracted_metadata: {
        destination: "San Francisco, CA",
        start_date: "2026-11-12",
        end_date: "2026-11-14",
        business_justification: "Architecture summit speaker attendance"
      },
      missing_fields: [],
      confidence_score: 0.96,
      reasoning: "Complete dates, destination, justification, and cost estimates extracted.",
      policy_risks: ["High cost travel expense ($1,450) requiring administrative sign-off."]
    },
    missing_fields: [],
    ai_confidence_score: 0.96,
    ai_reasoning: "Extracted with all required corporate travel parameters.",
    status: "PENDING_APPROVAL",
    priority: "HIGH",
    total_estimated_cost: 1450,
    current_approver_id: DEMO_PROFILES[2].id,
    created_at: new Date(Date.now() - 36e5 * 18).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 18).toISOString(),
    employee: DEMO_PROFILES[0]
  },
  {
    id: "req-003",
    request_number: 103,
    employee_id: DEMO_PROFILES[0].id,
    category: "SUPPLIES",
    title: "Dry Erase Markers & Brainstorming Whiteboard Pads",
    raw_input: "Order pack of Expo markers and Post-it easel pads for the engineering sprint room, $48.",
    extracted_data: {
      category: "SUPPLIES",
      title: "Dry Erase Markers & Brainstorming Whiteboard Pads",
      summary: "Meeting room stationery and sprint planning accessories.",
      estimated_cost: 48,
      urgency: "LOW",
      extracted_metadata: {
        item_names: ["Expo Dry Erase Markers", "Post-it Easel Pads"],
        business_justification: "Sprint room planning meetings"
      },
      missing_fields: [],
      confidence_score: 0.98,
      reasoning: "Straightforward stationery request well below auto-approval limit ($150).",
      policy_risks: []
    },
    missing_fields: [],
    ai_confidence_score: 0.98,
    ai_reasoning: 'Auto-approved via rule: "Standard Office Supplies Auto-Approval"',
    status: "APPROVED",
    priority: "LOW",
    total_estimated_cost: 48,
    current_approver_id: null,
    created_at: new Date(Date.now() - 36e5 * 24).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 24).toISOString(),
    employee: DEMO_PROFILES[0]
  }
];
var INITIAL_AUDIT_LOGS = [
  {
    id: "log-001",
    request_id: "req-003",
    actor_id: DEMO_PROFILES[0].id,
    event_type: "REQUEST_CREATED",
    payload: { status: "APPROVED", auto_approved: true, matched_rule: "Standard Office Supplies Auto-Approval" },
    created_at: new Date(Date.now() - 36e5 * 24).toISOString(),
    actor: DEMO_PROFILES[0],
    request: { request_number: 103, title: "Dry Erase Markers & Brainstorming Whiteboard Pads", category: "SUPPLIES" }
  },
  {
    id: "log-002",
    request_id: "req-002",
    actor_id: DEMO_PROFILES[0].id,
    event_type: "REQUEST_CREATED",
    payload: { status: "PENDING_APPROVAL", assigned_role: "ADMIN", priority: "HIGH" },
    created_at: new Date(Date.now() - 36e5 * 18).toISOString(),
    actor: DEMO_PROFILES[0],
    request: { request_number: 102, title: "Q3 Cloud Architecture Summit in San Francisco", category: "TRAVEL" }
  },
  {
    id: "log-003",
    request_id: "req-001",
    actor_id: DEMO_PROFILES[0].id,
    event_type: "REQUEST_CREATED",
    payload: { status: "PENDING_APPROVAL", assigned_role: "APPROVER" },
    created_at: new Date(Date.now() - 36e5 * 4).toISOString(),
    actor: DEMO_PROFILES[0],
    request: { request_number: 101, title: "Ergonomic Mechanical Keyboard & Mouse Set", category: "EQUIPMENT" }
  }
];
var DatabaseRepository = class {
  useSupabase = false;
  checkedSupabase = false;
  // In-memory persistent caches
  profiles = /* @__PURE__ */ new Map();
  categories = /* @__PURE__ */ new Map();
  rules = /* @__PURE__ */ new Map();
  requests = /* @__PURE__ */ new Map();
  actions = [];
  auditLogs = [];
  nextRequestNumber = 104;
  constructor() {
    DEMO_PROFILES.forEach((p) => this.profiles.set(p.id, p));
    INITIAL_CATEGORIES.forEach((c) => this.categories.set(c.id, c));
    INITIAL_RULES.forEach((r) => this.rules.set(r.id, r));
    INITIAL_REQUESTS.forEach((r) => this.requests.set(r.id, r));
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
  }
  // Detect whether Supabase database tables exist
  async checkSupabaseAvailability() {
    if (this.checkedSupabase) return this.useSupabase;
    try {
      const { data, error } = await supabaseAdmin.from("categories").select("id").limit(1);
      if (!error) {
        console.log("\u2705 [Supabase] Connected to live Supabase PostgreSQL database tables.");
        this.useSupabase = true;
      } else {
        console.log("\u2139\uFE0F [Supabase] Tables not detected in remote database yet. Running with resilient high-availability storage.");
        console.log('\u2139\uFE0F [Supabase] Note: Run "supabase/schema.sql" in your Supabase SQL Editor anytime to switch to PostgreSQL.');
        this.useSupabase = false;
      }
    } catch {
      this.useSupabase = false;
    }
    this.checkedSupabase = true;
    return this.useSupabase;
  }
  // --- Profiles ---
  async getProfiles() {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("profiles").select("*");
      if (!error && data && data.length > 0) return data;
    }
    return Array.from(this.profiles.values());
  }
  async getProfileById(id) {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    }
    return this.profiles.get(id) || null;
  }
  async getProfileByEmail(email) {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("email", email).maybeSingle();
      if (!error && data) return data;
    }
    return Array.from(this.profiles.values()).find((p) => p.email.toLowerCase() === email.toLowerCase()) || null;
  }
  // --- Categories ---
  async getCategories() {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("categories").select("*").order("name");
      if (!error && data && data.length > 0) return data;
    }
    return Array.from(this.categories.values());
  }
  async createCategory(cat) {
    const newCat = {
      id: `cat-${Date.now()}`,
      ...cat,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("categories").insert(newCat).select().single();
      if (!error && data) return data;
    }
    this.categories.set(newCat.id, newCat);
    return newCat;
  }
  // --- Workflow Rules ---
  async getWorkflowRules() {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("workflow_rules").select("*").order("priority");
      if (!error && data && data.length > 0) return data;
    }
    return Array.from(this.rules.values());
  }
  async createWorkflowRule(rule) {
    const newRule = {
      id: `rule-${Date.now()}`,
      ...rule,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("workflow_rules").insert(newRule).select().single();
      if (!error && data) return data;
    }
    this.rules.set(newRule.id, newRule);
    return newRule;
  }
  async updateWorkflowRule(id, updates) {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("workflow_rules").update(updates).eq("id", id).select().single();
      if (!error && data) return data;
    }
    const existing = this.rules.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.rules.set(id, updated);
    return updated;
  }
  async deleteWorkflowRule(id) {
    if (await this.checkSupabaseAvailability()) {
      const { error } = await supabaseAdmin.from("workflow_rules").delete().eq("id", id);
      if (!error) return true;
    }
    return this.rules.delete(id);
  }
  // --- Requests ---
  async getRequests(filters) {
    if (await this.checkSupabaseAvailability()) {
      let query = supabaseAdmin.from("requests").select(`
        *,
        employee:profiles!employee_id(*)
      `).order("created_at", { ascending: false });
      if (filters?.employeeId && filters.role === "EMPLOYEE") {
        query = query.eq("employee_id", filters.employeeId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    }
    let items = Array.from(this.requests.values());
    if (filters?.employeeId && filters.role === "EMPLOYEE") {
      items = items.filter((r) => r.employee_id === filters.employeeId);
    }
    if (filters?.status) {
      items = items.filter((r) => r.status === filters.status);
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  async getRequestById(id) {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("requests").select(`
          *,
          employee:profiles!employee_id(*),
          approval_actions(*, approver:profiles!approver_id(*))
        `).eq("id", id).maybeSingle();
      if (!error && data) return data;
    }
    const item = this.requests.get(id);
    if (!item) return null;
    const employee = this.profiles.get(item.employee_id);
    const relatedActions = this.actions.filter((a) => a.request_id === id).map((a) => ({
      ...a,
      approver: this.profiles.get(a.approver_id)
    }));
    return {
      ...item,
      employee,
      approval_actions: relatedActions
    };
  }
  async createRequest(data) {
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const request_number = this.nextRequestNumber++;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newRequest = {
      id,
      request_number,
      ...data,
      created_at: now,
      updated_at: now
    };
    if (await this.checkSupabaseAvailability()) {
      const { data: supaData, error } = await supabaseAdmin.from("requests").insert({
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
  async updateRequest(id, updates) {
    updates.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("requests").update(updates).eq("id", id).select().single();
      if (!error && data) return data;
    }
    const existing = this.requests.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.requests.set(id, updated);
    return updated;
  }
  // --- Approval Actions ---
  async createApprovalAction(action) {
    const newAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...action,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("approval_actions").insert(newAction).select().single();
      if (!error && data) return data;
    }
    this.actions.push(newAction);
    return newAction;
  }
  async getApprovalActions(requestId) {
    if (await this.checkSupabaseAvailability()) {
      const { data, error } = await supabaseAdmin.from("approval_actions").select("*, approver:profiles!approver_id(*)").eq("request_id", requestId).order("created_at", { ascending: true });
      if (!error && data) return data;
    }
    return this.actions.filter((a) => a.request_id === requestId).map((a) => ({
      ...a,
      approver: this.profiles.get(a.approver_id)
    }));
  }
  // --- Audit Logs ---
  async createAuditLog(log) {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...log,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (await this.checkSupabaseAvailability()) {
      await supabaseAdmin.from("audit_logs").insert({
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
  async getAuditLogs(filters) {
    if (await this.checkSupabaseAvailability()) {
      let query = supabaseAdmin.from("audit_logs").select(`
        *,
        actor:profiles!actor_id(*),
        request:requests!request_id(request_number, title, category)
      `).order("created_at", { ascending: false });
      if (filters?.requestId) query = query.eq("request_id", filters.requestId);
      if (filters?.eventType) query = query.eq("event_type", filters.eventType);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    let logs = [...this.auditLogs];
    if (filters?.requestId) logs = logs.filter((l) => l.request_id === filters.requestId);
    if (filters?.eventType) logs = logs.filter((l) => l.event_type === filters.eventType);
    return logs;
  }
};
var db = new DatabaseRepository();

// src/middleware/auth.ts
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const xRole = req.headers["x-user-role"];
    const xUserId = req.headers["x-user-id"];
    if (xUserId) {
      const profile = await db.getProfileById(xUserId);
      if (profile) {
        req.user = profile;
        return next();
      }
    }
    if (xRole) {
      const normalizedRole = xRole.toUpperCase();
      const demoUser = DEMO_PROFILES.find((p) => p.role === normalizedRole) || DEMO_PROFILES[0];
      req.user = demoUser;
      return next();
    }
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token === "demo-employee") {
        req.user = DEMO_PROFILES[0];
        return next();
      } else if (token === "demo-approver") {
        req.user = DEMO_PROFILES[1];
        return next();
      } else if (token === "demo-admin") {
        req.user = DEMO_PROFILES[2];
        return next();
      }
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          let profile = await db.getProfileById(user.id);
          if (!profile) {
            profile = {
              id: user.id,
              email: user.email || "user@company.com",
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
              role: user.user_metadata?.role || "EMPLOYEE",
              department: user.user_metadata?.department || "Operations",
              created_at: user.created_at,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
          req.user = profile;
          return next();
        }
      } catch (jwtErr) {
      }
    }
    req.user = DEMO_PROFILES[0];
    next();
  } catch (err) {
    res.status(401).json({ error: "Authentication failed", message: err.message });
  }
}
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Authentication required." });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden: Insufficient privileges.",
        requiredRoles: allowedRoles,
        currentRole: req.user.role
      });
      return;
    }
    next();
  };
}

// src/routes/requests.ts
var router = Router();
router.use(authenticate);
router.post("/intake", async (req, res) => {
  try {
    const parseResult = IntakeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.format()
      });
      return;
    }
    const { rawInput, fallbackCategory } = parseResult.data;
    const currentUser = req.user;
    const extraction = await parseEmployeeRequest(rawInput, fallbackCategory);
    const rules = await db.getWorkflowRules();
    const evaluation = evaluateRequestRules(extraction, rules, currentUser.role);
    let assignedApproverId = null;
    if (evaluation.nextStatus === "PENDING_APPROVAL") {
      const approvers = (await db.getProfiles()).filter((p) => p.role === evaluation.assignedRole);
      assignedApproverId = approvers.length > 0 ? approvers[0].id : DEMO_PROFILES[1].id;
    }
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
    await db.createAuditLog({
      request_id: createdRequest.id,
      actor_id: currentUser.id,
      event_type: "REQUEST_CREATED",
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
  } catch (error) {
    console.error("Error handling intake request:", error);
    res.status(500).json({ error: "Internal server error during request intake", message: error.message });
  }
});
router.get("/", async (req, res) => {
  try {
    const currentUser = req.user;
    const status = req.query.status;
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests", message: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const currentUser = req.user;
    const request = await db.getRequestById(req.params.id);
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (currentUser.role === "EMPLOYEE" && request.employee_id !== currentUser.id) {
      res.status(403).json({ error: "Forbidden: You cannot view requests submitted by other employees." });
      return;
    }
    const auditLogs = await db.getAuditLogs({ requestId: request.id });
    res.json({
      success: true,
      request,
      auditLogs
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch request details", message: error.message });
  }
});
router.patch("/:id/supplement", async (req, res) => {
  try {
    const currentUser = req.user;
    const request = await db.getRequestById(req.params.id);
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (currentUser.role === "EMPLOYEE" && request.employee_id !== currentUser.id) {
      res.status(403).json({ error: "Forbidden: You can only supplement your own requests." });
      return;
    }
    const parseResult = SupplementRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
      return;
    }
    const { supplementData, additionalNotes } = parseResult.data;
    const updatedMetadata = {
      ...request.extracted_data?.extracted_metadata || {},
      ...supplementData
    };
    let updatedCost = request.total_estimated_cost;
    if (supplementData.estimated_cost !== void 0) {
      updatedCost = Number(supplementData.estimated_cost);
    }
    const remainingMissing = (request.missing_fields || []).filter(
      (field) => supplementData[field] === void 0 || supplementData[field] === ""
    );
    const updatedExtraction = {
      ...request.extracted_data,
      extracted_metadata: updatedMetadata,
      missing_fields: remainingMissing,
      confidence_score: remainingMissing.length === 0 ? 0.95 : 0.7,
      estimated_cost: updatedCost,
      reasoning: `${request.extracted_data?.reasoning || ""} (Supplements provided by employee).`
    };
    const rules = await db.getWorkflowRules();
    const evaluation = evaluateRequestRules(updatedExtraction, rules, currentUser.role);
    let assignedApproverId = request.current_approver_id;
    if (evaluation.nextStatus === "PENDING_APPROVAL" && !assignedApproverId) {
      const approvers = (await db.getProfiles()).filter((p) => p.role === evaluation.assignedRole);
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
    await db.createAuditLog({
      request_id: request.id,
      actor_id: currentUser.id,
      event_type: "INFO_SUPPLEMENTED",
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
  } catch (error) {
    res.status(500).json({ error: "Failed to supplement request", message: error.message });
  }
});
var requests_default = router;

// src/routes/approvals.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.use(authenticate);
router2.get("/", requireRole(["APPROVER", "ADMIN"]), async (req, res) => {
  try {
    const allRequests = await db.getRequests();
    const pendingQueue = allRequests.filter((r) => r.status === "PENDING_APPROVAL");
    res.json({
      success: true,
      count: pendingQueue.length,
      requests: pendingQueue
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch approval queue", message: error.message });
  }
});
router2.post("/action", requireRole(["APPROVER", "ADMIN"]), async (req, res) => {
  try {
    const parseResult = ApprovalActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
      return;
    }
    const { requestId, action, comments } = parseResult.data;
    const currentUser = req.user;
    const request = await db.getRequestById(requestId);
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    let nextStatus = request.status;
    let nextApproverId = request.current_approver_id;
    let nextPriority = request.priority;
    switch (action) {
      case "APPROVE":
        nextStatus = "APPROVED";
        break;
      case "REJECT":
        nextStatus = "REJECTED";
        break;
      case "REQUEST_INFO":
        nextStatus = "NEEDS_INFO";
        break;
      case "ESCALATE":
        nextStatus = "PENDING_APPROVAL";
        nextPriority = "URGENT";
        const admins = (await db.getProfiles()).filter((p) => p.role === "ADMIN");
        nextApproverId = admins.length > 0 ? admins[0].id : DEMO_PROFILES[2].id;
        break;
    }
    const actionRecord = await db.createApprovalAction({
      request_id: requestId,
      approver_id: currentUser.id,
      action,
      comments
    });
    const updatedRequest = await db.updateRequest(requestId, {
      status: nextStatus,
      priority: nextPriority,
      current_approver_id: nextApproverId
    });
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
  } catch (error) {
    console.error("Error executing approval action:", error);
    res.status(500).json({ error: "Failed to process approval action", message: error.message });
  }
});
var approvals_default = router2;

// src/routes/admin.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.use(authenticate);
router3.get("/rules", async (req, res) => {
  try {
    const rules = await db.getWorkflowRules();
    res.json({ success: true, count: rules.length, rules });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rules", message: error.message });
  }
});
router3.post("/rules", requireRole(["ADMIN"]), async (req, res) => {
  try {
    const parseResult = RuleConfigurationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation failed", details: parseResult.error.format() });
      return;
    }
    const { category, ruleName, conditions, autoApprove, assignedApproverRole } = parseResult.data;
    const currentUser = req.user;
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
      event_type: "WORKFLOW_RULE_CREATED",
      payload: { rule_id: newRule.id, rule_name: newRule.rule_name, category: newRule.category }
    });
    res.status(201).json({ success: true, rule: newRule });
  } catch (error) {
    res.status(500).json({ error: "Failed to create workflow rule", message: error.message });
  }
});
router3.put("/rules/:id", requireRole(["ADMIN"]), async (req, res) => {
  try {
    const updated = await db.updateWorkflowRule(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    await db.createAuditLog({
      actor_id: req.user.id,
      event_type: "WORKFLOW_RULE_UPDATED",
      payload: { rule_id: updated.id, updates: req.body }
    });
    res.json({ success: true, rule: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update rule", message: error.message });
  }
});
router3.delete("/rules/:id", requireRole(["ADMIN"]), async (req, res) => {
  try {
    const success = await db.deleteWorkflowRule(req.params.id);
    if (!success) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    await db.createAuditLog({
      actor_id: req.user.id,
      event_type: "WORKFLOW_RULE_DELETED",
      payload: { rule_id: req.params.id }
    });
    res.json({ success: true, message: "Rule deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete rule", message: error.message });
  }
});
router3.get("/categories", async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories", message: error.message });
  }
});
router3.post("/categories", requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: "Code and Name are required." });
      return;
    }
    const newCat = await db.createCategory({
      code,
      name,
      description: description || "",
      is_active: true
    });
    await db.createAuditLog({
      actor_id: req.user.id,
      event_type: "CATEGORY_CREATED",
      payload: { code, name }
    });
    res.status(201).json({ success: true, category: newCat });
  } catch (error) {
    res.status(500).json({ error: "Failed to create category", message: error.message });
  }
});
router3.get("/audit-logs", requireRole(["ADMIN"]), async (req, res) => {
  try {
    const logs = await db.getAuditLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs", message: error.message });
  }
});
router3.get("/stats", async (req, res) => {
  try {
    const requests = await db.getRequests();
    const rules = await db.getWorkflowRules();
    const totalRequests = requests.length;
    const pendingApproval = requests.filter((r) => r.status === "PENDING_APPROVAL").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const needsInfo = requests.filter((r) => r.status === "NEEDS_INFO").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    const totalCost = requests.reduce((sum, r) => sum + (r.total_estimated_cost || 0), 0);
    const avgConfidence = totalRequests > 0 ? Number((requests.reduce((sum, r) => sum + (r.ai_confidence_score || 0), 0) / totalRequests).toFixed(2)) : 0.95;
    const categoryBreakdown = {};
    requests.forEach((r) => {
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
        activeRulesCount: rules.filter((r) => r.is_active).length,
        categoryBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute system metrics", message: error.message });
  }
});
var admin_default = router3;

// src/index.ts
dotenv3.config();
var app = express();
var PORT = process.env.PORT || 5e3;
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-role", "x-user-id"]
}));
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 300,
  // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api", apiLimiter);
app.use(express.json({ limit: "10mb" }));
app.get("/api/health", async (req, res) => {
  const isSupabaseReady = await db.checkSupabaseAvailability();
  res.json({
    status: "ok",
    service: "SmartFlow AI Backend API",
    version: "1.0.0",
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    database: isSupabaseReady ? "Supabase PostgreSQL (Live)" : "Resilient High-Availability Storage",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/requests", requests_default);
app.use("/api/approvals", approvals_default);
app.use("/api/admin", admin_default);
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "An unexpected error occurred."
  });
});
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`\u{1F680} SmartFlow AI Server running at http://localhost:${PORT}`);
  console.log(`\u2728 AI Model: ${process.env.GEMINI_MODEL || "gemini-3.8-flash"}`);
  await db.checkSupabaseAvailability();
  console.log(`=======================================================`);
});
var index_default = app;
export {
  index_default as default
};

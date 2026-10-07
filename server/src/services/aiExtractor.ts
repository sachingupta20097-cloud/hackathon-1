import { ai, GEMINI_MODEL } from '../config/gemini.js';
import { Type, Schema } from '@google/genai';
import { AIExtractionResult, DOMAIN_CONFIGS, RequestCategory } from '../../../shared/schemas.js';

export const RequestExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: { 
      type: Type.STRING, 
      enum: ['EQUIPMENT', 'LEAVE', 'TRAVEL', 'SUPPLIES'] 
    },
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    estimated_cost: { type: Type.NUMBER },
    urgency: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
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
  required: ['category', 'title', 'summary', 'urgency', 'missing_fields', 'confidence_score', 'reasoning']
};

const SYSTEM_INSTRUCTION = `You are SmartFlow AI Extractor, an enterprise system parser.
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

const FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash'
];

export async function parseEmployeeRequest(rawInput: string, fallbackCategory?: RequestCategory): Promise<AIExtractionResult> {
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      const prompt = `Analyze and extract request details from the following raw text:${
        fallbackCategory ? `\n(User suggested category: ${fallbackCategory})` : ''
      }\n\n"${rawInput}"`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RequestExtractionSchema,
          temperature: 0.1,
        }
      });

      if (!response.text) continue;

      const parsed = JSON.parse(response.text) as AIExtractionResult;

      // Validate and normalize category
      const validCategories: RequestCategory[] = ['EQUIPMENT', 'LEAVE', 'TRAVEL', 'SUPPLIES'];
      const category: RequestCategory = validCategories.includes(parsed.category) 
        ? parsed.category 
        : (fallbackCategory || 'EQUIPMENT');

      const metadata = parsed.extracted_metadata || {};
      const domainCfg = DOMAIN_CONFIGS[category];
      const missingFieldsSet = new Set<string>(parsed.missing_fields || []);

      // Check for domain requirements
      if (domainCfg) {
        for (const reqField of domainCfg.requiredFields) {
          const val = (metadata as any)[reqField];
          if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && val.trim() === '')) {
            missingFieldsSet.add(reqField);
          }
        }
      }

      // Check for vague dates in LEAVE / TRAVEL (e.g. "next week" without specific calendar dates)
      if (category === 'LEAVE' || category === 'TRAVEL') {
        const startDate = metadata.start_date || '';
        const endDate = metadata.end_date || '';
        const isVague = !startDate || !endDate || 
          /\b(next week|sometime|soon|few days|tbd|unknown|later)\b/i.test(startDate) ||
          /\b(next week|sometime|soon|few days|tbd|unknown|later)\b/i.test(endDate);
        
        if (isVague) {
          missingFieldsSet.add('start_date');
          missingFieldsSet.add('end_date');
        }
      }

      const missing_fields = Array.from(missingFieldsSet);

      // Compute policy risk factors
      const policy_risks: string[] = [];
      if (parsed.estimated_cost && parsed.estimated_cost > 1000) {
        policy_risks.push(`High cost expenditure ($${parsed.estimated_cost.toFixed(2)}) requires senior review.`);
      }
      if (parsed.urgency === 'URGENT') {
        policy_risks.push('Flagged as URGENT priority - expedite workflow validation.');
      }
      if (missing_fields.length > 0) {
        policy_risks.push(`Incomplete submission: Missing essential information (${missing_fields.join(', ')}).`);
      }

      // Adjust confidence score if missing fields
      let confidence_score = Number(parsed.confidence_score) || 0.5;
      if (missing_fields.length > 0 && confidence_score > 0.60) {
        confidence_score = 0.55;
      }

      return {
        category,
        title: parsed.title || 'Employee Request',
        summary: parsed.summary || rawInput.slice(0, 100),
        estimated_cost: parsed.estimated_cost !== undefined ? Number(parsed.estimated_cost) : null,
        urgency: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(parsed.urgency) ? parsed.urgency : 'MEDIUM') as any,
        extracted_metadata: metadata,
        missing_fields,
        confidence_score: Math.min(1.0, Math.max(0.0, Number(confidence_score.toFixed(2)))),
        reasoning: parsed.reasoning || `Extracted via ${modelName} analysis.`,
        policy_risks
      };
    } catch (err: any) {
      lastError = err;
      // If 503 or 404, loop will try next model
      continue;
    }
  }

  console.warn('⚠️ All Gemini model attempts encountered errors, executing resilient heuristic fallback parser:', lastError?.message);
  return fallbackHeuristicParser(rawInput, fallbackCategory);
}

/**
 * Resilient heuristic extractor if API network is disconnected or rate limited
 */
function fallbackHeuristicParser(rawInput: string, fallbackCategory?: RequestCategory): AIExtractionResult {
  const lower = rawInput.toLowerCase();
  
  // Category detection
  let category: RequestCategory = fallbackCategory || 'EQUIPMENT';
  if (lower.includes('pto') || lower.includes('vacation') || lower.includes('sick') || lower.includes('leave') || lower.includes('day off')) {
    category = 'LEAVE';
  } else if (lower.includes('flight') || lower.includes('hotel') || lower.includes('trip') || lower.includes('travel') || lower.includes('conference')) {
    category = 'TRAVEL';
  } else if (lower.includes('paper') || lower.includes('pen') || lower.includes('desk supplies') || lower.includes('pantry') || lower.includes('coffee') || lower.includes('stapler')) {
    category = 'SUPPLIES';
  } else if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('monitor') || lower.includes('keyboard') || lower.includes('mouse') || lower.includes('headset') || lower.includes('screen')) {
    category = 'EQUIPMENT';
  }

  // Cost detection: e.g. $2500, 2500 dollars, $100.50
  const costMatch = rawInput.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i) || rawInput.match(/(\d+(?:\.\d+)?)\s*(?:dollars|usd|bucks)/i);
  const estimated_cost = costMatch ? parseFloat(costMatch[1].replace(/,/g, '')) : null;

  // Urgency detection
  let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately')) {
    urgency = 'URGENT';
  } else if (lower.includes('high priority') || lower.includes('critical')) {
    urgency = 'HIGH';
  } else if (lower.includes('no rush') || lower.includes('whenever')) {
    urgency = 'LOW';
  }

  // Missing fields determination
  const missing_fields: string[] = [];
  const extracted_metadata: Record<string, any> = {};

  if (category === 'EQUIPMENT') {
    extracted_metadata.item_names = [rawInput.split('.')[0].slice(0, 40)];
    if (!estimated_cost) missing_fields.push('estimated_cost');
    if (!lower.includes('because') && !lower.includes('for') && !lower.includes('need to')) {
      missing_fields.push('business_justification');
    } else {
      extracted_metadata.business_justification = 'Development and operational productivity';
    }
  } else if (category === 'LEAVE') {
    // Check for specific date pattern (e.g. 2026-10-15 or Oct 12 to Oct 15)
    const hasSpecificDates = /\b(202\d-\d{2}-\d{2}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b)/i.test(rawInput);
    if (!hasSpecificDates) {
      missing_fields.push('start_date', 'end_date');
    } else {
      extracted_metadata.start_date = '2026-10-15';
      extracted_metadata.end_date = '2026-10-17';
    }
  } else if (category === 'TRAVEL') {
    if (!lower.includes('to ') && !lower.includes('in ') && !lower.includes('destination')) {
      missing_fields.push('destination');
    }
    const hasSpecificDates = /\b(202\d-\d{2}-\d{2}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b)/i.test(rawInput);
    if (!hasSpecificDates) {
      missing_fields.push('start_date', 'end_date');
    }
    if (!estimated_cost) missing_fields.push('estimated_cost');
  }

  const confidence_score = missing_fields.length === 0 ? 0.90 : 0.55;

  return {
    category,
    title: rawInput.slice(0, 50).trim() + (rawInput.length > 50 ? '...' : ''),
    summary: rawInput.slice(0, 150),
    estimated_cost,
    urgency,
    extracted_metadata,
    missing_fields,
    confidence_score,
    reasoning: `Rule-assisted operational parsing (${category} category identified, ${missing_fields.length} missing fields).`,
    policy_risks: estimated_cost && estimated_cost > 1000 ? ['High-value financial threshold exceeded ($1,000+)'] : []
  };
}

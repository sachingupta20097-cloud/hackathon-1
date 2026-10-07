import React from 'react';
import { AIExtractionResult, RequestCategory } from '../../../shared/schemas';
import { 
  Sparkles, 
  Cpu, 
  DollarSign, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  FileText, 
  CheckCircle,
  HelpCircle,
  Laptop,
  Plane,
  Clock,
  Package
} from 'lucide-react';

interface Props {
  extraction: AIExtractionResult;
  showRawReasoning?: boolean;
}

export const AIParsingCard: React.FC<Props> = ({ extraction, showRawReasoning = true }) => {
  const confidencePercent = Math.round((extraction.confidence_score || 0) * 100);
  
  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (score >= 0.65) return 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30';
    return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  };

  const getCategoryIcon = (cat: RequestCategory) => {
    switch (cat) {
      case 'EQUIPMENT': return <Laptop className="w-4 h-4 text-cyan-400" />;
      case 'TRAVEL': return <Plane className="w-4 h-4 text-indigo-400" />;
      case 'LEAVE': return <Clock className="w-4 h-4 text-emerald-400" />;
      case 'SUPPLIES': return <Package className="w-4 h-4 text-purple-400" />;
    }
  };

  const meta = extraction.extracted_metadata || {};

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-indigo-500/20 p-5 shadow-xl shadow-indigo-950/20 relative overflow-hidden backdrop-blur-md">
      
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Gemini Structured Extraction
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-xs text-slate-400">Zero-shot structured JSON extraction</p>
          </div>
        </div>

        {/* Confidence Score Pill */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${getConfidenceColor(extraction.confidence_score)}`}>
            <Cpu className="w-3.5 h-3.5" />
            <span>Confidence: {confidencePercent}%</span>
          </div>
        </div>
      </div>

      {/* Extracted Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        
        {/* Category */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Category
          </span>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            {getCategoryIcon(extraction.category)}
            <span>{extraction.category}</span>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Estimated Cost
          </span>
          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-400">
            <DollarSign className="w-4 h-4" />
            <span>
              {extraction.estimated_cost !== null && extraction.estimated_cost !== undefined
                ? extraction.estimated_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'Not specified'}
            </span>
          </div>
        </div>

        {/* Urgency */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Urgency
          </span>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className={`w-2 h-2 rounded-full ${
              extraction.urgency === 'URGENT' ? 'bg-rose-500 animate-ping' :
              extraction.urgency === 'HIGH' ? 'bg-amber-500' :
              extraction.urgency === 'MEDIUM' ? 'bg-indigo-400' : 'bg-slate-400'
            }`} />
            <span className="text-slate-200">{extraction.urgency}</span>
          </div>
        </div>

        {/* Missing Fields Count */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Data Completeness
          </span>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            {extraction.missing_fields && extraction.missing_fields.length > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{extraction.missing_fields.length} missing</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete</span>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Domain Specific Metadata Chips */}
      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2 mb-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Extracted Context Parameters
        </h4>
        <div className="flex flex-wrap gap-2 text-xs">
          {meta.item_names && meta.item_names.length > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
              <Laptop className="w-3 h-3 text-cyan-400" />
              <span>Items: {meta.item_names.join(', ')}</span>
            </div>
          )}
          {meta.destination && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
              <MapPin className="w-3 h-3 text-rose-400" />
              <span>Destination: {meta.destination}</span>
            </div>
          )}
          {meta.start_date && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>Start: {meta.start_date}</span>
            </div>
          )}
          {meta.end_date && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>End: {meta.end_date}</span>
            </div>
          )}
          {meta.business_justification && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 max-w-full truncate">
              <FileText className="w-3 h-3 text-amber-400" />
              <span className="truncate">Justification: {meta.business_justification}</span>
            </div>
          )}
        </div>
      </div>

      {/* Policy Risk Flags */}
      {extraction.policy_risks && extraction.policy_risks.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">AI Policy Advisory:</span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/90">
              {extraction.policy_risks.map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* AI Reasoning */}
      {showRawReasoning && extraction.reasoning && (
        <div className="text-xs text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          <span className="font-semibold text-slate-300">AI Reasoning: </span>
          <span>{extraction.reasoning}</span>
        </div>
      )}

    </div>
  );
};

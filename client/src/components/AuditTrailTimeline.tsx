import React, { useState } from 'react';
import { AuditLogItem } from '../../../shared/schemas';
import { 
  History, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  FileEdit, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  Terminal
} from 'lucide-react';

interface Props {
  logs: AuditLogItem[];
}

export const AuditTrailTimeline: React.FC<Props> = ({ logs }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('APPROVE')) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (eventType.includes('REJECT')) return <XCircle className="w-4 h-4 text-rose-400" />;
    if (eventType.includes('REQUEST_INFO')) return <AlertCircle className="w-4 h-4 text-amber-400" />;
    if (eventType.includes('SUPPLEMENT')) return <FileEdit className="w-4 h-4 text-cyan-400" />;
    if (eventType.includes('RULE')) return <ShieldCheck className="w-4 h-4 text-purple-400" />;
    return <Sparkles className="w-4 h-4 text-indigo-400" />;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Immutable Audit Ledger
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {logs.length} logged events
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No audit entries recorded for this request yet.
        </div>
      ) : (
        <div className="relative pl-6 pt-4 space-y-6 before:absolute before:left-2.5 before:top-6 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} className="relative group">
                
                {/* Node icon */}
                <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-slate-950 border-2 border-indigo-500/50 flex items-center justify-center shadow-sm">
                  {getEventIcon(log.event_type)}
                </div>

                {/* Content Box */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all">
                  
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-200">
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                      {log.actor && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{log.actor.full_name}</span>
                          <span className="text-[10px] text-slate-400">({log.actor.role})</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>

                  {/* Summary of payload */}
                  <div className="mt-2 text-xs text-slate-300 space-y-1">
                    {log.payload.comments && (
                      <p className="italic text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        "{log.payload.comments}"
                      </p>
                    )}
                    {log.payload.rule_reasoning && (
                      <p className="text-[11px] text-indigo-300">
                        <strong>Rule:</strong> {log.payload.rule_reasoning}
                      </p>
                    )}
                    {log.payload.matched_rule && (
                      <p className="text-[11px] text-emerald-400">
                        <strong>Matched Rule:</strong> {log.payload.matched_rule}
                      </p>
                    )}
                  </div>

                  {/* Toggle Raw JSON */}
                  <div className="mt-3 pt-2 border-t border-slate-900 flex justify-end">
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono transition-colors"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>{isExpanded ? 'Hide Payload' : 'View Raw Ledger Payload'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Raw JSON viewer */}
                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                      <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

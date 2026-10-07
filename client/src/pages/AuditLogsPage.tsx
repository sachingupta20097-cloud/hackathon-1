import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuditLogItem } from '../../../shared/schemas';
import { 
  ScrollText, 
  RotateCw, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  Filter,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (selectedEventType === 'ALL') return true;
    return l.event_type === selectedEventType;
  });

  const eventTypes = Array.from(new Set(logs.map(l => l.event_type)));

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <ScrollText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              System Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable cryptographic ledger tracking all intake extractions, policy evaluations, and human decisions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="Refresh Audit Logs"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-300">Filter Event Type:</span>
          <select
            value={selectedEventType}
            onChange={e => setSelectedEventType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200"
          >
            <option value="ALL">All Events ({logs.length})</option>
            {eventTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security Ledger Active</span>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No audit ledger entries recorded yet.
          </div>
        ) : (
          filteredLogs.map(log => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 backdrop-blur-md space-y-3 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[11px]">
                      {log.event_type}
                    </span>
                    {log.request && (
                      <Link 
                        to={`/requests/${log.request_id}`}
                        className="text-white hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>REQ #{log.request.request_number}: {log.request.title}</span>
                      </Link>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Actor:</span>
                    <span className="font-semibold text-slate-200">
                      {log.actor?.full_name || 'System Engine'}
                    </span>
                    {log.actor && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {log.actor.role}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono transition-colors cursor-pointer"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>{isExpanded ? 'Hide Payload' : 'Inspect JSON Payload'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-3 rounded-xl bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                    <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RequestItem, RequestCategory } from '../../../shared/schemas';
import { RequestStatusBadge } from '../components/RequestStatusBadge';
import { ApprovalModal } from '../components/ApprovalModal';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  RotateCw, 
  Sparkles, 
  Laptop, 
  Plane, 
  Calendar, 
  Package,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { role, apiFetch } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  useEffect(() => {
    fetchApprovalQueue();
  }, [role]);

  const fetchApprovalQueue = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/approvals');
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch approval queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (cat: RequestCategory) => {
    switch (cat) {
      case 'EQUIPMENT': return <Laptop className="w-4 h-4 text-cyan-400" />;
      case 'TRAVEL': return <Plane className="w-4 h-4 text-indigo-400" />;
      case 'LEAVE': return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'SUPPLIES': return <Package className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Approver Review Queue
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop review queue for employee requests exceeding automated policy thresholds.
          </p>
        </div>

        <button
          onClick={fetchApprovalQueue}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="Refresh Queue"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Queue Cards Grid */}
      {pendingRequests.length === 0 ? (
        <div className="py-20 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3 backdrop-blur-md">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Queue Clear</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All submitted requests have been reviewed or auto-approved by the rules engine.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRequests.map((req) => {
            const isHighCost = req.total_estimated_cost && req.total_estimated_cost > 1000;
            return (
              <div 
                key={req.id} 
                className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 p-5 backdrop-blur-md shadow-xl transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        REQ #{req.request_number}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-medium">
                        {getCategoryIcon(req.category)}
                        <span>{req.category}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.priority === 'URGENT' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold animate-pulse">
                          URGENT
                        </span>
                      )}
                      <RequestStatusBadge status={req.status} size="sm" />
                    </div>
                  </div>

                  {/* Request Title & Prompt */}
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {req.title}
                    </h3>
                    <p className="text-xs text-slate-400 italic line-clamp-2 mt-1">
                      "{req.raw_input}"
                    </p>
                  </div>

                  {/* AI Metadata & Cost Strip */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Estimated Spend
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {req.total_estimated_cost ? `$${req.total_estimated_cost.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        AI Confidence
                      </span>
                      <span className="font-mono font-bold text-indigo-300 text-sm">
                        {req.ai_confidence_score ? `${Math.round(req.ai_confidence_score * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* High cost warning */}
                  {isHighCost && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Exceeds $1,000 corporate threshold.</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <Link
                    to={`/requests/${req.id}`}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    View Timeline
                  </Link>
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-950/50 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Review & Decide</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {selectedRequest && (
        <ApprovalModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          onActionComplete={fetchApprovalQueue}
        />
      )}

    </div>
  );
};

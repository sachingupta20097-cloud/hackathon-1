import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RequestItem, ApprovalActionType } from '../../../shared/schemas';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  Loader2,
  DollarSign,
  Tag
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem;
  onActionComplete: () => void;
}

export const ApprovalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  request,
  onActionComplete
}) => {
  const { apiFetch } = useAuth();
  const [selectedAction, setSelectedAction] = useState<ApprovalActionType>('APPROVE');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setError('Comments are required for audit tracking.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/approvals/action', {
        method: 'POST',
        body: JSON.stringify({
          requestId: request.id,
          action: selectedAction,
          comments
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit approval action');
      }

      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const actionButtons: { type: ApprovalActionType; label: string; icon: any; color: string; activeColor: string }[] = [
    {
      type: 'APPROVE',
      label: 'Approve Request',
      icon: CheckCircle2,
      color: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
      activeColor: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/50'
    },
    {
      type: 'REJECT',
      label: 'Reject Request',
      icon: XCircle,
      color: 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10',
      activeColor: 'bg-rose-600 text-white border-rose-500 shadow-rose-950/50'
    },
    {
      type: 'REQUEST_INFO',
      label: 'Request More Info',
      icon: AlertCircle,
      color: 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10',
      activeColor: 'bg-amber-600 text-white border-amber-500 shadow-amber-950/50'
    },
    {
      type: 'ESCALATE',
      label: 'Escalate to Admin',
      icon: TrendingUp,
      color: 'border-purple-500/30 text-purple-300 hover:bg-purple-500/10',
      activeColor: 'bg-purple-600 text-white border-purple-500 shadow-purple-950/50'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl shadow-black/80 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Review & Decision</h3>
            <p className="text-xs text-slate-400">
              Request #{request.request_number} &bull; {request.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Brief */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Category: <strong>{request.category}</strong></span>
            </span>
            <span className="text-emerald-400 font-semibold flex items-center">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{request.total_estimated_cost ? request.total_estimated_cost.toLocaleString() : 'N/A'}</span>
            </span>
          </div>
          <p className="text-slate-300 text-xs line-clamp-2 italic">
            "{request.raw_input}"
          </p>
          {request.ai_reasoning && (
            <div className="text-[11px] text-indigo-300/80 pt-1 border-t border-slate-900">
              <strong>AI Assessment:</strong> {request.ai_reasoning}
            </div>
          )}
        </div>

        {/* Action Choice Buttons */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Decision Action:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {actionButtons.map(btn => {
                const Icon = btn.icon;
                const isSelected = selectedAction === btn.type;
                return (
                  <button
                    key={btn.type}
                    type="button"
                    onClick={() => setSelectedAction(btn.type)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected ? btn.activeColor : `bg-slate-950 ${btn.color}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audit Comments Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Decision Comments & Justification:</span>
              <span className="text-[10px] text-slate-400 font-normal">Immutable Audit Ledger</span>
            </label>
            <textarea
              required
              rows={3}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="State the rationale for your approval, rejection, or request for information..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/50 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Decision...</span>
                </>
              ) : (
                <span>Confirm & Record Action</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

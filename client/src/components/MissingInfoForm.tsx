import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RequestItem } from '../../../shared/schemas';
import { AlertTriangle, Send, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  request: RequestItem;
  onSuccess: (updated: RequestItem) => void;
}

export const MissingInfoForm: React.FC<Props> = ({ request, onSuccess }) => {
  const { apiFetch } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingFields = request.missing_fields || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/requests/${request.id}/supplement`, {
        method: 'PATCH',
        body: JSON.stringify({
          supplementData: formData,
          additionalNotes: notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit missing information');
      }

      onSuccess(data.request);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      start_date: 'Start Date (e.g., 2026-10-15)',
      end_date: 'End Date (e.g., 2026-10-18)',
      destination: 'Travel Destination (City / Country)',
      estimated_cost: 'Estimated Budget / Cost ($)',
      business_justification: 'Business Purpose & Justification',
      item_names: 'Specific Item Names & Models'
    };
    return labels[field] || field.replace(/_/g, ' ').toUpperCase();
  };

  const getFieldType = (field: string) => {
    if (field.includes('date')) return 'date';
    if (field.includes('cost') || field.includes('amount')) return 'number';
    return 'text';
  };

  return (
    <div className="rounded-2xl bg-amber-500/5 border border-amber-500/30 p-5 backdrop-blur-md">
      <div className="flex items-start gap-3 pb-4 border-b border-amber-500/20">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-amber-200">
            Action Required: Supplementary Details Needed
          </h3>
          <p className="text-xs text-amber-300/80 mt-0.5">
            The AI engine flagged this request as incomplete. Please provide the required information below so your request can proceed into the approval workflow.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {missingFields.map(field => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 capitalize flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>{getFieldLabel(field)}</span>
              </label>
              <input
                type={getFieldType(field)}
                required
                value={formData[field] || ''}
                onChange={e => handleInputChange(field, e.target.value)}
                placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Additional Clarification Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Provide any additional context or clarifications for the approver..."
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-950/40 disabled:opacity-50 transition-all hover:scale-[1.02] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Re-evaluating Request...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Details & Resume Workflow</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

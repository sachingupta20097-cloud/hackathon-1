import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { WorkflowRule, RequestCategory, UserRole } from '../../../shared/schemas';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  Loader2,
  X
} from 'lucide-react';

interface Props {
  rules: WorkflowRule[];
  onRefresh: () => void;
}

export const RuleBuilderTable: React.FC<Props> = ({ rules, onRefresh }) => {
  const { apiFetch } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Rule Form State
  const [newRule, setNewRule] = useState({
    category: 'EQUIPMENT' as RequestCategory,
    ruleName: '',
    maxCost: 500,
    requiresManagerApproval: true,
    autoApprove: false,
    assignedApproverRole: 'APPROVER' as UserRole
  });

  const handleToggleActive = async (rule: WorkflowRule) => {
    setActionLoadingId(rule.id);
    try {
      await apiFetch(`/admin/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      onRefresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to remove this workflow rule?')) return;
    setActionLoadingId(ruleId);
    try {
      await apiFetch(`/admin/rules/${ruleId}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/admin/rules', {
        method: 'POST',
        body: JSON.stringify({
          category: newRule.category,
          ruleName: newRule.ruleName,
          conditions: {
            maxCost: Number(newRule.maxCost),
            requiresManagerApproval: newRule.requiresManagerApproval
          },
          autoApprove: newRule.autoApprove,
          assignedApproverRole: newRule.assignedApproverRole
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewRule({
          category: 'EQUIPMENT',
          ruleName: '',
          maxCost: 500,
          requiresManagerApproval: true,
          autoApprove: false,
          assignedApproverRole: 'APPROVER'
        });
        onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>Workflow Decision Rules</span>
          </h3>
          <p className="text-xs text-slate-400">
            Define auto-approval thresholds, evaluation conditions, and escalation paths.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow Rule</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Rule Name</th>
              <th className="py-3 px-4">Conditions</th>
              <th className="py-3 px-4">Auto-Approve</th>
              <th className="py-3 px-4">Routed Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {rules.map((rule) => {
              const maxCost = rule.conditions?.max_cost ?? rule.conditions?.maxCost;
              return (
                <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-indigo-400">
                    #{rule.priority}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                      {rule.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white max-w-xs truncate">
                    {rule.rule_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    {maxCost !== undefined ? (
                      <span className="text-emerald-400">Max ${maxCost}</span>
                    ) : (
                      'Any cost'
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {rule.auto_approve ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                        <Zap className="w-3 h-3" />
                        <span>Instant Auto</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Requires Review</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                      {rule.assigned_approver_role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      disabled={actionLoadingId === rule.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        rule.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-400'
                      }`}
                    >
                      {rule.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{rule.is_active ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      disabled={actionLoadingId === rule.id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Workflow Rule */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-bold text-white">Create Workflow Rule</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Target Category</label>
                <select
                  value={newRule.category}
                  onChange={e => setNewRule({ ...newRule, category: e.target.value as RequestCategory })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="EQUIPMENT">EQUIPMENT</option>
                  <option value="LEAVE">LEAVE</option>
                  <option value="TRAVEL">TRAVEL</option>
                  <option value="SUPPLIES">SUPPLIES</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Rule Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Minor Supplies Fast-Track"
                  value={newRule.ruleName}
                  onChange={e => setNewRule({ ...newRule, ruleName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Max Dollar Threshold ($)</label>
                <input
                  type="number"
                  min="0"
                  value={newRule.maxCost}
                  onChange={e => setNewRule({ ...newRule, maxCost: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Assigned Approver Role</label>
                <select
                  value={newRule.assignedApproverRole}
                  onChange={e => setNewRule({ ...newRule, assignedApproverRole: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="APPROVER">APPROVER (Manager)</option>
                  <option value="ADMIN">ADMIN (Executive / IT Head)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={newRule.autoApprove}
                  onChange={e => setNewRule({ ...newRule, autoApprove: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="autoApprove" className="text-slate-300 font-medium cursor-pointer">
                  Auto-Approve immediately if conditions are met (bypass review)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

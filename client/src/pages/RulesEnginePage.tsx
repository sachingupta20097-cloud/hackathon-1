import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WorkflowRule } from '../../../shared/schemas';
import { RuleBuilderTable } from '../components/RuleBuilderTable';
import { Sliders, RotateCw } from 'lucide-react';

export const RulesEnginePage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Workflow Rules Engine
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated routing policies, approval thresholds, and auto-approval limits per operational domain.
          </p>
        </div>

        <button
          onClick={fetchRules}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          title="Refresh Rules"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rules Table */}
      <RuleBuilderTable rules={rules} onRefresh={fetchRules} />

    </div>
  );
};

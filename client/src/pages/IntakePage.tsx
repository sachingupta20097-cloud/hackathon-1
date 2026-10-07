import React from 'react';
import { IntakeForm } from '../components/IntakeForm';
import { ShieldCheck, Zap, HelpCircle, CheckCircle } from 'lucide-react';

export const IntakePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Intake Component */}
      <IntakeForm />

      {/* Advisory & Policy Rules Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-1.5">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
            <Zap className="w-4 h-4" />
            <span>Instant Auto-Approval</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Requests within standard policy thresholds (e.g., standard equipment &le; $200, office supplies &le; $150) bypass manager queues and auto-approve.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>Missing Information Flow</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            If dates, costs, or justification are missing, the request transitions to <strong>Needs Info</strong> so you can provide the missing fields before managerial review.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Full Audit Trail</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Every AI extraction step, policy rule match, and manager approval comment is recorded immutably in the PostgreSQL audit ledger.
          </p>
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { RequestStatus } from '../../../shared/schemas';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  CheckCheck, 
  Ban 
} from 'lucide-react';

interface Props {
  status: RequestStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RequestStatusBadge: React.FC<Props> = ({ status, size = 'md', showIcon = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-semibold px-3.5 py-1.5 gap-2'
  }[size];

  switch (status) {
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium ${sizeClasses}`}>
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Approved</span>
        </span>
      );
    case 'PENDING_APPROVAL':
      return (
        <span className={`inline-flex items-center rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium ${sizeClasses}`}>
          {showIcon && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          )}
          <span>Pending Approval</span>
        </span>
      );
    case 'NEEDS_INFO':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium ${sizeClasses}`}>
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
          <span>Needs Info</span>
        </span>
      );
    case 'PARSING':
      return (
        <span className={`inline-flex items-center rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium ${sizeClasses}`}>
          {showIcon && <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
          <span>AI Parsing</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium ${sizeClasses}`}>
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
          <span>Rejected</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium ${sizeClasses}`}>
          {showIcon && <CheckCheck className="w-3.5 h-3.5 text-teal-400" />}
          <span>Completed</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 font-medium ${sizeClasses}`}>
          {showIcon && <Ban className="w-3.5 h-3.5 text-slate-400" />}
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30 font-medium ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
  }
};

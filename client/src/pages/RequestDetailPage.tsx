import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RequestItem, AuditLogItem } from '../../../shared/schemas';
import { RequestStatusBadge } from '../components/RequestStatusBadge';
import { AIParsingCard } from '../components/AIParsingCard';
import { MissingInfoForm } from '../components/MissingInfoForm';
import { ApprovalModal } from '../components/ApprovalModal';
import { AuditTrailTimeline } from '../components/AuditTrailTimeline';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  FileText, 
  CheckSquare, 
  RotateCw,
  AlertTriangle,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, user, apiFetch } = useAuth();

  const [request, setRequest] = useState<RequestItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchRequestDetails();
  }, [id, role]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/requests/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load request details');
      }

      setRequest(data.request);
      setAuditLogs(data.auditLogs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = (role === 'APPROVER' || role === 'ADMIN') && request?.status === 'PENDING_APPROVAL';

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RotateCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
        <p className="text-xs text-slate-400">Loading request metadata & audit ledger...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Error Loading Request</h3>
        <p className="text-xs text-slate-400">{error || 'Request record not found.'}</p>
        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Request List</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRequestDetails}
            title="Refresh details"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {canApprove && (
            <button
              onClick={() => setIsApprovalModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/60 transition-all hover:scale-105 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Review & Make Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Request Hero Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        
        {/* Title, Badge & Submitter info */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-400">
                REQ #{request.request_number}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {request.category}
              </span>
              <RequestStatusBadge status={request.status} size="md" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {request.title}
            </h1>
          </div>

          <div className="flex flex-col text-right text-xs space-y-1">
            <span className="text-slate-400">Submitted by:</span>
            <span className="font-semibold text-slate-200">
              {request.employee?.full_name || 'Alex Rivera'}
            </span>
            <span className="text-[11px] text-slate-500">
              {new Date(request.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Raw Employee Input Box */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Original Raw Request Input</span>
          </h4>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 font-sans text-sm text-slate-200 leading-relaxed italic">
            "{request.raw_input}"
          </div>
        </div>

        {/* Gemini AI Extraction Component */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Information Extraction & Confidence Assessment</span>
          </h4>
          {request.extracted_data && (
            <AIParsingCard extraction={request.extracted_data} />
          )}
        </div>

        {/* Missing Info Form (Only shown if status is NEEDS_INFO) */}
        {request.status === 'NEEDS_INFO' && (
          <MissingInfoForm
            request={request}
            onSuccess={(updated) => {
              setRequest(updated);
              fetchRequestDetails();
            }}
          />
        )}

      </div>

      {/* Audit Trail Timeline */}
      <AuditTrailTimeline logs={auditLogs} />

      {/* Approval Modal */}
      {isApprovalModalOpen && (
        <ApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          request={request}
          onActionComplete={fetchRequestDetails}
        />
      )}

    </div>
  );
};

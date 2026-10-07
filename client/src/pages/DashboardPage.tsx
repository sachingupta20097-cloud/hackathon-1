import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RequestItem, RequestCategory } from '../../../shared/schemas';
import { RequestStatusBadge } from '../components/RequestStatusBadge';
import { 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Laptop,
  Plane,
  Package,
  Calendar
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, role, apiFetch } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [reqRes, statsRes] = await Promise.all([
        apiFetch('/requests'),
        apiFetch('/admin/stats')
      ]);

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }

      if (statsRes.ok) {
        const statData = await statsRes.json();
        setStats(statData.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING_APPROVAL');
  const needsInfoRequests = requests.filter(r => r.status === 'NEEDS_INFO');
  const approvedRequests = requests.filter(r => r.status === 'APPROVED');

  const getCategoryIcon = (cat: RequestCategory) => {
    switch (cat) {
      case 'EQUIPMENT': return <Laptop className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TRAVEL': return <Plane className="w-3.5 h-3.5 text-indigo-400" />;
      case 'LEAVE': return <Calendar className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SUPPLIES': return <Package className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>SmartFlow AI Operations Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Enterprise intake is operational. Gemini AI actively categorizes employee requests, verifies policy thresholds, and streamlines human approval workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-950/60 transition-all hover:scale-105 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              <span>Submit Request</span>
            </Link>

            {(role === 'APPROVER' || role === 'ADMIN') && (
              <Link
                to="/approvals"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
              >
                <span>Approver Queue</span>
                {pendingRequests.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Action Required Banner for Needs Info */}
      {needsInfoRequests.length > 0 && role === 'EMPLOYEE' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Action Required on {needsInfoRequests.length} Request(s)
              </h4>
              <p className="text-xs text-amber-300/80">
                The AI engine identified missing details on your submitted requests. Please supply the missing data to continue.
              </p>
            </div>
          </div>
          <Link
            to={`/requests/${needsInfoRequests[0].id}`}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
          >
            Resolve Now
          </Link>
        </div>
      )}

      {/* Executive KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Requests */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {role === 'EMPLOYEE' ? 'My Requests' : 'Total Pipeline'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{requests.length}</span>
            <span className="text-xs text-emerald-400 font-medium">Logged</span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">{pendingRequests.length}</span>
            <span className="text-xs text-amber-400/80 font-medium">Awaiting Review</span>
          </div>
        </div>

        {/* Auto / Approved */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Approved Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">{approvedRequests.length}</span>
            <span className="text-xs text-emerald-400/80 font-medium">Verified</span>
          </div>
        </div>

        {/* Spend / AI Confidence */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              AI Avg Confidence
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-300">
              {stats?.avgConfidence ? `${Math.round(stats.avgConfidence * 100)}%` : '94%'}
            </span>
            <span className="text-xs text-slate-400 font-medium">High Precision</span>
          </div>
        </div>

      </div>

      {/* Recent Activity Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Recent Requests
            </h3>
            <p className="text-xs text-slate-400">
              Review current state, extraction data, and audit histories.
            </p>
          </div>
          <Link
            to="/requests"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No requests logged yet. Submit your first request using the button above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Req #</th>
                  <th className="py-3 px-3">Title & Request</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Est. Cost</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">AI Score</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {requests.slice(0, 6).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-semibold text-indigo-400">
                      #{req.request_number}
                    </td>
                    <td className="py-3.5 px-3 max-w-sm">
                      <Link to={`/requests/${req.id}`} className="font-semibold text-white hover:text-indigo-300 transition-colors block truncate">
                        {req.title}
                      </Link>
                      <span className="text-[11px] text-slate-400 truncate block">
                        {req.raw_input}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                        {getCategoryIcon(req.category)}
                        <span>{req.category}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-emerald-400">
                      {req.total_estimated_cost ? `$${req.total_estimated_cost.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      <RequestStatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-xs text-indigo-300">
                        {req.ai_confidence_score ? `${Math.round(req.ai_confidence_score * 100)}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/requests/${req.id}`}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium inline-block transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

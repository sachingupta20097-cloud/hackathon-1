import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RequestItem, RequestStatus, RequestCategory } from '../../../shared/schemas';
import { RequestStatusBadge } from '../components/RequestStatusBadge';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Laptop, 
  Plane, 
  Calendar, 
  Package, 
  DollarSign, 
  RotateCw,
  SlidersHorizontal
} from 'lucide-react';

export const RequestsPage: React.FC = () => {
  const { role, apiFetch } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchRequests();
  }, [role]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.raw_input.toLowerCase().includes(search.toLowerCase()) ||
      r.request_number.toString().includes(search);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getCategoryIcon = (cat: RequestCategory) => {
    switch (cat) {
      case 'EQUIPMENT': return <Laptop className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TRAVEL': return <Plane className="w-3.5 h-3.5 text-indigo-400" />;
      case 'LEAVE': return <Calendar className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SUPPLIES': return <Package className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const statusOptions: { value: string; label: string }[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'NEEDS_INFO', label: 'Needs Info' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Employee Request Registry
          </h1>
          <p className="text-xs text-slate-400">
            {role === 'EMPLOYEE' 
              ? 'Your submitted requests and real-time approval status.' 
              : 'Enterprise-wide request ledger with role-based governance.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            title="Refresh list"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Request</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by request #, keyword, title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category Selector */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
            <option value="LEAVE">LEAVE</option>
            <option value="TRAVEL">TRAVEL</option>
            <option value="SUPPLIES">SUPPLIES</option>
          </select>
        </div>

      </div>

      {/* Requests Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden backdrop-blur-md">
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No requests matched your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Req #</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Title & Raw Prompt</th>
                  <th className="py-3.5 px-4">Estimated Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">AI Confidence</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-indigo-400">
                      #{req.request_number}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-200">
                        {getCategoryIcon(req.category)}
                        <span>{req.category}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-sm">
                      <Link 
                        to={`/requests/${req.id}`} 
                        className="font-semibold text-white hover:text-indigo-300 transition-colors block text-sm"
                      >
                        {req.title}
                      </Link>
                      <span className="text-xs text-slate-400 line-clamp-1 italic mt-0.5">
                        "{req.raw_input}"
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-semibold text-emerald-400">
                      {req.total_estimated_cost ? (
                        `$${req.total_estimated_cost.toLocaleString()}`
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <RequestStatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs font-semibold text-indigo-300">
                        {req.ai_confidence_score ? `${Math.round(req.ai_confidence_score * 100)}%` : '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      {new Date(req.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/requests/${req.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-block transition-colors"
                      >
                        Details
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

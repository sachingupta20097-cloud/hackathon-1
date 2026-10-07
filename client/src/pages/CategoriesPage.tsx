import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CategoryItem, RequestCategory, DOMAIN_CONFIGS } from '../../../shared/schemas';
import { 
  FolderTree, 
  Plus, 
  RotateCw, 
  CheckCircle, 
  Laptop, 
  Plane, 
  Calendar, 
  Package,
  Layers,
  ShieldCheck,
  X
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCat, setNewCat] = useState({
    code: 'EQUIPMENT' as RequestCategory,
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify(newCat)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewCat({ code: 'EQUIPMENT', name: '', description: '' });
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryIcon = (code: RequestCategory) => {
    switch (code) {
      case 'EQUIPMENT': return <Laptop className="w-5 h-5 text-cyan-400" />;
      case 'TRAVEL': return <Plane className="w-5 h-5 text-indigo-400" />;
      case 'LEAVE': return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 'SUPPLIES': return <Package className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <FolderTree className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Request Category Taxonomy
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage domain definitions, required fields for AI extraction, and approval routing hierarchies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const domainConfig = DOMAIN_CONFIGS[cat.code];
          return (
            <div 
              key={cat.id} 
              className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-md shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                    {getCategoryIcon(cat.code)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{cat.name}</h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      CODE: {cat.code}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-medium">
                  <CheckCircle className="w-3 h-3" />
                  <span>Active</span>
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {cat.description}
              </p>

              {/* Domain Config details */}
              {domainConfig && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">
                      Auto-Approval Threshold
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {domainConfig.autoApprovalThresholdLimit > 0 
                        ? `Up to $${domainConfig.autoApprovalThresholdLimit}` 
                        : 'Manual Review Required'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-1">
                      Mandatory Extraction Fields
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {domainConfig.requiredFields.map(field => (
                        <span key={field} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-1">
                      Approval Hierarchy
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-300">
                      {domainConfig.approvalLevels.map((lvl, idx) => (
                        <React.Fragment key={lvl}>
                          <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-900">
                            {lvl}
                          </span>
                          {idx < domainConfig.approvalLevels.length - 1 && (
                            <span className="text-slate-600">&rarr;</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-bold text-white">Add Category Taxonomy</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Category Domain</label>
                <select
                  value={newCat.code}
                  onChange={e => setNewCat({ ...newCat, code: e.target.value as RequestCategory })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="EQUIPMENT">EQUIPMENT</option>
                  <option value="LEAVE">LEAVE</option>
                  <option value="TRAVEL">TRAVEL</option>
                  <option value="SUPPLIES">SUPPLIES</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Display Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ergonomic Office Equipment"
                  value={newCat.name}
                  onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Scope Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe what items or requests belong to this category..."
                  value={newCat.description}
                  onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../../../shared/schemas';
import { 
  Bot, 
  LayoutDashboard, 
  PlusCircle, 
  ListFilter, 
  CheckSquare, 
  Sliders, 
  FolderTree, 
  ScrollText, 
  Users, 
  LogOut,
  ChevronDown,
  Sparkles
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { user, role, switchRole, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navLinkClass = (path: string) => `
    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
    ${isActive(path) 
      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}
  `;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                    SmartFlow
                  </span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 -mt-0.5">Enterprise Routing</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link to="/requests/new" className={navLinkClass('/requests/new')}>
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <span>New Request</span>
              </Link>

              <Link to="/requests" className={navLinkClass('/requests')}>
                <ListFilter className="w-4 h-4" />
                <span>Requests</span>
              </Link>

              {(role === 'APPROVER' || role === 'ADMIN') && (
                <Link to="/approvals" className={navLinkClass('/approvals')}>
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Approvals</span>
                </Link>
              )}

              {role === 'ADMIN' && (
                <>
                  <Link to="/admin/rules" className={navLinkClass('/admin/rules')}>
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Rules Engine</span>
                  </Link>

                  <Link to="/admin/categories" className={navLinkClass('/admin/categories')}>
                    <FolderTree className="w-4 h-4" />
                    <span>Categories</span>
                  </Link>

                  <Link to="/admin/audit-logs" className={navLinkClass('/admin/audit-logs')}>
                    <ScrollText className="w-4 h-4 text-emerald-400" />
                    <span>Audit Ledger</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Right Header: Role Switcher & User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Interactive Role Switcher Pills */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase px-2 tracking-wider">
                Persona:
              </span>
              {(['EMPLOYEE', 'APPROVER', 'ADMIN'] as UserRole[]).map((r) => {
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isSelected
                        ? r === 'ADMIN'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : r === 'APPROVER'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {r === 'EMPLOYEE' ? 'Employee' : r === 'APPROVER' ? 'Approver' : 'Admin'}
                  </button>
                );
              })}
            </div>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300">
                {user?.full_name ? user.full_name[0] : 'U'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user?.full_name || 'Alex Rivera'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {user?.department || 'Engineering'}
                </span>
              </div>
              <button 
                onClick={logout}
                title="Log Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../../../shared/schemas';
import { 
  Bot, 
  Sparkles, 
  User, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  LogIn
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Failed to authenticate');
    }
  };

  const handleQuickPersona = (role: UserRole, targetRoute: string) => {
    switchRole(role);
    navigate(targetRoute);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-500/20 mb-1">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            SmartFlow <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            AI-Powered Internal Employee Request Routing & Approval Management Platform
          </p>
        </div>

        {/* Quick Persona Demo Switcher Card */}
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Instant Demo Persona Access</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              One-Click Entry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Employee */}
            <button
              onClick={() => handleQuickPersona('EMPLOYEE', '/dashboard')}
              className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span className="text-[10px] font-mono text-indigo-400 font-semibold">EMPLOYEE</span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                Alex Rivera
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Software Engineering</p>
              <span className="text-[10px] text-indigo-400 flex items-center gap-1 mt-2 font-medium">
                <span>Enter as Submitter</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {/* Approver */}
            <button
              onClick={() => handleQuickPersona('APPROVER', '/approvals')}
              className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-[10px] font-mono text-amber-400 font-semibold">APPROVER</span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Sarah Chen
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Engineering Lead</p>
              <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-2 font-medium">
                <span>Enter Approver Queue</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>

            {/* Admin */}
            <button
              onClick={() => handleQuickPersona('ADMIN', '/admin/rules')}
              className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span className="text-[10px] font-mono text-purple-400 font-semibold">ADMIN</span>
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                Marcus Vance
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">IT & Workplace Admin</p>
              <span className="text-[10px] text-purple-400 flex items-center gap-1 mt-2 font-medium">
                <span>Enter Admin Console</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        </div>

        {/* Supabase Password Login Section */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Supabase Auth Credentials
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">PostgreSQL RLS</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="alex.employee@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{loading ? 'Authenticating...' : 'Sign In with Supabase'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

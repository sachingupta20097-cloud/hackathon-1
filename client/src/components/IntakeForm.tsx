import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RequestCategory, PriorityLevel } from '../../../shared/schemas';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  FileText, 
  ListPlus, 
  DollarSign, 
  Layers, 
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export const IntakeForm: React.FC = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'NATURAL' | 'STRUCTURED'>('NATURAL');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Structured form state
  const [category, setCategory] = useState<RequestCategory>('EQUIPMENT');
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [justification, setJustification] = useState('');
  const [urgency, setUrgency] = useState<PriorityLevel>('MEDIUM');

  const SAMPLE_PROMPTS = [
    {
      title: 'Dev Laptop Hardware',
      prompt: 'Need a new MacBook Pro for dev work, budget around $2500'
    },
    {
      title: 'Missing Details PTO',
      prompt: 'I need PTO next week to visit family'
    },
    {
      title: 'Conference Travel',
      prompt: 'Flight and hotel for Cloud Computing Summit in Chicago from Nov 15 to Nov 18, 2026. Estimated cost is $1,150.'
    },
    {
      title: 'Office Stationery',
      prompt: 'Restock dry-erase markers and sticky easel pads for conference room 4B, roughly $45 total.'
    }
  ];

  const handleSelectSample = (prompt: string) => {
    setRawText(prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let submissionText = rawText;
      let fallbackCat: RequestCategory | undefined = undefined;

      if (mode === 'STRUCTURED') {
        fallbackCat = category;
        submissionText = `Request: ${title}. Category: ${category}. Estimated Budget: $${cost || 0}. Urgency: ${urgency}. Justification: ${justification}.`;
      }

      if (submissionText.trim().length < 10) {
        throw new Error('Request text must be at least 10 characters long.');
      }

      const res = await apiFetch('/requests/intake', {
        method: 'POST',
        body: JSON.stringify({
          rawInput: submissionText,
          fallbackCategory: fallbackCat
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request submission failed');
      }

      // Navigate to created request detail page
      navigate(`/requests/${data.request.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/60 relative overflow-hidden">
      
      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mt-20"></div>

      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Create Employee Request
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Submit in your own words via Gemini 3.8 AI or use our structured intake form.
          </p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('NATURAL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              mode === 'NATURAL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Natural AI Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('STRUCTURED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              mode === 'STRUCTURED'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Structured Form</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        
        {mode === 'NATURAL' ? (
          <div className="space-y-4">
            
            {/* Quick Sample Chips */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Try an example prompt:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PROMPTS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(s.prompt)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-300 transition-all cursor-pointer text-left"
                  >
                    <span className="font-medium text-indigo-400">{s.title}:</span>{' '}
                    <span className="text-slate-400 italic truncate max-w-xs inline-block align-bottom">
                      "{s.prompt.slice(0, 36)}..."
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Free-form Request Details
              </label>
              <div className="relative">
                <textarea
                  required
                  rows={5}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Describe what you need in natural English (e.g., 'Need a 4K 27-inch monitor for design work, approx $450 from Dell, needed by next Wednesday')..."
                  className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed"
                />
                <span className="absolute bottom-3 right-4 text-[11px] font-mono text-slate-500">
                  {rawText.length} characters (min 10)
                </span>
              </div>
            </div>

          </div>
        ) : (
          /* Structured Mode Form */
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as RequestCategory)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                >
                  <option value="EQUIPMENT">EQUIPMENT (Hardware, Laptops, Desk)</option>
                  <option value="LEAVE">LEAVE (Time Off, Vacation, Sick)</option>
                  <option value="TRAVEL">TRAVEL (Flights, Hotels, Transport)</option>
                  <option value="SUPPLIES">SUPPLIES (Stationery, Team Pantry)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Urgency Level</label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as PriorityLevel)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                >
                  <option value="LOW">Low (Standard SLA)</option>
                  <option value="MEDIUM">Medium (Default)</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent (Immediate Review)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-semibold text-slate-300">Request Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ergonomic Office Chair"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Estimated Cost ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 350"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Business Justification & Context</label>
              <textarea
                required
                rows={3}
                placeholder="Explain why this request is required for team or personal productivity..."
                value={justification}
                onChange={e => setJustification(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Automated rule engine evaluation active</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-950/60 disabled:opacity-50 transition-all hover:scale-[1.02] cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting & Evaluating with Gemini...</span>
              </>
            ) : (
              <>
                <span>Submit & Route Request</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

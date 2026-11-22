import React, { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { PlayerProgress } from '../game/types';

interface ArenaCoachPanelProps {
  open: boolean;
  progress: PlayerProgress;
  onClose: () => void;
}

type CoachModel = 'gemini-4-hydrogen' | 'gemini-4-carbon' | 'gemini-4-argon' | 'gemini-3.1-flash-lite';

export const ArenaCoachPanel: React.FC<ArenaCoachPanelProps> = ({ open, progress, onClose }) => {
  const [prompt, setPrompt] = useState('What weapon, vehicle & island tactic gives the best win rate?');
  const [model, setModel] = useState<CoachModel>('gemini-4-hydrogen');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Ready, ${progress.playerName}#${progress.playerTag}! Ask for island vehicle tactics, rooftop sniping spots, or loadout upgrades.`,
    },
  ]);

  if (!open) return null;

  const askCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const userMsg = prompt.trim();
    setPrompt('');
    const nextMsgs = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(nextMsgs);
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: nextMsgs.map((m) => ({ role: m.role, text: m.text })),
          context: {
            level: progress.level,
            coins: progress.coins,
            gunId: progress.equipped.gunId,
            arenaId: progress.equipped.arenaId,
          },
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || data.error || 'Try controlling the central plaza and vehicles!' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Grab an Armored Buggy or Horse early, shoot from horseback/cars, and hold rooftop stairs!' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-black text-white">BLOCK WAR TACTICAL COACH</h2>
              <p className="text-[11px] text-slate-400">Strategy advice for vehicles, horses & weapons</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as CoachModel)}
              className="rounded-lg border border-white/15 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200"
            >
              <option value="gemini-4-hydrogen">Fast Tactical</option>
              <option value="gemini-3.1-flash-lite">Lite Quick</option>
              <option value="gemini-4-argon">Pro Strategy</option>
              <option value="gemini-4-carbon">Deep Analysis</option>
            </select>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'ml-10 bg-cyan-600/30 border border-cyan-400/40 text-white'
                  : 'mr-10 bg-slate-800/80 border border-white/10 text-slate-200'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        <form onSubmit={askCoach} className="flex items-center gap-2 border-t border-white/10 bg-slate-950/70 p-3">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask tactical coach..."
            className="flex-1 rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {loading ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
};

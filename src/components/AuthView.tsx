import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AuthView({ onClose }: { onClose?: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              name: email.split('@')[0],
              business_name: 'My Business',
            }
          }
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", !onClose ? "min-h-screen p-4 bg-[#FDFDFF]" : "p-0")}>
      <div className={cn("w-full max-w-sm", onClose ? "py-4 px-4" : "py-10 px-6")}>
        <div className={cn("text-center", onClose ? "mb-4" : "mb-8")}>
          <div className={cn("bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-2xl shadow-indigo-100 mx-auto italic", onClose ? "w-10 h-10 text-xl mb-3" : "w-14 h-14 text-3xl mb-5")}>
            P
          </div>
          <h1 className={cn("font-black tracking-tighter text-slate-900 italic", onClose ? "text-xl" : "text-2xl")}>
            Paydrip Portal
          </h1>
          <p className="text-slate-500 mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] font-black">
            {isLogin ? 'Security Verification' : 'Open Active Ledger'}
          </p>
        </div>

        <div className={cn("bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100", onClose ? "p-6" : "p-8")}>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 font-mono">
                Identity Code / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-xs font-bold"
                  placeholder="billing@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 font-mono">
                Access Token / Pass
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-xs font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-[10px] font-bold uppercase tracking-wider px-3 bg-red-50 py-2 rounded-lg border border-red-100 animate-pulse font-mono">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-[10px]">{isLogin ? 'Initialize Session' : 'Create Vault'}</span>
                </>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-black text-slate-400">
              <span className="bg-white px-3 font-mono italic">Verified Methods</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black flex items-center justify-center space-x-2.5 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3.5 h-3.5 grayscale opacity-70 group-hover:grayscale-0" />
            <span className="text-[9px] uppercase tracking-widest">Connect with Google</span>
          </button>

          <p className="mt-6 text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            {isLogin ? "No vault? " : "Access active? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:text-slate-900 transition-colors"
            >
              {isLogin ? 'Open Account' : 'Return to Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

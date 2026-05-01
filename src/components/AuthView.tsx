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
    <div className={cn("min-h-screen flex items-center justify-center bg-[#FDFDFF]", !onClose && "p-4")}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-indigo-100 mx-auto mb-6 italic">
            P
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">
            Paydrip Portal
          </h1>
          <p className="text-slate-400 mt-2 font-mono text-[10px] uppercase tracking-[0.2em] font-black">
            {isLogin ? 'Security Verification' : 'Open Active Ledger'}
          </p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 font-mono">
                Identity Code / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium"
                  placeholder="billing@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 font-mono">
                Access Token / Pass
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium"
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
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs">{isLogin ? 'Initialize Session' : 'Create Vault'}</span>
                </>
              )}
            </button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-white px-4 text-slate-300 font-mono italic">Verified Methods</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-slate-50 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale opacity-70 group-hover:grayscale-0" />
            <span className="text-xs uppercase tracking-widest">Connect with Google</span>
          </button>

          <p className="mt-10 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {isLogin ? "No vault? " : "Access active? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:underline"
            >
              {isLogin ? 'Open Account' : 'Return to Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

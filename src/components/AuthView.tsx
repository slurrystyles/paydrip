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
    <div className={cn("flex flex-col items-center justify-center", !onClose ? "min-h-screen p-4 bg-[#080808]" : "p-0")}>
      <div className={cn("w-full max-w-sm", onClose ? "py-2 px-4" : "py-8 px-6")}>
        <div className={cn("text-center", onClose ? "mb-3" : "mb-6")}>
          <img 
            src="/images/logo.png" 
            alt="Paydrip Logo" 
            className="w-24 h-8 object-contain mx-auto mb-2 select-none" 
            referrerPolicy="no-referrer"
          />
          <p className="text-[#888888] mt-1 font-mono text-[9px] uppercase tracking-[0.2em] font-bold">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        <div className={cn("bg-[#111111] rounded-[1.5rem] border border-[#222222]", onClose ? "p-5" : "p-8")}>
          <form onSubmit={handleAuth} className="space-y-3.5">
            <div>
              <label className="block text-[9px] font-bold text-[#888888] uppercase tracking-widest mb-1.5 px-1 font-mono">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444444]" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#080808] border border-[#222222] rounded-xl focus:ring-1 focus:ring-[#C8FF00] focus:border-[#C8FF00] outline-none transition-all placeholder:text-[#444444] text-xs font-bold text-[#EEEEEE]"
                  placeholder="billing@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#888888] uppercase tracking-widest mb-1.5 px-1 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444444]" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#080808] border border-[#222222] rounded-xl focus:ring-1 focus:ring-[#C8FF00] focus:border-[#C8FF00] outline-none transition-all placeholder:text-[#444444] text-xs font-bold text-[#EEEEEE]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-[10px] font-bold uppercase tracking-wider px-3 bg-red-950/20 py-2 rounded-lg border border-red-900/30 animate-pulse font-mono">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full py-3 bg-[#C8FF00] text-[#080808] rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-[#b8ef00] transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#080808] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="uppercase tracking-[0.2em] text-[10px] font-bold">{isLogin ? 'Sign in' : 'Create account'}</span>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#222222]"></span>
            </div>
            <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-bold text-[#888888]">
              <span className="bg-[#111111] px-3 font-mono italic">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2.5 bg-[#161616] border border-[#222222] text-[#EEEEEE] rounded-xl font-bold flex items-center justify-center space-x-2.5 hover:bg-[#222222] transition-all active:scale-95 shadow-sm group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3.5 h-3.5 grayscale opacity-70 group-hover:grayscale-0 transition-all duration-300" />
            <span className="text-[9px] uppercase tracking-widest">Continue with Google</span>
          </button>

          <p className="mt-6 text-center text-[9px] text-[#888888] font-bold uppercase tracking-widest leading-none">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#C8FF00] hover:underline transition-colors ml-1"
            >
              {isLogin ? 'Sign up' : 'Return to Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

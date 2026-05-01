import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function InfoPageLayout({ 
  title, 
  subtitle, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  children: React.ReactNode 
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-indigo-100 pb-20">
      <nav className="h-20 border-b border-slate-100 bg-white flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back Home
          </button>
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic group-hover:bg-indigo-700 transition-colors">P</div>
            <span className="font-black tracking-tighter italic group-hover:text-indigo-600 transition-colors">Paydrip</span>
          </div>
        </div>
      </nav>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-6 pt-20"
      >
        <header className="mb-16">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic mb-4">{title}</h1>
          <p className="text-xl text-slate-400 font-medium">{subtitle}</p>
        </header>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-16 shadow-2xl shadow-indigo-100/20 prose prose-slate prose-indigo max-w-none">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

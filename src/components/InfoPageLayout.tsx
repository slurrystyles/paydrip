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
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] font-sans selection:bg-[#C8FF00] selection:text-[#080808] pb-20">
      <nav className="h-20 border-b border-[#222222] bg-[#080808]/95 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#888888] hover:text-[#C8FF00] transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back Home
          </button>
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img 
              src="/images/logo.png" 
              alt="Paydrip Logo" 
              className="h-8 w-auto object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </nav>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-6 pt-20"
      >
        <header className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-[#EEEEEE] uppercase">{title}</h1>
          <p className="text-lg text-[#888888] font-medium">{subtitle}</p>
        </header>

        <div className="bg-[#111111] border border-[#222222] rounded-[2.5rem] p-8 md:p-16 shadow-2xl max-w-none mb-20 text-[#EEEEEE]">
          {children}
        </div>

        <div className="text-center py-20 border-t border-[#222222]">
          <h2 className="text-3xl font-bold tracking-tight mb-8 text-[#EEEEEE]">Ready to stop chasing payments?</h2>
          <button 
            onClick={() => navigate('/')}
            className="px-10 py-5 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-2xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            Go to Platform
          </button>
        </div>
      </motion.div>

      <footer className="py-12 px-6 border-t border-[#222222] font-bold uppercase tracking-widest bg-[#080808]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Paydrip Logo" 
              className="h-8 w-auto object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-[9px] text-[#888888] font-mono">© 2026 Paydrip Protocol • All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

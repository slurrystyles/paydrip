import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

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
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] font-sans selection:bg-[#C8FF00] selection:text-[#080808] pb-10 flex flex-col justify-between">
      <div>
        <PublicHeader />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-6 pt-16"
        >
          <div className="mb-8">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#888888] hover:text-[#C8FF00] transition-all group cursor-pointer"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back Home
            </button>
          </div>

          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#EEEEEE] uppercase">{title}</h1>
            <p className="text-base text-[#888888] font-medium">{subtitle}</p>
          </header>

          <div className="bg-[#111111] border border-[#222222] rounded-[2rem] p-6 md:p-12 shadow-2xl max-w-none mb-16 text-[#EEEEEE]">
            {children}
          </div>

          <div className="text-center py-16 border-t border-[#222222] mb-12">
            <h2 className="text-2xl font-bold tracking-tight mb-6 text-[#EEEEEE]">Ready to stop chasing payments?</h2>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer"
            >
              Go to Platform
            </button>
          </div>
        </motion.div>
      </div>

      <PublicFooter />
    </div>
  );
}

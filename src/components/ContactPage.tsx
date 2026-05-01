import React, { useState } from 'react';
import InfoPageLayout from './InfoPageLayout';
import { Send, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <InfoPageLayout 
      title="Contact Node" 
      subtitle="Questions, custom requests, or system feedback."
    >
      <div className="max-w-md">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit} 
              className="space-y-6"
            >
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Your Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">System Address (Email)</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Message Protocol</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-indigo-600 transition-all outline-none resize-none"
                  placeholder="How can we help?"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
              >
                Dispatch Message
                <Send size={16} />
              </button>
            </motion.form>
          ) : (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter mb-2">Message Dispatched</h3>
              <p className="text-slate-400 font-medium">We'll get back to your node shortly.</p>
              <button 
                onClick={() => setSubmitted(false)}
                className="mt-8 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-slate-900 transition-colors"
              >
                Send another message
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </InfoPageLayout>
  );
}

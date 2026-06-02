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
      title="Contact Support" 
      subtitle="Questions, feature requests, or custom deployment configurations."
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-2 block">Your Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-[#080808] border border-[#222222] rounded-2xl p-4 text-sm font-bold text-[#EEEEEE] focus:border-[#C8FF00] transition-all outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-2 block">Your Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-[#080808] border border-[#222222] rounded-2xl p-4 text-sm font-bold text-[#EEEEEE] focus:border-[#C8FF00] transition-all outline-none"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#888888] mb-2 block">Message Details</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full bg-[#080808] border border-[#222222] rounded-2xl p-4 text-sm font-bold text-[#EEEEEE] focus:border-[#C8FF00] transition-all outline-none resize-none"
                  placeholder="Let us know how we can help you get paid faster."
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] py-5 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                Send Message
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
              <div className="w-20 h-20 bg-[#1e2501] text-[#C8FF00] rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-[#EEEEEE] uppercase tracking-tight mb-2">Message Received</h3>
              <p className="text-[#888888] font-medium text-sm">We'll get back to you shortly.</p>
              <button 
                onClick={() => setSubmitted(false)}
                className="mt-8 text-[10px] font-bold uppercase tracking-widest text-[#C8FF00] hover:underline transition-colors"
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

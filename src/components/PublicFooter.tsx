import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function PublicFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (id: string) => {
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <footer className="bg-[#080808] border-t border-[#222222] py-10 px-6 text-xs text-[#888888]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                navigate('/');
              }
            }}
            className="cursor-pointer"
          >
            <img 
              src="/images/logo.png" 
              alt="Paydrip Logo" 
              className="h-10 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 font-medium text-[#444444]">
          <button 
            onClick={() => handleNavClick('how-it-works')} 
            className="hover:text-[#888888] transition-colors cursor-pointer text-xs"
          >
            How it works
          </button>
          <button 
            onClick={() => handleNavClick('features')} 
            className="hover:text-[#888888] transition-colors cursor-pointer text-xs"
          >
            Features
          </button>
          <button 
            onClick={() => navigate('/pricing')} 
            className="hover:text-[#888888] transition-colors cursor-pointer text-xs"
          >
            Pricing
          </button>
          <Link to="/privacy" className="hover:text-[#888888] transition-colors text-xs">Privacy</Link>
          <Link to="/terms" className="hover:text-[#888888] transition-colors text-xs">Terms</Link>
          <Link to="/refund-policy" className="hover:text-[#888888] transition-colors text-xs">Refund Policy</Link>
          <Link to="/contact" className="hover:text-[#888888] transition-[#C8FF00] text-xs">Contact</Link>
        </div>

        <p className="text-xs text-[#444444]">
          Made for freelancers, everywhere.
        </p>
      </div>
    </footer>
  );
}

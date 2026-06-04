import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'usd' | 'inr';

interface Prices {
  free: string;
  pro_monthly: string;
  pro_annual: string;
  ent_monthly: string;
  ent_annual: string;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  prices: Record<Currency, Prices>;
  isIndia: boolean;
}

const PRICES: Record<Currency, Prices> = {
  usd: {
    free: '$0',
    pro_monthly: '$12',
    pro_annual: '$99',
    ent_monthly: '$39',
    ent_annual: '$299',
  },
  inr: {
    free: '₹0',
    pro_monthly: '₹399',
    pro_annual: '₹2,999',
    ent_monthly: '₹999',
    ent_annual: '₹7,999',
  },
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'usd',
  setCurrency: () => {},
  prices: PRICES,
  isIndia: false,
});

export function CurrencyProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [currency, setCurrency] = useState<Currency>('usd');
  const [isIndia, setIsIndia] = useState(false);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (data.country_code === 'IN') {
          setCurrency('inr');
          setIsIndia(true);
        } else {
          setCurrency('usd');
          setIsIndia(false);
        }
      })
      .catch(() => {
        setCurrency('usd');
        setIsIndia(false);
      });
  }, []);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      prices: PRICES,
      isIndia 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);

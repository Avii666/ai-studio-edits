import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, CURRENCY_LIST, CurrencyCode } from '../lib/currency';
import { ChevronDown, Coins, Check } from 'lucide-react';

interface CurrencySelectorProps {
  variant?: 'topbar' | 'compact' | 'dropdown' | 'bar';
  className?: string;
  buttonClassName?: string;
  showFlag?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ 
  variant = 'topbar',
  className = '',
  buttonClassName = '',
  showFlag = false
}) => {
  const { selectedCurrency, setSelectedCurrency } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeConfig = CURRENCIES[selectedCurrency] || CURRENCIES.LKR;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: CurrencyCode) => {
    setSelectedCurrency(code);
    setIsOpen(false);
  };

  if (variant === 'bar') {
    return (
      <div className={`inline-flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80 ${className}`}>
        <span className="text-[11px] font-bold text-stone-600 px-2 flex items-center gap-1">
          <Coins className="w-3 h-3 text-stone-700" />
          <span>Currency:</span>
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {CURRENCY_LIST.map((c) => {
            const isSelected = c.code === selectedCurrency;
            return (
              <button
                key={c.code}
                onClick={() => handleSelect(c.code)}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:bg-white/60 hover:text-stone-900'
                }`}
                title={`${c.name} (${c.exchangeRateDescription})`}
              >
                <span>{c.flag}</span>
                <span>{c.symbol.trim() || c.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${className?.includes('hidden') ? 'hidden ' : ''}${buttonClassName ? buttonClassName + ' ' : ''}group flex items-center gap-1.5 transition-all cursor-pointer ${
          variant === 'topbar'
            ? 'bg-stone-800 hover:bg-stone-700 text-stone-100 px-2.5 py-1 rounded-lg border border-stone-700 text-xs font-medium'
            : 'bg-white hover:bg-stone-50 text-stone-900 px-2.5 py-1.5 rounded-xl border border-stone-200/80 text-xs font-semibold shadow-2xs'
        }`}
        id="currency-selector-button"
        title="Change viewing currency"
      >
        {showFlag && <span className="text-sm leading-none">{activeConfig.flag}</span>}
        <span className="font-mono font-bold tracking-tight">
          {activeConfig.label}
        </span>
        <ChevronDown className={`w-3 h-3 ${variant === 'topbar' ? 'text-stone-300' : 'text-stone-900'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-white border border-stone-200/90 shadow-xl z-50 py-1.5 text-xs text-stone-900 animate-in fade-in-50 zoom-in-95 duration-100 overflow-hidden">
          <div className="px-3.5 py-2 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
              Select Currency
            </span>
            <span className="text-[10px] text-amber-600 font-mono font-medium">
              Auto-converted
            </span>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {CURRENCY_LIST.map((c) => {
              const isSelected = c.code === selectedCurrency;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-stone-100 text-stone-950 font-semibold'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5 text-stone-900">
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono text-stone-400">({c.code})</span>
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {c.exchangeRateDescription}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-serif-heading font-bold text-amber-600">
                      {c.symbol}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-stone-900" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3.5 py-2 border-t border-stone-100 bg-stone-50 text-[10px] text-stone-500 flex items-center gap-1">
            <span>ℹ️</span>
            <span>All antique listings and bids synchronize in real-time.</span>
          </div>
        </div>
      )}
    </div>
  );
};

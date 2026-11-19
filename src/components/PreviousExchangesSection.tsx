import React from 'react';
import { useApp } from '../context/AppContext';
import { Archive, XCircle, CheckCircle2, Gavel, ShieldCheck, Eye, Clock, MapPin } from 'lucide-react';
import { AntiqueItem } from '../types';
import { SafeImage } from './SafeImage';

export const PreviousExchangesSection: React.FC = () => {
  const { items, setSelectedItem, formatCurrency } = useApp();

  // Closed exchanges include lots marked deal_cancelled (deal off), sold, closed, or expired
  const closedItems = items.filter(
    item => item.status === 'deal_cancelled' || item.status === 'sold' || item.status === 'closed'
  );

  return (
    <section 
      className="mt-16 pt-10 border-t border-stone-200/80"
      id="previous-exchanges-section"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-stone-600" />
            <h2 className="font-serif-heading text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Previous Exchanges & Concluded Lots
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 200 }}>
            Historical public record of antique lots that have concluded bidding, undergone private dealer negotiations, or where deals were called off by the seller.
          </p>
        </div>

        <div className="text-xs text-stone-500 shrink-0 font-medium">
          Archived Lots: <strong className="text-stone-900">{closedItems.length}</strong>
        </div>
      </div>
      {closedItems.length === 0 ? (
        <div className="border border-dashed border-stone-200 bg-white p-10 text-center rounded-2xl space-y-2">
          <Archive className="w-8 h-8 text-stone-300 mx-auto" />
          <h3 className="font-serif-heading text-sm font-semibold text-stone-800">
            No Previous Exchanges Recorded
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Once a seller concludes negotiations or marks a deal as called off, the closed lot is removed from the active public auction and archived here for historical provenance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {closedItems.map((item: AntiqueItem) => {
            const isDealOff = item.status === 'deal_cancelled';
            const isSold = item.status === 'sold';

            return (
              <div 
                key={item.id}
                className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between text-xs"
              >
                {/* Lot Header & Image */}
                <div>
                  <div className="relative aspect-16/10 bg-stone-100 overflow-hidden border-b border-stone-100">
                    <SafeImage
                      src={(Array.isArray(item.images) && item.images[0]) || '/images/antique-fallback.webp'}
                      alt={item.title}
                      className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                      {isDealOff && (
                        <span className="bg-red-900 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-200" />
                          <span>Deal Called Off</span>
                        </span>
                      )}
                      {isSold && (
                        <span className="bg-emerald-800 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                          <span>Concluded & Sealed</span>
                        </span>
                      )}
                      {!isDealOff && !isSold && (
                        <span className="bg-stone-900 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md shadow-xs">
                          Closed Lot
                        </span>
                      )}
                    </div>

                    <span className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-serif-heading font-semibold text-base text-stone-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-stone-400 font-provenance flex items-center gap-1.5 flex-wrap">
                      <span>{item.era} · {item.dimensions || 'Archived lot'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {item.city || 'Colombo'}, {item.country || 'Sri Lanka'}
                      </span>
                    </p>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Seller:</span>
                        <span className="font-medium text-stone-800">{item.sellerName}</span>
                      </div>
                      {item.chosenBuyerName && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Buyer:</span>
                          <span className="font-medium text-stone-800">{item.chosenBuyerName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-stone-200/60 pt-1.5">
                        <span className="text-stone-500">
                          {isDealOff ? 'Offered Price:' : 'Final Exchange:'}
                        </span>
                        <span className="font-bold text-stone-900 font-mono text-xs tabular-nums">
                          {formatCurrency(item.chosenDealAmount || item.currentBid)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>Inspect Lot Archive & Bid History</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

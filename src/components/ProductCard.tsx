import React from 'react';
import { AntiqueItem } from '../types';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Clock, ArrowUpRight, CheckCircle2, User, Heart, ZoomIn, MapPin, Star } from 'lucide-react';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  item: AntiqueItem;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
  const { setSelectedItem, currentUser, toggleWatchlist, isWatchlisted, setInspectionData, formatCurrency, openRateSellerModal } = useApp();

  const bids = Array.isArray(item?.bids) ? item.bids : [];
  const images = Array.isArray(item?.images) && item.images.length > 0 ? item.images : ['/images/antique-fallback.webp'];

  const isOwner = currentUser?.id === item.sellerId;
  const isLeadingBidder = Boolean(
    currentUser &&
    bids.length > 0 &&
    (bids[0].isMyBid || bids[0].bidderId === currentUser.id)
  );
  const hasUserBid = Boolean(
    currentUser &&
    bids.some(b => b.isMyBid || b.bidderId === currentUser.id)
  );
  const isSaved = isWatchlisted(item.id);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist(item.id);
  };

  const handleOpenInspection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInspectionData({
      images,
      initialIndex: 0,
      title: item.title,
      era: item.era
    });
  };

  return (
    <div
      onClick={() => setSelectedItem(item)}
      className="group cursor-pointer bg-white rounded-2xl border border-stone-200/80 hover:border-stone-900/30 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-lg relative"
      id={`antique-card-${item.id}`}
    >
      <div>
        {/* Image Container with Badges */}
        <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
          <SafeImage
            src={images[0]}
            alt={`${item.title} (${item.era}) - Authentic antique in ${item.category}`}
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Top Right: Watchlist Heart & Inspection Zoom */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={handleOpenInspection}
              className="p-2 rounded-xl bg-black/45 hover:bg-black/75 text-stone-200 hover:text-white backdrop-blur-md transition-all shadow-xs cursor-pointer"
              title="Inspect Craftsmanship & Hallmarks (Zoom)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleSave}
              className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                isSaved
                  ? 'bg-red-600 text-white'
                  : 'bg-black/45 hover:bg-black/75 text-stone-200 hover:text-red-400'
              }`}
              title={isSaved ? 'Remove from Saved Watchlist' : 'Save to Watchlist'}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
          </div>

          {/* Bottom user badge on image */}
          {hasUserBid && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-xs ${
                isLeadingBidder 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-amber-600 text-white'
              }`}>
                {isLeadingBidder ? '★ High Bid' : 'Outbid'}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5">
          {/* Unboxed Metadata Kicker (Category · Era) */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 tracking-wider uppercase mb-1.5">
            <span>{item.category}</span>
            <span className="text-stone-300" aria-hidden="true">·</span>
            <span>{item.era}</span>
          </div>

          {/* Title */}
          <h3 className="font-serif-heading text-base font-semibold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-950 transition-colors mb-2">
            {item.title}
          </h3>

          {/* Provenance extract */}
          <p className="font-provenance text-xs text-stone-500 line-clamp-2 italic mb-3">
            "{item.provenance}"
          </p>

          {/* Seller attribution & Location */}
          <div className="space-y-1.5 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between text-xs text-stone-500 gap-2">
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  openRateSellerModal({
                    sellerId: item.sellerId,
                    sellerName: item.sellerName,
                    itemId: item.id,
                    itemTitle: item.title
                  });
                }}
                className="inline-flex items-center gap-1.5 font-medium text-stone-700 hover:text-stone-900 transition-colors cursor-pointer truncate max-w-[200px]"
                title={`Seller: ${item.sellerName} • Rating: ${(typeof item.sellerRating === 'number' ? item.sellerRating : 5.0).toFixed(1)} ★`}
              >
                <User className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate">{item.sellerName}</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 shrink-0">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>{(typeof item.sellerRating === 'number' ? item.sellerRating : 5.0).toFixed(1)}</span>
                </span>
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openRateSellerModal({
                    sellerId: item.sellerId,
                    sellerName: item.sellerName,
                    itemId: item.id,
                    itemTitle: item.title
                  });
                }}
                className="text-[10px] font-medium text-stone-400 hover:text-stone-700 underline cursor-pointer"
              >
                Rate
              </button>
            </div>

            {/* Location & Condition */}
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <div className="flex items-center gap-1 text-stone-500 truncate">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="truncate">{item.city || 'Colombo'}, {item.country || 'Sri Lanka'}</span>
              </div>
              <span className="text-stone-400 shrink-0">
                Cond: <strong className="text-stone-600 font-medium">{item.condition}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Pricing & CTA */}
      <div className="px-5 py-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-semibold text-stone-400 block tracking-wider">
            {bids.length > 0 ? 'Current Bid' : 'Starting Price'}
          </span>
          <span className="font-serif-heading text-lg font-bold text-stone-900 tabular-nums">
            {formatCurrency(item.currentBid)}
          </span>
          <span className="text-[10px] text-stone-400 block">
            {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedItem(item);
          }}
          className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors shadow-2xs cursor-pointer"
        >
          <span>{isOwner ? 'Manage' : 'Place Bid'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

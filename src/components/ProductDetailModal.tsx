import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CurrencySelector } from './CurrencySelector';
import { SafeImage } from './SafeImage';
import { formatTimestamp } from '../lib/date';
import { 
  X, 
  ShieldCheck, 
  Gavel, 
  MessageSquare, 
  Check, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Edit,
  Trash2,
  XCircle,
  Heart,
  ZoomIn,
  MapPin,
  Star
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedItem,
    setSelectedItem,
    currentUser,
    placeBid,
    updateBid,
    selectWinningBuyer,
    setIsAuthModalOpen,
    setActiveNavTab,
    setEditingItem,
    setIsEditListingOpen,
    approveListing,
    deleteListing,
    startAdminDirectChat,
    markDealAsOff,
    toggleWatchlist,
    isWatchlisted,
    setInspectionData,
    formatCurrency,
    selectedCurrency,
    openRateSellerModal,
    getSellerRatings
  } = useApp();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [customBidAmount, setCustomBidAmount] = useState<number>(0);
  const [isEditingMyBid, setIsEditingMyBid] = useState(false);
  const [editBidAmount, setEditBidAmount] = useState<number>(0);
  const [tableEditingBidId, setTableEditingBidId] = useState<string | null>(null);
  const [tableEditPrice, setTableEditPrice] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDealOff, setConfirmDealOff] = useState(false);

  if (!selectedItem) return null;

  const bids = Array.isArray(selectedItem.bids) ? selectedItem.bids : [];
  const images = Array.isArray(selectedItem.images) && selectedItem.images.length > 0
    ? selectedItem.images
    : ['/images/antique-fallback.webp'];

  const isSellerOwner = currentUser?.id === selectedItem.sellerId;
  const myExistingBid = bids.find(b => b.isMyBid || (currentUser && b.bidderId === currentUser.id));
  const minNextBid = bids.length > 0
    ? selectedItem.currentBid + 1
    : Math.max(1, selectedItem.startingBid || 300);

  const handlePlaceBid = async (amount: number) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setFeedback(null);
    const result = await placeBid(selectedItem.id, amount);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setCustomBidAmount(0);
      setIsEditingMyBid(false);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleUpdateBid = async (bidId: string, amount: number) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setFeedback(null);
    const result = await updateBid(selectedItem.id, bidId, amount);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setIsEditingMyBid(false);
      setTableEditingBidId(null);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleSelectBuyer = async (bidId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const res = await selectWinningBuyer(selectedItem.id, bidId);
    if (res.success) {
      setSelectedItem(null); // Close modal, chat is opened
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-stone-950/80 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-stone-900 dark:text-stone-100"
        id="product-detail-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-stone-700 dark:text-stone-200 bg-stone-200/70 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
              {selectedItem.category}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">Lot #{selectedItem.id.replace('item_', '')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWatchlist(selectedItem.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isWatchlisted(selectedItem.id)
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
              title={isWatchlisted(selectedItem.id) ? 'Remove from Saved Watchlist' : 'Save to Watchlist'}
            >
              <Heart className={`w-3.5 h-3.5 ${isWatchlisted(selectedItem.id) ? 'fill-red-600 text-red-600' : 'text-stone-500 dark:text-stone-400'}`} />
              <span>{isWatchlisted(selectedItem.id) ? 'Saved' : 'Save Lot'}</span>
            </button>

            <CurrencySelector variant="compact" />

            <button
              onClick={() => setSelectedItem(null)}
              className="p-1 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 dark:bg-stone-900">
          {/* Admin Authority Banner if current user is admin */}
          {currentUser?.isAdmin && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-stone-200">
                  Master Admin Privileges: You can edit or delete this seller's listing.
                </span>
                {selectedItem.status === 'pending_approval' && (
                  <span className="bg-amber-500 text-stone-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Awaiting Your Approval
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedItem.status === 'pending_approval' && (
                  <button
                    onClick={async () => {
                      const res = await approveListing(selectedItem.id);
                      setFeedback({ type: res.success ? 'success' : 'error', message: res.message });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Lot</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setEditingItem(selectedItem);
                    setIsEditListingOpen(true);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit className="w-3 h-3 text-amber-300" />
                  <span>Edit Listing</span>
                </button>

                {confirmDelete ? (
                  <div className="flex items-center gap-1 bg-rose-900/90 border border-rose-400 px-2 py-0.5 rounded-xl">
                    <span className="text-[11px] text-rose-200">Confirm delete?</span>
                    <button
                      onClick={async () => {
                        await deleteListing(selectedItem.id);
                        setSelectedItem(null);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-stone-300 text-[11px] hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="bg-rose-800/60 hover:bg-rose-800 text-rose-200 font-semibold text-xs px-3 py-1.5 rounded-xl border border-rose-600/40 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-rose-300" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Gallery & Provenance Badges */}
            <div className="space-y-3">
              <div 
                className="relative aspect-4/3 w-full bg-stone-100 dark:bg-stone-800 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-700 group cursor-zoom-in shadow-2xs"
                onClick={() => setInspectionData({
                  images,
                  initialIndex: activeImageIdx,
                  title: selectedItem.title,
                  era: selectedItem.era
                })}
              >
                <SafeImage
                  priority
                  src={images[activeImageIdx] || images[0]}
                  alt={`${selectedItem.title} (${selectedItem.era}) - Curated Lot in ${selectedItem.category}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute bottom-2.5 left-2.5 bg-stone-900/85 text-stone-100 text-[11px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {selectedItem.era}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectionData({
                      images,
                      initialIndex: activeImageIdx,
                      title: selectedItem.title,
                      era: selectedItem.era
                    });
                  }}
                  className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black/90 text-stone-200 hover:text-white px-3 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect Hallmarks</span>
                </button>
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIdx === i ? 'border-stone-900 dark:border-amber-400 shadow-2xs' : 'border-stone-200 dark:border-stone-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <SafeImage src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Seller Provenance Card */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950/70 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-2.5 text-xs text-stone-700 dark:text-stone-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Cataloged by {selectedItem.sellerName}</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold">
                    Listing Fee Paid ✓
                  </span>
                </div>

                {/* Seller Rating Badge & Action */}
                <div className="flex items-center justify-between bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-3 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={`w-3.5 h-3.5 ${
                            s <= Math.round(selectedItem.sellerRating || 5) 
                              ? 'fill-amber-400 text-amber-400' 
                              : 'text-stone-300 dark:text-stone-600'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                      {(selectedItem.sellerRating || 5.0).toFixed(1)} / 5.0
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      ({selectedItem.sellerReviewCount || getSellerRatings(selectedItem.sellerId).length || 1} verified review{(selectedItem.sellerReviewCount || getSellerRatings(selectedItem.sellerId).length) === 1 ? '' : 's'})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      openRateSellerModal({
                        sellerId: selectedItem.sellerId,
                        sellerName: selectedItem.sellerName,
                        itemId: selectedItem.id,
                        itemTitle: selectedItem.title
                      });
                    }}
                    className="inline-flex items-center gap-1 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                    title={`Rate verified seller ${selectedItem.sellerName}`}
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 dark:fill-stone-950 dark:text-stone-950" />
                    <span>Rate Seller</span>
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Seller is registered with verified national credentials. Contact details remain securely protected in-app.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-300 pt-1.5 border-t border-stone-200 dark:border-stone-800">
                  <MapPin className="w-3.5 h-3.5 text-stone-700 dark:text-amber-400 shrink-0" />
                  <span>Item Place: <strong className="text-stone-800 dark:text-stone-100">{selectedItem.city || 'Colombo'}, {selectedItem.country || 'Sri Lanka'}</strong></span>
                </div>

                {currentUser?.isAdmin && currentUser.id !== selectedItem.sellerId && (
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await startAdminDirectChat(selectedItem.id);
                        if (res.success) {
                          setSelectedItem(null);
                        }
                      }}
                      className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white dark:text-stone-100 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs border border-transparent dark:border-stone-700 cursor-pointer"
                      title="Curator Admin Authority: Direct Message Seller regarding this listing"
                      id="btn-admin-direct-message-seller"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Direct Message Seller (Admin Only)</span>
                    </button>
                    <span className="text-[10px] text-stone-400 block text-center mt-1">
                      Curatorial privilege: Directly message seller regarding lot condition & verification
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Lot Description & Bidding Controls */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
                  {selectedItem.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-stone-900 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-stone-600 dark:text-amber-400" />
                    <span>{selectedItem.city || 'Colombo'}, {selectedItem.country || 'Sri Lanka'}</span>
                  </span>
                  <span>•</span>
                  <span>Condition: <strong className="text-stone-800 dark:text-stone-200">{selectedItem.condition}</strong></span>
                  <span>•</span>
                  <span>Dimensions: {selectedItem.dimensions}</span>
                </div>
              </div>

              {/* Historical Provenance Quote */}
              <div className="bg-stone-50 dark:bg-stone-950/70 p-4 rounded-xl border-l-4 border-amber-500 border-y border-r border-stone-200/80 dark:border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-amber-400/90 block mb-1">
                  Historical Provenance & Archive Notes
                </span>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed italic">
                  "{selectedItem.provenance}"
                </p>
              </div>

              {/* Valuation & Current Bid Status */}
              <div className="space-y-2">
                {selectedItem.estimatedValueRange ? (
                  <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                    <span>Estimated Collector Value:</span>
                    <span className="font-bold text-stone-900 dark:text-amber-300">{selectedItem.estimatedValueRange}</span>
                  </div>
                ) : null}

                {/* Current High Bid Hero */}
                <div className="bg-stone-50 dark:bg-stone-950/70 p-4.5 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400">
                        Current Highest Bid
                      </span>
                      <p className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                        {formatCurrency(selectedItem.currentBid)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-stone-500 dark:text-stone-400 block">
                        {bids.length} {bids.length === 1 ? 'Offer' : 'Offers'} Logged
                      </span>
                      {selectedItem.reservePrice && selectedItem.reservePrice > 0 ? (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {selectedItem.currentBid >= selectedItem.reservePrice ? 'Reserve Price Met' : 'Reserve Price Pending'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          Open Bidding
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* BUYER ACTION PANEL */}
              {!isSellerOwner && selectedItem.status === 'active' && (
                <div className="bg-stone-50 dark:bg-stone-950/70 p-4.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-3">
                  {/* If buyer already placed a bid: enforce single bid rule & provide Edit Bid Option */}
                  {myExistingBid ? (
                    <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-4 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-stone-900 dark:text-stone-100 font-bold">
                          <Gavel className="w-3.5 h-3.5 text-stone-800 dark:text-amber-400" />
                          <span>Your Active Bid on This Lot:</span>
                        </div>
                        <span className="font-black text-base text-stone-950 dark:text-amber-300">
                          {formatCurrency(myExistingBid.amount)}
                        </span>
                      </div>

                      {!isEditingMyBid ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-200/80 dark:border-stone-800">
                          <div>
                            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 block">
                              Need to adjust or raise your offer?
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                              1 bid per collector limit. Use edit to update your bid price.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingMyBid(true);
                              setEditBidAmount(myExistingBid.amount);
                            }}
                            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs cursor-pointer"
                            id="btn-edit-active-bid"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Bid Price</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2 border-t border-stone-200/80 dark:border-stone-800">
                          <label htmlFor="detail-edit-bid-amount" className="block text-[11px] font-bold text-stone-700 dark:text-stone-300">
                            Enter Revised Bid Price (Min Floor {formatCurrency(Math.max(1, selectedItem.startingBid || 300))}) [Base Rs.]:
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-2 text-xs text-stone-500 dark:text-stone-400 font-bold">Rs.</span>
                              <input
                                id="detail-edit-bid-amount"
                                name="editBidAmount"
                                type="number"
                                min={Math.max(1, selectedItem.startingBid || 300)}
                                step={1}
                                value={editBidAmount || ''}
                                onChange={(e) => setEditBidAmount(Number(e.target.value))}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400"
                                placeholder="Enter revised amount"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateBid(myExistingBid.id, editBidAmount)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                              id="btn-save-bid-change"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Price</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingMyBid(false)}
                              className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          {editBidAmount > 0 && selectedCurrency !== 'LKR' && (
                            <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                              Converted: {formatCurrency(editBidAmount)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Single Bid Policy Active: You already have an active offer on this lot. Each buyer is limited to one bid; please use Edit Bid Price to revise your offer.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">Place Your Verified Bid</span>
                        <span className="text-stone-500 dark:text-stone-400">Min: {formatCurrency(minNextBid)}</span>
                      </div>

                      {/* Quick Bid Increment Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[100, 500, 1000].map((inc) => {
                          const quickAmount = selectedItem.currentBid + inc;
                          return (
                            <button
                              key={inc}
                              onClick={() => handlePlaceBid(quickAmount)}
                              className="py-1.5 px-2 bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs transition-colors cursor-pointer"
                            >
                              +{formatCurrency(inc)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Bid Input (Allows any minimum amount) */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-2 text-xs text-stone-500 dark:text-stone-400 font-bold">Rs.</span>
                          <input
                            id="detail-custom-bid-amount"
                            name="customBidAmount"
                            aria-label="Custom bid amount"
                            type="number"
                            min={minNextBid}
                            step={1}
                            placeholder={`Enter amount in Rs. (min ${minNextBid.toLocaleString()})`}
                            value={customBidAmount || ''}
                            onChange={(e) => setCustomBidAmount(Number(e.target.value))}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400"
                          />
                        </div>
                        <button
                          onClick={() => handlePlaceBid(customBidAmount || minNextBid)}
                          className="bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 text-xs font-bold px-4 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>Submit Bid</span>
                        </button>
                      </div>

                      {customBidAmount > 0 && selectedCurrency !== 'LKR' && (
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                          Display equivalent: {formatCurrency(customBidAmount)}
                        </div>
                      )}

                      <p className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Each collector can place 1 bid per lot. You can revise your price anytime via the Edit option once placed.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* IF DEAL CALLED OFF */}
              {selectedItem.status === 'deal_cancelled' && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-bold text-sm text-red-950 dark:text-red-200">
                      Deal Called Off by Seller — Archived Lot
                    </span>
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-300">
                    This deal was called off by the seller. The lot is closed from active marketplace bidding and archived in the Previous Exchanges registry at the bottom of the page.
                  </p>
                </div>
              )}

              {/* IF DEAL PENDING */}
              {selectedItem.status === 'deal_pending' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-sm text-amber-950 dark:text-amber-200">
                      Seller Has Selected a Winning Bid!
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-300">
                    A deal is in active negotiation with <strong>{selectedItem.chosenBuyerName}</strong> for {formatCurrency(selectedItem.chosenDealAmount || 0)}.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        setActiveNavTab('chats');
                      }}
                      className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      Go to Deal Chats
                    </button>

                    {isSellerOwner && (
                      <div>
                        {!confirmDealOff ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDealOff(true)}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            id="btn-modal-deal-off"
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span>Mark Deal as Off</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700 px-2 py-0.5 rounded-xl">
                            <span className="text-xs font-bold text-red-900 dark:text-red-200">Confirm call off?</span>
                            <button
                              type="button"
                              onClick={() => {
                                markDealAsOff(selectedItem.id);
                                setConfirmDealOff(false);
                              }}
                              className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-2 py-0.5 rounded-lg"
                            >
                              Yes, Call Off
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDealOff(false)}
                              className="bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold px-2 py-0.5 rounded-lg border border-stone-300 dark:border-stone-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LOWER SECTION: BIDS LOG TABLE */}
          <div className="border-t border-stone-200/80 dark:border-stone-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Verified Bid History & Collector Submissions
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {isSellerOwner
                    ? 'As the seller, you can review each collector\'s offer and choose a buyer to open direct private chat.'
                    : 'Transparent bids submitted by verified antique collectors.'}
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg text-stone-700 dark:text-stone-300">
                {bids.length} Total Offers
              </span>
            </div>

            {bids.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
                No bids recorded on this lot yet. Be the first verified bidder at {formatCurrency(selectedItem.startingBid)}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-stone-200/80 dark:border-stone-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-300 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200/80 dark:border-stone-800">
                    <tr>
                      <th className="py-2.5 px-3">Collector</th>
                      <th className="py-2.5 px-3">Verification Hash</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3 text-right">Offer Amount</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {bids.map((bid, index) => {
                      const isWinningSelection = selectedItem.acceptedBidId === bid.id;
                      const isMyBid = Boolean(bid.isMyBid || (currentUser && bid.bidderId === currentUser.id));
                      const isRowEditing = tableEditingBidId === bid.id;

                      return (
                        <tr 
                          key={bid.id} 
                          className={`hover:bg-stone-50/80 dark:hover:bg-stone-850/60 transition-colors ${
                            isWinningSelection 
                              ? 'bg-amber-50/70 dark:bg-amber-950/40 font-medium' 
                              : isMyBid 
                                ? 'bg-stone-50/50 dark:bg-stone-800/40' 
                                : ''
                          }`}
                        >
                          {/* Bidder name & avatar */}
                          <td className="py-3 px-3 flex items-center gap-2.5">
                            {bid.bidderAvatar ? (
                              <SafeImage
                                src={bid.bidderAvatar}
                                alt={bid.bidderName}
                                className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {(bid.bidderName || 'C').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-stone-900 dark:text-stone-100 block">
                                  {bid.bidderName}
                                </span>
                                {isMyBid && (
                                  <span className="text-[9px] bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 px-1.5 py-0.2 rounded-full font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              {index === 0 && (
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                  Highest Bidder
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Verification */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Verified Buyer</span>
                              <span className="text-stone-400 dark:text-stone-500">({bid.bidderRating}★)</span>
                            </div>
                            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                              Phone: Masked for Privacy
                            </span>
                          </td>

                          {/* Time */}
                          <td className="py-3 px-3 text-stone-500 dark:text-stone-400">
                            {formatTimestamp(bid.timestamp)}
                          </td>

                          {/* Bid Amount */}
                          <td className="py-3 px-3 text-right">
                            {isRowEditing ? (
                              <div className="inline-flex items-center gap-1 justify-end">
                                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Rs.</span>
                                <input
                                  id={`detail-table-edit-bid-${bid.id}`}
                                  name={`tableEditBid-${bid.id}`}
                                  aria-label="Revised bid amount"
                                  type="number"
                                  min={Math.max(1, selectedItem.startingBid || 300)}
                                  step={1}
                                  value={tableEditPrice || ''}
                                  onChange={(e) => setTableEditPrice(Number(e.target.value))}
                                  className="w-24 px-2 py-0.5 text-xs bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-500 dark:focus:border-amber-400"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                {formatCurrency(bid.amount)}
                              </span>
                            )}
                          </td>

                          {/* Actions column */}
                          <td className="py-3 px-3 text-right">
                            {isRowEditing ? (
                              <div className="inline-flex items-center gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBid(bid.id, tableEditPrice)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
                                  title="Save revised bid"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTableEditingBidId(null)}
                                  className="p-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-lg cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isSellerOwner ? (
                              isWinningSelection ? (
                                <div className="inline-flex items-center gap-1 text-xs text-amber-900 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/70 px-2 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                                  <Check className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                  <span>Chosen Buyer</span>
                                </div>
                              ) : selectedItem.status === 'active' ? (
                                <button
                                  onClick={() => handleSelectBuyer(bid.id)}
                                  className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-xs transition-colors cursor-pointer"
                                  id={`select-buyer-${bid.id}`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Choose & Open Chat</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-stone-400 italic">
                                  Closed
                                </span>
                              )
                            ) : isMyBid && selectedItem.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTableEditingBidId(bid.id);
                                  setTableEditPrice(bid.amount);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white dark:text-stone-200 text-[11px] font-semibold rounded-xl transition-colors shadow-xs border border-transparent dark:border-stone-700 cursor-pointer"
                                id={`edit-table-bid-${bid.id}`}
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit Price</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-stone-400">
                                Verified
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span>Antiauc Escrow & Masked Direct Chat Protection Active</span>
          </div>

          <button
            onClick={() => setSelectedItem(null)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

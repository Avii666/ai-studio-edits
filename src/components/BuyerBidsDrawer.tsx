import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Gavel, MessageSquare, AlertCircle, CheckCircle2, Edit, Check } from 'lucide-react';
import { SafeImage } from './SafeImage';

export const BuyerBidsDrawer: React.FC = () => {
  const { currentUser, items, setSelectedItem, setActiveNavTab, setActiveChatId, chats, setIsAuthModalOpen, updateBid, formatCurrency, selectedCurrency } = useApp();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ itemId: string; message: string; isError?: boolean } | null>(null);

  if (!currentUser) {
    return (
      <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 my-8 shadow-xs">
        <ShoppingBag className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="font-serif-heading text-lg font-bold text-stone-900">
          Collector Account Required
        </h2>
        <p className="text-xs text-stone-500">
          Sign up or log in to track your live bids, winning auction lots, and deal rooms.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-6 rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  // Find all items where currentUser placed at least one bid
  const myBiddedItems = items.filter(item =>
    Array.isArray(item.bids) && item.bids.some(b => b.isMyBid || b.bidderId === currentUser.id)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="buyer-bids-view">
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-heading text-xl font-bold text-stone-900">
              My Active Bids & Acquisitions
            </h1>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
              Verified Buyer
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Logged collector: <strong className="text-stone-800">{currentUser.name}</strong> · ID: <span className="font-mono">{currentUser.verificationIdNumber || 'Verified'}</span>
          </p>
        </div>

        <button
          onClick={() => setActiveNavTab('browse')}
          className="self-start sm:self-auto px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Gavel className="w-3.5 h-3.5 text-amber-300" />
          <span>Explore More Auctions</span>
        </button>
      </div>

      {myBiddedItems.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-12 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-serif-heading text-base font-semibold text-stone-900">
            No Active Bids Placed Yet
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Browse our curated antique collection and place your bid. Buyer registration is completely free for verified collectors.
          </p>
          <button
            onClick={() => setActiveNavTab('browse')}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Browse Antique Lots
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myBiddedItems.map(item => {
            const bids = Array.isArray(item.bids) ? item.bids : [];
            const myLatestBid = bids.find(b => b.isMyBid || b.bidderId === currentUser.id);
            const isHighest = bids.length > 0 && (bids[0].isMyBid || bids[0].bidderId === currentUser.id);
            const isChosenWinner = item.status === 'deal_pending' && item.chosenBuyerId === currentUser.id;
            const thumb = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '/images/antique-fallback.webp';

            return (
              <div 
                key={item.id}
                className="bg-white border border-stone-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <SafeImage
                    src={thumb}
                    alt={item.title}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                      <span className="text-xs text-stone-400">Seller: <strong className="text-stone-700 font-medium">{item.sellerName}</strong></span>
                    </div>

                    <h3 className="font-serif-heading text-base font-semibold text-stone-900 mt-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-400">
                      {item.era} · Condition: <strong className="text-stone-600">{item.condition}</strong>
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span>Your Offer: <strong className="font-serif-heading text-amber-800 font-bold tabular-nums">{formatCurrency(myLatestBid?.amount || 0)}</strong></span>
                      <span className="text-stone-300">·</span>
                      <span>Current Leading Bid: <strong className="font-serif-heading text-stone-900 font-bold tabular-nums">{formatCurrency(item.currentBid)}</strong></span>

                      {myLatestBid && item.status === 'active' && editingItemId !== item.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditAmount(myLatestBid.amount);
                            setFeedback(null);
                          }}
                          className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-950 font-semibold text-xs underline cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit Bid Price</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Edit Box */}
                    {editingItemId === item.id && myLatestBid && (
                      <div className="mt-3 p-3 bg-stone-50 border border-stone-200/80 rounded-xl space-y-2">
                        <label htmlFor={`buyer-edit-bid-${item.id}`} className="text-xs font-semibold text-stone-800 block">
                          Change Bid Price (Minimum: {formatCurrency(Math.max(300, item.startingBid || 300))}) [Base Rs.]:
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative max-w-xs flex-1">
                            <span className="absolute left-3 top-2 text-xs text-stone-400 font-bold">Rs.</span>
                            <input
                              id={`buyer-edit-bid-${item.id}`}
                              name={`editBid-${item.id}`}
                              type="number"
                              min={Math.max(300, item.startingBid || 300)}
                              step={100}
                              value={editAmount || ''}
                              onChange={(e) => setEditAmount(Number(e.target.value))}
                              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg font-semibold focus:outline-none focus:border-stone-900"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await updateBid(item.id, myLatestBid.id, editAmount);
                              if (res.success) {
                                setEditingItemId(null);
                                setFeedback({ itemId: item.id, message: res.message });
                              } else {
                                setFeedback({ itemId: item.id, message: res.message, isError: true });
                              }
                            }}
                            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Save Price</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(null);
                              setFeedback(null);
                            }}
                            className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        {editAmount > 0 && selectedCurrency !== 'LKR' && (
                          <div className="text-[11px] text-stone-600 font-mono">
                            Converted: {formatCurrency(editAmount)}
                          </div>
                        )}
                      </div>
                    )}

                    {feedback && feedback.itemId === item.id && (
                      <p className={`text-xs mt-1.5 font-medium ${feedback.isError ? 'text-red-700' : 'text-emerald-700'}`}>
                        {feedback.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 self-stretch sm:self-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {isChosenWinner ? (
                    <div className="text-left sm:text-right">
                      <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Seller Selected Your Bid!</span>
                      </span>
                      <button
                        onClick={() => {
                          const chat = chats.find(c => !c.isAdminDirectChat && c.itemId === item.id && c.buyerId === currentUser.id);
                          if (chat) {
                            setActiveChatId(chat.id);
                            setActiveNavTab('chats');
                          }
                        }}
                        className="mt-2 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                        <span>Open Deal Chat Room</span>
                      </button>
                    </div>
                  ) : isHighest ? (
                    <div className="text-left sm:text-right">
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        ★ You are currently the highest bidder
                      </span>
                      <p className="text-[11px] text-stone-400 mt-1">Waiting for seller review</p>
                    </div>
                  ) : (
                    <div className="text-left sm:text-right">
                      <span className="bg-stone-100 text-stone-700 border border-stone-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Outbid by another collector</span>
                      </span>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="mt-1.5 text-xs text-stone-800 font-semibold hover:underline"
                      >
                        Increase Bid →
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedItem(item)}
                    className="text-xs text-stone-500 hover:text-stone-900 underline mt-1 cursor-pointer"
                  >
                    View Full Lot
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

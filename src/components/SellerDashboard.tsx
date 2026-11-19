import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Store, 
  Plus, 
  ShieldCheck, 
  MessageSquare, 
  CheckCircle2, 
  ChevronRight, 
  ExternalLink,
  Users,
  Coins,
  MapPin,
  Archive,
  XCircle,
  Lock,
  User
} from 'lucide-react';
import { SafeImage } from './SafeImage';
import { formatTimestamp } from '../lib/date';

const parseItemListingFee = (txId?: string | null, fallbackFee: number = 500): number => {
  if (!txId) return fallbackFee;
  const match = txId.match(/-RS(\d+)/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fallbackFee;
};

export const SellerDashboard: React.FC = () => {
  const {
    currentUser,
    items,
    setIsCreateListingOpen,
    setSelectedItem,
    selectWinningBuyer,
    setActiveNavTab,
    chats,
    setActiveChatId,
    sellerListingFee,
    setIsAuthModalOpen,
    formatCurrency
  } = useApp();

  if (!currentUser) {
    return (
      <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 my-8 shadow-xs">
        <Store className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="font-serif-heading text-lg font-bold text-stone-900">
          Seller Account Required
        </h2>
        <p className="text-xs text-stone-500">
          Please log in or register to access the seller dashboard and catalog your antiques.
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

  const sellerItems = items.filter(i => i.sellerId === currentUser.id);

  // Separate Active/In-Progress Lots from Concluded Deals
  const activeSellerItems = sellerItems.filter(
    i => i.status !== 'sold' && i.status !== 'closed' && i.status !== 'deal_cancelled'
  );
  const concludedSellerItems = sellerItems.filter(
    i => i.status === 'sold' || i.status === 'closed' || i.status === 'deal_cancelled'
  );

  const totalBidsReceived = sellerItems.reduce((acc, item) => acc + (Array.isArray(item.bids) ? item.bids.length : 0), 0);
  const sealedDealsCount = concludedSellerItems.filter(i => i.status === 'sold').length;
  const totalRealizedSales = concludedSellerItems
    .filter(i => i.status === 'sold')
    .reduce((acc, item) => acc + (item.chosenDealAmount || item.currentBid || 0), 0);

  const activeNegotiations = chats.filter(c => {
    if (c.sellerId !== currentUser.id) return false;
    if (c.isAdminDirectChat && !(c.messages || []).some(m => !m.isSystemNotice)) return false;
    if (c.dealStatus === 'deal_sealed' || c.dealStatus === 'deal_off') return false;
    const item = items.find(i => i.id === c.itemId);
    if (item && item.status === 'sold') return false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="seller-dashboard">
      {/* Seller Header & Metrics */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
          <div className="flex items-center gap-3.5">
            {currentUser.avatar ? (
              <SafeImage
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-stone-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-base border-2 border-stone-800">
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-6 h-6 text-amber-200" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-heading text-xl font-bold text-stone-900">
                  {currentUser.name}
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Verified Antique Dealer
                </span>
                {currentUser.isAdmin && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Admin Privileges
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-provenance mt-0.5">
                Location: {currentUser.location} • ID Bound: <span className="font-mono">{currentUser.verificationIdNumber || 'Protected'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.isAdmin && (
              <button
                onClick={() => setActiveNavTab('admin')}
                className="bg-stone-900 text-stone-100 hover:bg-stone-800 text-xs font-medium py-2.5 px-4 rounded-xl border border-stone-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>Adjust Listing Fee</span>
              </button>
            )}

            <button
              onClick={() => setIsCreateListingOpen(true)}
              className="self-start md:self-auto bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              id="seller-add-antique-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Antique ({formatCurrency(sellerListingFee)} Fee)</span>
            </button>
          </div>
        </div>

        {/* 4 Key Business Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
              Active Lots In Market
            </span>
            <span className="font-serif-heading text-xl font-extrabold text-stone-900 mt-1 block">
              {activeSellerItems.length}
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">
              {sellerItems.length} total cataloged
            </span>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
              Total Buyer Bids Logged
            </span>
            <span className="font-serif-heading text-xl font-extrabold text-stone-900 mt-1 block">
              {totalBidsReceived}
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">
              Across all listings
            </span>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Deals Sealed & Concluded
            </span>
            <span className="font-serif-heading text-xl font-extrabold text-emerald-900 mt-1 block">
              {sealedDealsCount} Sold
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
              {formatCurrency(totalRealizedSales)} gross
            </span>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
              Private Deal Chats
            </span>
            <span className="font-serif-heading text-xl font-extrabold text-stone-900 mt-1 block">
              {activeNegotiations.length} Active
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">
              In negotiation room
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Lots & Live Buyer Bids */}
      <div className="space-y-4" id="seller-active-lots-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-heading text-lg font-bold text-stone-900">
                Active Lots & Live Buyer Bids
              </h2>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-md">
                {activeSellerItems.length} In Progress
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Inspect incoming bids from collectors, choose a winning buyer, and enter secure private negotiations.
            </p>
          </div>

          <button
            onClick={() => setIsCreateListingOpen(true)}
            className="self-start sm:self-auto bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span>Post New Lot</span>
          </button>
        </div>

        {activeSellerItems.length === 0 ? (
          <div className="bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
            <Store className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="font-serif-heading text-base font-bold text-stone-900">
              No Active Lots Currently Open
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              {sellerItems.length > 0 
                ? 'All your published lots have either concluded bidding or been sealed into completed deals. Check the Concluded Deals section below or publish a new lot.'
                : `Post your authenticated antique lots for a standard listing charge of ${formatCurrency(sellerListingFee)}. Verified buyers will submit bids here.`
              }
            </p>
            <button
              onClick={() => setIsCreateListingOpen(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Publish New Lot ({formatCurrency(sellerListingFee)})</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSellerItems.map((item) => {
              const bids = Array.isArray(item.bids) ? item.bids : [];
              const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : ['/images/antique-fallback.webp'];
              const hasAcceptedBuyer = item.status === 'deal_pending' && item.chosenBuyerId;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs hover:border-stone-300 transition-all"
                >
                  {/* Top Item Summary Strip */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-50/70 border-b border-stone-200/80">
                    <div className="flex items-center gap-3.5">
                      <SafeImage
                        src={images[0]}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            Fee Paid: {formatCurrency(parseItemListingFee(item.listingFeeTxId, sellerListingFee))} ({item.listingFeeTxId})
                          </span>
                        </div>
                        <h3 className="font-serif-heading text-base font-bold text-stone-900 mt-1">
                          {item.title}
                        </h3>
                        {item.status === 'pending_approval' && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5">
                            Listing has been submitted and is currently <strong>Waiting for Admin's Approval</strong> before going live to buyers. Fee has been processed.
                          </p>
                        )}
                        {item.status === 'rejected' && (
                          <p className="text-[11px] text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1.5">
                            <strong>Curator Note:</strong> {item.rejectionReason || 'Documentation does not meet standards.'}
                          </p>
                        )}
                        <p className="text-xs text-stone-500 flex items-center gap-1.5 flex-wrap mt-1">
                          <span>{item.era} • Condition: <strong className="text-stone-700">{item.condition}</strong></span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-stone-700 font-medium">
                            <MapPin className="w-3 h-3 text-stone-500" />
                            {item.city || 'Colombo'}, {item.country || 'Sri Lanka'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 uppercase font-bold block">
                          Current High Bid
                        </span>
                        <span className="font-serif-heading text-lg font-black text-stone-900">
                          {formatCurrency(item.currentBid)}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          {bids.length} Offers
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-900 text-xs font-semibold rounded-xl border border-stone-200/80 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Full Lot Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Bids List For This Item */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-700" />
                        <span>All Incoming Buyer Bids for this Lot ({bids.length})</span>
                      </span>

                      {hasAcceptedBuyer && (
                        <span className="text-xs text-amber-900 bg-amber-50 border border-amber-200 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Deal Pending with {item.chosenBuyerName} ({formatCurrency(item.chosenDealAmount || 0)})</span>
                        </span>
                      )}
                    </div>

                    {bids.length === 0 ? (
                      <p className="text-xs text-stone-500 italic py-2">
                        No buyer bids placed yet. Active on marketplace starting at {formatCurrency(item.startingBid)}.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-stone-200/80">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 text-stone-600 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-200/80">
                            <tr>
                              <th className="py-2.5 px-3">Buyer Handle</th>
                              <th className="py-2.5 px-3">Trust Verification</th>
                              <th className="py-2.5 px-3">Timestamp</th>
                              <th className="py-2.5 px-3 text-right">Offer Amount</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {bids.map((bid) => {
                              const isChosen = item.acceptedBidId === bid.id;
                              return (
                                <tr 
                                  key={bid.id} 
                                  className={`hover:bg-stone-50/70 ${isChosen ? 'bg-amber-50/70 font-medium' : ''}`}
                                >
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      {bid.bidderAvatar ? (
                                        <SafeImage
                                          src={bid.bidderAvatar}
                                          alt={bid.bidderName}
                                          className="w-5 h-5 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                          {(bid.bidderName || 'C').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className="font-semibold text-stone-900">
                                        {bid.bidderName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      Verified Collector
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-500">
                                    {formatTimestamp(bid.timestamp)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className="font-serif-heading font-bold text-sm text-stone-900">
                                      {formatCurrency(bid.amount)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {isChosen ? (
                                      <button
                                        onClick={() => {
                                          setActiveNavTab('chats');
                                        }}
                                        className="bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto cursor-pointer"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        <span>Open Chat</span>
                                      </button>
                                    ) : item.status === 'active' ? (
                                      <button
                                        onClick={() => selectWinningBuyer(item.id, bid.id)}
                                        className="bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto cursor-pointer shadow-2xs"
                                        title="Select this buyer's offer and open private chat"
                                      >
                                        <MessageSquare className="w-3 h-3 text-amber-300" />
                                        <span>Select & Open Chat</span>
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-stone-400 italic">
                                        Lot Closed
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
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Concluded Deals & Sales History */}
      <div className="space-y-4 pt-6 border-t border-stone-200/80" id="seller-concluded-deals-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-emerald-800" />
              <h2 className="font-serif-heading text-lg font-bold text-stone-900">
                Concluded Deals & Sales History
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Completed transactions where a deal was sealed with a buyer or negotiation was officially concluded.
            </p>
          </div>

          {sealedDealsCount > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
              <span className="text-emerald-800">Total Realized Revenue:</span>
              <strong className="font-serif-heading font-extrabold text-sm text-emerald-950">
                {formatCurrency(totalRealizedSales)}
              </strong>
            </div>
          )}
        </div>

        {concludedSellerItems.length === 0 ? (
          <div className="bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-2 shadow-2xs">
            <Archive className="w-9 h-9 text-stone-400 mx-auto" />
            <h3 className="font-serif-heading text-sm font-bold text-stone-900">
              No Concluded Deals Yet
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              When a private negotiation in the deal room is sealed as completed, the lot moves here automatically with its finalized sale price, winning buyer record, and chat transcript.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {concludedSellerItems.map((item) => {
              const bids = Array.isArray(item.bids) ? item.bids : [];
              const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : ['/images/antique-fallback.webp'];
              const chatSession = chats.find(c => !c.isAdminDirectChat && c.itemId === item.id);
              const isSold = item.status === 'sold';
              const isDealCancelled = item.status === 'deal_cancelled';
              const finalPrice = item.chosenDealAmount || item.currentBid;
              const winningBidder = item.chosenBuyerName || (bids.length > 0 ? bids[0].bidderName : 'Authenticated Collector');

              return (
                <div
                  key={item.id}
                  className="bg-white border border-emerald-200/80 rounded-2xl overflow-hidden shadow-2xs"
                >
                  {/* Top Item Summary Strip */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-50/30 border-b border-emerald-100">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <SafeImage
                          src={images[0]}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover border border-emerald-200"
                        />
                        <div className="absolute -top-1.5 -left-1.5 bg-emerald-600 text-white p-0.5 rounded-full border-2 border-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>

                          {isSold ? (
                            <span className="text-[10px] uppercase font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Deal Sealed & Sold
                            </span>
                          ) : isDealCancelled ? (
                            <span className="text-[10px] uppercase font-bold text-stone-700 bg-stone-200 border border-stone-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-stone-600" />
                              Deal Called Off
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-stone-700 bg-stone-200 border border-stone-300 px-2 py-0.5 rounded-md">
                              Lot Concluded
                            </span>
                          )}

                          <span className="text-[10px] text-stone-500 font-mono">
                            Listing Tx: {item.listingFeeTxId}
                          </span>
                        </div>

                        <h3 className="font-serif-heading text-base font-bold text-stone-900 mt-1">
                          {item.title}
                        </h3>

                        <p className="text-xs text-stone-500 flex items-center gap-1.5 flex-wrap mt-1">
                          <span>{item.era} • Condition: <strong className="text-stone-700">{item.condition}</strong></span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                            <MapPin className="w-3 h-3 text-emerald-700" />
                            {item.city || 'Colombo'}, {item.country || 'Sri Lanka'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                          {isSold ? 'Final Agreed Sale Price' : 'Closing Bid Amount'}
                        </span>
                        <span className="font-serif-heading text-lg font-black text-emerald-950">
                          {formatCurrency(finalPrice)}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          Purchased by {winningBidder}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {chatSession && (
                          <button
                            onClick={() => {
                              setActiveChatId(chatSession.id);
                              setActiveNavTab('chats');
                            }}
                            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            title="Open the concluded private deal conversation and settlement summary"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                            <span>View Deal Chat</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedItem(item)}
                          className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-900 text-xs font-semibold rounded-xl border border-stone-200/80 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <span>Full Lot Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Concluded Lot Metadata / Winner Box */}
                  <div className="p-4 sm:p-5 bg-white space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">
                            Transaction Status: <span className="text-emerald-800 font-extrabold">{isSold ? 'Deal Sealed & Concluded' : 'Auction Closed'}</span>
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Winning Collector: <strong className="text-stone-800">{winningBidder}</strong> • Total Offers Logged: <strong>{bids.length}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
                          <Lock className="w-3 h-3 text-stone-500" />
                          <span>Bidding Archive Locked</span>
                        </span>
                      </div>
                    </div>

                    {/* View all bids submitted during auction */}
                    {bids.length > 0 && (
                      <details className="text-xs group">
                        <summary className="cursor-pointer text-[11px] font-bold text-stone-700 hover:text-stone-950 flex items-center gap-1 select-none">
                          <span>Review Historical Bidding Log ({bids.length} total offers submitted)</span>
                          <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                        </summary>
                        <div className="mt-2 overflow-x-auto rounded-xl border border-stone-200/80">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-stone-50 text-stone-600 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-200/80">
                              <tr>
                                <th className="py-2.5 px-3">Buyer Handle</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Timestamp</th>
                                <th className="py-2.5 px-3 text-right">Offer Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {bids.map((bid) => {
                                const isWinner = item.acceptedBidId === bid.id || bid.bidderName === item.chosenBuyerName;
                                return (
                                  <tr key={bid.id} className={isWinner ? 'bg-emerald-50/70 font-semibold text-emerald-950' : 'text-stone-600'}>
                                    <td className="py-2.5 px-3 flex items-center gap-2">
                                      {bid.bidderAvatar ? (
                                        <SafeImage src={bid.bidderAvatar} alt={bid.bidderName} className="w-4 h-4 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                                          {(bid.bidderName || 'C').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span>{bid.bidderName}</span>
                                      {isWinner && (
                                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md font-bold">
                                          Deal Sealed
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="text-[10px] text-stone-500">Verified Bid</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-stone-500">{formatTimestamp(bid.timestamp)}</td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                                      {formatCurrency(bid.amount)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

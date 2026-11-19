import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  Coins, 
  Users, 
  Package, 
  MessageSquare, 
  CheckCircle2, 
  Save, 
  Lock, 
  TrendingUp, 
  DollarSign,
  Clock,
  Check,
  Edit,
  Trash2,
  Eye,
  Mail,
  Building2,
  ExternalLink,
  Crown,
  KeyRound,
  MapPin,
  Star,
  Shield,
  User,
  Database
} from 'lucide-react';
import { ItemStatus } from '../types';
import { SafeImage } from './SafeImage';
import { formatTimestamp } from '../lib/date';
import { apiRequest } from '../lib/api';

const parseItemListingFee = (txId?: string | null, fallbackFee: number = 500): number => {
  if (txId === 'FEE_WAIVED' || txId === 'ADMIN_EXEMPT') return 0;
  if (!txId) return fallbackFee;
  const match = txId.match(/-RS(\d+)/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fallbackFee;
};

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    items,
    allUsers,
    setUserRoleCode,
    chats,
    sellerListingFee,
    updateSellerListingFee,
    setActiveNavTab,
    setIsCreateListingOpen,
    setSelectedItem,
    setEditingItem,
    setIsEditListingOpen,
    approveListing,
    rejectListing,
    deleteListing,
    startAdminDirectChat,
    deleteChatSession,
    deleteChatMessage,
    setActiveChatId,
    contactInquiries,
    markInquiryReviewed,
    formatCurrency,
    sellerRatings,
    deleteSellerReview
  } = useApp();

  const [feeInput, setFeeInput] = useState<number>(sellerListingFee);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ItemStatus>('all');
  const [rejectPromptId, setRejectPromptId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [confirmDeleteAdminReviewId, setConfirmDeleteAdminReviewId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const pendingItems = items.filter(i => i.status === 'pending_approval');
  const activeItems = items.filter(i => i.status === 'active');
  const totalFeeCollected = items
    .filter(i => i.listingFeePaid)
    .reduce((acc, it) => acc + parseItemListingFee(it.listingFeeTxId, sellerListingFee), 0);
  const verifiedUsersCount = allUsers.filter(u => u.isVerified).length;
  const totalBidsLogged = items.reduce((acc, it) => acc + (it.bids?.length || 0), 0);

  const filteredItems = statusFilter === 'all' 
    ? items 
    : items.filter(i => i.status === statusFilter);

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (feeInput < 0) return;
    updateSellerListingFee(feeInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleApproveVerification = async (userId: string) => {
    const result = await apiRequest<{ success: boolean; message?: string }>(
      `/api/admin/users/${encodeURIComponent(userId)}/verify`,
      { method: 'POST' }
    );
    if (!result?.success) {
      setActionAlert(result?.message || 'Could not approve identity verification.');
      return;
    }
    setActionAlert('Identity approved. Refreshing account registry...');
    window.location.reload();
  };

  const handleApprove = async (itemId: string) => {
    const res = await approveListing(itemId);
    setActionAlert(res.message);
    setTimeout(() => setActionAlert(null), 3000);
  };

  const handleReject = async (itemId: string) => {
    const res = await rejectListing(itemId, rejectionReasonInput || 'Provenance or documentation does not meet archival standards.');
    setRejectPromptId(null);
    setRejectionReasonInput('');
    setActionAlert(res.message);
    setTimeout(() => setActionAlert(null), 3000);
  };

  const handleDelete = async (itemId: string) => {
    const res = await deleteListing(itemId);
    setConfirmDeleteId(null);
    setActionAlert(res.message);
    setTimeout(() => setActionAlert(null), 3000);
  };

  const handleOpenEdit = (item: typeof items[0]) => {
    setEditingItem(item);
    setIsEditListingOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="admin-control-center">
      {/* Top Banner */}
      <div className="bg-stone-950 border border-stone-800 text-stone-100 rounded-2xl p-7 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                Master Administrator Authority
              </span>
              {pendingItems.length > 0 && (
                <span className="bg-amber-400 text-stone-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md animate-pulse">
                  {pendingItems.length} Lot{pendingItems.length > 1 ? 's' : ''} Awaiting Approval
                </span>
              )}
            </div>
            <h1 className="font-serif-heading text-2xl sm:text-3xl font-bold text-stone-50">
              Platform Administration & Curatorial Control
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 font-provenance mt-1 max-w-2xl">
              Welcome, <strong className="text-white">{currentUser?.name || 'Administrator'}</strong>. You hold full authority to approve, edit, or delete seller listings, calibrate listing fees, and manage the contact page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveNavTab('contact')}
              className="bg-white/10 hover:bg-white/15 text-stone-100 text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Edit Contact Us Page</span>
            </button>
            <button
              onClick={() => setIsCreateListingOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              id="admin-post-lot-btn"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catalog New Antique Lot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className="bg-emerald-800 text-white text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium shadow-sm animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{actionAlert}</span>
        </div>
      )}

      {/* SECTION 1: PENDING LISTINGS AWAITING ADMIN APPROVAL */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 shadow-2xs space-y-4" id="admin-pending-approvals-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-stone-950 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-heading text-lg font-bold text-stone-900 flex items-center gap-2">
                <span>Pending Lots Awaiting Approval</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  pendingItems.length > 0 ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-700'
                }`}>
                  {pendingItems.length}
                </span>
              </h2>
              <p className="text-xs text-stone-600">
                When sellers post an antique, it must be approved here before becoming publicly visible on the marketplace.
              </p>
            </div>
          </div>
        </div>

        {pendingItems.length === 0 ? (
          <div className="bg-white/80 border border-amber-200/60 rounded-xl p-6 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-stone-900">All Submitted Lots Have Been Reviewed</p>
            <p className="text-[11px] text-stone-500">
              No lots currently pending curator approval. New seller submissions will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-stone-200/80 rounded-xl p-4 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="flex gap-3">
                  <SafeImage
                    src={(Array.isArray(item.images) && item.images[0]) || '/images/antique-fallback.webp'}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg border border-stone-200 shrink-0"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Pending Review
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        Fee: {formatCurrency(parseItemListingFee(item.listingFeeTxId, sellerListingFee))} Paid
                      </span>
                    </div>
                    <h3 className="font-serif-heading text-sm font-bold text-stone-900 truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-stone-600 flex items-center gap-1.5 flex-wrap">
                      <span>Era: <strong className="text-stone-800">{item.era}</strong> • Cat: {item.category}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-stone-700 font-medium">
                        <MapPin className="w-3 h-3 text-stone-500" />
                        {item.city || 'Colombo'}, {item.country || 'Sri Lanka'}
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Seller: <strong className="text-stone-800">{item.sellerName}</strong> • Starting: <strong className="text-stone-900">{formatCurrency(item.startingBid)}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 text-[11px] text-stone-600 font-provenance line-clamp-2">
                  "{item.provenance}"
                </div>

                {/* Reject Reason Input if active */}
                {rejectPromptId === item.id && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg space-y-2">
                    <label htmlFor={`admin-reject-reason-${item.id}`} className="text-xs font-bold text-rose-800 block">
                      Provide Rejection Reason to Seller:
                    </label>
                    <input
                      id={`admin-reject-reason-${item.id}`}
                      name={`rejectionReason-${item.id}`}
                      type="text"
                      placeholder="e.g. Incomplete provenance documentation or low photo clarity"
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-rose-300 rounded-lg bg-white text-rose-900 focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRejectPromptId(null)}
                        className="text-[11px] text-stone-600 hover:underline px-2 py-0.5 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg cursor-pointer"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { void startAdminDirectChat(item.id); }}
                      className="bg-stone-900 hover:bg-stone-800 text-white border border-stone-800 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-2xs text-xs cursor-pointer"
                      title="Directly message the seller regarding this listing"
                      id={`admin-msg-seller-${item.id}`}
                    >
                      <MessageSquare className="w-3 h-3 text-amber-300" />
                      <span>Message Seller</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="text-stone-700 hover:text-stone-900 border border-stone-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 hover:bg-stone-50 transition-colors cursor-pointer"
                      title="Edit listing details"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-stone-600 hover:text-stone-900 px-2 py-1 rounded-lg font-medium flex items-center gap-1 cursor-pointer"
                      title="Inspect full lot card"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRejectPromptId(item.id)}
                      className="text-rose-700 hover:text-rose-900 border border-rose-200 px-2.5 py-1 rounded-lg font-semibold hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: EDIT SELLER LISTING FEE */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-2xs" id="admin-fee-setting-box">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-stone-900 text-amber-300 rounded-xl">
                <Coins className="w-4 h-4" />
              </div>
              <h2 className="font-serif-heading text-lg font-bold text-stone-900">
                Seller Antique Listing Fee Configuration
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Configure the mandatory cataloging fee charged to sellers when listing an antique. All platform revenue recalculates immediately.
            </p>
          </div>

          {/* Current Live Fee Badge */}
          <div className="bg-stone-50 border border-stone-200 px-4 py-2 rounded-xl text-right shrink-0">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Active Listing Fee
            </span>
            <span className="font-serif-heading text-2xl font-black text-stone-900">
              {formatCurrency(sellerListingFee)}
            </span>
          </div>
        </div>

        {/* Dynamic Fee Adjuster Form */}
        <form onSubmit={handleSaveFee} className="pt-4 flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="w-full sm:w-64">
            <label htmlFor="admin-fee-input" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Set New Listing Fee Amount (Rs.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                Rs.
              </span>
              <input
                name="sellerListingFee"
                type="number"
                min={0}
                step={50}
                value={feeInput}
                onChange={(e) => setFeeInput(Number(e.target.value))}
                className="w-full pl-10 pr-3 py-2 bg-white border border-stone-200 rounded-xl font-mono font-bold text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                id="admin-fee-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              id="admin-save-fee-btn"
            >
              <Save className="w-3.5 h-3.5 text-amber-300" />
              <span>Update Fee</span>
            </button>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1">
              {[250, 500, 750, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFeeInput(preset)}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    feeInput === preset
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  Rs.{preset}
                </button>
              ))}
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-1 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl animate-in fade-in-50">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Listing fee updated!</span>
            </div>
          )}
        </form>
      </div>

      {/* SECTION 3: KEY PLATFORM METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Registered Accounts</span>
            <Users className="w-4 h-4 text-stone-700" />
          </div>
          <span className="font-serif-heading text-2xl font-black text-stone-900">
            {allUsers.length}
          </span>
          <span className="text-[11px] text-stone-500 block mt-0.5">
            {verifiedUsersCount} Verified Identities
          </span>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Published Lots</span>
            <Package className="w-4 h-4 text-stone-700" />
          </div>
          <span className="font-serif-heading text-2xl font-black text-stone-900">
            {items.length}
          </span>
          <span className="text-[11px] text-stone-500 block mt-0.5">
            {activeItems.length} Live • {pendingItems.length} Pending
          </span>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Bids Logged</span>
            <TrendingUp className="w-4 h-4 text-stone-700" />
          </div>
          <span className="font-serif-heading text-2xl font-black text-stone-900">
            {totalBidsLogged}
          </span>
          <span className="text-[11px] text-stone-500 block mt-0.5">
            Realtime collector offers
          </span>
        </div>

        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Catalog Fees Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-serif-heading text-2xl font-black text-emerald-700">
            {formatCurrency(totalFeeCollected)}
          </span>
          <span className="text-[11px] text-stone-500 block mt-0.5">
            Current rate: {formatCurrency(sellerListingFee)} / listing
          </span>
        </div>
      </div>

      {/* SECTION 4: FULL CATALOG MANAGEMENT WITH ADMIN EDIT & DELETE */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="font-serif-heading text-lg font-bold text-stone-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-stone-700" />
              <span>Antique Lot Master Management & Authority</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              As Master Administrator, you have full authority to edit descriptions, adjust bids, approve lots, or permanently delete listings.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {(['all', 'pending_approval', 'active', 'deal_pending', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-colors shrink-0 cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {filter === 'all' ? `All (${items.length})` : filter.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Package className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 italic">
              No antique lots found matching status filter "{statusFilter}".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto pr-1">
            {filteredItems.map((it) => (
              <div key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <SafeImage
                    src={(Array.isArray(it.images) && it.images[0]) || '/images/antique-fallback.webp'}
                    alt={it.title}
                    className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 text-sm truncate max-w-xs">{it.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        it.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : it.status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : it.status === 'deal_pending'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : it.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {it.status === 'pending_approval' ? 'Pending Approval' : it.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>Seller: <span className="font-medium text-stone-700">{it.sellerName}</span> • {it.category} • {it.era}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-stone-700 font-medium">
                        <MapPin className="w-3 h-3 text-stone-500" />
                        {it.city || 'Colombo'}, {it.country || 'Sri Lanka'}
                      </span>
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Starting: <span className="font-medium">{formatCurrency(it.startingBid)}</span> • Current: <strong className="text-stone-900">{formatCurrency(it.currentBid)}</strong> ({Array.isArray(it.bids) ? it.bids.length : 0} bids)
                    </p>
                  </div>
                </div>

                {/* Admin Actions Bar */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {it.status === 'pending_approval' && (
                    <button
                      onClick={() => handleApprove(it.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="Approve lot for public catalog"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { void startAdminDirectChat(it.id); }}
                    className="bg-stone-900 hover:bg-stone-800 text-white border border-stone-800 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-2xs text-xs cursor-pointer"
                    title="Directly message the seller regarding this listing"
                    id={`admin-msg-seller-${it.id}`}
                  >
                    <MessageSquare className="w-3 h-3 text-amber-300" />
                    <span>Message Seller</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(it)}
                    className="bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-stone-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    title="Edit any field of this listing"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  {confirmDeleteId === it.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                      <span className="text-rose-800 text-[10px] font-bold">Delete?</span>
                      <button
                        onClick={() => handleDelete(it.id)}
                        className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-stone-500 text-[10px] hover:underline cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(it.id)}
                      className="text-rose-600 hover:text-rose-800 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Permanently remove listing"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedItem(it)}
                    className="text-stone-500 hover:text-stone-900 p-1 cursor-pointer"
                    title="View public modal preview"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4.5: PLATFORM DEAL ROOMS & CHATS (ADMIN OVERSIGHT & DELETION) */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-2xs" id="admin-deal-rooms-oversight">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
          <div>
            <h3 className="font-serif-heading text-base font-bold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-stone-700" />
              <span>Platform Deal Rooms & Direct Chats ({chats.length})</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Curatorial administrator oversight for private deal rooms and direct channels. Admins can review transcripts or permanently delete any chat.
            </p>
          </div>
          <button
            onClick={() => setActiveNavTab('chats')}
            className="text-xs font-semibold text-stone-900 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Open Deal Rooms View</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {chats.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-xs text-stone-500 italic">No chat sessions or deal rooms currently recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-1 space-y-2">
            {chats.map(chat => {
              const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
              return (
                <div key={chat.id} className="pt-3 pb-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeImage 
                        src={chat.itemImage || '/images/antique-fallback.webp'} 
                        alt={chat.itemTitle} 
                        className="w-11 h-11 object-cover rounded-xl border border-stone-200 shrink-0" 
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif-heading font-bold text-stone-900 truncate max-w-xs">{chat.itemTitle}</span>
                          {chat.isAdminDirectChat ? (
                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md">
                              Admin Direct Channel
                            </span>
                          ) : (
                            <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-mono">
                              Deal: {formatCurrency(chat.dealAmount)}
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            chat.dealStatus === 'deal_sealed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            chat.dealStatus === 'deal_off' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                            'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}>
                            {chat.dealStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                          <strong>{chat.sellerName}</strong> (Seller) ↔ <strong>{chat.buyerName}</strong> (Buyer)
                          {lastMsg && <span className="text-stone-400 italic ml-2">"{lastMsg.text}"</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setExpandedChatId(expandedChatId === chat.id ? null : chat.id)}
                        className="text-stone-700 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Inspect messages in this chat"
                      >
                        <MessageSquare className="w-3 h-3 text-stone-700" />
                        <span>{expandedChatId === chat.id ? 'Hide Messages' : `Messages (${chat.messages.length})`}</span>
                      </button>

                      <button
                        onClick={() => setActiveChatId(chat.id)}
                        className="text-stone-900 hover:text-black border border-stone-200 hover:bg-stone-50 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Open transcript modal"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Chat Room</span>
                      </button>

                      {confirmDeleteChatId !== chat.id ? (
                        <button
                          onClick={() => setConfirmDeleteChatId(chat.id)}
                          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Delete entire chat session permanently from admin and seller's views"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Chat</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg shadow-xs">
                          <span className="text-[10px] text-rose-800 font-bold px-1">Delete from all users?</span>
                          <button
                            onClick={() => {
                              deleteChatSession(chat.id);
                              setConfirmDeleteChatId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer shadow-xs"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteChatId(null)}
                            className="text-stone-600 hover:text-stone-900 text-[10px] px-1 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline message transcript & message deletion for admin */}
                  {expandedChatId === chat.id && (
                    <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 space-y-2 mb-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 text-[11px] text-stone-600 font-medium">
                        <span>Chat Messages Transcript ({chat.messages.length})</span>
                        <span className="text-[10px] text-stone-500">Deleting an admin message removes it from the seller's chats</span>
                      </div>

                      {chat.messages.length === 0 ? (
                        <p className="text-stone-500 italic text-center py-2 text-[11px]">No messages recorded in this channel.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {chat.messages.map((m) => {
                            const isAdminSender = m.senderRole === 'admin' || m.senderId === currentUser?.id;
                            return (
                              <div 
                                key={m.id} 
                                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  isAdminSender 
                                    ? 'bg-amber-50/70 border-amber-200' 
                                    : 'bg-white border-stone-200/80'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mb-0.5">
                                    <strong className="text-stone-900">{m.senderName}</strong>
                                    <span className={`px-1.5 py-0.5 rounded-md font-mono uppercase text-[9px] ${
                                      isAdminSender ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
                                    }`}>
                                      {m.senderRole}
                                    </span>
                                    <span>•</span>
                                    <span>{formatTimestamp(m.timestamp)}</span>
                                    {m.isSystemNotice && (
                                      <span className="text-amber-800 font-semibold">[System Protocol]</span>
                                    )}
                                  </div>
                                  <p className="text-stone-700 text-xs italic break-words">
                                    "{m.text}"
                                  </p>
                                </div>

                                <div className="shrink-0 self-end sm:self-center">
                                  {confirmDeleteMsgId !== m.id ? (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteMsgId(m.id)}
                                      className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                      title="Delete this message (removes from seller's chat)"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Delete Message</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md text-[10px] shadow-2xs">
                                      <span className="text-rose-800 font-bold">Delete message?</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deleteChatMessage(chat.id, m.id);
                                          setConfirmDeleteMsgId(null);
                                        }}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md cursor-pointer shadow-xs"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteMsgId(null)}
                                        className="text-stone-600 hover:text-stone-900 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: REGISTERED USERS & CONTACT INQUIRIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registry */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif-heading text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-700" />
                <span>Registered Accounts Registry ({allUsers.length})</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Sole Master Admin Seat: <strong>{allUsers.some(u => u.isAdmin) ? '1 of 1 Assigned' : '0 of 1 (Unclaimed)'}</strong></span>
              </p>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-emerald-600" />
              <span>Password Protected</span>
            </span>
          </div>

          {/* Platform Authority Levels Reference Guide */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-amber-950 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-700" />
                <span>Platform Authority Levels</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                0 = Admin • 1 = Standard Member
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Manage account privilege levels and identity approvals. Verify identity documents outside the platform before approving an unverified account. Level <strong>0</strong> grants Master Admin authority, and level <strong>1</strong> assigns standard member access.
            </p>
          </div>

          {allUsers.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-4">
              No registered users yet. Sign up to begin.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto pr-1">
              {allUsers.map((u) => (
                <div key={u.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {u.avatar ? (
                      <SafeImage
                        src={u.avatar}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-xs border border-stone-800 shrink-0">
                        {u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-4 h-4 text-amber-200" />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-stone-900 truncate">{u.name}</span>
                        {u.isAdmin || u.role_code === 0 ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-700" />
                            <span>Admin (0)</span>
                          </span>
                        ) : (
                          <span className="capitalize text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                            {u.role === 'seller' ? 'Antique Dealer (1)' : 'Collector (1)'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="truncate">{u.email}</span>
                        <span>•</span>
                        <span className="font-mono">ID: {u.verificationIdNumber || 'Pending'}</span>
                        <span>•</span>
                        <span className="text-stone-400 flex items-center gap-0.5 font-mono text-[10px]">
                          <Lock className="w-2.5 h-2.5" />
                          PW Secured
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    {/* Role Assignment Selector (0 for Admin, 1 for Standard Member) */}
                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg">
                      <label htmlFor={`admin-user-role-${u.id}`} className="text-[10px] font-mono text-stone-500">Access:</label>
                      <select
                        id={`admin-user-role-${u.id}`}
                        name={`roleCode-${u.id}`}
                        value={u.role_code === 0 || u.isAdmin ? '0' : '1'}
                        onChange={(e) => setUserRoleCode(u.id, Number(e.target.value))}
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                          (u.role_code === 0 || u.isAdmin)
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : 'bg-white text-stone-700 border-stone-200'
                        }`}
                        title="Set account authority: 0 = Admin, 1 = Standard Member"
                      >
                        <option value="0">0 (Admin)</option>
                        <option value="1">1 (Member)</option>
                      </select>
                    </div>

                    <div>
                      {u.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Pending Review
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleApproveVerification(u.id)}
                            className="text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-2 py-1 rounded-md cursor-pointer"
                            title="Approve only after completing an independent identity check"
                          >
                            Approve Identity
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Inquiries Inbox */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-serif-heading text-base font-bold text-stone-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-stone-700" />
              <span>Contact Page Inquiries ({contactInquiries.length})</span>
            </h3>
            <button
              onClick={() => setActiveNavTab('contact')}
              className="text-xs font-semibold text-stone-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Contact Page</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {contactInquiries.length === 0 ? (
            <div className="text-center py-8 space-y-1">
              <p className="text-xs text-stone-500 italic">
                No visitor inquiries received yet.
              </p>
              <p className="text-[11px] text-stone-400">
                Messages submitted on the Contact Us page will be logged here for admin review.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1 space-y-2">
              {contactInquiries.map((inq) => (
                <div key={inq.id} className="pt-2 pb-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">{inq.name}</span>
                    <span className="text-[10px] text-stone-400">{formatTimestamp(inq.submittedAt)}</span>
                  </div>
                  <div className="text-[11px] text-stone-800 font-semibold">
                    {inq.subject}
                  </div>
                  <p className="text-stone-600 font-provenance text-[11px] line-clamp-2">
                    "{inq.message}"
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-stone-500 font-mono">{inq.email}</span>
                    {inq.status === 'new' ? (
                      <button
                        onClick={() => markInquiryReviewed(inq.id)}
                        className="text-amber-800 hover:underline font-bold cursor-pointer"
                      >
                        Mark Reviewed
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold">Reviewed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Master Admin Seller Reviews Moderation Panel */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 space-y-4 shadow-2xs md:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="font-serif-heading text-base font-bold text-stone-900 flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Seller Appraisals & Community Reviews Moderation ({sellerRatings?.length || 0})</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Master Admin Privilege: You alone have authority to review and delete inappropriate or disputed collector feedback.
              </p>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs">
              <Shield className="w-3 h-3 text-amber-700" />
              Admin Only Delete Authority
            </span>
          </div>

          {(!sellerRatings || sellerRatings.length === 0) ? (
            <div className="text-center py-8 space-y-1">
              <p className="text-xs text-stone-500 italic">
                No collector reviews or appraisals logged in the registry yet.
              </p>
              <p className="text-[11px] text-stone-400">
                When buyers or collectors rate sellers, their feedback will appear here with deletion controls.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {sellerRatings.map((rev) => (
                <div 
                  key={rev.id} 
                  className="p-4 bg-stone-50/50 border border-stone-200/80 rounded-xl text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="font-bold text-stone-900">{rev.sellerName}</span>
                      <span className="text-[10px] text-stone-500 ml-1">
                        (Reviewed by <strong>{rev.raterName}</strong>)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex items-center text-amber-400 text-[10px]">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] text-stone-400 ml-1 font-mono">{formatTimestamp(rev.timestamp)}</span>
                    </div>
                  </div>

                  {rev.tag && (
                    <span className="inline-block text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                      ✓ {rev.tag}
                    </span>
                  )}

                  {rev.comment && (
                    <p className="text-stone-700 italic text-[11px] bg-white p-2.5 rounded-lg border border-stone-200/80">
                      "{rev.comment}"
                    </p>
                  )}

                  {rev.itemTitle && (
                    <div className="text-[10px] text-stone-500 truncate">
                      Lot: <span className="font-serif-heading italic text-stone-700">{rev.itemTitle}</span>
                    </div>
                  )}

                  {/* Admin Deletion Action */}
                  <div className="flex items-center justify-end pt-1.5 border-t border-stone-200/80">
                    {confirmDeleteAdminReviewId !== rev.id ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAdminReviewId(rev.id)}
                        className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Delete this seller review permanently"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        <span>Delete Review</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-[10px] shadow-xs">
                        <span className="text-rose-800 font-bold">Permanently delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSellerReview(rev.id);
                            setConfirmDeleteAdminReviewId(null);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md cursor-pointer shadow-xs"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteAdminReviewId(null)}
                          className="text-stone-600 hover:text-stone-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

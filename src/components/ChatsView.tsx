import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';
import { ChatModal } from './ChatModal';
import { SafeImage } from './SafeImage';
import { formatTimestamp } from '../lib/date';

export const ChatsView: React.FC = () => {
  const { chats, items, currentUser, activeChatId, setActiveChatId, setIsAuthModalOpen, deleteChatSession, formatCurrency } = useApp();
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 my-8 shadow-xs">
        <MessageSquare className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="font-serif-heading text-lg font-bold text-stone-900">
          Account Required for Deal Rooms
        </h2>
        <p className="text-xs text-stone-500">
          Sign up or log in to access your direct, private negotiations with buyers and sellers.
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

  // Chats involving the logged-in user (Admin has full oversight of all platform deal rooms)
  const myChats = (currentUser.isAdmin
    ? chats
    : chats.filter(c => c.sellerId === currentUser.id || c.buyerId === currentUser.id)
  ).filter(c => {
    if (c.isAdminDirectChat) {
      return c.messages && c.messages.some(m => !m.isSystemNotice);
    }
    return c.messages && c.messages.length > 0;
  });

  const isChatActive = (chat: typeof chats[0]) => {
    if (chat.dealStatus === 'deal_sealed' || chat.dealStatus === 'deal_off') return false;
    const item = items.find(i => i.id === chat.itemId);
    if (item && item.status === 'sold') return false;
    return true;
  };

  const activeChats = myChats.filter(isChatActive);
  const concludedChats = myChats.filter(c => !isChatActive(c));

  return (
    <div className="max-w-5xl mx-auto space-y-6" id="deal-chats-view">
      {/* Header Banner */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif-heading text-xl font-bold text-stone-900">
              Private In-App Deal Rooms
            </h1>
            <span className="text-xs bg-stone-900 text-white font-semibold px-2.5 py-0.5 rounded-md">
              {activeChats.length} Active Deals
            </span>
            {currentUser.isAdmin && (
              <span className="text-xs bg-rose-50 text-rose-800 border border-rose-200 font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <Trash2 className="w-3 h-3 text-rose-600" />
                Admin Oversight Active
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            When a seller chooses a buyer's bid, a dedicated encrypted deal room opens. Personal contact numbers are masked to protect both parties and preserve escrow authenticity.
          </p>
        </div>
      </div>

      {/* Active Chats Section */}
      {activeChats.length === 0 ? (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-2 shadow-2xs">
          <MessageSquare className="w-9 h-9 text-stone-400 mx-auto" />
          <h3 className="font-serif-heading text-base font-bold text-stone-900">
            0 Active Deals In Progress
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {concludedChats.length > 0 
              ? 'All previous negotiations have been concluded or sealed.' 
              : 'Deal rooms open as soon as a seller accepts a buyer\'s offer on an antique lot.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Active Negotiations ({activeChats.length})
          </h2>
          {activeChats.map(chat => {
            const isSeller = currentUser.id === chat.sellerId;
            const otherPartyName = isSeller ? chat.buyerName : chat.sellerName;
            const otherPartyRole = isSeller ? 'Buyer' : 'Seller';
            const lastMsg = chat.messages[chat.messages.length - 1];

            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className="group cursor-pointer bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-md hover:border-stone-300"
              >
                <div className="flex items-center gap-4">
                  <SafeImage
                    src={chat.itemImage || '/images/antique-fallback.webp'}
                    alt={chat.itemTitle}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shadow-2xs"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif-heading text-base font-bold text-stone-900">
                        {chat.itemTitle}
                      </span>
                      {chat.isAdminDirectChat ? (
                        <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          <span>Curatorial Admin Inquiry</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-mono">
                          {chat.itemEra}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                      {chat.isAdminDirectChat ? (
                        <span>Official Channel: <strong className="text-stone-800">{otherPartyName}</strong> (Administrator Inquiry)</span>
                      ) : (
                        <>
                          <span>Negotiating with: <strong className="text-stone-800">{otherPartyName}</strong> ({otherPartyRole})</span>
                          <span className="text-stone-300">•</span>
                          <span>Agreed Bid: <strong className="font-serif-heading font-bold text-stone-900">{formatCurrency(chat.dealAmount)}</strong></span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-stone-500 italic mt-1.5 line-clamp-1">
                      {lastMsg?.senderName}: "{lastMsg?.text}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">{formatTimestamp(chat.lastMessageTime)}</span>
                    {chat.isAdminDirectChat ? (
                      <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 mt-0.5 justify-end">
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        <span>Admin Direct Active</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 block mt-0.5">
                        Private Chat Active
                      </span>
                    )}
                  </div>

                  {currentUser.isAdmin && (
                    <div 
                      className="flex items-center" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      {confirmDeleteChatId !== chat.id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteChatId(chat.id);
                          }}
                          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Delete this chat session (Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg shadow-xs">
                          <span className="text-[10px] text-rose-800 font-bold px-1">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(chat.id);
                              setConfirmDeleteChatId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer shadow-xs"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteChatId(null);
                            }}
                            className="text-stone-600 hover:text-stone-900 text-[10px] px-1 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 group-hover:bg-stone-900 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Concluded / Previous Deals */}
      {concludedChats.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-stone-200/80">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Concluded & Sealed Deals ({concludedChats.length})</span>
          </h2>
          {concludedChats.map(chat => {
            const isSeller = currentUser.id === chat.sellerId;
            const otherPartyName = isSeller ? chat.buyerName : chat.sellerName;
            const otherPartyRole = isSeller ? 'Buyer' : 'Seller';
            const lastMsg = chat.messages[chat.messages.length - 1];
            const isDealOff = chat.dealStatus === 'deal_off';

            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className="group cursor-pointer bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 opacity-90 hover:opacity-100 hover:border-stone-300 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-4">
                  <SafeImage
                    src={chat.itemImage || '/images/antique-fallback.webp'}
                    alt={chat.itemTitle}
                    className="w-14 h-14 rounded-xl object-cover border border-stone-200 grayscale-30"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif-heading text-sm font-bold text-stone-900">
                        {chat.itemTitle}
                      </span>
                      <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-mono">
                        {chat.itemEra}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                      <span>Transacted with: <strong className="text-stone-800">{otherPartyName}</strong> ({otherPartyRole})</span>
                      <span className="text-stone-300">•</span>
                      <span>Final Bid: <strong className="font-serif-heading font-bold text-stone-900">{formatCurrency(chat.dealAmount)}</strong></span>
                    </div>

                    <p className="text-xs text-stone-500 italic mt-1 line-clamp-1">
                      {lastMsg?.senderName}: "{lastMsg?.text}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">{formatTimestamp(chat.lastMessageTime)}</span>
                    {isDealOff ? (
                      <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 block mt-0.5">
                        Deal Called Off
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 block mt-0.5">
                        Deal Sealed ✓
                      </span>
                    )}
                  </div>

                  {currentUser.isAdmin && (
                    <div 
                      className="flex items-center" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      {confirmDeleteChatId !== chat.id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteChatId(chat.id);
                          }}
                          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Delete this chat session (Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg shadow-xs">
                          <span className="text-[10px] text-rose-800 font-bold px-1">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(chat.id);
                              setConfirmDeleteChatId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer shadow-xs"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteChatId(null);
                            }}
                            className="text-stone-600 hover:text-stone-900 text-[10px] px-1 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 group-hover:bg-stone-900 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Chat Modal */}
      {activeChatId && <ChatModal />}
    </div>
  );
};

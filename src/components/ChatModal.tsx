import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Send, 
  ShieldCheck, 
  EyeOff,
  Check,
  Trash2
} from 'lucide-react';
import { SafeImage } from './SafeImage';
import { formatTimestamp } from '../lib/date';

interface ChatModalProps {
  chatId?: string;
  onClose?: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ chatId: propChatId, onClose: propOnClose }) => {
  const {
    chats,
    currentUser,
    sendChatMessage,
    deleteChatSession,
    deleteChatMessage,
    updateDealStatus,
    activeChatId,
    setActiveChatId,
    formatCurrency
  } = useApp();

  const effectiveChatId = propChatId || activeChatId;
  const chat = chats.find(c => c.id === effectiveChatId);
  const [inputText, setInputText] = useState('');
  const [isConfirmingDeal, setIsConfirmingDeal] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setActiveChatId(null);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  if (!chat) return null;

  const isSeller = currentUser?.id === chat.sellerId;
  const otherPartyName = isSeller ? chat.buyerName : chat.sellerName;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(chat.id, inputText);
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-black/65 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-3xl bg-white border border-stone-200/80 rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[750px] overflow-hidden"
        id="private-deal-chat"
      >
        {/* Chat Top Banner: Item & Privacy Header */}
        <div className="bg-stone-950 text-stone-100 px-5 py-3.5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SafeImage
              src={chat.itemImage || '/images/antique-fallback.webp'}
              alt={chat.itemTitle}
              className="w-11 h-11 rounded-lg object-cover border border-stone-800"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-heading text-sm font-bold text-stone-50 truncate max-w-xs sm:max-w-md">
                  {chat.itemTitle}
                </span>
                <span className="bg-amber-400 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {formatCurrency(chat.dealAmount)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                {chat.isAdminDirectChat ? (
                  <span className="text-amber-300 font-medium">
                    Curatorial Administration Direct Channel • <strong>{chat.buyerName}</strong> ↔ <strong>{chat.sellerName}</strong>
                  </span>
                ) : (
                  <span>Negotiation between: <strong>{chat.sellerName}</strong> (Seller) & <strong>{chat.buyerName}</strong> (Buyer)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!chat.isAdminDirectChat && (isSeller || currentUser?.isAdmin) && (
              chat.dealStatus === 'deal_sealed' ? (
                <span className="bg-emerald-800 text-emerald-100 border border-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Deal Sealed</span>
                </span>
              ) : !isConfirmingDeal ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDeal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Finalize and seal deal"
                  id="btn-deal-check"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Seal Deal</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-emerald-950 border border-emerald-700 px-2 py-1 rounded-lg">
                  <span className="text-[10px] text-emerald-200 font-bold">Seal Deal?</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateDealStatus(chat.id, 'deal_sealed');
                      setIsConfirmingDeal(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer"
                  >
                    Yes, Deal ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDeal(false)}
                    className="text-stone-300 text-[10px] px-1 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}

            {/* Administrator Delete Chat Option */}
            {currentUser?.isAdmin && (
              !isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/80 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Permanently delete this chat room (Admin only)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Delete Chat</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-rose-950 border border-rose-700 px-2 py-1 rounded-lg shadow-xs animate-in fade-in">
                  <span className="text-[10px] text-rose-200 font-bold">Delete Chat?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteChatSession(chat.id);
                      handleClose();
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer shadow-xs"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="text-stone-300 text-[10px] px-1 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}

            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Privacy & Phone Masking Guarantee Banner */}
        <div className="bg-stone-50 border-b border-stone-200/80 px-5 py-2.5 flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2">
          <div className="flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-semibold text-stone-800">Contact Numbers Masked:</span>
            <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-md border border-stone-200 shadow-2xs">
              +94 ••• ••• •• (Protected)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Conduct deal communication strictly via this channel</span>
          </div>
        </div>

        {/* Message Transcript Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-stone-50/40">
          {(Array.isArray(chat.messages) ? chat.messages : []).map((msg) => {
            if (msg.isSystemNotice) {
              return (
                <div key={msg.id} className="p-3 bg-white border border-stone-200/80 rounded-xl text-xs text-stone-600 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-stone-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>{msg.senderName}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{msg.text}</p>
                </div>
              );
            }

            const isMyMessage = currentUser && msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMyMessage ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-stone-500">
                  <span className="font-semibold text-stone-700">{msg.senderName}</span>
                  <span className="capitalize text-stone-400 font-mono">({msg.senderRole})</span>
                  <span>•</span>
                  <span>{formatTimestamp(msg.timestamp)}</span>
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    isMyMessage
                      ? 'bg-stone-900 text-white font-normal shadow-2xs'
                      : 'bg-white text-stone-900 border border-stone-200/80 shadow-2xs'
                  }`}
                >
                  {msg.text.replace(/\s*Please let us know if you have any questions or additional provenance documentation to verify\.?/gi, '').trim()}
                </div>

                {/* Administrator Delete Message Button (removes message from seller's chat) */}
                {currentUser?.isAdmin && (
                  <div className="mt-0.5">
                    {confirmDeleteMsgId !== msg.id ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMsgId(msg.id)}
                        className="text-[10px] text-stone-400 hover:text-rose-600 opacity-60 hover:opacity-100 flex items-center gap-1 transition-opacity cursor-pointer py-0.5"
                        title="Delete this message (removes immediately from seller's view)"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        <span>Delete message</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] shadow-2xs mt-0.5">
                        <span className="text-rose-800 font-bold">Delete message?</span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteChatMessage(chat.id, msg.id);
                            setConfirmDeleteMsgId(null);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.2 rounded-xs cursor-pointer shadow-xs"
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
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200/80 flex items-center gap-2">
          <input
            id="chat-modal-message-input"
            name="message"
            aria-label="Deal room message"
            type="text"
            placeholder={chat.isAdminDirectChat 
              ? `Direct message regarding ${chat.itemTitle}...` 
              : `Message ${otherPartyName} regarding terms, collection, or certificate...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 text-stone-900"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

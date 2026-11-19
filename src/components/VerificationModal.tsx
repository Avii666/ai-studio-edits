import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShieldCheck, Check, AlertCircle, Lock, UserCheck, ShieldAlert } from 'lucide-react';

export const VerificationModal: React.FC = () => {
  const {
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    currentUser,
    verifyUserAccount,
    setIsAuthModalOpen
  } = useApp();

  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isVerificationModalOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-7 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-black text-stone-900 tracking-tight">
            Sign Up or Login Required
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Please register or sign in to verify your antique collector/dealer identity credentials.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => setIsVerificationModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsVerificationModalOpen(false);
                setIsAuthModalOpen(true);
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              Sign Up / Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultMessage(null);

    const res = await verifyUserAccount();
    if (res.success) {
      setResultMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setIsVerificationModalOpen(false);
      }, 1200);
    } else {
      setResultMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-lg bg-white border border-stone-200/80 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col"
        id="verification-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 bg-stone-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">
              Identity Verification Review
            </h2>
          </div>
          <button
            onClick={() => setIsVerificationModalOpen(false)}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Policy Banner */}
          <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-xl text-xs text-stone-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <Lock className="w-3.5 h-3.5 text-stone-800" />
              <span>Strict Single-Account Policy (No Duplicate Accounts)</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              To preserve authentic bidding integrity and prevent counterfeit shill bids or duplicate profiles, each verified collector or seller account is protected by an Anti-Fraud Single-Identity seal.
            </p>
          </div>

          {resultMessage && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
              resultMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}>
              {resultMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{resultMessage.text}</span>
            </div>
          )}

          {/* Account Profile Verification Overview */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
              <span className="text-stone-500 font-medium">Collector / Seller Account:</span>
              <span className="font-bold text-stone-900">{currentUser.name}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
              <span className="text-stone-500 font-medium">Registered Email:</span>
              <span className="font-mono text-stone-800">{currentUser.email}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
              <span className="text-stone-500 font-medium">Platform Role:</span>
              <span className="uppercase text-[11px] font-bold text-stone-900 bg-white border border-stone-200 px-2.5 py-0.5 rounded-full">
                {currentUser.role}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Verification Status:</span>
              {currentUser.isVerified ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Single Identity
                </span>
              ) : (
                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  Pending Administrator Review
                </span>
              )}
            </div>
          </div>

          {/* Form Action */}
          <form onSubmit={handleVerify} className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Submitting this request does not automatically verify your identity. An Antiauc administrator must independently review your identity before bidding or listing is enabled.
              </p>
            </div>

            <div className="pt-2">
              {currentUser.isVerified ? (
                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Account Verified & Active — Close</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  id="submit-verification-btn"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Submit for Administrator Review</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Star, X, Check, Award, ShieldCheck, MessageSquare, Trash2, Shield, AlertCircle } from 'lucide-react';
import { formatTimestamp } from '../lib/date';

export interface RateSellerModalProps {
  sellerId?: string;
  sellerName?: string;
  itemTitle?: string;
  itemId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Unacceptable / Misrepresented',
  2: 'Poor / Significant Discrepancies',
  3: 'Acceptable / Standard Transaction',
  4: 'High Quality / Authentic Provenance',
  5: 'Exceptional / Master Curator Grade'
};

const RATING_TAGS = [
  'Museum Grade Condition',
  'Prompt & Insured Delivery',
  'Verified Provenance Papers',
  'Accurate Restoration Notes',
  'Courteous Curatorial Chat',
  'Secure Escrow Compliance'
];

export const RateSellerModal: React.FC<RateSellerModalProps> = ({
  sellerId: propSellerId,
  sellerName: propSellerName,
  itemTitle: propItemTitle,
  itemId: propItemId,
  isOpen: propIsOpen,
  onClose: propOnClose
}) => {
  const { 
    currentUser, 
    isRateSellerOpen,
    rateSellerTarget,
    closeRateSellerModal, 
    rateSeller, 
    addSellerReview,
    getSellerReviews, 
    getSellerAverageRating,
    getSellerRatings,
    sellerRatings,
    sellerProfiles,
    deleteSellerReview
  } = useApp();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isRateSellerOpen;
  const sellerId = propSellerId || rateSellerTarget?.sellerId || '';
  const sellerName = propSellerName || rateSellerTarget?.sellerName || '';
  const itemTitle = propItemTitle || rateSellerTarget?.itemTitle;
  const itemId = propItemId || rateSellerTarget?.itemId;

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Museum Grade Condition');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState<boolean>(false);
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string>('');

  // Reset form state whenever the modal opens for a new target
  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setHoverRating(null);
      setComment('');
      setSelectedTag('Museum Grade Condition');
      setShowFeedbackSuccess(false);
      setConfirmDeleteReviewId(null);
      setSubmitError('');
    }
  }, [isOpen, sellerId, sellerName]);

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      closeRateSellerModal();
    }
  };

  if (!isOpen || (!sellerName && !sellerId)) {
    return null;
  }

  // Resolve target seller details safely
  const matchedUser = sellerProfiles.find(u => 
    (sellerId && u.id === sellerId) || 
    (sellerName && u.name.toLowerCase() === sellerName.toLowerCase())
  );
  const resolvedSellerId = sellerId || matchedUser?.id || '';
  const displaySellerName = sellerName || matchedUser?.name || 'Antique Seller';

  const sellerReviews = resolvedSellerId
    ? getSellerRatings(resolvedSellerId)
    : (getSellerReviews ? getSellerReviews(displaySellerName) : sellerRatings.filter(r => r.sellerName.toLowerCase() === displaySellerName.toLowerCase()));

  const currentSellerRating = matchedUser?.rating ?? (
    getSellerAverageRating
      ? getSellerAverageRating(resolvedSellerId || displaySellerName)
      : (sellerReviews.length > 0 
          ? Math.round((sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length) * 10) / 10 
          : 5.0)
  );

  const activeStars = hoverRating !== null ? hoverRating : rating;
  const isSelfRating = Boolean(currentUser && (currentUser.id === resolvedSellerId || (currentUser.name && currentUser.name.toLowerCase() === displaySellerName.toLowerCase())));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || isSelfRating) return;

    setSubmitError('');
    setIsSubmitting(true);
    try {
      let result;
      if (rateSeller && resolvedSellerId) {
        result = await rateSeller(
          resolvedSellerId,
          rating,
          comment.trim() || undefined,
          selectedTag || undefined,
          itemId
        );
      } else if (addSellerReview) {
        result = await addSellerReview({
          sellerId: resolvedSellerId || undefined,
          sellerName: displaySellerName,
          rating,
          comment: comment.trim() || undefined,
          tag: selectedTag || undefined,
          itemId,
          itemTitle
        });
      }

      if (result?.success === false) {
        setSubmitError(result.message || 'Unable to save seller rating.');
        return;
      }

      setShowFeedbackSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch {
      setSubmitError('Unable to submit seller rating right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white border border-stone-200/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-50 text-stone-900 px-6 py-4 flex items-center justify-between border-b border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Award className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">
                Rate Antique Seller
              </h2>
              <p className="text-xs text-stone-500">
                Community authenticity review & seller reputation score
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* Target Seller Identity Banner */}
          <div className="bg-stone-50 border border-stone-200/80 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center text-sm">
                {displaySellerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-stone-900">{displaySellerName}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Seller
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {Number(currentSellerRating).toFixed(1)} / 5.0
                  </span>
                  <span>•</span>
                  <span>{sellerReviews.length} community review{sellerReviews.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>

            {itemTitle && (
              <div className="hidden sm:block text-right text-[11px] text-stone-500 max-w-[150px] truncate">
                <span className="block text-[9px] uppercase tracking-wider text-stone-400 font-mono">Concerning Lot:</span>
                <span className="font-medium text-stone-800 truncate block">{itemTitle}</span>
              </div>
            )}
          </div>

          {isSelfRating ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Self-Appraisal Not Permitted</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  To safeguard marketplace trust, sellers cannot submit appraisals or reviews for their own profile.
                </p>
              </div>
            </div>
          ) : showFeedbackSuccess ? (
            <div className="py-8 text-center space-y-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-base font-bold text-emerald-950">
                Seller Rating Submitted!
              </h3>
              <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                Thank you for contributing to our verified antique collectors registry. {displaySellerName}'s curatorial score has been updated.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              {/* Interactive Star Selection */}
              <div className="space-y-2 text-center py-2 bg-stone-50 border border-stone-200/80 rounded-2xl p-5">
                <span className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Select Your Overall Rating
                </span>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = starVal <= activeStars;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1.5 text-stone-300 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                        title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                      >
                        <Star 
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                            isFilled
                              ? 'text-amber-500 fill-amber-400 drop-shadow-xs'
                              : 'text-stone-300 hover:text-amber-300'
                          }`} 
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-semibold text-stone-700">
                  {STAR_LABELS[activeStars] || `${activeStars} Stars`}
                </div>
              </div>

              {/* Praise / Provenance Tags */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-stone-700">
                  Key Experience Highlight (Optional):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RATING_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {selectedTag === tag ? '✓ ' : ''}{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Comment Box */}
              <div className="space-y-1.5">
                <label htmlFor="rate-seller-comment" className="block text-xs font-bold text-stone-700">
                  Collector Review / Remarks:
                </label>
                <textarea
                  id="rate-seller-comment"
                  name="comment"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={`Share your experience with ${displaySellerName} regarding artifact condition, authenticity, shipping, or negotiations...`}
                  rows={3}
                  className="w-full text-xs p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-stone-400 placeholder:text-stone-400 text-stone-900"
                />
                <span className="text-[10px] text-stone-500 block">
                  Reviews are public to help other verified collectors assess seller provenance.
                </span>
              </div>

              {/* Submit and Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>Submit Seller Rating</span>
                </button>
              </div>
            </form>
          )}

          {/* Past Community Reviews for this seller */}
          {sellerReviews.length > 0 && (
            <div className="pt-4 border-t border-stone-200/80 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                  <span>Recent Collector Appraisals ({sellerReviews.length})</span>
                </h4>
                {currentUser?.isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                    <Shield className="w-3 h-3 text-amber-700" />
                    Admin Moderation Active (Delete Enabled)
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sellerReviews.map(rev => (
                  <div 
                    key={rev.id} 
                    className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 font-bold text-[10px] flex items-center justify-center">
                          {rev.raterName ? rev.raterName.charAt(0).toUpperCase() : 'C'}
                        </span>
                        <span>{rev.raterName}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-500 text-[10px]">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">{formatTimestamp(rev.timestamp)}</span>

                        {/* Admin Exclusive Review Deletion Action */}
                        {currentUser?.isAdmin && (
                          <div className="ml-1">
                            {confirmDeleteReviewId !== rev.id ? (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteReviewId(rev.id)}
                                className="text-rose-700 hover:text-white hover:bg-rose-700 border border-rose-300 hover:border-rose-700 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Admin: Permanently delete this review"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Delete Review</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded-md text-[10px] shadow-xs">
                                <span className="text-rose-800 font-bold">Delete review?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteSellerReview(rev.id);
                                    setConfirmDeleteReviewId(null);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.5 rounded-sm cursor-pointer shadow-xs"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteReviewId(null)}
                                  className="text-stone-600 hover:text-stone-900 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {rev.tag && (
                      <span className="inline-block text-[10px] bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                        {rev.tag}
                      </span>
                    )}

                    {rev.comment && (
                      <p className="text-stone-600 italic">
                        "{rev.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

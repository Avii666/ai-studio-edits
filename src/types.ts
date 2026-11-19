export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isAdmin?: boolean;
  role_code?: number;
  roleCode?: number;
  isVerified: boolean;
  verificationIdNumber: string; // Masked identifier for display only; full ID stays on server
  verificationDate?: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
  location: string;
  sellerFeeCredits?: number;
  watchlist?: string[];
}

export interface PublicSellerProfile {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  memberSince: string;
  location: string;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  title: string;
  message: string;
  timestamp?: number;
}

export interface Bid {
  id: string;
  itemId: string;
  bidderId: string;
  bidderName: string;
  bidderAvatar: string;
  bidderVerified: boolean;
  bidderRating: number;
  amount: number;
  timestamp: string;
  isLeading?: boolean;
  isMyBid?: boolean;
}

export type ItemStatus = 'pending_approval' | 'active' | 'deal_pending' | 'sold' | 'rejected' | 'expired' | 'deal_cancelled' | 'closed';

export interface AntiqueItem {
  id: string;
  title: string;
  era: string; // e.g., 'Victorian (1890)', 'Dutch Colonial (18th c.)', 'Ming Dynasty'
  category: 'Timepieces' | 'Furniture' | 'Porcelain & Ceramic' | 'Brassware & Metal' | 'Jewellery' | 'Coins & Stamps' | 'Art & Sculptures' | 'Rare Books';
  condition: 'Pristine Antique' | 'Excellent Historical Wear' | 'Restored Patina' | 'Original Aged Condition';
  provenance: string;
  dimensions: string;
  city?: string;
  country?: string;
  location?: string;
  estimatedValueRange?: string;
  startingBid: number;
  currentBid: number;
  reservePrice?: number;
  bidCount: number;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerRating: number;
  sellerReviewCount?: number;
  createdAt: string;
  endsAt: string;
  status: ItemStatus;
  rejectionReason?: string;
  bids: Bid[];
  acceptedBidId?: string;
  chosenBuyerId?: string;
  chosenBuyerName?: string;
  chosenDealAmount?: number;
  listingFeePaid: boolean;
  listingFeeTxId?: string;
  snipedExtensionCount?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isSystemNotice?: boolean;
}

export interface ChatSession {
  id: string;
  itemId: string;
  itemTitle: string;
  itemEra: string;
  itemImage: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  dealAmount: number;
  dealStatus: 'negotiating' | 'inspection_agreed' | 'payment_escrowed' | 'deal_sealed' | 'deal_off';
  createdAt: string;
  lastMessageTime: string;
  messages: ChatMessage[];
  unreadBySeller?: boolean;
  unreadByBuyer?: boolean;
  isAdminDirectChat?: boolean;
}

export interface ContactInfo {
  organizationName: string;
  tagline: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  cityStateCountry: string;
  businessHours: string;
  inspectionHours: string;
  notes: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  submittedAt: string;
  status: 'new' | 'reviewed';
}

export interface SellerRatingReview {
  id: string;
  sellerId: string;
  sellerName: string;
  raterId: string;
  raterName: string;
  rating: number; // 1 to 5
  comment?: string;
  tag?: string;
  timestamp: string;
  itemId?: string;
  itemTitle?: string;
}

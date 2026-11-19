import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AntiqueItem,
  ChatSession,
  ContactInfo,
  ContactInquiry,
  PublicSellerProfile,
  SellerRatingReview,
  ToastNotification,
  User,
  UserRole
} from '../types';
import { CurrencyCode, CURRENCIES, formatCurrency as formatCurrencyHelper } from '../lib/currency';
import { apiRequest, scrubLegacySessionTokens } from '../lib/api';

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  organizationName: 'Antiauc Heritage Curators & Escrow Chambers',
  tagline: 'Authenticated Historical Antiquities, Rare Masterpieces & Secured Direct Negotiations',
  email: 'curator@antiauc.com',
  phone: '+1 (800) 555-8285',
  secondaryPhone: '+94 11 234 5678',
  address: 'Antiauc Vault Chambers, 45 Grand Regal Boulevard',
  cityStateCountry: 'Old Fort Quarter, Colombo 01, Sri Lanka (Global Curatorial Affiliation: London / Geneva)',
  businessHours: 'Monday – Saturday: 09:00 AM – 06:00 PM',
  inspectionHours: 'Private In-Person Viewing by Prior Appointment: 10:00 AM – 04:00 PM',
  notes: 'For confidential museum collections, estate clearances, appraisal certificates, or physical valuation of rare heirlooms, contact our Senior Appraisal Officer.'
};

interface ActionResult {
  success: boolean;
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  allUsers: User[];
  sellerProfiles: PublicSellerProfile[];
  isAdminSeatTaken: boolean;
  hasUsers: boolean;
  items: AntiqueItem[];
  chats: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  selectedItem: AntiqueItem | null;
  setSelectedItem: (item: AntiqueItem | null) => void;
  isCreateListingOpen: boolean;
  setIsCreateListingOpen: (open: boolean) => void;
  isVerificationModalOpen: boolean;
  setIsVerificationModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isProfileSettingsOpen: boolean;
  setIsProfileSettingsOpen: (open: boolean) => void;
  updateUserProfile: (data: { name?: string; phone?: string; avatar?: string; location?: string }) => Promise<ActionResult>;
  activeNavTab: 'browse' | 'seller_hub' | 'my_bids' | 'chats' | 'admin' | 'contact';
  setActiveNavTab: (tab: 'browse' | 'seller_hub' | 'my_bids' | 'chats' | 'admin' | 'contact') => void;

  // Admin Editing & Approval Controls
  editingItem: AntiqueItem | null;
  setEditingItem: (item: AntiqueItem | null) => void;
  isEditListingOpen: boolean;
  setIsEditListingOpen: (open: boolean) => void;
  approveListing: (itemId: string) => Promise<ActionResult>;
  rejectListing: (itemId: string, reason?: string) => Promise<ActionResult>;
  updateListing: (itemId: string, updatedData: Partial<AntiqueItem>) => Promise<ActionResult>;
  deleteListing: (itemId: string) => Promise<ActionResult>;

  // Contact Information & Inquiries
  contactInfo: ContactInfo;
  updateContactInfo: (info: ContactInfo) => void;
  contactInquiries: ContactInquiry[];
  submitContactInquiry: (data: Omit<ContactInquiry, 'id' | 'submittedAt' | 'status'>) => Promise<ActionResult>;
  markInquiryReviewed: (id: string) => void;

  // Listing Fee Management
  sellerListingFee: number;
  updateSellerListingFee: (newFee: number) => void;

  // Auth Actions
  registerUser: (data: { name: string; email: string; phone: string; idNumber: string; role: UserRole; password: string; location: string }) => Promise<ActionResult>;
  loginUser: (email: string, password: string) => Promise<ActionResult>;
  logoutUser: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ActionResult>;
  exportUserData: () => Promise<ActionResult>;
  deleteUserAccount: (password: string) => Promise<ActionResult>;

  // Auction & Deal Actions
  placeBid: (itemId: string, amount: number) => Promise<ActionResult>;
  updateBid: (itemId: string, bidId: string, newAmount: number) => Promise<ActionResult>;
  createListing: (data: Omit<AntiqueItem, 'id' | 'createdAt' | 'status' | 'bids' | 'currentBid' | 'bidCount' | 'listingFeePaid' | 'listingFeeTxId'>) => Promise<{ success: boolean; txId: string; requiresApproval: boolean }>;
  selectWinningBuyer: (itemId: string, bidId: string) => Promise<{ success: boolean; chatId: string }>;
  startAdminDirectChat: (itemId: string, initialMessage?: string) => Promise<{ success: boolean; chatId: string }>;
  sendChatMessage: (chatId: string, text: string) => void;
  deleteChatSession: (chatId: string) => ActionResult;
  deleteChatMessage: (chatId: string, messageId: string) => ActionResult;
  updateDealStatus: (chatId: string, status: ChatSession['dealStatus']) => void;
  markDealAsOff: (itemId: string, chatId?: string) => ActionResult;
  verifyUserAccount: (idNumber?: string, phone?: string, fullName?: string) => Promise<ActionResult>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  // Watchlist & Saved Lots
  watchlist: string[];
  toggleWatchlist: (itemId: string) => void;
  isWatchlisted: (itemId: string) => boolean;

  // In-App Toast Alerts
  toasts: ToastNotification[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'alert') => void;
  removeToast: (id: string) => void;

  // Currency Management
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (amountInRs: number, options?: { showApproxBase?: boolean; showCode?: boolean }) => string;
  currencySymbol: string;

  // Hi-Res Image Inspection Modal
  inspectionData: { images: string[]; initialIndex: number; title: string; era: string } | null;
  setInspectionData: (data: { images: string[]; initialIndex: number; title: string; era: string } | null) => void;

  // Seller Rating System
  sellerRatings: SellerRatingReview[];
  rateSeller: (sellerId: string, rating: number, comment?: string, tag?: string, itemId?: string) => Promise<ActionResult>;
  addSellerReview: (params: { sellerId?: string; sellerName?: string; rating: number; comment?: string; tag?: string; itemId?: string; itemTitle?: string }) => Promise<ActionResult>;
  deleteSellerReview: (reviewId: string) => ActionResult;
  getSellerRatings: (sellerId: string) => SellerRatingReview[];
  getSellerReviews: (sellerIdOrName: string) => SellerRatingReview[];
  getSellerAverageRating: (sellerIdOrName: string) => number;
  isRateSellerOpen: boolean;
  rateSellerTarget: { sellerId: string; sellerName: string; itemId?: string; itemTitle?: string } | null;
  openRateSellerModal: (target: { sellerId: string; sellerName: string; itemId?: string; itemTitle?: string }) => void;
  closeRateSellerModal: () => void;

  // Theme (Dark Mode)
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Database Role Management (0 = Admin, 1 = Normal user)
  setUserRoleCode: (userId: string, roleCode: number) => Promise<ActionResult>;

  // Live Feed / Network Health
  isBootstrapping: boolean;
  connectionError: string | null;
  retrySync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Only non-sensitive UI preferences are kept in localStorage
const LOCAL_STORAGE_WATCHLIST_KEY = 'antique_marketplace_watchlist_v2';
const LOCAL_STORAGE_CURRENCY_KEY = 'antique_marketplace_currency_v2';

// Legacy sensitive keys to scrub immediately from any visitor's browser
const LEGACY_SENSITIVE_KEYS = [
  'antique_marketplace_users_v2_fresh',
  'antique_marketplace_current_user_id_v2_fresh',
  'antique_marketplace_chats_v2_fresh',
  'antique_marketplace_inquiries_v2',
  'antique_marketplace_items_v2_fresh',
  'antique_marketplace_seller_ratings_v2',
  'antique_marketplace_contact_info_v2',
  'antique_marketplace_seller_fee_v2'
];

const sanitizeChatSession = (chat: ChatSession): ChatSession => ({
  ...chat,
  messages: Array.isArray(chat.messages) ? chat.messages : []
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<PublicSellerProfile[]>([]);
  const [isAdminSeatTaken, setIsAdminSeatTaken] = useState<boolean>(true);
  const [hasUsers, setHasUsers] = useState<boolean>(true);
  const [items, setItems] = useState<AntiqueItem[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [sellerRatings, setSellerRatings] = useState<SellerRatingReview[]>([]);
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [sellerListingFee, setSellerListingFee] = useState<number>(0);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const currentRole: UserRole = currentUser?.role || 'buyer';

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('antiauc_dark_mode');
      if (saved !== null) return saved === 'true';
    } catch {}
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('antiauc_dark_mode', String(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AntiqueItem | null>(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

  const validTabs = ['browse', 'seller_hub', 'my_bids', 'chats', 'admin', 'contact'] as const;
  type NavTab = (typeof validTabs)[number];

  const [activeNavTab, setActiveNavTabState] = useState<NavTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const viewParam = new URLSearchParams(window.location.search).get('view');
        if (viewParam && (validTabs as readonly string[]).includes(viewParam)) {
          return viewParam as NavTab;
        }
      }
      const saved = sessionStorage.getItem('antiauc_active_tab');
      if (saved && (validTabs as readonly string[]).includes(saved)) {
        return saved as NavTab;
      }
    } catch {}
    return 'browse';
  });

  const setActiveNavTab = (tab: NavTab) => {
    setActiveNavTabState(tab);
    try {
      sessionStorage.setItem('antiauc_active_tab', tab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (tab === 'browse') url.searchParams.delete('view');
        else url.searchParams.set('view', tab);
        const queryStr = url.searchParams.toString();
        window.history.replaceState(null, '', url.pathname + (queryStr ? `?${queryStr}` : ''));
      }
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const viewParam = new URLSearchParams(window.location.search).get('view');
      if (viewParam && (validTabs as readonly string[]).includes(viewParam)) {
        setActiveNavTabState(viewParam as NavTab);
      } else {
        setActiveNavTabState('browse');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [editingItem, setEditingItem] = useState<AntiqueItem | null>(null);
  const [isEditListingOpen, setIsEditListingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedCurrency, setSelectedCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
      if (saved && saved in CURRENCIES) return saved as CurrencyCode;
    } catch {}
    return 'LKR';
  });

  const setSelectedCurrency = (code: CurrencyCode) => {
    setSelectedCurrencyState(code);
    try {
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, code);
    } catch {}
  };

  const formatCurrency = (amountInRs: number, options?: { showApproxBase?: boolean; showCode?: boolean }) => {
    return formatCurrencyHelper(amountInRs, selectedCurrency, options);
  };

  const currencySymbol = CURRENCIES[selectedCurrency]?.symbol || 'Rs.';

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'alert' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const toggleWatchlist = (itemId: string) => {
    const exists = watchlist.includes(itemId);
    const next = exists ? watchlist.filter(id => id !== itemId) : [...watchlist, itemId];
    setWatchlist(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_WATCHLIST_KEY, JSON.stringify(next));
    } catch {}
    if (currentUser) {
      apiRequest('/api/auth/watchlist', {
        method: 'PATCH',
        body: JSON.stringify({ watchlist: next })
      }).catch(() => {});
    }
    addToast(
      exists ? 'Removed from Watchlist' : 'Saved to Watchlist',
      exists ? 'Item removed from your saved lots.' : 'Lot saved! Watchlist items are tracked under My Bids.',
      'info'
    );
  };

  const isWatchlisted = (itemId: string) => watchlist.includes(itemId);

  const [inspectionData, setInspectionData] = useState<{ images: string[]; initialIndex: number; title: string; era: string } | null>(null);
  const [isRateSellerOpen, setIsRateSellerOpen] = useState(false);
  const [rateSellerTarget, setRateSellerTarget] = useState<{
    sellerId: string;
    sellerName: string;
    itemId?: string;
    itemTitle?: string;
  } | null>(null);

  const openRateSellerModal = (target: { sellerId: string; sellerName: string; itemId?: string; itemTitle?: string }) => {
    setRateSellerTarget(target);
    setIsRateSellerOpen(true);
  };

  const closeRateSellerModal = () => {
    setIsRateSellerOpen(false);
    setRateSellerTarget(null);
  };

  // Scrub any legacy cached PII/credentials from browser storage on mount
  useEffect(() => {
    scrubLegacySessionTokens();
    try {
      for (const key of LEGACY_SENSITIVE_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {}
  }, []);

  // Selected item sync
  useEffect(() => {
    if (selectedItem) {
      const refreshed = items.find(i => i.id === selectedItem.id);
      if (refreshed && refreshed !== selectedItem) {
        setSelectedItem(refreshed);
      }
    }
  }, [items, selectedItem]);

  const syncFromServer = useCallback(async () => {
    try {
      const data = await apiRequest<any>('/api/bootstrap');
      if (!data || data.error || data.success === false) {
        setConnectionError(data?.message || 'Unable to reach live marketplace feed.');
        return;
      }
      setConnectionError(null);
      if (!data.currentUser) {
        scrubLegacySessionTokens();
        setActiveNavTabState(prev => (prev === 'contact' || prev === 'browse' ? prev : 'browse'));
      } else if (Array.isArray(data.currentUser.watchlist)) {
        setWatchlist(data.currentUser.watchlist);
        try {
          localStorage.setItem(LOCAL_STORAGE_WATCHLIST_KEY, JSON.stringify(data.currentUser.watchlist));
        } catch {}
      }
      setCurrentUser(data.currentUser || null);
      setIsAdminSeatTaken(Boolean(data.isAdminSeatTaken));
      setHasUsers(Boolean(data.hasUsers));
      setItems(Array.isArray(data.items) ? data.items : []);
      setSellerProfiles(Array.isArray(data.sellerProfiles) ? data.sellerProfiles : []);
      setChats(Array.isArray(data.chats) ? data.chats.map(sanitizeChatSession) : []);
      setSellerRatings(Array.isArray(data.sellerRatings) ? data.sellerRatings : []);
      setContactInquiries(Array.isArray(data.inquiries) ? data.inquiries : []);
      setAllUsers(Array.isArray(data.users) ? data.users : []);
      if (data.platformSettings) {
        if (typeof data.platformSettings.sellerListingFee === 'number') {
          setSellerListingFee(data.platformSettings.sellerListingFee);
        }
        if (data.platformSettings.contactInfo) {
          setContactInfo(data.platformSettings.contactInfo);
        }
      }
    } catch {
      setConnectionError('Unable to synchronize live marketplace feed.');
    }
  }, []);

  // Initial load + Server-Sent Events realtime sync (with automatic Vercel polling fallback)
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryDelayMs = 2000;
    let isMounted = true;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (isMounted && document.visibilityState === 'visible') {
          void syncFromServer();
        }
      }, 30000);
    };

    const connectSse = () => {
      if (!isMounted || typeof EventSource === 'undefined') {
        startPolling();
        return;
      }
      try {
        es = new EventSource('/api/events');
        es.onopen = () => {
          retryDelayMs = 2000;
        };
        es.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data);
            if (parsed?.type === 'poll_only') {
              if (es) {
                es.close();
                es = null;
              }
              startPolling();
              return;
            }
            if (parsed?.type === 'sync') {
              void syncFromServer();
            }
          } catch {}
        };
        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          if (!isMounted) return;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          const delay = retryDelayMs;
          retryDelayMs = Math.min(30000, Math.round(retryDelayMs * 1.5));
          reconnectTimer = setTimeout(() => {
            connectSse();
          }, delay);
        };
      } catch {
        startPolling();
      }
    };

    void syncFromServer().finally(() => {
      if (!isMounted) return;
      setIsBootstrapping(false);
      connectSse();
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncFromServer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (es) es.close();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncFromServer]);

  const updateSellerListingFee = (newFee: number) => {
    const fee = Math.max(0, newFee);
    setSellerListingFee(fee);
    apiRequest('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ sellerListingFee: fee })
    })
      .then((res) => {
        if (res && res.success === false) {
          addToast('Update Failed', res.message || 'Could not update listing fee.', 'alert');
        }
        return syncFromServer();
      })
      .catch(() => {
        addToast('Network Error', 'Failed to update listing fee.', 'alert');
      });
  };

  const registerUser = async (data: { name: string; email: string; phone: string; idNumber: string; role: UserRole; password: string; location: string }): Promise<ActionResult> => {
    const res = await apiRequest<ActionResult & { user?: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!res.success || !res.user) {
      return { success: false, message: res.message || 'Registration failed.' };
    }

    setCurrentUser(res.user);
    await syncFromServer();

    if (res.user.isAdmin) {
      setActiveNavTab('admin');
    }

    return { success: true, message: res.message };
  };

  const loginUser = async (email: string, password: string): Promise<ActionResult> => {
    const res = await apiRequest<ActionResult & { user?: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!res.success || !res.user) {
      return { success: false, message: res.message || 'Invalid email or password.' };
    }

    setCurrentUser(res.user);
    await syncFromServer();

    if (res.user.isAdmin) {
      setActiveNavTab('admin');
    } else if (res.user.role === 'seller') {
      setActiveNavTab('seller_hub');
    } else {
      setActiveNavTab('browse');
    }

    return { success: true, message: res.message };
  };

  const logoutUser = () => {
    scrubLegacySessionTokens();
    setCurrentUser(null);
    setAllUsers([]);
    setChats([]);
    setContactInquiries([]);
    setActiveChatId(null);
    setActiveNavTab('browse');
    apiRequest('/api/auth/logout', { method: 'POST' })
      .then(() => syncFromServer())
      .catch(() => {});
  };

  const updateContactInfo = (info: ContactInfo) => {
    setContactInfo(info);
    apiRequest('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ contactInfo: info })
    })
      .then((res) => {
        if (res && res.success === false) {
          addToast('Update Failed', res.message || 'Could not update curatorial contact details.', 'alert');
        }
        return syncFromServer();
      })
      .catch(() => {
        addToast('Network Error', 'Could not update contact information.', 'alert');
      });
  };

  const submitContactInquiry = async (data: Omit<ContactInquiry, 'id' | 'submittedAt' | 'status'>): Promise<ActionResult> => {
    const res = await apiRequest<ActionResult>('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) await syncFromServer();
    return {
      success: Boolean(res.success),
      message: res.message || 'Your inquiry has been transmitted to the curatorial desk.'
    };
  };

  const markInquiryReviewed = (id: string) => {
    setContactInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: 'reviewed' } : inq));
    apiRequest(`/api/inquiries/${encodeURIComponent(id)}/reviewed`, { method: 'POST' }).catch(() => {});
  };

  const approveListing = async (itemId: string): Promise<ActionResult> => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'active', rejectionReason: undefined } : it));
    await apiRequest(`/api/items/${encodeURIComponent(itemId)}/approve`, { method: 'POST' });
    await syncFromServer();
    return { success: true, message: 'Lot approved! It is now live on the public auction catalog.' };
  };

  const rejectListing = async (itemId: string, reason?: string): Promise<ActionResult> => {
    const defaultReason = reason || 'Documentation, era verification, or photo standards not met.';
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'rejected', rejectionReason: defaultReason } : it));
    await apiRequest(`/api/items/${encodeURIComponent(itemId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: defaultReason })
    });
    await syncFromServer();
    return { success: true, message: 'Lot rejected and feedback noted for seller.' };
  };

  const updateListing = async (itemId: string, updatedData: Partial<AntiqueItem>): Promise<ActionResult> => {
    const res = await apiRequest<{ success: boolean; item?: AntiqueItem; message?: string }>(
      `/api/items/${encodeURIComponent(itemId)}`,
      { method: 'PATCH', body: JSON.stringify(updatedData) }
    );
    if (!res.success) {
      return { success: false, message: res.message || 'Failed to update listing.' };
    }
    await syncFromServer();
    return { success: true, message: 'Listing specifications updated successfully.' };
  };

  const deleteListing = async (itemId: string): Promise<ActionResult> => {
    setItems(prev => prev.filter(it => it.id !== itemId));
    if (selectedItem?.id === itemId) setSelectedItem(null);
    if (editingItem?.id === itemId) {
      setEditingItem(null);
      setIsEditListingOpen(false);
    }
    await apiRequest(`/api/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    await syncFromServer();
    return { success: true, message: 'Antique lot has been permanently removed.' };
  };

  const switchRole = (newRole: UserRole) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (newRole === 'admin' && !currentUser.isAdmin) return;

    setCurrentUser(prev => prev ? { ...prev, role: newRole } : prev);
    if (newRole === 'seller') setActiveNavTab('seller_hub');
    else if (newRole === 'admin') setActiveNavTab('admin');
    else setActiveNavTab('browse');

    apiRequest('/api/auth/role', {
      method: 'POST',
      body: JSON.stringify({ role: newRole })
    }).catch(() => {});
  };

  const verifyUserAccount = async (idNumber?: string, phone?: string, fullName?: string): Promise<ActionResult> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, message: 'Please log in or register first.' };
    }
    const res = await apiRequest<ActionResult & { user?: User }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ idNumber, phone, fullName })
    });
    if (res.success && res.user) {
      setCurrentUser(res.user);
      await syncFromServer();
    }
    return { success: Boolean(res.success), message: res.message || 'Verification completed.' };
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<ActionResult> => {
    if (!currentUser) {
      return { success: false, message: 'You must be logged in to change your password.' };
    }
    const res = await apiRequest<ActionResult>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return { success: Boolean(res.success), message: res.message || 'Password updated.' };
  };

  const exportUserData = async (): Promise<ActionResult> => {
    if (!currentUser) {
      return { success: false, message: 'Please sign in to export your data.' };
    }
    try {
      const response = await fetch('/api/auth/export', { credentials: 'include' });
      if (!response.ok) {
        return { success: false, message: 'Could not prepare personal data export.' };
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `antiauc-personal-data-${currentUser.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Data Export Ready', 'Your personal account archive has been downloaded.', 'success');
      return { success: true, message: 'Your personal data archive was downloaded.' };
    } catch {
      return { success: false, message: 'Network error while preparing data export.' };
    }
  };

  const deleteUserAccount = async (password: string): Promise<ActionResult> => {
    if (!currentUser) {
      return { success: false, message: 'You must be signed in to delete your account.' };
    }
    const res = await apiRequest<ActionResult>('/api/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password })
    });
    if (!res.success) {
      return { success: false, message: res.message || 'Unable to delete account.' };
    }
    scrubLegacySessionTokens();
    setCurrentUser(null);
    setAllUsers([]);
    setChats([]);
    setContactInquiries([]);
    setActiveChatId(null);
    setIsProfileSettingsOpen(false);
    setActiveNavTab('browse');
    await syncFromServer();
    addToast('Account Deleted', 'Your account has been permanently removed and anonymized.', 'info');
    return { success: true, message: res.message || 'Account deleted.' };
  };

  const updateUserProfile = async (data: { name?: string; phone?: string; avatar?: string; location?: string }): Promise<ActionResult> => {
    if (!currentUser) {
      return { success: false, message: 'You must be signed in to perform this action.' };
    }
    const res = await apiRequest<ActionResult & { user?: User }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (res.success && res.user) {
      setCurrentUser(res.user);
      await syncFromServer();
    }
    return { success: Boolean(res.success), message: res.message || 'Profile updated.' };
  };

  const setUserRoleCode = async (userId: string, roleCode: number): Promise<ActionResult> => {
    const code = Number(roleCode) === 0 ? 0 : 1;
    const isTargetAdmin = code === 0;
    let targetUserName = allUsers.find(u => u.id === userId)?.name || 'User';

    const res = await apiRequest<ActionResult>(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ roleCode: code })
    });

    if (res.success) {
      await syncFromServer();
      addToast(
        'Authority Level Updated',
        `${targetUserName} is now set to ${isTargetAdmin ? 'Admin' : 'Standard User'}.`,
        'success'
      );
      return {
        success: true,
        message: `${targetUserName} updated to ${isTargetAdmin ? 'Admin' : 'Standard User'}.`
      };
    }
    return { success: false, message: res.message || 'Permission denied.' };
  };

  const markDealAsOff = (itemId: string): ActionResult => {
    if (!currentUser) return { success: false, message: 'You must be signed in to perform this action.' };
    const item = items.find(i => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found.' };
    if (item.sellerId !== currentUser.id && !currentUser.isAdmin) {
      return { success: false, message: 'Only the seller or an administrator can mark a deal as called off.' };
    }

    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'deal_cancelled' } : i));
    apiRequest(`/api/items/${encodeURIComponent(itemId)}/deal-off`, { method: 'POST' })
      .then(() => syncFromServer())
      .catch(() => {
        addToast('Sync Error', 'Could not persist deal cancellation status.', 'alert');
      });

    return {
      success: true,
      message: 'The deal has been marked as called off. The listing is now closed from the homepage and moved to Previous Exchanges.'
    };
  };

  const updateBid = async (itemId: string, bidId: string, newAmount: number): Promise<ActionResult> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, message: 'Please log in to edit your bid.' };
    }
    const res = await apiRequest<ActionResult>(`/api/items/${encodeURIComponent(itemId)}/bids/${encodeURIComponent(bidId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ amount: newAmount })
    });
    if (!res.success) {
      return { success: false, message: res.message || 'Unable to update bid.' };
    }
    await syncFromServer();
    return {
      success: true,
      message: `Your bid price has been successfully updated to ${formatCurrency(newAmount)}.`
    };
  };

  const placeBid = async (itemId: string, amount: number): Promise<ActionResult> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, message: 'Please sign up or log in to place bids on antique lots.' };
    }
    if (!currentUser.isVerified) {
      setIsVerificationModalOpen(true);
      return { success: false, message: 'Only verified collectors can place bids. Please complete verification first.' };
    }

    const res = await apiRequest<ActionResult>(`/api/items/${encodeURIComponent(itemId)}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });

    if (!res.success) {
      return { success: false, message: res.message || 'Unable to place bid.' };
    }

    await syncFromServer();
    addToast(
      'Bid Placed Successfully',
      `Your bid of ${formatCurrency(amount)} is recorded as the leading bid.`,
      'success'
    );
    return {
      success: true,
      message: `Your bid of ${formatCurrency(amount)} has been placed as highest bid!`
    };
  };

  const createListing = async (data: Omit<AntiqueItem, 'id' | 'createdAt' | 'status' | 'bids' | 'currentBid' | 'bidCount' | 'listingFeePaid' | 'listingFeeTxId'>) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, txId: '', requiresApproval: false };
    }
    const res = await apiRequest<{ success: boolean; txId?: string; requiresApproval?: boolean }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) {
      await syncFromServer();
    }
    return {
      success: Boolean(res.success),
      txId: res.txId || '',
      requiresApproval: Boolean(res.requiresApproval)
    };
  };

  const selectWinningBuyer = async (itemId: string, bidId: string) => {
    if (!currentUser) return { success: false, chatId: '' };
    const res = await apiRequest<{ success: boolean; chatId?: string }>(
      `/api/items/${encodeURIComponent(itemId)}/select-winner`,
      { method: 'POST', body: JSON.stringify({ bidId }) }
    );
    if (res.success && res.chatId) {
      await syncFromServer();
      setActiveChatId(res.chatId);
      setActiveNavTab('chats');
      return { success: true, chatId: res.chatId };
    }
    return { success: false, chatId: '' };
  };

  const startAdminDirectChat = async (itemId: string, initialMessage?: string) => {
    if (!currentUser?.isAdmin) {
      addToast('Access Denied', 'Only administrators have authority to directly message sellers during listing.', 'alert');
      return { success: false, chatId: '' };
    }
    const res = await apiRequest<{ success: boolean; chatId?: string; message?: string }>(
      '/api/chats/admin-direct',
      { method: 'POST', body: JSON.stringify({ itemId, initialMessage }) }
    );
    if (res.success && res.chatId) {
      await syncFromServer();
      setActiveChatId(res.chatId);
      addToast('Direct Chat Opened', 'Direct message channel with seller opened.', 'success');
      return { success: true, chatId: res.chatId };
    }
    addToast('Error', res.message || 'Could not start direct chat.', 'alert');
    return { success: false, chatId: '' };
  };

  const sendChatMessage = (chatId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    apiRequest(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() })
    })
      .then((res) => {
        if (res && res.success === false) {
          addToast('Message Error', res.message || 'Could not deliver message.', 'alert');
        }
        return syncFromServer();
      })
      .catch(() => {
        addToast('Connection Error', 'Failed to send message. Please retry.', 'alert');
      });
  };

  const updateDealStatus = (chatId: string, status: ChatSession['dealStatus']) => {
    if (!currentUser) return;
    apiRequest(`/api/chats/${encodeURIComponent(chatId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
      .then((res) => {
        if (res && res.success === false) {
          addToast('Status Error', res.message || 'Could not update deal status.', 'alert');
          return syncFromServer();
        }
        if (status === 'deal_sealed') {
          addToast('Deal Finalized ✓', 'The deal has been successfully sealed and archived under Previous Exchanges.', 'success');
        }
        return syncFromServer();
      })
      .catch(() => {
        addToast('Connection Error', 'Could not update deal status.', 'alert');
      });
  };

  const deleteChatMessage = (chatId: string, messageId: string): ActionResult => {
    if (!currentUser?.isAdmin) {
      addToast('Permission Denied', 'Only administrators have authority to delete messages.', 'alert');
      return { success: false, message: 'Only administrators can delete messages.' };
    }
    apiRequest(`/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE'
    })
      .then(() => syncFromServer())
      .catch(() => {});
    addToast('Message Deleted', 'The administrator message was deleted.', 'info');
    return { success: true, message: 'Message deleted successfully.' };
  };

  const deleteChatSession = (chatId: string): ActionResult => {
    if (!currentUser?.isAdmin) {
      addToast('Permission Denied', 'Only administrators have authority to delete chat sessions.', 'alert');
      return { success: false, message: 'Only administrators can delete chat sessions.' };
    }
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
    apiRequest(`/api/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE' })
      .then(() => syncFromServer())
      .catch(() => {});
    addToast('Chat Deleted', 'Deal room / admin message was deleted.', 'info');
    return { success: true, message: 'Chat successfully deleted.' };
  };

  const getSellerRatings = (sellerId: string): SellerRatingReview[] => {
    return sellerRatings.filter(r => r.sellerId === sellerId);
  };

  const getSellerReviews = (sellerIdOrName: string): SellerRatingReview[] => {
    if (!sellerIdOrName) return [];
    const term = sellerIdOrName.trim().toLowerCase();
    return sellerRatings.filter(r =>
      r.sellerId.toLowerCase() === term || r.sellerName.toLowerCase() === term
    );
  };

  const getSellerAverageRating = (sellerIdOrName: string): number => {
    if (!sellerIdOrName) return 5.0;
    const term = sellerIdOrName.trim().toLowerCase();
    const matchedProfile = sellerProfiles.find(u => u.id.toLowerCase() === term || u.name.toLowerCase() === term);
    if (matchedProfile?.rating) return matchedProfile.rating;
    const reviews = getSellerReviews(sellerIdOrName);
    if (reviews.length === 0) return 5.0;
    return Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
  };

  const addSellerReview = async (params: {
    sellerId?: string;
    sellerName?: string;
    rating: number;
    comment?: string;
    tag?: string;
    itemId?: string;
    itemTitle?: string;
  }): Promise<ActionResult> => {
    let targetSellerId = params.sellerId;
    if (!targetSellerId && params.sellerName) {
      const u = sellerProfiles.find(user => user.name.toLowerCase() === params.sellerName?.trim().toLowerCase());
      if (u) targetSellerId = u.id;
    }
    if (!targetSellerId && params.itemId) {
      const item = items.find(it => it.id === params.itemId);
      if (item) targetSellerId = item.sellerId;
    }
    return rateSeller(
      targetSellerId || (params.sellerName ? `seller_${params.sellerName.replace(/\s+/g, '_').toLowerCase()}` : 'unknown_seller'),
      params.rating,
      params.comment,
      params.tag,
      params.itemId
    );
  };

  const rateSeller = async (
    sellerId: string,
    rating: number,
    comment?: string,
    tag?: string,
    itemId?: string
  ): Promise<ActionResult> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, message: 'Please log in or register to submit a seller rating.' };
    }
    if (currentUser.id === sellerId) {
      addToast('Invalid Action', 'Sellers cannot rate their own profile or lots.', 'alert');
      return { success: false, message: 'Sellers cannot rate their own profile or lots.' };
    }

    const targetItem = itemId ? items.find(i => i.id === itemId) : undefined;
    const targetSeller = sellerProfiles.find(u => u.id === sellerId);
    const sellerName = targetSeller?.name || targetItem?.sellerName || 'Verified Antique Seller';

    const res = await apiRequest<ActionResult>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({
        sellerId,
        sellerName,
        rating,
        comment,
        tag,
        itemId,
        itemTitle: targetItem?.title
      })
    });

    if (!res.success) {
      return { success: false, message: res.message || 'Unable to save rating.' };
    }

    await syncFromServer();
    addToast('Seller Rating Recorded', `You gave ${sellerName} ${rating} ★. Your appraisal contributes to community trust!`, 'success');
    return { success: true, message: `Rating of ${rating} stars recorded for ${sellerName}.` };
  };

  const deleteSellerReview = (reviewId: string): ActionResult => {
    if (!currentUser?.isAdmin) {
      addToast('Permission Denied', 'Only administrators have authority to delete seller reviews.', 'alert');
      return { success: false, message: 'Only administrators can delete seller reviews.' };
    }
    setSellerRatings(prev => prev.filter(r => r.id !== reviewId));
    apiRequest(`/api/ratings/${encodeURIComponent(reviewId)}`, { method: 'DELETE' })
      .then(() => syncFromServer())
      .catch(() => {});
    addToast('Review Removed', 'The review was permanently deleted by Master Admin.', 'info');
    return { success: true, message: 'Review successfully removed by administrator.' };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        allUsers,
        sellerProfiles,
        isAdminSeatTaken,
        hasUsers,
        items,
        chats,
        activeChatId,
        setActiveChatId,
        selectedItem,
        setSelectedItem,
        isCreateListingOpen,
        setIsCreateListingOpen,
        isVerificationModalOpen,
        setIsVerificationModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isProfileSettingsOpen,
        setIsProfileSettingsOpen,
        updateUserProfile,
        activeNavTab,
        setActiveNavTab,
        editingItem,
        setEditingItem,
        isEditListingOpen,
        setIsEditListingOpen,
        approveListing,
        rejectListing,
        updateListing,
        deleteListing,
        contactInfo,
        updateContactInfo,
        contactInquiries,
        submitContactInquiry,
        markInquiryReviewed,
        sellerListingFee,
        updateSellerListingFee,
        registerUser,
        loginUser,
        logoutUser,
        changePassword,
        exportUserData,
        deleteUserAccount,
        placeBid,
        updateBid,
        createListing,
        selectWinningBuyer,
        startAdminDirectChat,
        sendChatMessage,
        deleteChatSession,
        deleteChatMessage,
        updateDealStatus,
        markDealAsOff,
        verifyUserAccount,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        watchlist,
        toggleWatchlist,
        isWatchlisted,
        selectedCurrency,
        setSelectedCurrency,
        formatCurrency,
        currencySymbol,
        toasts,
        addToast,
        removeToast,
        inspectionData,
        setInspectionData,
        sellerRatings,
        rateSeller,
        addSellerReview,
        deleteSellerReview,
        getSellerRatings,
        getSellerReviews,
        getSellerAverageRating,
        isRateSellerOpen,
        rateSellerTarget,
        openRateSellerModal,
        closeRateSellerModal,
        setUserRoleCode,
        isDarkMode,
        toggleDarkMode,
        isBootstrapping,
        connectionError,
        retrySync: syncFromServer
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

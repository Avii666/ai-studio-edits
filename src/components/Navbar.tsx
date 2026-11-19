import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';
import { 
  Plus, 
  MessageSquare, 
  Gavel, 
  ChevronDown, 
  Store, 
  ShoppingBag, 
  Coins, 
  LogOut, 
  UserPlus, 
  Settings,
  User,
  Moon,
  Sun
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const app = useApp();
  const {
    currentUser,
    isBootstrapping,
    currentRole,
    switchRole,
    activeNavTab,
    setActiveNavTab,
    setIsCreateListingOpen,
    setIsAuthModalOpen,
    logoutUser,
    chats,
    items,
    sellerListingFee,
    setIsProfileSettingsOpen,
    formatCurrency
  } = app;

  const [localDark, setLocalDark] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('antiauc_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Sync with document element on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('antiauc_dark_mode');
      if (saved === 'true') {
        document.documentElement.classList.add('dark');
        setLocalDark(true);
      } else if (saved === 'false') {
        document.documentElement.classList.remove('dark');
        setLocalDark(false);
      }
    } catch {}
  }, []);

  const activeDarkMode = typeof app?.isDarkMode === 'boolean' ? app.isDarkMode : localDark;

  const handleToggleDarkMode = () => {
    if (typeof app?.toggleDarkMode === 'function') {
      app.toggleDarkMode();
      setLocalDark(!activeDarkMode);
    } else {
      const next = !document.documentElement.classList.contains('dark');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('antiauc_dark_mode', next ? 'true' : 'false');
      } catch {}
      setLocalDark(next);
    }
  };

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Active chats where current user is participant and deal is ongoing
  const userChats = currentUser 
    ? chats.filter(c => {
        const isParticipant = c.sellerId === currentUser.id || c.buyerId === currentUser.id;
        if (!isParticipant) return false;
        if (c.isAdminDirectChat && !(c.messages || []).some(m => !m.isSystemNotice)) return false;
        if (c.dealStatus === 'deal_sealed' || c.dealStatus === 'deal_off') return false;
        const item = items.find(i => i.id === c.itemId);
        if (item && item.status === 'sold') return false;
        return true;
      })
    : [];

  return (
    <header className="relative z-40 bg-white border-b border-stone-200/80">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div 
          onClick={() => setActiveNavTab('browse')}
          className="cursor-pointer flex items-center gap-3.5 group"
          id="brand-logo"
        >
          <div className="w-12 h-12 shrink-0 rounded-xl bg-stone-900 text-amber-300 border border-stone-800 flex items-center justify-center shadow-xs group-hover:bg-stone-800 transition-colors">
            <Gavel className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-brand-cinzel font-serif-heading text-2xl font-bold tracking-wider text-stone-900 leading-none">
                ANTIAUC
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium tracking-tight hidden sm:block mt-1">
              Antique Auctions
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher & Tab Navigation (Visible ONLY after login) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {currentUser && (
            <>
              {/* Mode Switcher Pill */}
              <div 
                className="bg-stone-100 p-0.5 rounded-lg border border-stone-200/80 shadow-2xs flex items-center transition-all gap-0.5" 
                id="role-mode-switcher"
                role="group"
                aria-label="Marketplace Role Mode"
              >
                <button
                  onClick={() => switchRole('buyer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    currentRole === 'buyer'
                      ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/60 font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                  id="switch-to-buyer-btn"
                  title="Switch to Buyer / Collector Mode (Browse lots, place sealed & live bids)"
                >
                  <div className="relative">
                    <ShoppingBag className={`w-3.5 h-3.5 ${currentRole === 'buyer' ? 'text-stone-900' : 'text-stone-500'}`} />
                    {currentRole === 'buyer' && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    )}
                  </div>
                  <span className="tracking-tight">Buyer</span>
                </button>

                <button
                  onClick={() => switchRole('seller')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    currentRole === 'seller'
                      ? 'bg-stone-900 text-white shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                  }`}
                  id="switch-to-seller-btn"
                  title={`Switch to Consignor / Seller Mode (List authenticated relics, listing fee ${formatCurrency(sellerListingFee)})`}
                >
                  <div className="relative">
                    <Store className={`w-3.5 h-3.5 ${currentRole === 'seller' ? 'text-amber-300' : 'text-stone-500'}`} />
                  </div>
                  <span className="tracking-tight">Seller</span>
                </button>
              </div>

              {/* Navigation Links (Visible ONLY after login) */}
              <nav className="hidden lg:flex items-center ml-2 gap-1">
                {currentRole === 'seller' ? (
                  <button
                    onClick={() => setActiveNavTab('seller_hub')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      activeNavTab === 'seller_hub'
                        ? 'bg-stone-100 text-stone-950 font-semibold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    Seller Hub
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveNavTab('my_bids')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      activeNavTab === 'my_bids'
                        ? 'bg-stone-100 text-stone-950 font-semibold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    My Bids
                  </button>
                )}

                <button
                  onClick={() => setActiveNavTab('chats')}
                  className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeNavTab === 'chats'
                      ? 'bg-stone-100 text-stone-950 font-semibold shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                  <span>Chats</span>
                  {userChats.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white">
                      {userChats.length}
                    </span>
                  )}
                </button>

                {currentUser?.isAdmin && (
                  <button
                    onClick={() => setActiveNavTab('admin')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      activeNavTab === 'admin'
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Admin</span>
                  </button>
                )}
              </nav>
            </>
          )}
        </div>

        {/* Right: Actions, Verification status & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Post Product (Only visible after login) */}
          {currentUser && (
            currentRole === 'seller' ? (
              <button
                onClick={() => setIsCreateListingOpen(true)}
                className="hidden sm:flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide shadow-2xs transition-colors cursor-pointer"
                id="post-antique-btn"
                title={`List an Antique (${formatCurrency(sellerListingFee)} listing fee)`}
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" />
                <span>List Antique</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  switchRole('seller');
                  setIsCreateListingOpen(true);
                }}
                className="hidden sm:flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 px-2 py-1 font-medium cursor-pointer"
              >
                <span>Sell an Antique?</span>
              </button>
            )
          )}

          {/* User state / Profile */}
          {currentUser ? (
            <>
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200/80 transition-colors shadow-2xs cursor-pointer"
                  id="profile-dropdown-trigger"
                >
                  {currentUser.avatar ? (
                    <SafeImage
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-stone-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-[10px] border border-stone-800">
                      {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-4 h-4 text-amber-200" />}
                    </div>
                  )}
                  <div className="text-left hidden md:block">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-stone-900 leading-tight truncate max-w-[110px]">
                        {currentUser.name}
                      </p>
                      {currentUser.isAdmin && (
                        <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1 rounded-xs">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 capitalize leading-none">
                      {currentUser.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 mr-1" />
                </button>

                {/* Profile Menu */}
                {isProfileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-xl py-2 z-50 text-xs">
                      <div className="px-3 py-2 border-b border-stone-100">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-stone-900">{currentUser.name}</p>
                          {currentUser.isAdmin && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-stone-500 text-[11px] truncate">{currentUser.email}</p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                          <span>Role: <strong className="capitalize text-stone-800">{currentUser.role}</strong></span>
                          <span className="text-emerald-700 font-medium">✓ Verified Identity</span>
                        </div>
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        {/* Settings Button */}
                        <button
                          onClick={() => {
                            setIsProfileSettingsOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-stone-50 text-stone-800 font-medium transition-colors cursor-pointer"
                          id="profile-dropdown-settings-btn"
                        >
                          <Settings className="w-4 h-4 text-stone-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="block leading-tight text-xs font-semibold">Account & Profile Settings</span>
                            <span className="text-[10px] text-stone-400 font-normal block leading-tight mt-0.5">
                              View profile, add photo, change password
                            </span>
                          </div>
                        </button>

                        {currentUser.isAdmin && (
                          <button
                            onClick={() => {
                              setActiveNavTab('admin');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-stone-900 bg-amber-50/70 hover:bg-amber-100/70 font-medium transition-colors cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit Seller Listing Fee ({formatCurrency(sellerListingFee)})</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            logoutUser();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : isBootstrapping ? (
            <div
              className="h-9 w-28 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              id="nav-login-signup-btn"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign In / Join</span>
            </button>
          )}

          {/* Darker Mode Switch - Visible both before and after login, placed to the right */}
          <button
            type="button"
            onClick={handleToggleDarkMode}
            className="p-2 rounded-lg border border-stone-200/80 bg-stone-50 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 hover:text-stone-900 dark:text-stone-200 dark:hover:text-white transition-colors shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
            title={activeDarkMode ? 'Switch to Light Mode' : 'Switch to Darker Mode'}
            aria-label="Toggle darker mode"
            id="dark-mode-toggle-btn"
          >
            {activeDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar (Only after login) */}
      {currentUser && (
        <div className="lg:hidden border-t border-stone-200/80 bg-stone-50 px-4 py-2 flex items-center justify-around text-xs">
          <button
            onClick={() => setActiveNavTab('browse')}
            className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
              activeNavTab === 'browse' ? 'font-bold text-stone-950 bg-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Curated Lots</span>
          </button>

          {currentRole === 'seller' ? (
            <button
              onClick={() => setActiveNavTab('seller_hub')}
              className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                activeNavTab === 'seller_hub' ? 'font-bold text-stone-950 bg-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Seller Hub</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveNavTab('my_bids')}
              className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                activeNavTab === 'my_bids' ? 'font-bold text-stone-950 bg-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>My Bids</span>
            </button>
          )}

          <button
            onClick={() => setActiveNavTab('chats')}
            className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
              activeNavTab === 'chats' ? 'font-bold text-stone-950 bg-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Deal Chats ({userChats.length})</span>
          </button>

          {currentUser?.isAdmin && (
            <button
              onClick={() => setActiveNavTab('admin')}
              className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                activeNavTab === 'admin' ? 'font-bold text-stone-950 bg-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}

          <button
            onClick={() => logoutUser()}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Sign out of account"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </header>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from './ProductCard';
import { PreviousExchangesSection } from './PreviousExchangesSection';
import { CurrencySelector } from './CurrencySelector';
import { convertToBase } from '../lib/currency';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  Layers,
  Coins,
  Heart,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Timepieces',
  'Furniture',
  'Porcelain & Ceramic',
  'Brassware & Metal',
  'Jewellery',
  'Coins & Stamps',
  'Art & Sculptures',
];

const HISTORICAL_ERAS = [
  'All Eras',
  'Victorian (1837–1901)',
  'Colonial (Dutch & British)',
  'Kandyan Kingdom (16th–19th c.)',
  'Ming & Qing Dynasties',
  'Art Deco (1920s–1930s)',
  'Ancient & Archaic'
];

const CONDITIONS = [
  'All Conditions',
  'Pristine Antique',
  'Excellent Historical Wear',
  'Restored Patina',
  'Original Aged Condition'
];

export const BrowseView: React.FC = () => {
  const {
    items,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setIsCreateListingOpen,
    setIsAuthModalOpen,
    currentUser,
    isBootstrapping,
    sellerListingFee,
    setActiveNavTab,
    watchlist,
    selectedCurrency,
    formatCurrency,
    currencySymbol
  } = useApp();

  const [activeQuickTab, setActiveQuickTab] = useState<'all' | 'watchlist' | 'active_bids'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedEra, setSelectedEra] = useState<string>('All Eras');
  const [selectedCondition, setSelectedCondition] = useState<string>('All Conditions');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'highest_bid' | 'most_bids' | 'newest'>('highest_bid');

  const pendingCount = items.filter(i => i.status === 'pending_approval').length;

  const handleClearFilters = () => {
    setSelectedEra('All Eras');
    setSelectedCondition('All Conditions');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedEra !== 'All Eras' || selectedCondition !== 'All Conditions' || minPrice !== '' || maxPrice !== '' || selectedCategory !== 'All' || searchQuery !== '';

  // Filter & Search Logic
  const filteredItems = items.filter(item => {
    if (item.status === 'deal_cancelled' || item.status === 'sold' || item.status === 'closed') {
      return false;
    }

    if (!currentUser?.isAdmin && item.status !== 'active') {
      return false;
    }

    // Quick Tabs
    if (activeQuickTab === 'watchlist' && !watchlist.includes(item.id)) {
      return false;
    }

    if (activeQuickTab === 'active_bids' && (!Array.isArray(item.bids) || item.bids.length === 0)) {
      return false;
    }

    // Category
    if (selectedCategory !== 'All') {
      const isJewelleryMatch = (selectedCategory === 'Jewellery' || (selectedCategory as string) === 'Jewelry') && (item.category === 'Jewellery' || (item.category as string) === 'Jewelry');
      if (item.category !== selectedCategory && !isJewelleryMatch) {
        return false;
      }
    }

    // Historical Era
    if (selectedEra !== 'All Eras') {
      const eraKey = selectedEra.split(' ')[0].toLowerCase();
      if (!item.era.toLowerCase().includes(eraKey)) {
        return false;
      }
    }

    // Condition
    if (selectedCondition !== 'All Conditions' && item.condition !== selectedCondition) {
      return false;
    }

    // Price range
    const rawMin = minPrice ? parseFloat(minPrice) : 0;
    const rawMax = maxPrice ? parseFloat(maxPrice) : Infinity;
    const min = selectedCurrency !== 'LKR' && rawMin > 0 ? convertToBase(rawMin, selectedCurrency) : rawMin;
    const max = selectedCurrency !== 'LKR' && rawMax < Infinity ? convertToBase(rawMax, selectedCurrency) : rawMax;
    if (item.currentBid < min || item.currentBid > max) {
      return false;
    }

    // Query Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchesQuery = 
        item.title.toLowerCase().includes(q) ||
        item.era.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.provenance.toLowerCase().includes(q);
      if (!matchesQuery) return false;
    }

    return true;
  });

  // Sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'highest_bid') return b.currentBid - a.currentBid;
    if (sortBy === 'most_bids') return b.bidCount - a.bidCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="browse-curated-auctions">
      {/* Editorial Heritage Banner */}
      <div className="bg-stone-950 text-stone-100 rounded-2xl p-7 sm:p-10 border border-stone-800/90 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          {currentUser?.isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                Admin Mode Active
              </span>
            </div>
          )}

          <h1 
            className="text-stone-50 tracking-tight"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 200,
              fontStyle: 'normal',
              textDecorationLine: 'none',
              fontSize: '42px',
              lineHeight: '54px'
            }}
          >
            Curated Antique Auctions
          </h1>

          <p 
            className="text-white text-xs sm:text-sm leading-relaxed max-w-2xl"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 200,
            }}
          >
            Place verified bids on authenticated heirlooms, Dutch colonial furniture, royal brassware, and fine timepieces. When a seller selects your bid, negotiations take place inside our protected in-app chat with contact privacy.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => setIsCreateListingOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                >
                  <span>List Antique ({formatCurrency(sellerListingFee)} Fee)</span>
                </button>

                {currentUser.isAdmin && (
                  <button
                    onClick={() => setActiveNavTab('admin')}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-medium px-4 py-2.5 rounded-lg border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-300" />
                    <span>Admin Control Desk</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Sign Up / Create Account</span>
                </button>
                <span className="text-xs text-white">Join to place bids, save lots, and access private deal rooms.</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin Notice for Pending Lots */}
      {currentUser?.isAdmin && pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-semibold text-amber-950">
              Curator Action Required: {pendingCount} seller lot{pendingCount > 1 ? 's' : ''} awaiting your approval before being visible to buyers.
            </span>
          </div>
          <button
            onClick={() => setActiveNavTab('admin')}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Review & Approve Lots</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200/80 overflow-x-auto">
          <button
            onClick={() => setActiveQuickTab('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeQuickTab === 'all'
                ? 'bg-white text-stone-950 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Live Lots
          </button>

          {/* Saved Watchlist: Only visible after login */}
          {currentUser && (
            <button
              onClick={() => setActiveQuickTab('watchlist')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeQuickTab === 'watchlist'
                  ? 'bg-white text-stone-950 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeQuickTab === 'watchlist' ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} />
              <span>Saved Watchlist</span>
              {watchlist.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeQuickTab === 'watchlist' ? 'bg-red-100 text-red-700' : 'bg-stone-200 text-stone-700'
                }`}>
                  {watchlist.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveQuickTab('active_bids')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeQuickTab === 'active_bids'
                ? 'bg-white text-stone-950 font-semibold shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Lots with Active Bids
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Option Above on Browse Page */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200/80 shadow-2xs">
            <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">Currency:</span>
            <CurrencySelector variant="compact" />
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shadow-2xs ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200/80 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
            <span>{showAdvancedFilters ? 'Hide Filters' : 'Filter by Era & Price'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer (Expandable) */}
      {showAdvancedFilters && (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 space-y-4 animate-in fade-in-50 duration-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-700" />
              <span>Advanced Antique Catalog Filters</span>
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-[11px] text-stone-700 hover:text-stone-900 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Historical Era */}
            <div>
              <label htmlFor="browse-filter-era" className="block font-bold text-stone-700 mb-1">Historical Era</label>
              <select
                id="browse-filter-era"
                name="era"
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-900 shadow-2xs"
              >
                {HISTORICAL_ERAS.map(era => (
                  <option key={era} value={era}>{era}</option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label htmlFor="browse-filter-condition" className="block font-bold text-stone-700 mb-1">Preservation Condition</label>
              <select
                id="browse-filter-condition"
                name="condition"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-900 shadow-2xs"
              >
                {CONDITIONS.map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label htmlFor="browse-filter-min-price" className="block font-bold text-stone-700 mb-1">Min Bid ({currencySymbol.trim()})</label>
              <input
                id="browse-filter-min-price"
                name="minPrice"
                type="number"
                placeholder={selectedCurrency === 'LKR' ? 'e.g. 5,000' : 'e.g. 50'}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-900 shadow-2xs"
              />
            </div>

            {/* Max Price */}
            <div>
              <label htmlFor="browse-filter-max-price" className="block font-bold text-stone-700 mb-1">Max Bid ({currencySymbol.trim()})</label>
              <input
                id="browse-filter-max-price"
                name="maxPrice"
                type="number"
                placeholder={selectedCurrency === 'LKR' ? 'e.g. 200,000' : 'e.g. 1,000'}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-900 shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search, Category Filters & Controls */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              id="browse-search-input"
              name="searchQuery"
              aria-label="Search antique lots"
              type="text"
              placeholder="Search antique lots, eras (e.g. Victorian, Dutch Colonial, Ming)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50/80 border border-stone-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-stone-900 transition-all"
            />
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <label htmlFor="browse-sort-select" className="text-stone-500 font-medium">Sort By:</label>
            <select
              id="browse-sort-select"
              name="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-stone-50/80 border border-stone-200/80 rounded-lg text-xs text-stone-800 font-medium focus:outline-none focus:border-stone-900 cursor-pointer"
            >
              <option value="highest_bid">Highest Current Bid</option>
              <option value="most_bids">Most Active Bidders</option>
              <option value="newest">Recently Listed</option>
            </select>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white font-semibold shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lots Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-stone-600 gap-2 flex-wrap">
          <span>Showing <strong>{sortedItems.length}</strong> authenticated antique lots</span>
        </div>

        {isBootstrapping && sortedItems.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs animate-pulse"
              >
                <div className="aspect-4/3 bg-stone-200/70" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-28 bg-stone-200/80 rounded" />
                  <div className="h-5 w-4/5 bg-stone-200/80 rounded" />
                  <div className="h-3 w-full bg-stone-100 rounded" />
                  <div className="h-8 w-2/3 bg-stone-200/80 rounded pt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          activeQuickTab === 'watchlist' ? (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
              <Heart className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif-heading text-lg font-bold text-stone-900">
                Your Saved Watchlist is Empty
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Click the heart icon on any antique lot card to bookmark it here for quick monitoring of ongoing bids.
              </p>
              <button
                onClick={() => setActiveQuickTab('all')}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Browse All Curated Lots</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
              <Layers className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="font-serif-heading text-lg font-bold text-stone-900">
                No Antique Lots Match Your Filters
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Try widening your price range or clearing selected historical era filters to discover more heirlooms.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  onClick={handleClearFilters}
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-5 rounded-xl inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedItems.map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Previous Exchanges Registry Archive */}
      <PreviousExchangesSection />
    </div>
  );
};

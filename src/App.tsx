import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BrowseView } from './components/BrowseView';
import { ToastContainer } from './components/ToastContainer';
import { SeoHead } from './components/SeoHead';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Gavel, Coins, Mail, WifiOff, RotateCw } from 'lucide-react';

const SellerDashboard = lazy(() => import('./components/SellerDashboard').then(m => ({ default: m.SellerDashboard })));
const BuyerBidsDrawer = lazy(() => import('./components/BuyerBidsDrawer').then(m => ({ default: m.BuyerBidsDrawer })));
const ChatsView = lazy(() => import('./components/ChatsView').then(m => ({ default: m.ChatsView })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ContactUsView = lazy(() => import('./components/ContactUsView').then(m => ({ default: m.ContactUsView })));
const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then(m => ({ default: m.ProductDetailModal })));
const CreateListingModal = lazy(() => import('./components/CreateListingModal').then(m => ({ default: m.CreateListingModal })));
const EditListingModal = lazy(() => import('./components/EditListingModal').then(m => ({ default: m.EditListingModal })));
const VerificationModal = lazy(() => import('./components/VerificationModal').then(m => ({ default: m.VerificationModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ProfileSettingsModal = lazy(() => import('./components/ProfileSettingsModal').then(m => ({ default: m.ProfileSettingsModal })));
const RateSellerModal = lazy(() => import('./components/RateSellerModal').then(m => ({ default: m.RateSellerModal })));
const ImageInspectionModal = lazy(() => import('./components/ImageInspectionModal').then(m => ({ default: m.ImageInspectionModal })));
const ChatModal = lazy(() => import('./components/ChatModal').then(m => ({ default: m.ChatModal })));

const MainLayout: React.FC = () => {
  const {
    activeNavTab,
    activeChatId,
    setActiveChatId,
    currentUser,
    sellerListingFee,
    setActiveNavTab,
    selectedItem,
    isCreateListingOpen,
    editingItem,
    isEditListingOpen,
    isVerificationModalOpen,
    isAuthModalOpen,
    isProfileSettingsOpen,
    isRateSellerOpen,
    inspectionData,
    setInspectionData,
    formatCurrency,
    connectionError,
    retrySync
  } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900">
      {/* Dynamic SEO Meta Tags & Schema.org JSON-LD */}
      <SeoHead />

      {/* Sticky Navigation Bar */}
      <Navbar />

      {/* Graceful Feed Degradation Banner (only visible on network disruption) */}
      {connectionError && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-medium">
              <WifiOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
              {connectionError}
            </span>
            <button
              type="button"
              onClick={() => void retrySync()}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900 text-white rounded-md font-semibold hover:bg-amber-800 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary compact fallbackTitle="Unable to render this view">
          <Suspense fallback={<div className="py-12 text-center text-xs text-stone-500">Loading archive view...</div>}>
            {activeNavTab === 'browse' && <BrowseView />}
            {activeNavTab === 'seller_hub' && <SellerDashboard />}
            {activeNavTab === 'my_bids' && <BuyerBidsDrawer />}
            {activeNavTab === 'chats' && <ChatsView />}
            {activeNavTab === 'admin' && <AdminDashboard />}
            {activeNavTab === 'contact' && <ContactUsView />}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Modals & Overlays */}
      <ErrorBoundary compact fallbackTitle="Modal temporarily unavailable">
        <Suspense fallback={null}>
          {selectedItem && <ProductDetailModal />}
          {isCreateListingOpen && <CreateListingModal />}
          {isEditListingOpen && editingItem && <EditListingModal />}
          {isVerificationModalOpen && <VerificationModal />}
          {isAuthModalOpen && <AuthModal />}
          {isProfileSettingsOpen && <ProfileSettingsModal />}
          {isRateSellerOpen && <RateSellerModal />}

          {/* Hi-Res Inspection Modal */}
          {inspectionData && (
            <ImageInspectionModal
              images={inspectionData.images}
              initialIndex={inspectionData.initialIndex}
              itemTitle={inspectionData.title}
              era={inspectionData.era}
              isOpen={true}
              onClose={() => setInspectionData(null)}
            />
          )}

          {activeChatId && activeNavTab !== 'chats' && (
            <ChatModal
              chatId={activeChatId}
              onClose={() => setActiveChatId(null)}
            />
          )}
        </Suspense>
      </ErrorBoundary>

      {/* Global In-App Toast Notification Toaster */}
      <ToastContainer />

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white/80 backdrop-blur-xs text-stone-600 py-10 px-4 sm:px-6 lg:px-8 mt-16 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 items-start">
          <div className="space-y-2.5 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-stone-900 text-amber-300 flex items-center justify-center">
                <Gavel className="w-3.5 h-3.5" />
              </div>
              <span className="font-brand-cinzel font-serif-heading font-bold text-sm tracking-wide text-stone-900">
                ANTIAUC
              </span>
            </div>
            <p className="text-stone-500 font-provenance text-xs leading-relaxed">
              A verified antique bidding marketplace safeguarding collectors and authentic dealers. Seller listings are currently free, and personal contact numbers remain masked to prevent off-platform fraud.
            </p>
          </div>

          <div className="space-y-2 md:mx-auto md:justify-self-center">
            <span className="font-bold text-stone-900 block text-[11px] uppercase tracking-wider">
              Platform Rules & Governance
            </span>
            <ul className="space-y-1 text-stone-500 text-[11px]">
              <li>• Free registration for verified buyers</li>
              <li>• Current Seller Listing Fee: <strong className="text-stone-700">{formatCurrency(sellerListingFee)}</strong></li>
              <li>• Single-Identity verification (No duplicate accounts)</li>
              <li>• Masked phone privacy during in-app chat</li>
            </ul>
          </div>

          <div className="space-y-2.5 max-w-sm md:justify-self-end md:ml-auto">
            <span className="font-bold text-stone-900 block text-[11px] uppercase tracking-wider">
              Contact & Inquiries
            </span>
            <p className="text-stone-500 text-[11px] leading-relaxed">
              Have questions regarding antique lot appraisals, consignment disputes, or account verification? Our Curatorial Desk is ready to assist.
            </p>
            <button
              onClick={() => {
                setActiveNavTab('contact');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              id="footer-contact-us-btn"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Us</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-stone-200/60 flex flex-col sm:flex-row items-center justify-between text-stone-500 text-[11px] gap-3">
          <span>© {new Date().getFullYear()} Antiauc Inc. All rights reserved.</span>
          {currentUser?.isAdmin && (
            <button
              onClick={() => {
                setActiveNavTab('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-stone-700 dark:text-stone-300 font-medium hover:text-stone-900 dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Coins className="w-3 h-3 text-amber-600" />
              <span>Admin Fee Settings</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

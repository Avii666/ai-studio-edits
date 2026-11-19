import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShieldCheck, CreditCard, CheckCircle2, AlertCircle, ArrowRight, Lock, Sparkles, Image as ImageIcon, UploadCloud, Plus, Trash2, Camera, MapPin, Clock } from 'lucide-react';
import { AntiqueItem } from '../types';
import { SafeImage } from './SafeImage';

const SAMPLE_ANTIQUE_PRESET_IMAGES = [
  {
    name: 'Antique Victorian Silver Pocket Watch',
    url: '/images/preset-watch.webp',
    category: 'Timepieces',
    era: 'Victorian (1890)'
  },
  {
    name: 'Carved Ebony & Ivory Inlay Jewellery Box',
    url: '/images/preset-ebony.webp',
    category: 'Furniture',
    era: 'Early Colonial (1840)'
  },
  {
    name: 'Temple Bronze Gilded Buddha Figurine',
    url: '/images/preset-bronze.webp',
    category: 'Art & Sculptures',
    era: '19th Century Kandyan'
  },
  {
    name: 'Blue Delftware Heritage Ceramic Pitcher',
    url: '/images/preset-delft.webp',
    category: 'Porcelain & Ceramic',
    era: 'Dutch Heritage (1790)'
  },
  {
    name: 'Heavy Brass Ceremonial Betel Nut Cutter (Giraya)',
    url: '/images/preset-brass.webp',
    category: 'Brassware & Metal',
    era: 'Pre-Colonial Period'
  }
];

export const CreateListingModal: React.FC = () => {
  const {
    isCreateListingOpen,
    setIsCreateListingOpen,
    currentUser,
    createListing,
    setIsVerificationModalOpen,
    setIsAuthModalOpen,
    setActiveNavTab,
    sellerListingFee,
    addToast,
    formatCurrency,
    selectedCurrency
  } = useApp();

  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AntiqueItem['category']>('Timepieces');
  const [era, setEra] = useState('Victorian (Late 19th c.)');
  const [condition, setCondition] = useState<AntiqueItem['condition']>('Pristine Antique');
  const [provenance, setProvenance] = useState('');
  const [dimensions, setDimensions] = useState('35cm × 20cm × 15cm');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [startingBid, setStartingBid] = useState<number>(300);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment State (Tokenized Gateway Checkout)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'qr'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdTxId, setCreatedTxId] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isCreateListingOpen) return null;

  // Check login
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
            Please create an authenticated account or log in to catalog antique auction lots.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => setIsCreateListingOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsCreateListingOpen(false);
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

  // Check verification
  if (!currentUser.isVerified) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
        <div className="bg-white border border-stone-200/80 rounded-2xl p-7 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-lg font-black text-stone-900 tracking-tight">
            Verification Required to Post Antiques
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            To prevent fraud, fake antique listings, and unauthorized multi-accounts, all sellers must verify their National Identity before publishing.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => setIsCreateListingOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsCreateListingOpen(false);
                setIsVerificationModalOpen(true);
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              Verify My Identity Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - uploadedImages.length;
    if (remainingSlots <= 0) {
      setErrorMessage('You have already uploaded the maximum of 5 images.');
      return;
    }

    const filesToLoad = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setErrorMessage(`Maximum 5 images allowed. Only the first ${remainingSlots} photo(s) were added.`);
    }

    filesToLoad.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select image files (e.g. JPG, PNG, WEBP).');
        return;
      }

      // Maximum 5 MB limit per photo
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(`Photo "${file.name}" exceeds the 5 MB limit. Please select an image under 5 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const rawDataUrl = event.target.result as string;
          // Optimize high-resolution photos using canvas to fit smoothly in database
          const img = new Image();
          img.onload = () => {
            const maxDim = 1400;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const webpData = canvas.toDataURL('image/webp', 0.85);
                const optimized = webpData.startsWith('data:image/webp')
                  ? webpData
                  : canvas.toDataURL('image/jpeg', 0.85);
                setUploadedImages(prev => prev.length >= 5 ? prev : [...prev, optimized]);
                return;
              }
            }
            setUploadedImages(prev => prev.length >= 5 ? prev : [...prev, rawDataUrl]);
          };
          img.onerror = () => {
            setUploadedImages(prev => prev.length >= 5 ? prev : [...prev, rawDataUrl]);
          };
          img.src = rawDataUrl;
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryUploadedImage = (index: number) => {
    setUploadedImages(prev => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const getEffectiveImages = () => {
    if (uploadedImages.length > 0) return uploadedImages;
    if (imageUrl.trim()) return [imageUrl.trim()];
    return [SAMPLE_ANTIQUE_PRESET_IMAGES[0].url];
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!title.trim() || !provenance.trim()) {
      setErrorMessage('Please provide the antique lot title and historical provenance description.');
      return;
    }
    if (startingBid < 300) {
      setErrorMessage(`Starting bid must be at least ${formatCurrency(300)}.`);
      return;
    }

    if (uploadedImages.length === 0 && !imageUrl.trim()) {
      setErrorMessage('Please upload at least one photo of the goods from your device (up to 5 images).');
      return;
    }
    
    // Never display a fake payment checkout. Paid listings remain blocked until
    // a real provider is configured and its server-side callback is verified.
    if (sellerListingFee > 0 && !currentUser.isAdmin) {
      setErrorMessage('Online listing payments are not connected yet. Your listing has not been submitted and no payment has been taken. Please try again once Antiauc enables a payment provider.');
      return;
    }

    // Zero-fee listings and administrator-exempt listings can be submitted directly.
    if (sellerListingFee === 0 || currentUser.isAdmin) {
      handlePayListingFeeAndPublish();
      return;
    }

    setStep('payment');
  };

  const handlePayListingFeeAndPublish = async () => {
    setIsProcessing(true);
    try {
      const effectiveImages = getEffectiveImages();
      const res = await createListing({
        title,
        category,
        era,
        condition,
        provenance,
        dimensions,
        city: city.trim() || 'Colombo',
        country: country.trim() || 'Sri Lanka',
        location: `${city.trim() || 'Colombo'}, ${country.trim() || 'Sri Lanka'}`,
        startingBid,
        reservePrice: 0,
        estimatedValueRange: '',
        images: effectiveImages,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        sellerVerified: currentUser.isVerified,
        sellerRating: currentUser.rating,
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (!res.success) {
        setErrorMessage('Failed to publish listing. Please verify your session and try again.');
        return;
      }

      setCreatedTxId(res.txId);
      setRequiresApproval(!!res.requiresApproval);
      setStep('success');

      if (res.requiresApproval) {
        addToast(
          "Waiting for Admin's Approval",
          "Your lot has been submitted and is Waiting for Admin's Approval before appearing on the public auction.",
          "warning"
        );
      } else {
        addToast("Lot Published", "Your lot is now live for public bidding.", "success");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsCreateListingOpen(false);
    setStep('details');
    setCity('');
    setCountry('');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-stone-950/70 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-2xl bg-white border border-stone-200/80 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        id="create-listing-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 bg-stone-50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900">
              {step === 'details' && 'Post Antique for Auction'}
              {step === 'payment' && `Listing Fee Checkout (${formatCurrency(sellerListingFee)})`}
              {step === 'success' && (requiresApproval ? 'Listing Submitted for Admin Approval' : 'Auction Lot Published Successfully')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: ANTIQUE DETAILS FORM */}
          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs text-stone-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Posting as verified seller: <strong className="text-stone-900">{currentUser.name}</strong></span>
                </div>
                <span className="font-mono text-[11px] text-stone-500">
                  Fee: {formatCurrency(sellerListingFee)}
                </span>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="create-listing-title" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Antique Lot Title *
                </label>
                <input
                  id="create-listing-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. 18th Century Dutch Colonial Calamander Writing Desk"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                />
              </div>

              {/* Category & Era */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-listing-category" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    id="create-listing-category"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                  >
                    <option value="Timepieces">Timepieces</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Porcelain & Ceramic">Porcelain & Ceramic</option>
                    <option value="Brassware & Metal">Brassware & Metal</option>
                    <option value="Jewellery">Jewellery</option>
                    <option value="Coins & Stamps">Coins & Stamps</option>
                    <option value="Art & Sculptures">Art & Sculptures</option>
                    <option value="Rare Books">Rare Books</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-listing-era" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Historical Era / Period
                  </label>
                  <input
                    id="create-listing-era"
                    name="era"
                    type="text"
                    required
                    placeholder="e.g. Circa 1780 (Dutch VOC Period)"
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Provenance Description */}
              <div>
                <label htmlFor="create-listing-provenance" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Provenance & Historical Background *
                </label>
                <textarea
                  id="create-listing-provenance"
                  name="provenance"
                  required
                  rows={3}
                  placeholder="Detail the acquisition origin, previous family ownership, maker stamps, or historical documentation..."
                  value={provenance}
                  onChange={(e) => setProvenance(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                />
              </div>

              {/* Condition & Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-listing-condition" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Condition Report
                  </label>
                  <select
                    id="create-listing-condition"
                    name="condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                  >
                    <option value="Pristine Antique">Pristine Antique</option>
                    <option value="Excellent Historical Wear">Excellent Historical Wear</option>
                    <option value="Restored Patina">Restored Patina</option>
                    <option value="Original Aged Condition">Original Aged Condition</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-listing-dimensions" className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Physical Dimensions
                  </label>
                  <input
                    id="create-listing-dimensions"
                    name="dimensions"
                    type="text"
                    placeholder="e.g. 52mm diameter, 114g weight"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Item Location: City & Country */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80 space-y-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-700" />
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Item Location (City & Country) *
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="create-listing-city" className="block text-[11px] font-semibold text-stone-600 mb-1">
                      City *
                    </label>
                    <input
                      id="create-listing-city"
                      name="city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="off"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="create-listing-country" className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Country *
                    </label>
                    <input
                      id="create-listing-country"
                      name="country"
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      autoComplete="off"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  This location will be displayed on the auction post.
                </p>
              </div>

              {/* Bidding Parameters */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
                <label htmlFor="create-listing-starting-bid" className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1">
                  Starting Bid (Base Rs.) *
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-2.5 text-xs text-stone-500 font-bold">Rs.</span>
                  <input
                    id="create-listing-starting-bid"
                    name="startingBid"
                    type="number"
                    min={300}
                    step={1}
                    value={startingBid}
                    onChange={(e) => setStartingBid(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-none focus:border-stone-400"
                    placeholder="300"
                  />
                </div>
                {startingBid > 0 && selectedCurrency !== 'LKR' && (
                  <p className="text-[11px] text-stone-600 font-mono mt-1">
                    Converted: {formatCurrency(startingBid)}
                  </p>
                )}
                <p className="text-[11px] text-stone-500 mt-1">
                  Minimum start bid is {formatCurrency(300)}.
                </p>
              </div>

              {/* Device Image Upload (Max 5 Images) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="device-image-file-input" className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Goods Photographic Documentation (Max 5 Images) *
                  </label>
                  <span className="text-[11px] font-semibold text-stone-600">
                    {uploadedImages.length} / 5 Uploaded
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  name="listingImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleDeviceUpload}
                  className="hidden"
                  id="device-image-file-input"
                />

                {/* Uploaded Thumbnails Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-stone-200 bg-white aspect-square flex flex-col items-center justify-center shadow-2xs">
                        <SafeImage
                          src={img}
                          alt={`Uploaded antique ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Primary Badge */}
                        {idx === 0 ? (
                          <span className="absolute top-1 left-1 bg-stone-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                            Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryUploadedImage(idx)}
                            className="absolute top-1 left-1 bg-black/60 hover:bg-black/80 text-white text-[9px] px-1 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Set Primary
                          </button>
                        )}
                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md shadow-xs opacity-90 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add More Button if < 5 */}
                    {uploadedImages.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-stone-300 hover:border-stone-900 bg-white/70 hover:bg-white rounded-xl aspect-square flex flex-col items-center justify-center gap-1 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Add Photo</span>
                        <span className="text-[9px] text-stone-400">({5 - uploadedImages.length} left)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Device Upload Drag & Click Trigger Box */}
                {uploadedImages.length === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-stone-900 bg-stone-50 hover:bg-stone-100 rounded-xl p-6 text-center cursor-pointer transition-colors space-y-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        Click to upload photos from your device
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Add up to 5 clear photos showing hallmarks, patina, condition & multiple angles
                      </p>
                      <p className="text-[10px] font-semibold text-stone-600 mt-1">
                        Maximum file size: 5 MB per photo • Supports JPG, PNG, WEBP
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-xl shadow-2xs hover:bg-stone-50"
                    >
                      Browse Files From Device
                    </button>
                  </div>
                )}

                {/* Optional Collapsible Sample Presets / URL */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPresets(!showPresets)}
                    className="text-[11px] text-stone-700 hover:text-stone-900 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{showPresets ? 'Hide preset images & URL option' : 'Or select sample archive image / web URL'}</span>
                  </button>

                  {showPresets && (
                    <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                      <p className="text-[11px] text-stone-600 font-medium">Select a curated archive preset photo:</p>
                      <div className="grid grid-cols-5 gap-2">
                        {SAMPLE_ANTIQUE_PRESET_IMAGES.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (uploadedImages.length < 5) {
                                setUploadedImages(prev => [...prev, preset.url]);
                              } else {
                                setErrorMessage('Maximum 5 images allowed.');
                              }
                              if (!title) setTitle(preset.name);
                              setCategory(preset.category as any);
                              setEra(preset.era);
                            }}
                            className="relative rounded-xl overflow-hidden border border-stone-200 hover:border-stone-900 transition-all aspect-square cursor-pointer"
                          >
                            <SafeImage src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <input
                          id="create-listing-image-url"
                          name="imageUrl"
                          aria-label="External image URL"
                          type="url"
                          placeholder="Or paste external image URL..."
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (imageUrl.trim()) {
                              if (uploadedImages.length < 5) {
                                setUploadedImages(prev => [...prev, imageUrl.trim()]);
                                setImageUrl('');
                              } else {
                                setErrorMessage('Maximum 5 images allowed.');
                              }
                            }
                          }}
                          className="px-3.5 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Add URL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit / Proceed to Fee */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <div className="text-xs text-stone-600">
                  Listing Fee: <strong className="text-stone-900">{formatCurrency(sellerListingFee)}</strong>
                  <span className="text-stone-500 text-[11px] block">No listing fee is currently charged.</span>
                </div>

                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  id="proceed-to-fee-btn"
                >
                  <span>{sellerListingFee > 0 ? `Proceed to Fee Checkout (${formatCurrency(sellerListingFee)})` : 'Publish Lot Now (Free)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: DYNAMIC LISTING FEE PAYMENT GATEWAY */}
          {step === 'payment' && (
            <div className="space-y-5">
              {/* Fee Breakdown Summary */}
              <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">
                      Antique Publication Order Summary
                    </h4>
                    <p className="text-xs text-stone-500 truncate max-w-sm">
                      {title} ({era})
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-700 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                    14-Day Auction
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Curator Authenticity & Cataloging Fee:</span>
                    <span>{formatCurrency(0)} (Waived)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard Verified Seller Listing Fee:</span>
                    <span className="font-bold text-stone-900">{formatCurrency(sellerListingFee)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>Single-Identity Fraud Guarantee:</span>
                    <span className="text-emerald-600 font-semibold">Included ✓</span>
                  </div>
                  <div className="border-t border-stone-200/80 pt-2 flex justify-between font-bold text-sm text-stone-900">
                    <span>Total Payable Now:</span>
                    <span className="text-base text-stone-950 font-black">{formatCurrency(sellerListingFee)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <span className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Select Payment Method
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-900'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 mb-2 ${paymentMethod === 'card' ? 'text-amber-400' : 'text-stone-700'}`} />
                    <div>
                      <span className="font-bold text-xs block">Visa / Master</span>
                      <span className={`text-[10px] ${paymentMethod === 'card' ? 'text-stone-300' : 'text-stone-500'}`}>Instant Approval</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-900'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 mb-2 ${paymentMethod === 'bank_transfer' ? 'text-amber-400' : 'text-stone-700'}`} />
                    <div>
                      <span className="font-bold text-xs block">Direct Bank</span>
                      <span className={`text-[10px] ${paymentMethod === 'bank_transfer' ? 'text-stone-300' : 'text-stone-500'}`}>CEFT / Slip</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      paymentMethod === 'qr'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-900'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 mb-2 ${paymentMethod === 'qr' ? 'text-amber-400' : 'text-stone-700'}`} />
                    <div>
                      <span className="font-bold text-xs block">LankaQR / App</span>
                      <span className={`text-[10px] ${paymentMethod === 'qr' ? 'text-stone-300' : 'text-stone-500'}`}>Scan & Pay</span>
                    </div>
                  </button>
                </div>

                {/* Tokenized Gateway Verification Panel */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-700">Payer Name: {currentUser.name}</span>
                    <span>Identity Ref: <strong className="font-mono text-stone-900">{currentUser.verificationIdNumber}</strong></span>
                  </div>
                  <div className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-stone-700">
                      <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {paymentMethod === 'card'
                          ? 'Card credentials are tokenized server-side via PCI-compliant checkout.'
                          : paymentMethod === 'bank_transfer'
                          ? 'Direct CEFT bank reference generated upon confirmation.'
                          : 'LankaQR settlement reference issued upon confirmation.'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                      Tokenized
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  ← Edit Lot Details
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayListingFeeAndPublish}
                  className="bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Processing {formatCurrency(sellerListingFee)} Payment...</span>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirm & Pay {formatCurrency(sellerListingFee)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESSFUL RECEIPT */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
                requiresApproval ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                <CheckCircle2 className={`w-8 h-8 ${requiresApproval ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>

              <div>
                <h3 className="text-xl font-black text-stone-900 tracking-tight">
                  {requiresApproval ? "Waiting for Admin's Approval" : 'Lot Published to Live Auction!'}
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                  {requiresApproval
                    ? 'Your listing fee has been confirmed and the antique lot has been submitted. It is now Waiting for Admin\'s Approval before going live to public buyers.'
                    : 'Your antique has been cataloged immediately. Verified buyers can now place bids and you can monitor offers in your Seller Hub.'}
                </p>
              </div>

              {/* Prominent Notice for Waiting for Admin's Approval */}
              {requiresApproval && (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-left max-w-md mx-auto space-y-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-950">
                      Notice: Waiting for Admin's Approval
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Thank you for listing your antique lot. Your item is now <strong>Waiting for Admin's Approval</strong>. Our authorized curation desk will review the lot details, provenance, and images to ensure platform integrity. Once approved, the auction will automatically open for verified bids.
                  </p>
                  <div className="text-[11px] text-amber-900 bg-amber-100/80 p-2.5 rounded-lg border border-amber-300 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Status: <strong>Waiting for Admin's Approval</strong> • Check Seller Hub for status updates</span>
                  </div>
                </div>
              )}

              {/* Official Fee Receipt Card */}
              <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-xl text-left max-w-md mx-auto text-xs space-y-2.5">
                <div className="flex justify-between items-center border-b border-stone-200/80 pb-2.5 font-bold text-stone-900">
                  <span className="uppercase tracking-wider text-[11px]">Official Listing Receipt</span>
                  <span className={requiresApproval ? 'text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[10px]' : 'text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold text-[10px]'}>
                    {requiresApproval ? "WAITING FOR ADMIN'S APPROVAL" : 'PAID IN FULL • ACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-stone-900">{createdTxId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Listing Fee Charged:</span>
                  <span className="font-bold text-stone-900">{formatCurrency(sellerListingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Seller Account:</span>
                  <span className="font-medium text-stone-800">{currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Starting Bid:</span>
                  <span className="font-medium text-stone-800">{formatCurrency(startingBid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Catalog Visibility:</span>
                  <span className="font-bold text-amber-800">
                    {requiresApproval ? "Waiting for Admin's Approval (Pending Review)" : 'Live Public Auction'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    handleClose();
                    setActiveNavTab('seller_hub');
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  View in Seller Hub
                </button>
                <button
                  onClick={() => {
                    handleClose();
                    setActiveNavTab('browse');
                  }}
                  className="px-5 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  Browse Marketplace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

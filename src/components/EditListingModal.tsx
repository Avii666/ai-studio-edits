import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Save, Trash2, CheckCircle2, ShieldCheck, UploadCloud, Plus, MapPin } from 'lucide-react';
import { AntiqueItem, ItemStatus } from '../types';
import { SafeImage } from './SafeImage';

const parseItemListingFee = (txId?: string | null, fallbackFee: number = 500): number => {
  if (!txId) return fallbackFee;
  const match = txId.match(/-RS(\d+)/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fallbackFee;
};

export const EditListingModal: React.FC = () => {
  const {
    editingItem,
    setEditingItem,
    isEditListingOpen,
    setIsEditListingOpen,
    updateListing,
    deleteListing,
    approveListing,
    rejectListing,
    sellerListingFee,
    formatCurrency,
    selectedCurrency
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AntiqueItem['category']>('Timepieces');
  const [era, setEra] = useState('');
  const [condition, setCondition] = useState<AntiqueItem['condition']>('Pristine Antique');
  const [provenance, setProvenance] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [city, setCity] = useState('Colombo');
  const [country, setCountry] = useState('Sri Lanka');
  const [startingBid, setStartingBid] = useState<number>(500);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [status, setStatus] = useState<ItemStatus>('active');
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setCategory(editingItem.category);
      setEra(editingItem.era);
      setCondition(editingItem.condition);
      setProvenance(editingItem.provenance);
      setDimensions(editingItem.dimensions);
      setCity(editingItem.city || 'Colombo');
      setCountry(editingItem.country || 'Sri Lanka');
      setStartingBid(editingItem.startingBid);
      setImages(Array.isArray(editingItem.images) && editingItem.images.length > 0 ? editingItem.images : ['/images/antique-fallback.webp']);
      setNewImageUrl('');
      setStatus(editingItem.status);
      setRejectionReason(editingItem.rejectionReason || '');
      setConfirmDelete(false);
      setToastMessage(null);
    }
  }, [editingItem]);

  if (!isEditListingOpen || !editingItem) return null;

  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setToastMessage('Maximum 5 images allowed.');
      return;
    }

    const filesToLoad = Array.from(files).slice(0, remainingSlots);
    filesToLoad.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        setToastMessage(`Photo "${file.name}" exceeds the 5 MB limit. Please select an image under 5 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const rawDataUrl = event.target.result as string;
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
                setImages(prev => prev.length >= 5 ? prev : [...prev, optimized]);
                return;
              }
            }
            setImages(prev => prev.length >= 5 ? prev : [...prev, rawDataUrl]);
          };
          img.onerror = () => {
            setImages(prev => prev.length >= 5 ? prev : [...prev, rawDataUrl]);
          };
          img.src = rawDataUrl;
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimary = (index: number) => {
    setImages(prev => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const handleClose = () => {
    setIsEditListingOpen(false);
    setEditingItem(null);
    setConfirmDelete(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const finalImages = images.length > 0 ? images : (editingItem.images || ['/images/antique-fallback.webp']);

    try {
      const res = await updateListing(editingItem.id, {
        title,
        category,
        era,
        condition,
        provenance,
        dimensions,
        city: city.trim() || 'Colombo',
        country: country.trim() || 'Sri Lanka',
        location: `${city.trim() || 'Colombo'}, ${country.trim() || 'Sri Lanka'}`,
        startingBid: Math.max(300, Number(startingBid)),
        reservePrice: 0,
        estimatedValueRange: '',
        images: finalImages,
        status,
        rejectionReason: status === 'rejected' ? (rejectionReason || 'Curator rejection') : undefined
      });

      setToastMessage(res.message);
      if (res.success) {
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch {
      setToastMessage('Unable to save listing changes right now.');
    }
  };

  const handleApprove = async () => {
    try {
      const res = await approveListing(editingItem.id);
      if (res.success) {
        setStatus('active');
      }
      setToastMessage(res.message);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch {
      setToastMessage('Unable to approve listing right now.');
    }
  };

  const handleReject = async () => {
    try {
      const reason = rejectionReason || 'Does not meet historical verification standards.';
      const res = await rejectListing(editingItem.id, reason);
      if (res.success) {
        setStatus('rejected');
      }
      setToastMessage(res.message);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch {
      setToastMessage('Unable to reject listing right now.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      const res = await deleteListing(editingItem.id);
      setToastMessage(res.message);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch {
      setToastMessage('Unable to delete listing right now.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white border border-stone-200/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto animate-in fade-in-50 zoom-in-95 duration-200 overflow-hidden"
        id="edit-listing-modal"
      >
        {/* Modal Header */}
        <div className="bg-stone-950 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Admin Curatorial Control: Edit Antique Lot
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Authority Level
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Seller: <strong className="text-white">{editingItem.sellerName}</strong> • ID: {editingItem.id}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-700 text-white text-xs px-4 py-2.5 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body: Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status & Approval Quick Banner */}
          <div className="bg-stone-50 border border-stone-200/80 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Current Lot Status:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                  status === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : status === 'pending_approval'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                    : status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-stone-200 text-stone-800'
                }`}>
                  {status === 'pending_approval' ? 'Awaiting Admin Approval' : status}
                </span>
                {editingItem.listingFeePaid && (
                  <span className="text-[11px] text-stone-500 font-mono">
                    ({formatCurrency(parseItemListingFee(editingItem.listingFeeTxId, sellerListingFee))} Listing Fee Paid • {editingItem.listingFeeTxId})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status === 'pending_approval' && (
                <button
                  type="button"
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Publish</span>
                </button>
              )}

              {status !== 'rejected' && (
                <button
                  type="button"
                  onClick={handleReject}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Reject Lot
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="edit-listing-title" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
              Lot Title *
            </label>
            <input
              id="edit-listing-title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-semibold focus:bg-white focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Category & Era */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-listing-category" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                id="edit-listing-category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
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
              <label htmlFor="edit-listing-era" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Era & Crafting Date
              </label>
              <input
                id="edit-listing-era"
                name="era"
                type="text"
                value={era}
                onChange={(e) => setEra(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* Condition & Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-listing-condition" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Condition State
              </label>
              <select
                id="edit-listing-condition"
                name="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
              >
                <option value="Pristine Antique">Pristine Antique</option>
                <option value="Excellent Historical Wear">Excellent Historical Wear</option>
                <option value="Restored Patina">Restored Patina</option>
                <option value="Original Aged Condition">Original Aged Condition</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-listing-dimensions" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Dimensions
              </label>
              <input
                id="edit-listing-dimensions"
                name="dimensions"
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* Item Location: City & Country */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-700" />
              <span className="font-bold text-stone-900 uppercase tracking-wider text-xs">
                Item Location (City & Country)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-listing-city" className="block text-[11px] font-semibold text-stone-600 mb-1">
                  City
                </label>
                <input
                  id="edit-listing-city"
                  name="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
              <div>
                <label htmlFor="edit-listing-country" className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Country
                </label>
                <input
                  id="edit-listing-country"
                  name="country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          {/* Financials: Starting Bid */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
            <label htmlFor="edit-listing-starting-bid" className="block font-bold text-stone-900 uppercase tracking-wider mb-1 text-xs">
              Starting Bid (Base Rs.) *
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-2 text-xs text-stone-500 font-bold">Rs.</span>
              <input
                id="edit-listing-starting-bid"
                name="startingBid"
                type="number"
                min={300}
                step={1}
                value={startingBid}
                onChange={(e) => setStartingBid(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                placeholder="300"
              />
            </div>
            {startingBid > 0 && selectedCurrency !== 'LKR' && (
              <p className="text-[11px] text-stone-600 font-mono mt-1">
                Converted: {formatCurrency(startingBid)}
              </p>
            )}
            <p className="text-[11px] text-stone-500 mt-1">
              Minimum start bid value is {formatCurrency(300)}.
            </p>
          </div>

          {/* Provenance & Historical Notes */}
          <div>
            <label htmlFor="edit-listing-provenance" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
              Provenance & Archival History
            </label>
            <textarea
              id="edit-listing-provenance"
              name="provenance"
              rows={3}
              value={provenance}
              onChange={(e) => setProvenance(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl leading-relaxed text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Photographic Documentation (Up to 5 images) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-listing-file-input" className="block font-bold text-stone-900 uppercase tracking-wider">
                Photographic Documentation (Max 5 Images)
              </label>
              <span className="text-[11px] font-semibold text-stone-600">
                {images.length} / 5
              </span>
            </div>

            <input
              id="edit-listing-file-input"
              name="editListingImages"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleDeviceUpload}
              className="hidden"
            />

            {/* Thumbnail grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 bg-stone-50 border border-stone-200/80 rounded-xl">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-stone-200 bg-white aspect-square shadow-2xs">
                    <SafeImage src={img} alt={`Lot image ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute top-1 left-1 bg-stone-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(idx)}
                        className="absolute top-1 left-1 bg-black/60 hover:bg-black/80 text-white text-[9px] px-1 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md shadow-xs opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-stone-900 bg-white/70 hover:bg-white rounded-xl aspect-square flex flex-col items-center justify-center gap-1 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-bold">Add Photo</span>
                    <span className="text-[9px] text-stone-400">({5 - images.length} left)</span>
                  </button>
                )}
              </div>
            )}

            {images.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-stone-900 bg-stone-50 hover:bg-stone-100 rounded-xl p-5 text-center cursor-pointer transition-colors space-y-1"
              >
                <UploadCloud className="w-5 h-5 text-stone-700 mx-auto" />
                <p className="text-xs font-bold text-stone-900">Click to upload photos from device</p>
                <p className="text-[11px] text-stone-500">Up to 5 images</p>
              </div>
            )}

            {/* URL input fallback */}
            <div className="flex gap-2 pt-1">
              <input
                id="edit-listing-new-image-url"
                name="newImageUrl"
                aria-label="Additional image URL"
                type="url"
                placeholder="Or paste image URL to append..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (newImageUrl.trim()) {
                    if (images.length < 5) {
                      setImages(prev => [...prev, newImageUrl.trim()]);
                      setNewImageUrl('');
                    } else {
                      setToastMessage('Maximum 5 images allowed.');
                    }
                  }
                }}
                className="px-3.5 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Override Status Manually */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
            <div>
              <label htmlFor="edit-listing-status" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Catalog Status Override
              </label>
              <select
                id="edit-listing-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-none focus:border-stone-400"
              >
                <option value="pending_approval">Pending Admin Approval (Hidden from Public)</option>
                <option value="active">Active (Published on Public Catalog)</option>
                <option value="deal_pending">Deal Pending (In Negotiation)</option>
                <option value="sold">Sold</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {status === 'rejected' && (
              <div>
                <label htmlFor="edit-listing-rejection-reason" className="block font-bold text-rose-800 uppercase tracking-wider mb-1">
                  Rejection Reason Note
                </label>
                <input
                  id="edit-listing-rejection-reason"
                  name="rejectionReason"
                  type="text"
                  placeholder="e.g. Missing provenance documentation"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
            {/* Delete with confirmation */}
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-2 rounded-xl">
                  <span className="text-rose-800 text-[11px] font-bold">Really delete this listing?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1 rounded-lg cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-stone-600 hover:underline text-[11px] px-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="admin-delete-lot-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Listing</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                id="admin-save-lot-btn"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

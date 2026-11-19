import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SafeImage } from './SafeImage';
import { 
  X, 
  User, 
  Camera, 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Crown, 
  Check, 
  Trash2 
} from 'lucide-react';

export const ProfileSettingsModal: React.FC = () => {
  const { 
    isProfileSettingsOpen, 
    setIsProfileSettingsOpen, 
    currentUser, 
    updateUserProfile,
    changePassword,
    deleteUserAccount
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'security'>('profile');
  
  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarMessage, setAvatarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Synchronize when current user loads or modal opens
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || '');
      setSelectedAvatar(currentUser.avatar || '');
    }
  }, [currentUser, isProfileSettingsOpen]);

  if (!isProfileSettingsOpen || !currentUser) return null;

  const handleClose = () => {
    setIsProfileSettingsOpen(false);
    setProfileMessage(null);
    setAvatarMessage(null);
    setPasswordMessage(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteError(null);
  };

  // Save general profile details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (!name.trim()) {
      setProfileMessage({ type: 'error', text: 'Collector name cannot be blank.' });
      return;
    }

    const res = await updateUserProfile({
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim(),
      avatar: selectedAvatar
    });

    if (res.success) {
      setProfileMessage({ type: 'success', text: res.message });
      setTimeout(() => setProfileMessage(null), 3000);
    } else {
      setProfileMessage({ type: 'error', text: res.message });
    }
  };

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, WEBP).' });
      return;
    }

    // Limit to 2.5MB to ensure fast database synchronisation
    if (file.size > 2.5 * 1024 * 1024) {
      setAvatarMessage({ type: 'error', text: 'Image size exceeds 2.5 MB. Please select a smaller photo.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;
      const img = new Image();
      img.onload = async () => {
        const maxDim = 400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        let finalUrl = rawDataUrl;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const webp = canvas.toDataURL('image/webp', 0.85);
          finalUrl = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
        }
        setSelectedAvatar(finalUrl);
        const res = await updateUserProfile({ avatar: finalUrl });
        if (res.success) {
          setAvatarMessage({ type: 'success', text: 'New profile photo uploaded and saved!' });
          setTimeout(() => setAvatarMessage(null), 3000);
        } else {
          setAvatarMessage({ type: 'error', text: res.message });
        }
      };
      img.onerror = () => {
        setAvatarMessage({ type: 'error', text: 'Could not decode image file. Please choose another photo.' });
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setAvatarMessage({ type: 'error', text: 'Failed to read image file. Please try again.' });
    };
    reader.readAsDataURL(file);
  };

  // Remove photo and use clean initials badge
  const handleRemovePhoto = async () => {
    setSelectedAvatar('');
    const res = await updateUserProfile({ avatar: '' });
    if (res.success) {
      setAvatarMessage({ type: 'success', text: 'Profile picture removed. Initials badge restored.' });
      setTimeout(() => setAvatarMessage(null), 3000);
    } else {
      setAvatarMessage({ type: 'error', text: res.message });
    }
  };

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must contain at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMessage({ type: 'error', text: 'New password cannot be identical to your current password.' });
      return;
    }

    setIsChangingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (res.success) {
      setPasswordMessage({ type: 'success', text: 'Password successfully changed and secured!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 3500);
    } else {
      setPasswordMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-2xl bg-white border border-stone-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        id="profile-settings-modal"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">
                Account & Profile Settings
              </h2>
              <p className="text-xs text-stone-500">
                Personal details, collector avatar, and security credentials
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-200 cursor-pointer transition-colors"
            id="close-profile-settings-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Account settings sections"
          className="grid grid-cols-3 gap-2 border-b border-stone-200/80 bg-stone-100/70 px-6 py-2.5 text-xs font-semibold"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'border border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
            id="tab-profile-details"
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">Profile Details</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'avatar'}
            onClick={() => setActiveTab('avatar')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'avatar'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'border border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
            id="tab-profile-picture"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="truncate">Profile Picture</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'border border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
            id="tab-security-password"
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span className="truncate">Change Password</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-stone-900">

          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Account Quick Summary Card */}
              <div className="bg-stone-50 border border-stone-200/80 p-4.5 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      {(selectedAvatar || currentUser.avatar) ? (
                        <SafeImage
                          src={selectedAvatar || currentUser.avatar}
                          alt={currentUser.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/80 shadow-2xs ring-2 ring-amber-400/20"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl border-2 border-amber-300 shadow-2xs">
                          {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-8 h-8 text-amber-700" />}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('avatar')}
                        title="Change Profile Picture"
                        className="absolute bottom-0 right-0 p-1.5 bg-stone-900 text-white rounded-full border border-white hover:bg-stone-800 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-stone-900 truncate">{currentUser.name}</h3>
                        {currentUser.isAdmin ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-700" />
                            Master Admin
                          </span>
                        ) : (
                          <span className="capitalize text-[10px] font-bold text-stone-700 bg-stone-200/80 px-2.5 py-0.5 rounded-full">
                            {currentUser.role === 'seller' ? 'Antique Dealer' : 'Verified Collector'}
                          </span>
                        )}

                        {currentUser.isVerified && (
                          <span className="hidden bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Verified ID Bound
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-500 flex items-center gap-2 mt-1 flex-wrap">
                        <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{currentUser.email}</span>
                        <span>•</span>
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>Member since {currentUser.memberSince || '2025'}</span>
                      </p>
                    </div>
                  </div>

                  {!showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setShowDeleteConfirm(true);
                      }}
                      className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
                      id="delete-account-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setDeleteError(null);
                      setIsDeletingAccount(true);
                      const res = await deleteUserAccount(deletePassword);
                      setIsDeletingAccount(false);
                      if (!res.success) {
                        setDeleteError(res.message);
                      }
                    }}
                    className="pt-3.5 border-t border-red-200/80 space-y-2.5"
                  >
                    <p className="text-[11px] font-semibold text-red-900">
                      Permanent Action: Active listings will close, your personal credentials will be erased, and historical bids will be anonymized. Enter your current password to confirm:
                    </p>
                    {deleteError && (
                      <div className="p-2.5 rounded-xl text-xs flex items-center gap-2 bg-red-50 text-red-800 border border-red-200">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{deleteError}</span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="profile-delete-account-password"
                        name="deleteAccountPassword"
                        type="password"
                        autoComplete="current-password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                        className="flex-1 text-xs p-2.5 rounded-xl border border-red-200 bg-white text-stone-900 focus:outline-none focus:border-red-400"
                      />
                      <button
                        type="submit"
                        disabled={isDeletingAccount}
                        className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer shrink-0 transition-colors"
                        id="confirm-delete-account-btn"
                      >
                        {isDeletingAccount ? 'Deleting...' : 'Confirm Deletion'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword('');
                          setDeleteError(null);
                        }}
                        className="bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer shrink-0 transition-colors"
                        id="cancel-delete-account-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {profileMessage && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  profileMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              {/* Editable Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-settings-name" className="block text-xs font-bold text-stone-700 mb-1">
                      Full Legal / Collector Name *
                    </label>
                    <input
                      id="profile-settings-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-settings-email" className="block text-xs font-bold text-stone-700 mb-1">
                      Account Registered Email
                    </label>
                    <input
                      id="profile-settings-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={currentUser.email}
                      disabled
                      className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed font-mono"
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Email address is permanently bound to single-identity verification.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-settings-phone" className="block text-xs font-bold text-stone-700 mb-1">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        id="profile-settings-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g., +1 (555) 019-2834"
                        className="w-full text-xs pl-9 p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-settings-location" className="block text-xs font-bold text-stone-700 mb-1">
                      Location / Region
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-3.5" />
                      <input
                        id="profile-settings-location"
                        name="location"
                        type="text"
                        autoComplete="address-level2"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., Colombo, Sri Lanka / London, UK"
                        className="w-full text-xs pl-9 p-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                  <div className="text-xs text-stone-500">
                    Looking to change your password? <button type="button" onClick={() => setActiveTab('security')} className="text-stone-900 font-bold underline cursor-pointer">Click here</button>
                  </div>
                  <button
                    type="submit"
                    className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    id="save-profile-btn"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PROFILE PICTURE */}
          {activeTab === 'avatar' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-stone-50 border border-stone-200/80 rounded-2xl">
                <div className="relative">
                  {(selectedAvatar || currentUser.avatar) ? (
                    <SafeImage
                      src={selectedAvatar || currentUser.avatar}
                      alt={currentUser.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-amber-500/80 shadow-md ring-2 ring-amber-400/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-3xl border-4 border-amber-300 shadow-md">
                      {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-12 h-12 text-amber-700" />}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full border-2 border-white">
                    <Check className="w-3 h-3" />
                  </div>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <h4 className="font-bold text-base text-stone-900">
                    Current Collector Avatar
                  </h4>
                  <p className="text-xs text-stone-500">
                    Your avatar represents you across public bidding lots, authenticated dealer catalogs, and escrow chats.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                      id="upload-photo-btn"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Local Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
                      id="remove-photo-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>Remove Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                name="avatarFile"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                id="profile-file-input"
              />

              {avatarMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  avatarMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {avatarMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{avatarMessage.text}</span>
                </div>
              )}

              {/* Upload Local Photo Panel */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-200 hover:border-stone-900 bg-stone-50/60 hover:bg-stone-100/60 p-8 rounded-2xl text-center cursor-pointer transition-colors space-y-3 group"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-stone-200 group-hover:bg-stone-300 flex items-center justify-center text-stone-800 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-stone-900">
                    Click here to select and upload a local photo
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Supports PNG, JPG, JPEG, or WEBP up to 2.5 MB
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 bg-stone-900 group-hover:bg-stone-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File from Computer</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-stone-50 border border-stone-200/80 p-4.5 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <KeyRound className="w-4 h-4 text-stone-700" />
                  <span>Update Account Password</span>
                </div>
                <p className="text-xs text-stone-500">
                  Your password protects your verified identity, active auction bids, and escrow negotiation sessions. Please ensure your new password contains at least 6 characters.
                </p>
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 bg-white p-5 border border-stone-200/80 rounded-2xl">
                {/* Current Password */}
                <div>
                  <label htmlFor="profile-current-password" className="block text-xs font-bold text-stone-700 mb-1">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      id="profile-current-password"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full text-xs p-3 pr-10 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="profile-new-password" className="block text-xs font-bold text-stone-700 mb-1">
                    New Password (Min. 6 characters) *
                  </label>
                  <div className="relative">
                    <input
                      id="profile-new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      required
                      className="w-full text-xs p-3 pr-10 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="profile-confirm-password" className="block text-xs font-bold text-stone-700 mb-1">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      id="profile-confirm-password"
                      name="confirmNewPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full text-xs p-3 pr-10 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    id="submit-change-password-btn"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isChangingPassword ? 'Saving Password...' : 'Save New Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200/80 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-stone-400" />
            <span>Encrypted Server Session & Registry</span>
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  KeyRound, 
  Eye, 
  EyeOff, 
  X,
  Store,
  Compass
} from 'lucide-react';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    isAdminSeatTaken,
    hasUsers,
    registerUser,
    loginUser
  } = useApp();

  const existingAdmin = isAdminSeatTaken;
  const isFirstUser = !hasUsers;

  const [mode, setMode] = useState<'signup' | 'login'>(isFirstUser ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [role, setRole] = useState<UserRole>('seller');
  const [location, setLocation] = useState('Colombo, Sri Lanka');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authContainerRef = useRef<HTMLDivElement>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'signup') {
      if (!name.trim() || !email.trim() || !idNumber.trim()) {
        setErrorMsg('Please fill in all required fields (Name, Email, Government ID).');
        return;
      }

      if (!password || password.trim().length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please retype your password.');
        return;
      }

      if (role === 'admin' && existingAdmin) {
        setErrorMsg('Only ONE administrator account is allowed on Antiauc. An admin has already been registered.');
        return;
      }

      setIsSubmitting(true);
      const res = await registerUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        idNumber: idNumber.trim(),
        role: existingAdmin && role === 'admin' ? 'buyer' : role,
        password: password,
        location: location.trim()
      });
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(res.message);
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setPassword('');
          setConfirmPassword('');
        }, 1200);
      }
    } else {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both your registered email and password.');
        return;
      }

      setIsSubmitting(true);
      const res = await loginUser(email.trim(), password);
      setIsSubmitting(false);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(res.message);
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setPassword('');
          setConfirmPassword('');
        }, 800);
      }
    }
  };

  return (
    <div ref={authContainerRef} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-stone-950/80 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col text-stone-900 dark:text-stone-100"
        id="auth-modal"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-stone-900 dark:bg-stone-800 text-white rounded-xl shadow-xs border border-transparent dark:border-stone-700">
                {mode === 'signup' && (role === 'admin' || isFirstUser) ? (
                  <Crown className="w-5 h-5 text-amber-300" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {mode === 'signup' 
                    ? (isFirstUser || role === 'admin' ? 'Register Sole Master Administrator' : 'Create Verified Account')
                    : 'Account Login'}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Secure single-identity authentication
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex mt-4 bg-stone-200/70 dark:bg-stone-850 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login' 
                  ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Log In With Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'signup' 
                  ? 'bg-white dark:bg-stone-750 text-stone-900 dark:text-stone-100 shadow-xs' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Sign Up (New Account)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs bg-white dark:bg-stone-900">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGNUP FORM FIELDS */}
          {mode === 'signup' && (
            <>
              {/* Account Type / Role Selection */}
              <div>
                <span className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 text-[11px]">
                  Account Role *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      role === 'seller'
                        ? 'border-stone-900 dark:border-amber-400 bg-stone-50 dark:bg-amber-950/25 ring-1 ring-stone-900 dark:ring-amber-400'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 hover:bg-stone-50 dark:hover:bg-stone-850'
                    }`}
                  >
                    <Store className="w-4 h-4 text-stone-900 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">Seller / Dealer</div>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Post antique lots, manage bids, and negotiate deals.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      role === 'buyer'
                        ? 'border-stone-900 dark:border-amber-400 bg-stone-50 dark:bg-amber-950/25 ring-1 ring-stone-900 dark:ring-amber-400'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 hover:bg-stone-50 dark:hover:bg-stone-850'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-stone-900 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100">Collector / Buyer</div>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                        Place bids, conduct escrow payments, and buy artifacts.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="auth-signup-name" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                  Full Legal Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="auth-signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="e.g. Johnathan Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-signup-email" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="auth-signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="e.g. johnsmith@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="auth-signup-password" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                    Create Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="auth-signup-password"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-signup-confirm-password" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="auth-signup-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Retype password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {password && confirmPassword && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  {password === confirmPassword ? (
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="auth-signup-id-number" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                    Gov ID / Passport (Anti-Duplicate) *
                  </label>
                  <input
                    id="auth-signup-id-number"
                    name="idNumber"
                    type="text"
                    autoComplete="off"
                    required
                    placeholder="e.g. LK-NIC-19941103"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 font-mono text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>

                <div>
                  <label htmlFor="auth-signup-phone" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                    Contact Phone (Masked in Chat)
                  </label>
                  <input
                    id="auth-signup-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. +94 77 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-signup-location" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                  Location / City
                </label>
                <input
                  id="auth-signup-location"
                  name="location"
                  type="text"
                  autoComplete="address-level2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100"
                />
              </div>
            </>
          )}

          {/* LOGIN FORM FIELDS */}
          {mode === 'login' && (
            <>
              <div>
                <label htmlFor="auth-login-email" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                  Registered Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="auth-login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-login-password" className="block font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1 text-[11px]">
                  Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="auth-login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl focus:bg-white dark:focus:bg-stone-900 focus:outline-none focus:border-stone-400 dark:focus:border-amber-400 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-stone-950 font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              id="auth-submit-btn"
            >
              <UserCheck className="w-4 h-4 text-white dark:text-stone-950" />
              <span>
                {isSubmitting
                  ? (mode === 'signup' ? 'Creating Account...' : 'Signing In...')
                  : mode === 'signup' 
                    ? 'Create Password-Protected Account'
                    : 'Sign In with Password'}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
            <Lock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
            <span>Strict single-identity & password protocol enforced</span>
          </div>
        </form>
      </div>
    </div>
  );
};

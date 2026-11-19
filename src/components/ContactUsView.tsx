import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  Mail, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X, 
  FileCheck2,
  CalendarCheck,
  MessageSquare
} from 'lucide-react';
import { ContactInfo } from '../types';
import { formatTimestamp } from '../lib/date';

export const ContactUsView: React.FC = () => {
  const { 
    contactInfo, 
    updateContactInfo, 
    contactInquiries, 
    submitContactInquiry, 
    markInquiryReviewed,
    currentUser,
    sellerListingFee,
    formatCurrency
  } = useApp();

  // Contact Form State (never pre-fill masked server PII placeholders)
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(
    currentUser?.email && !currentUser.email.includes('***') ? currentUser.email : ''
  );
  const [phone, setPhone] = useState(
    currentUser?.phone && !currentUser.phone.includes('•') && !currentUser.phone.includes('*')
      ? currentUser.phone
      : ''
  );
  const [subject, setSubject] = useState('Consignment Appraisal & Verification');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Admin In-App Editor State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState<ContactInfo>(contactInfo);
  const [infoSavedSuccess, setInfoSavedSuccess] = useState(false);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await submitContactInquiry({
        name,
        email,
        phone,
        subject,
        message
      });
      setFormSuccessMessage(res.message);
      if (res.success) {
        setMessage('');
      }
      setTimeout(() => setFormSuccessMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateContactInfo(editForm);
    setInfoSavedSuccess(true);
    setTimeout(() => {
      setInfoSavedSuccess(false);
      setIsEditingInfo(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4" id="contact-us-view">
      {/* Top Banner */}
      <div className="bg-stone-950 border border-stone-800 text-stone-100 rounded-2xl p-7 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Official Curatorial Desk & Escrow Chamber
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Contact & Curatorial Services
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed font-normal">
            {contactInfo.tagline}
          </p>
        </div>

        {currentUser?.isAdmin && (
          <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              Administrator Control Active
            </span>
            <button
              onClick={() => {
                setEditForm(contactInfo);
                setIsEditingInfo(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              id="admin-edit-contact-btn"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Contact Information</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Quick Editor Modal/Drawer */}
      {isEditingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="bg-stone-950 text-stone-100 px-6 py-4 flex items-center justify-between rounded-t-2xl border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Admin: Edit Contact Page Information
                  </h3>
                  <p className="text-xs text-stone-400">
                    Update phone numbers, email addresses, gallery address, and operating hours.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingInfo(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {infoSavedSuccess && (
              <div className="bg-emerald-700 text-white text-xs px-4 py-2 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Contact details updated and saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveContactInfo} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label htmlFor="admin-contact-org-name" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Organization / House Name
                </label>
                <input
                  id="admin-contact-org-name"
                  name="organizationName"
                  type="text"
                  required
                  value={editForm.organizationName}
                  onChange={(e) => setEditForm({ ...editForm, organizationName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label htmlFor="admin-contact-tagline" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Curatorial Tagline
                </label>
                <input
                  id="admin-contact-tagline"
                  name="tagline"
                  type="text"
                  value={editForm.tagline}
                  onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-contact-phone" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Primary Telephone
                  </label>
                  <input
                    id="admin-contact-phone"
                    name="phone"
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label htmlFor="admin-contact-secondary-phone" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Secondary Telephone
                  </label>
                  <input
                    id="admin-contact-secondary-phone"
                    name="secondaryPhone"
                    type="text"
                    value={editForm.secondaryPhone}
                    onChange={(e) => setEditForm({ ...editForm, secondaryPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-contact-email" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Official Email Address
                </label>
                <input
                  id="admin-contact-email"
                  name="email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-contact-address" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Physical Address
                  </label>
                  <input
                    id="admin-contact-address"
                    name="address"
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label htmlFor="admin-contact-city" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    City, State, Country
                  </label>
                  <input
                    id="admin-contact-city"
                    name="cityStateCountry"
                    type="text"
                    value={editForm.cityStateCountry}
                    onChange={(e) => setEditForm({ ...editForm, cityStateCountry: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-contact-hours" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    General Business Hours
                  </label>
                  <input
                    id="admin-contact-hours"
                    name="businessHours"
                    type="text"
                    value={editForm.businessHours}
                    onChange={(e) => setEditForm({ ...editForm, businessHours: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label htmlFor="admin-contact-inspection-hours" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Physical Viewing / Inspection Hours
                  </label>
                  <input
                    id="admin-contact-inspection-hours"
                    name="inspectionHours"
                    type="text"
                    value={editForm.inspectionHours}
                    onChange={(e) => setEditForm({ ...editForm, inspectionHours: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-contact-notes" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Appraisal Notes & Policy Remarks
                </label>
                <textarea
                  id="admin-contact-notes"
                  name="notes"
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Contact Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4 Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Telephone Card */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Telephone & Hotline
            </h3>
            <p className="text-[11px] text-stone-500">
              Direct curatorial desk & seller consignments
            </p>
          </div>
          <div className="pt-1 text-xs space-y-1">
            <div className="font-mono font-bold text-stone-900 text-sm">
              {contactInfo.phone}
            </div>
            {contactInfo.secondaryPhone && (
              <div className="font-mono text-stone-600 text-xs">
                {contactInfo.secondaryPhone}
              </div>
            )}
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block font-semibold">
              Live Support Available
            </span>
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Curatorial Inquiries
            </h3>
            <p className="text-[11px] text-stone-500">
              Archive documentation & certificates
            </p>
          </div>
          <div className="pt-1 text-xs space-y-1">
            <div className="font-mono font-bold text-stone-900 text-xs break-all">
              {contactInfo.email}
            </div>
            <p className="text-[10px] text-stone-500">
              Typical curatorial response: under 24 hours
            </p>
          </div>
        </div>

        {/* Physical Address Card */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Chambers & Vault
            </h3>
            <p className="text-[11px] text-stone-500">
              In-person viewing and escrow custody
            </p>
          </div>
          <div className="pt-1 text-xs space-y-1">
            <p className="font-medium text-stone-900 leading-snug">
              {contactInfo.address}
            </p>
            <p className="text-[11px] text-stone-600">
              {contactInfo.cityStateCountry}
            </p>
          </div>
        </div>

        {/* Business Hours Card */}
        <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Operating Hours
            </h3>
            <p className="text-[11px] text-stone-500">
              Curatorial and appraisal sessions
            </p>
          </div>
          <div className="pt-1 text-xs space-y-1">
            <div className="font-semibold text-stone-900">
              {contactInfo.businessHours}
            </div>
            <p className="text-[10px] text-stone-500">
              {contactInfo.inspectionHours}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: Contact Form & Escrow Assurance Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Contact & Appraisal Inquiry Form */}
        <div className="lg:col-span-7 bg-white border border-stone-200/80 p-6 sm:p-7 rounded-2xl shadow-2xs space-y-5">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              Send Curatorial or Appraisal Inquiry
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Inquire about consignment listings, certificate authentication, or schedule a physical antique inspection.
            </p>
          </div>

          {formSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Inquiry Transmitted Successfully</p>
                <p className="text-[11px] mt-0.5">{formSuccessMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-inquiry-name" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  id="contact-inquiry-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="e.g. Lord Harrington / Collector"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label htmlFor="contact-inquiry-email" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  id="contact-inquiry-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-inquiry-phone" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Telephone (Optional)
                </label>
                <input
                  id="contact-inquiry-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+94 77 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label htmlFor="contact-inquiry-subject" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Subject of Inquiry
                </label>
                <select
                  id="contact-inquiry-subject"
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                >
                  <option value="Consignment Appraisal & Verification">Consignment Appraisal & Verification</option>
                  <option value="Seller Listing Approval Status">Seller Listing Approval Status</option>
                  <option value="Physical Vault Inspection Appointment">Physical Vault Inspection Appointment</option>
                  <option value="Escrow Deposit & Settlement Query">Escrow Deposit & Settlement Query</option>
                  <option value="Estate Clearances & Rare Antiquities">Estate Clearances & Rare Antiquities</option>
                  <option value="General Collector Inquiry">General Collector Inquiry</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="contact-inquiry-message" className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Detailed Message / Item Description *
              </label>
              <textarea
                id="contact-inquiry-message"
                name="message"
                rows={4}
                required
                placeholder="Please describe your antique item, provenance documentation, or inquiry in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl leading-relaxed text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-500">
                Directly reviewed by verified appraisal curators.
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                id="submit-inquiry-btn"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Transmitting...' : 'Send Curatorial Message'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Curatorial Protocols & Instructions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-stone-200/80 p-6 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-stone-900">
                Antique Consignment Protocol
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-stone-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 block font-bold">1. Seller Cataloging & Review</strong>
                  When sellers post an antique lot ({formatCurrency(sellerListingFee)} catalog fee), it enters curator queue. The master administrator verifies historical provenance before the lot appears publicly.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CalendarCheck className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 block font-bold">2. In-Person Physical Inspection</strong>
                  Buyers whose bids are selected may request a physical inspection in our chambers or agree on mutually insured transport before funds release.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-stone-900 block font-bold">3. In-App Private Chat Only</strong>
                  Contact phone numbers are masked by default to protect both buyers and sellers from unauthorized off-platform exploitation. All negotiations occur in the built-in negotiation room.
                </div>
              </div>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-[11px] text-stone-700">
              <strong className="font-bold text-stone-900">Senior Appraisal Officer Note:</strong>
              <p className="mt-0.5 italic text-stone-600">
                "{contactInfo.notes}"
              </p>
            </div>
          </div>

          {/* Admin Inquiry Viewer if logged in as Admin */}
          {currentUser?.isAdmin && (
            <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                  <h4 className="text-sm font-bold text-stone-900">
                    Logged Inquiries ({contactInquiries.length})
                  </h4>
                </div>
                <span className="text-[10px] text-stone-500 font-mono">Realtime Archive</span>
              </div>

              {contactInquiries.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-2 text-center">
                  No incoming visitor inquiries submitted yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {contactInquiries.map((inq) => (
                    <div 
                      key={inq.id} 
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        inq.status === 'new' 
                          ? 'bg-amber-50/70 border-amber-200' 
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{inq.name}</span>
                        <span className="text-[10px] text-stone-500">{formatTimestamp(inq.submittedAt)}</span>
                      </div>
                      <div className="text-[11px] text-stone-950 font-semibold">
                        {inq.subject}
                      </div>
                      <p className="text-stone-600 text-[11px] line-clamp-2">
                        "{inq.message}"
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-200 text-[10px]">
                        <span className="text-stone-500 font-mono">{inq.email} {inq.phone ? `• ${inq.phone}` : ''}</span>
                        {inq.status === 'new' ? (
                          <button
                            onClick={() => markInquiryReviewed(inq.id)}
                            className="text-stone-900 hover:underline font-bold"
                          >
                            Mark Reviewed
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Reviewed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

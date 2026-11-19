import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from './mockDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn('[Antiauc] SESSION_SECRET is not set; using an ephemeral generated secret.');
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[AI Studio] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — using in-memory mock database.');
}

const db: SupabaseClient<any, any, any> = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : (createMockSupabaseClient() as unknown as SupabaseClient<any, any, any>);

const SESSION_COOKIE_NAME = 'antiauc_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// ==================== SECURITY & CRYPTO HELPERS ====================

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): { valid: boolean; needsRehash: boolean } {
  if (!stored) return { valid: true, needsRehash: true };
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return { valid: false, needsRehash: false };
    const [, salt, originalHex] = parts;
    try {
      const derived = crypto.scryptSync(password, salt, 64);
      const original = Buffer.from(originalHex, 'hex');
      if (derived.length !== original.length) return { valid: false, needsRehash: false };
      return { valid: crypto.timingSafeEqual(derived, original), needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy plaintext compatibility with automatic upgrade to salted scrypt hash
  const a = Buffer.from(password, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.length !== b.length) return { valid: false, needsRehash: false };
  return { valid: crypto.timingSafeEqual(a, b), needsRehash: true };
}

function signSessionToken(uid: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, exp: Date.now() + SESSION_MAX_AGE_MS }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed?.uid || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return String(parsed.uid);
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') return true;
  const forwarded = req.headers['forwarded'];
  if (typeof forwarded === 'string' && /proto=https/i.test(forwarded)) return true;
  const origin = req.headers['origin'];
  if (typeof origin === 'string' && origin.startsWith('https://')) return true;
  const referer = req.headers['referer'];
  if (typeof referer === 'string' && referer.startsWith('https://')) return true;
  return false;
}

function isCrossSiteIframeContext(req: Request): boolean {
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') return true;
  const referer = String(req.headers.referer || '').toLowerCase();
  const origin = String(req.headers.origin || '').toLowerCase();
  const host = String(req.headers.host || '').toLowerCase();
  if (referer.includes('aistudio.google.com') && host && !referer.includes(host)) return true;
  if (origin.includes('aistudio.google.com') && host && !origin.includes(host)) return true;
  return false;
}

function setSessionCookie(req: Request, res: Response, uid: string): void {
  const token = signSessionToken(uid);
  const https = isHttpsRequest(req);
  const crossSiteIframe = isCrossSiteIframeContext(req);
  const isProd = process.env.NODE_ENV === 'production';

  const flags = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`,
    https && crossSiteIframe ? 'SameSite=None' : 'SameSite=Strict',
    https || isProd ? 'Secure' : '',
    https && crossSiteIframe ? 'Partitioned' : ''
  ].filter(Boolean);
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearSessionCookie(req: Request, res: Response) {
  const https = isHttpsRequest(req);
  const crossSiteIframe = isCrossSiteIframeContext(req);
  const isProd = process.env.NODE_ENV === 'production';

  const flags = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    https && crossSiteIframe ? 'SameSite=None' : 'SameSite=Strict',
    https || isProd ? 'Secure' : '',
    https && crossSiteIframe ? 'Partitioned' : ''
  ].filter(Boolean);
  res.setHeader('Set-Cookie', flags.join('; '));
}

function hashGovId(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return '';
  if (raw.trim().startsWith('sha256$')) return raw.trim();
  const digest = crypto.createHmac('sha256', SESSION_SECRET).update(`gov_id:${normalized}`).digest('hex');
  const last4 = normalized.slice(-4);
  return `sha256$${digest}$${last4}`;
}

function matchesGovId(stored: string | undefined | null, candidateRaw: string): boolean {
  const s = (stored || '').trim();
  const c = candidateRaw.trim();
  if (!s || !c) return false;
  if (s.startsWith('sha256$')) {
    return s === hashGovId(c);
  }
  return s.toLowerCase() === c.toLowerCase();
}

function maskIdNumber(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return '';
  if (val.startsWith('sha256$')) {
    const parts = val.split('$');
    const last4 = parts[2] || '';
    return last4 ? `••••${last4}` : '••••';
  }
  if (val.length <= 4) return '••••';
  return `••••${val.slice(-4)}`;
}

function maskEmail(raw?: string): string {
  const val = (raw || '').trim();
  if (!val || !val.includes('@')) return '';
  const [local, domain] = val.split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return '';
  const digits = val.replace(/\s+/g, '');
  if (digits.length <= 4) return '••••';
  return `••••••${digits.slice(-2)}`;
}

function maskHandle(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return 'Verified Collector';
  return val
    .split(/\s+/)
    .slice(0, 2)
    .map(part => (part.length <= 1 ? '*' : `${part[0]}${'*'.repeat(Math.min(3, part.length - 1))}`))
    .join(' ');
}

function sanitizeText(val: unknown, maxLength = 2000): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 7_000_000) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('data:image/png;base64,') ||
    lower.startsWith('data:image/jpeg;base64,') ||
    lower.startsWith('data:image/jpg;base64,') ||
    lower.startsWith('data:image/webp;base64,')
  ) {
    return trimmed;
  }
  return null;
}

function sanitizeImageArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ['/images/antique-fallback.webp'];
  const valid = raw
    .slice(0, 5)
    .map(sanitizeImageUrl)
    .filter((u): u is string => Boolean(u));
  return valid.length > 0 ? valid : ['/images/antique-fallback.webp'];
}

const MEDIA_BUCKET = 'antiauc-media';
let mediaBucketEnsured = false;

async function ensureMediaBucket(): Promise<void> {
  if (!db || mediaBucketEnsured) return;
  mediaBucketEnsured = true;
  try {
    const { data: buckets, error } = await db.storage.listBuckets();
    if (!error && Array.isArray(buckets) && buckets.some((b: any) => b.name === MEDIA_BUCKET)) {
      return;
    }
    await db.storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: 6 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    });
  } catch {
    // Non-fatal: bucket may already exist or key may lack bucket-admin privileges
  }
}

async function uploadDataUrlToStorage(
  rawUrl: string,
  folder: 'listings' | 'avatars',
  ownerId: string
): Promise<string> {
  const safe = sanitizeImageUrl(rawUrl);
  if (!safe) return '';
  if (!db || !safe.startsWith('data:image/')) return safe;

  const match = safe.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return safe;

  const extRaw = match[1].toLowerCase();
  const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 6 * 1024 * 1024) return safe;

  const safeOwner = (ownerId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'anon';
  const objectPath = `${folder}/${safeOwner}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;

  try {
    await ensureMediaBucket();
    const { error: uploadErr } = await db.storage.from(MEDIA_BUCKET).upload(objectPath, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false
    });
    if (uploadErr) {
      return safe;
    }
    const { data: pub } = db.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath);
    return pub?.publicUrl ? pub.publicUrl : safe;
  } catch {
    return safe;
  }
}

async function persistImageArrayToStorage(raw: unknown, ownerId: string): Promise<string[]> {
  const sanitized = sanitizeImageArray(raw);
  if (!db) return sanitized;
  const uploaded = await Promise.all(
    sanitized.map(url => uploadDataUrlToStorage(url, 'listings', ownerId))
  );
  const filtered = uploaded.filter(Boolean);
  return filtered.length > 0 ? filtered : ['/images/antique-fallback.webp'];
}

// Lightweight sliding-window rate limiter for auth & public inquiry endpoints
const rateLimitBuckets = new Map<string, number[]>();
function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const history = (rateLimitBuckets.get(key) || []).filter(ts => now - ts < windowMs);
    if (history.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this address. Please wait a few minutes before trying again.'
      });
    }
    history.push(now);
    rateLimitBuckets.set(key, history);
    next();
  };
}
const authRateLimiter = createRateLimiter(25, 10 * 60 * 1000);
const inquiryRateLimiter = createRateLimiter(12, 10 * 60 * 1000);

// ==================== DB MAPPERS & SANITIZERS ====================

const DEFAULT_CONTACT_INFO = {
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

function normalizeUserRow(row: any) {
  const code =
    row.role_code !== undefined && row.role_code !== null
      ? Number(row.role_code)
      : row.roleCode !== undefined
      ? Number(row.roleCode)
      : row.isadmin || row.isAdmin || row.role === 'admin'
      ? 0
      : 1;
  const isAdmin = code === 0 || Boolean(row.isadmin ?? row.isAdmin);
  const rawAvatar = row.avatar || '';
  const cleanAvatar =
    rawAvatar.includes('unsplash.com') ||
    rawAvatar.includes('photo-1534528741775') ||
    rawAvatar.includes('photo-1507003211169')
      ? ''
      : rawAvatar;
  let role = row.role || (isAdmin ? 'admin' : 'buyer');
  if (!['buyer', 'seller', 'admin'].includes(role)) {
    role = isAdmin ? 'admin' : 'buyer';
  }
  if (!isAdmin && role === 'admin') {
    role = 'buyer';
  }

  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    password: row.password || '',
    role,
    role_code: isAdmin ? 0 : code,
    roleCode: isAdmin ? 0 : code,
    isAdmin,
    isVerified: Boolean(row.isverified ?? row.isVerified),
    verificationIdNumber: row.verificationidnumber ?? row.verificationIdNumber ?? '',
    verificationDate: row.verificationdate ?? row.verificationDate ?? '',
    avatar: cleanAvatar,
    rating: Number(row.rating ?? 5.0),
    reviewCount: Number(row.reviewcount ?? row.reviewCount ?? 0),
    memberSince: row.membersince ?? row.memberSince ?? '2024',
    location: row.location || 'Colombo, Sri Lanka',
    sellerFeeCredits: Number(row.sellerfeecredits ?? row.sellerFeeCredits ?? 0),
    watchlist: Array.isArray(row.watchlist) ? row.watchlist : []
  };
}

function sanitizeUserForSelf(user: ReturnType<typeof normalizeUserRow>) {
  return {
    id: user.id,
    name: user.name,
    email: maskEmail(user.email),
    phone: maskPhone(user.phone),
    role: user.role,
    role_code: user.role_code,
    roleCode: user.roleCode,
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    verificationIdNumber: maskIdNumber(user.verificationIdNumber),
    verificationDate: user.verificationDate,
    avatar: user.avatar,
    rating: user.rating,
    reviewCount: user.reviewCount,
    memberSince: user.memberSince,
    location: user.location,
    sellerFeeCredits: user.sellerFeeCredits,
    watchlist: user.watchlist
  };
}

function sanitizeUserForAdmin(user: ReturnType<typeof normalizeUserRow>) {
  return {
    id: user.id,
    name: user.name,
    email: maskEmail(user.email),
    phone: '',
    role: user.role,
    role_code: user.role_code,
    roleCode: user.roleCode,
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    verificationIdNumber: maskIdNumber(user.verificationIdNumber),
    verificationDate: user.verificationDate,
    avatar: user.avatar,
    rating: user.rating,
    reviewCount: user.reviewCount,
    memberSince: user.memberSince,
    location: user.location,
    sellerFeeCredits: user.sellerFeeCredits
  };
}

function toPublicSellerProfile(user: ReturnType<typeof normalizeUserRow>) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    rating: user.rating,
    reviewCount: user.reviewCount,
    isVerified: user.isVerified,
    memberSince: user.memberSince,
    location: user.location
  };
}

function itemFromDbRow(row: any) {
  return {
    id: row.id,
    title: row.title || '',
    era: row.era || '',
    category: row.category || 'Brassware & Metal',
    condition: row.condition || 'Original Aged Condition',
    provenance: row.provenance || '',
    dimensions: row.dimensions || '',
    city: row.city || 'Colombo',
    country: row.country || 'Sri Lanka',
    location: row.location || 'Colombo, Sri Lanka',
    startingBid: Number(row.startingbid ?? row.startingBid ?? 300),
    currentBid: Number(row.currentbid ?? row.currentBid ?? row.startingbid ?? row.startingBid ?? 300),
    reservePrice:
      row.reserveprice !== undefined && row.reserveprice !== null
        ? Number(row.reserveprice)
        : row.reservePrice !== undefined
        ? Number(row.reservePrice)
        : undefined,
    bidCount: Number(row.bidcount ?? row.bidCount ?? 0),
    images: Array.isArray(row.images) ? row.images : [],
    sellerId: row.sellerid ?? row.sellerId ?? '',
    sellerName: row.sellername ?? row.sellerName ?? '',
    sellerVerified: Boolean(row.sellerverified ?? row.sellerVerified ?? true),
    sellerRating: Number(row.sellerrating ?? row.sellerRating ?? 5.0),
    sellerReviewCount: Number(row.sellerreviewcount ?? row.sellerReviewCount ?? 0),
    createdAt: row.createdat ?? row.createdAt ?? new Date().toISOString(),
    endsAt: row.endsat ?? row.endsAt ?? '',
    status: row.status || 'active',
    bids: Array.isArray(row.bids) ? row.bids : [],
    listingFeePaid: Boolean(row.listingfeepaid ?? row.listingFeePaid ?? false),
    listingFeeTxId: row.listingfeetxid ?? row.listingFeeTxId ?? undefined,
    acceptedBidId: row.acceptedbidid ?? row.acceptedBidId ?? undefined,
    chosenBuyerId: row.chosenbuyerid ?? row.chosenBuyerId ?? undefined,
    chosenBuyerName: row.chosenbuyername ?? row.chosenBuyerName ?? undefined,
    chosenDealAmount:
      row.chosendealamount !== undefined && row.chosendealamount !== null
        ? Number(row.chosendealamount)
        : undefined,
    rejectionReason: row.rejectionreason ?? row.rejectionReason ?? undefined
  };
}

function sanitizeItemForViewer(item: ReturnType<typeof itemFromDbRow>, viewer: ReturnType<typeof normalizeUserRow> | null) {
  const canSeePrivate = Boolean(viewer && (viewer.isAdmin || viewer.id === item.sellerId));
  const isChosenWinner = Boolean(viewer && item.chosenBuyerId && viewer.id === item.chosenBuyerId);

  const sanitizedBids = (Array.isArray(item.bids) ? item.bids : []).map((bid: any) => {
    const isMyBid = Boolean(viewer && bid.bidderId === viewer.id);
    if (canSeePrivate || isMyBid) {
      return {
        ...bid,
        isMyBid
      };
    }
    return {
      id: bid.id,
      itemId: bid.itemId,
      bidderId: '',
      bidderName: maskHandle(bid.bidderName),
      bidderAvatar: '',
      bidderVerified: Boolean(bid.bidderVerified),
      bidderRating: Number(bid.bidderRating ?? 5.0),
      amount: Number(bid.amount ?? 0),
      timestamp: bid.timestamp || '',
      isLeading: Boolean(bid.isLeading),
      isMyBid: false
    };
  });

  return {
    ...item,
    bids: sanitizedBids,
    reservePrice: canSeePrivate ? item.reservePrice : undefined,
    listingFeeTxId: canSeePrivate ? item.listingFeeTxId : undefined,
    rejectionReason: canSeePrivate ? item.rejectionReason : undefined,
    chosenBuyerId: canSeePrivate || isChosenWinner ? item.chosenBuyerId : undefined,
    chosenBuyerName:
      canSeePrivate || isChosenWinner
        ? item.chosenBuyerName
        : item.chosenBuyerName
        ? maskHandle(item.chosenBuyerName)
        : undefined
  };
}

function itemToDbRow(item: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.title !== undefined) row.title = item.title;
  if (item.category !== undefined) row.category = item.category;
  if (item.era !== undefined) row.era = item.era;
  if (item.condition !== undefined) row.condition = item.condition;
  if (item.dimensions !== undefined) row.dimensions = item.dimensions;
  if (item.provenance !== undefined) row.provenance = item.provenance;
  if (item.city !== undefined) row.city = item.city;
  if (item.country !== undefined) row.country = item.country;
  if (item.location !== undefined) row.location = item.location;
  if (item.reservePrice !== undefined) row.reserveprice = item.reservePrice;
  if (item.startingBid !== undefined) row.startingbid = item.startingBid;
  if (item.currentBid !== undefined) row.currentbid = item.currentBid;
  if (item.bidCount !== undefined) row.bidcount = item.bidCount;
  if (item.images !== undefined) row.images = item.images;
  if (item.sellerId !== undefined) row.sellerid = item.sellerId;
  if (item.sellerName !== undefined) row.sellername = item.sellerName;
  if (item.sellerRating !== undefined) row.sellerrating = item.sellerRating;
  if (item.sellerReviewCount !== undefined) row.sellerreviewcount = item.sellerReviewCount;
  if (item.sellerVerified !== undefined) row.sellerverified = item.sellerVerified;
  if (item.createdAt !== undefined) row.createdat = item.createdAt;
  if (item.endsAt !== undefined) row.endsat = item.endsAt;
  if (item.status !== undefined) row.status = item.status;
  if (item.bids !== undefined) row.bids = item.bids;
  if (item.listingFeePaid !== undefined) row.listingfeepaid = item.listingFeePaid;
  if (item.listingFeeTxId !== undefined) row.listingfeetxid = item.listingFeeTxId;
  if (item.acceptedBidId !== undefined) row.acceptedbidid = item.acceptedBidId;
  if (item.chosenBuyerId !== undefined) row.chosenbuyerid = item.chosenBuyerId;
  if (item.chosenBuyerName !== undefined) row.chosenbuyername = item.chosenBuyerName;
  if (item.chosenDealAmount !== undefined) row.chosendealamount = item.chosenDealAmount;
  if (item.rejectionReason !== undefined) row.rejectionreason = item.rejectionReason;
  return row;
}

function isMissingLocationColumnError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    ((msg.includes('city') || msg.includes('country') || msg.includes('location')) &&
      (msg.includes('column') || msg.includes('schema cache')))
  );
}

async function upsertItemResilient(row: Record<string, any>) {
  if (!db) return { error: new Error('Database unavailable') };
  const first = await db.from('items').upsert(row);
  if (!first.error || !isMissingLocationColumnError(first.error)) {
    return first;
  }
  const { city: _c, country: _co, location: _l, ...fallbackRow } = row;
  return db.from('items').upsert(fallbackRow);
}

function userToDbRow(u: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  if (u.id !== undefined) row.id = u.id;
  if (u.name !== undefined) row.name = u.name;
  if (u.email !== undefined) row.email = u.email;
  if (u.password !== undefined) row.password = u.password;
  if (u.phone !== undefined) row.phone = u.phone;
  if (u.role !== undefined) row.role = u.role;
  if (u.role_code !== undefined) row.role_code = u.role_code;
  else if (u.roleCode !== undefined) row.role_code = u.roleCode;
  if (u.isAdmin !== undefined) row.isadmin = u.isAdmin;
  if (u.isVerified !== undefined) row.isverified = u.isVerified;
  if (u.verificationIdNumber !== undefined) row.verificationidnumber = u.verificationIdNumber;
  if (u.verificationDate !== undefined) row.verificationdate = u.verificationDate;
  if (u.avatar !== undefined) row.avatar = u.avatar;
  if (u.rating !== undefined) row.rating = u.rating;
  if (u.reviewCount !== undefined) row.reviewcount = u.reviewCount;
  if (u.memberSince !== undefined) row.membersince = u.memberSince;
  if (u.location !== undefined) row.location = u.location;
  if (u.sellerFeeCredits !== undefined) row.sellerfeecredits = u.sellerFeeCredits;
  if (u.watchlist !== undefined) row.watchlist = u.watchlist;
  return row;
}

function chatFromDbRow(row: any) {
  return {
    id: row.id,
    itemId: row.itemid ?? row.itemId ?? '',
    itemTitle: row.itemtitle ?? row.itemTitle ?? '',
    itemEra: row.itemera ?? row.itemEra ?? '',
    itemImage: row.itemimage ?? row.itemImage ?? '',
    sellerId: row.sellerid ?? row.sellerId ?? '',
    sellerName: row.sellername ?? row.sellerName ?? '',
    buyerId: row.buyerid ?? row.buyerId ?? '',
    buyerName: row.buyername ?? row.buyerName ?? '',
    dealAmount: Number(row.dealamount ?? row.dealAmount ?? 0),
    dealStatus: row.dealstatus ?? row.dealStatus ?? 'negotiating',
    isAdminDirectChat: Boolean(row.isadmindirectchat ?? row.isAdminDirectChat ?? false),
    messages: Array.isArray(row.messages) ? row.messages : [],
    createdAt: row.createdat ?? row.createdAt ?? new Date().toISOString(),
    lastMessageTime: row.lastmessagetime ?? row.lastMessageTime ?? new Date().toISOString()
  };
}

function chatToDbRow(c: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.id !== undefined) row.id = c.id;
  if (c.itemId !== undefined) row.itemid = c.itemId;
  if (c.itemTitle !== undefined) row.itemtitle = c.itemTitle;
  if (c.itemEra !== undefined) row.itemera = c.itemEra;
  if (c.itemImage !== undefined) row.itemimage = c.itemImage;
  if (c.sellerId !== undefined) row.sellerid = c.sellerId;
  if (c.sellerName !== undefined) row.sellername = c.sellerName;
  if (c.buyerId !== undefined) row.buyerid = c.buyerId;
  if (c.buyerName !== undefined) row.buyername = c.buyerName;
  if (c.dealAmount !== undefined) row.dealamount = c.dealAmount;
  if (c.dealStatus !== undefined) row.dealstatus = c.dealStatus;
  if (c.isAdminDirectChat !== undefined) row.isadmindirectchat = c.isAdminDirectChat;
  if (c.messages !== undefined) row.messages = c.messages;
  if (c.createdAt !== undefined) row.createdat = c.createdAt;
  if (c.lastMessageTime !== undefined) row.lastmessagetime = c.lastMessageTime;
  return row;
}

function sellerRatingFromDbRow(row: any) {
  return {
    id: row.id,
    sellerId: row.sellerid ?? row.sellerId ?? '',
    sellerName: row.sellername ?? row.sellerName ?? '',
    raterId: row.raterid ?? row.raterId ?? '',
    raterName: row.ratername ?? row.raterName ?? '',
    rating: Number(row.rating ?? 5),
    comment: row.comment || '',
    tag: row.tag || '',
    timestamp: row.timestamp || new Date().toISOString(),
    itemId: row.itemid ?? row.itemId ?? undefined,
    itemTitle: row.itemtitle ?? row.itemTitle ?? undefined
  };
}

function sellerRatingToDbRow(r: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  if (r.id !== undefined) row.id = r.id;
  if (r.sellerId !== undefined) row.sellerid = r.sellerId;
  if (r.sellerName !== undefined) row.sellername = r.sellerName;
  if (r.raterId !== undefined) row.raterid = r.raterId;
  if (r.raterName !== undefined) row.ratername = r.raterName;
  if (r.rating !== undefined) row.rating = r.rating;
  if (r.comment !== undefined) row.comment = r.comment;
  if (r.tag !== undefined) row.tag = r.tag;
  if (r.timestamp !== undefined) row.timestamp = r.timestamp;
  if (r.itemId !== undefined) row.itemid = r.itemId;
  if (r.itemTitle !== undefined) row.itemtitle = r.itemTitle;
  return row;
}

function inquiryFromDbRow(row: any) {
  return {
    id: row.id,
    name: row.fullname ?? row.fullName ?? row.name ?? '',
    email: row.email || '',
    phone: row.phone || '',
    subject: row.subject || '',
    message: row.message || '',
    status: row.status || 'new',
    submittedAt: row.submittedat ?? row.submittedAt ?? new Date().toISOString()
  };
}

// ==================== SSE REALTIME BROADCAST ====================

const sseClients = new Set<Response>();

function broadcastSync(scope: string = 'all') {
  const payload = `data: ${JSON.stringify({ type: 'sync', scope, ts: Date.now() })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

if (db && !process.env.VERCEL) {
  db.channel('server_db_sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => broadcastSync('items'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => broadcastSync('chats'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => broadcastSync('users'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_ratings' }, () => broadcastSync('ratings'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => broadcastSync('inquiries'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => broadcastSync('settings'))
    .subscribe();
}

// ==================== EXPRESS APP SETUP ====================

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '15mb' }));

// Global HTTP security headers & Content Security Policy
app.use((req: Request, res: Response, next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev ? "'self' 'unsafe-inline'" : "'self'";
  const connectSrc = isDev
    ? "'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com"
    : "'self' https://fonts.googleapis.com https://fonts.gstatic.com";

  const supabaseOrigin = (() => {
    try {
      return SUPABASE_URL ? new URL(SUPABASE_URL).origin : '';
    } catch {
      return '';
    }
  })();
  const imgSrc = ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', supabaseOrigin, 'https://*.supabase.co']
    .filter(Boolean)
    .join(' ');

  const cspDirectives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://aistudio.google.com https://*.google.com",
    isHttpsRequest(req) || !isDev ? 'upgrade-insecure-requests' : ''
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

async function getAuthenticatedUser(req: Request) {
  if (!db) return null;
  const cookies = parseCookies(req.headers.cookie);
  const uid = verifySessionToken(cookies[SESSION_COOKIE_NAME]);
  if (!uid) return null;
  const { data, error } = await db.from('users').select('*').eq('id', uid).maybeSingle();
  if (error || !data) return null;
  return normalizeUserRow(data);
}

// ==================== SSE STREAM ====================

app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  if (process.env.VERCEL) {
    res.write(`data: ${JSON.stringify({ type: 'poll_only', ts: Date.now() })}\n\n`);
    res.end();
    return;
  }

  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ==================== BOOTSTRAP (SCOPED BY SESSION) ====================

app.get('/api/bootstrap', async (req: Request, res: Response) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not configured on server.' });
  }
  try {
    const viewer = await getAuthenticatedUser(req);

    const USER_COLS = viewer?.isAdmin
      ? 'id, name, email, phone, role, role_code, isadmin, isverified, verificationidnumber, verificationdate, avatar, rating, reviewcount, membersince, location, sellerfeecredits, watchlist'
      : 'id, name, role, role_code, isadmin, isverified, avatar, rating, reviewcount, membersince, location';

    const itemsQuery = !viewer
      ? db.from('items').select('*').in('status', ['active', 'sold', 'deal_pending']).order('createdat', { ascending: false })
      : db.from('items').select('*').order('createdat', { ascending: false });

    const chatsQuery = viewer
      ? viewer.isAdmin
        ? db.from('chats').select('*').order('lastmessagetime', { ascending: false })
        : db.from('chats').select('*').or(`buyerid.eq.${viewer.id},sellerid.eq.${viewer.id}`).order('lastmessagetime', { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null });

    const inquiriesQuery = viewer?.isAdmin
      ? db.from('inquiries').select('*').order('submittedat', { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null });

    const [itemsRes, usersRes, ratingsRes, settingsRes, chatsRes, inqRes] = await Promise.all([
      itemsQuery,
      db.from('users').select(USER_COLS),
      db.from('seller_ratings').select('*'),
      db.from('platform_settings').select('*').eq('id', 'platform').maybeSingle(),
      chatsQuery,
      inquiriesQuery
    ]);

    if (itemsRes.error || usersRes.error || ratingsRes.error) {
      console.error('[GET /api/bootstrap] Query error:', {
        items: itemsRes.error?.code,
        users: usersRes.error?.code,
        ratings: ratingsRes.error?.code
      });
      return res.status(500).json({ error: 'Failed to load marketplace state from database.' });
    }

    const normalizedUsers = (usersRes.data || []).map(normalizeUserRow);
    const isAdminSeatTaken = normalizedUsers.some(u => u.isAdmin);
    const hasUsers = normalizedUsers.length > 0;

    const rawItems = (itemsRes.data || [])
      .map(itemFromDbRow)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const sellerIdsWithItems = new Set(rawItems.map(it => it.sellerId));
    const items = rawItems.map(it => sanitizeItemForViewer(it, viewer));

    const sellerProfiles = normalizedUsers
      .filter(u => u.role === 'seller' || sellerIdsWithItems.has(u.id))
      .map(toPublicSellerProfile);

    const sellerRatings = (ratingsRes.data || [])
      .map(sellerRatingFromDbRow)
      .map(r => {
        const canSeeRater = Boolean(viewer && (viewer.isAdmin || viewer.id === r.raterId));
        return canSeeRater
          ? r
          : {
              ...r,
              raterId: '',
              raterName: maskHandle(r.raterName)
            };
      });

    let chats: ReturnType<typeof chatFromDbRow>[] = [];
    if (viewer) {
      if (chatsRes.error) {
        console.error('[GET /api/bootstrap] Chats query error:', chatsRes.error.code);
      } else {
        chats = (chatsRes.data || [])
          .map(chatFromDbRow)
          .filter(c => viewer.isAdmin || c.buyerId === viewer.id || c.sellerId === viewer.id);
      }
    }

    let inquiries: ReturnType<typeof inquiryFromDbRow>[] = [];
    if (viewer?.isAdmin) {
      if (inqRes.error) {
        console.error('[GET /api/bootstrap] Inquiries query error:', inqRes.error.code);
      } else {
        inquiries = (inqRes.data || []).map(inquiryFromDbRow);
      }
    }

    const rawSettings = settingsRes.error ? null : settingsRes.data;
    const rawFee = rawSettings ? (rawSettings.sellerlistingfee ?? rawSettings.sellerListingFee ?? 0) : 0;
    const platformSettings = {
      sellerListingFee: typeof rawFee === 'number' ? rawFee : (!isNaN(Number(rawFee)) ? Number(rawFee) : 0),
      contactInfo: rawSettings?.contactinfo || rawSettings?.contactInfo || DEFAULT_CONTACT_INFO
    };

    return res.json({
      currentUser: viewer ? sanitizeUserForSelf(viewer) : null,
      isAdminSeatTaken,
      hasUsers,
      items,
      sellerProfiles,
      chats,
      sellerRatings,
      inquiries,
      platformSettings,
      users: viewer?.isAdmin ? normalizedUsers.map(sanitizeUserForAdmin) : []
    });
  } catch (err) {
    console.error('[GET /api/bootstrap] Error:', err);
    return res.status(500).json({ error: 'Failed to load marketplace state.' });
  }
});

// ==================== AUTHENTICATION ENDPOINTS ====================

app.post('/api/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  try {
    const rawBody = req.body || {};
    const name = sanitizeText(rawBody.name, 120);
    const email = sanitizeText(rawBody.email, 160);
    const phone = sanitizeText(rawBody.phone, 40);
    const idNumber = sanitizeText(rawBody.idNumber, 64);
    const location = sanitizeText(rawBody.location, 140);
    const role = rawBody.role;
    const password = rawBody.password;

    if (!name || !email || !idNumber) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields (Name, Email, Government ID).' });
    }
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'A secure password of at least 6 characters is required.' });
    }

    const { data: allUsersRaw, error: fetchErr } = await db
      .from('users')
      .select('id, email, verificationidnumber, isadmin, role_code, role');
    if (fetchErr) {
      return res.status(500).json({ success: false, message: 'Database error during registration check.' });
    }

    const allUsers = (allUsersRaw || []).map(normalizeUserRow);

    const dupId = allUsers.find(u => matchesGovId(u.verificationIdNumber, String(idNumber)));
    if (dupId) {
      return res.status(409).json({
        success: false,
        message: 'An account is already verified under this Government ID. Duplicate identity registrations are prohibited.'
      });
    }

    const dupEmail = allUsers.find(
      u => u.email.trim().toLowerCase() === String(email).trim().toLowerCase()
    );
    if (dupEmail) {
      return res.status(409).json({
        success: false,
        message: `An account with email ${email} already exists. Please log in instead.`
      });
    }

    const existingAdmin = allUsers.find(u => u.isAdmin);
    const wantsAdmin = role === 'admin' || (allUsers.length === 0 && !existingAdmin);

    if (wantsAdmin && existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only ONE person can be registered as Master Administrator. An administrator account already exists.'
      });
    }

    const isDesignatedAdmin = wantsAdmin && !existingAdmin;
    const finalRole = isDesignatedAdmin ? 'admin' : role === 'seller' ? 'seller' : 'buyer';

    const newUserObj = {
      id: `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone || '').trim(),
      password: hashPassword(String(password)),
      role: finalRole,
      role_code: isDesignatedAdmin ? 0 : 1,
      isAdmin: isDesignatedAdmin,
      isVerified: isDesignatedAdmin,
      verificationIdNumber: hashGovId(String(idNumber).trim()),
      verificationDate: isDesignatedAdmin ? new Date().toISOString() : '',
      avatar: '',
      rating: 5.0,
      reviewCount: 0,
      memberSince: new Date().getFullYear().toString(),
      location: String(location || 'Heritage Exchange District').trim(),
      sellerFeeCredits: 0,
      watchlist: []
    };

    const { error: upsertErr } = await db.from('users').upsert(userToDbRow(newUserObj));
    if (upsertErr) {
      return res.status(500).json({ success: false, message: 'Failed to create account in database.' });
    }

    setSessionCookie(req, res, newUserObj.id);
    broadcastSync('users');

    const normalized = normalizeUserRow(userToDbRow(newUserObj));
    return res.json({
      success: true,
      user: sanitizeUserForSelf(normalized),
      message: isDesignatedAdmin
        ? `Welcome, Master Administrator ${newUserObj.name}! Your admin account has been created.`
        : `Account created successfully for ${newUserObj.name} (${finalRole === 'seller' ? 'Seller' : 'Buyer'}). Identity verification is pending administrator review.`
    });
  } catch (err) {
    console.error('[POST /api/auth/register] Error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

app.post('/api/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  try {
    const cleanEmail = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = req.body?.password;
    if (!cleanEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both your registered email and password.' });
    }

    const escapedForLike = cleanEmail.replace(/[%_\\]/g, '\\$&');
    const { data: usersData, error } = await db
      .from('users')
      .select('*')
      .ilike('email', escapedForLike)
      .limit(5);
    if (error) {
      return res.status(500).json({ success: false, message: 'Authentication service temporarily unavailable.' });
    }

    const matchedRow = (usersData || []).find(
      (u: any) => String(u.email || '').trim().toLowerCase() === cleanEmail
    );

    if (!matchedRow) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials and try again.'
      });
    }

    const user = normalizeUserRow(matchedRow);
    const pwCheck = verifyPassword(String(password), user.password || '');
    if (!pwCheck.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials and try again.'
      });
    }

    // Upgrade legacy plaintext passwords to salted scrypt hash silently
    if (pwCheck.needsRehash) {
      const upgradedHash = hashPassword(String(password));
      await db.from('users').update({ password: upgradedHash }).eq('id', user.id);
    }

    setSessionCookie(req, res, user.id);

    return res.json({
      success: true,
      user: sanitizeUserForSelf(user),
      message: user.isAdmin
        ? `Welcome back, Master Administrator ${user.name}!`
        : `Welcome back, ${user.name}!`
    });
  } catch (err) {
    console.error('[POST /api/auth/login] Error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  clearSessionCookie(req, res);
  return res.json({ success: true });
});

app.post('/api/auth/change-password', authRateLimiter, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) {
    return res.status(401).json({ success: false, message: 'You must be logged in to change your password.' });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Please enter your current password.' });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: 'New password cannot be identical to the current password.' });
  }

  const check = verifyPassword(String(currentPassword), viewer.password || '');
  if (!check.valid) {
    return res.status(403).json({ success: false, message: 'Current password does not match our records.' });
  }

  const hashed = hashPassword(String(newPassword));
  const { error } = await db.from('users').update({ password: hashed }).eq('id', viewer.id);
  if (error) {
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }

  return res.json({ success: true, message: 'Your password has been successfully updated.' });
});

app.post('/api/auth/verify', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) {
    return res.status(401).json({ success: false, message: 'Please log in or register first.' });
  }
  if (viewer.isVerified) {
    return res.json({ success: true, user: sanitizeUserForSelf(viewer), message: 'Your identity is already verified.' });
  }

  // A user cannot approve their own identity. Registration stores only a keyed
  // hash of the supplied identity number; an administrator must review it.
  return res.json({
    success: true,
    user: sanitizeUserForSelf(viewer),
    message: 'Your verification request is pending administrator review. You will be able to bid and list once it is approved.'
  });
});

app.patch('/api/auth/profile', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) {
    return res.status(401).json({ success: false, message: 'You must be signed in to perform this action.' });
  }

  const { name, phone, avatar, location } = req.body || {};
  const cleanName = name !== undefined ? sanitizeText(name, 120) : '';
  const rawPhone = phone !== undefined ? sanitizeText(phone, 40) : '';
  // Preserve existing phone if client sent back a masked placeholder
  const cleanPhone = rawPhone && !rawPhone.includes('•') && !rawPhone.includes('*') ? rawPhone : viewer.phone;
  const cleanLocation = location !== undefined ? sanitizeText(location, 140) : viewer.location;
  const cleanAvatar =
    avatar === ''
      ? ''
      : avatar !== undefined
      ? await uploadDataUrlToStorage(String(avatar), 'avatars', viewer.id) || viewer.avatar
      : viewer.avatar;

  const updates = userToDbRow({
    name: cleanName || viewer.name,
    phone: cleanPhone,
    avatar: cleanAvatar,
    location: cleanLocation
  });

  const { data: updated, error } = await db.from('users').update(updates).eq('id', viewer.id).select('*').single();
  if (error || !updated) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }

  broadcastSync('users');
  return res.json({
    success: true,
    user: sanitizeUserForSelf(normalizeUserRow(updated)),
    message: 'Your profile and avatar have been updated successfully!'
  });
});

app.patch('/api/auth/watchlist', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const incoming = Array.isArray(req.body?.watchlist) ? req.body.watchlist : [];
  const safeWatchlist = Array.from(
    new Set(
      incoming
        .map((id: unknown) => sanitizeText(id, 64))
        .filter(Boolean)
    )
  ).slice(0, 100);

  const { error } = await db.from('users').update({ watchlist: safeWatchlist }).eq('id', viewer.id);
  if (error) {
    return res.status(500).json({ success: false, message: 'Failed to update saved lots.' });
  }
  return res.json({ success: true, watchlist: safeWatchlist });
});

app.post('/api/auth/role', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const { role } = req.body || {};
  if (role === 'admin' && !viewer.isAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }

  const safeRole = role === 'admin' && viewer.isAdmin ? 'admin' : role === 'seller' ? 'seller' : 'buyer';
  const { data: updated, error } = await db
    .from('users')
    .update({ role: safeRole })
    .eq('id', viewer.id)
    .select('*')
    .single();

  if (error || !updated) {
    return res.status(500).json({ success: false, message: 'Failed to switch role.' });
  }

  return res.json({ success: true, user: sanitizeUserForSelf(normalizeUserRow(updated)) });
});

app.get('/api/auth/export', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Authentication required.' });

  try {
    const [itemsRes, chatsRes, ratingsRes] = await Promise.all([
      db.from('items').select('*'),
      db.from('chats').select('*').or(`buyerid.eq.${viewer.id},sellerid.eq.${viewer.id}`),
      db.from('seller_ratings').select('*').or(`raterid.eq.${viewer.id},sellerid.eq.${viewer.id}`)
    ]);

    const allItems = (itemsRes.data || []).map(itemFromDbRow);
    const myListings = allItems.filter(it => it.sellerId === viewer.id);
    const myBids = allItems.flatMap(it =>
      (it.bids || [])
        .filter((b: any) => b.bidderId === viewer.id)
        .map((b: any) => ({ itemId: it.id, itemTitle: it.title, ...b }))
    );

    const myChats = (chatsRes.data || [])
      .map(chatFromDbRow)
      .filter(c => c.buyerId === viewer.id || c.sellerId === viewer.id);

    const myReviews = (ratingsRes.data || [])
      .map(sellerRatingFromDbRow)
      .filter(r => r.raterId === viewer.id || r.sellerId === viewer.id);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      platform: 'Antiauc Marketplace',
      account: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        phone: viewer.phone,
        role: viewer.role,
        isVerified: viewer.isVerified,
        verificationIdStatus: viewer.verificationIdNumber ? `Verified (${maskIdNumber(viewer.verificationIdNumber)})` : 'Unverified',
        verificationDate: viewer.verificationDate,
        location: viewer.location,
        memberSince: viewer.memberSince,
        rating: viewer.rating,
        reviewCount: viewer.reviewCount,
        watchlist: viewer.watchlist
      },
      listings: myListings,
      bids: myBids,
      chats: myChats,
      reviews: myReviews
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="antiauc-personal-data-export.json"');
    return res.send(JSON.stringify(exportBundle, null, 2));
  } catch (err) {
    console.error('[GET /api/auth/export] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assemble personal data export.' });
  }
});

app.delete('/api/auth/account', authRateLimiter, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const password = String(req.body?.password || '');
  if (viewer.password) {
    const check = verifyPassword(password, viewer.password);
    if (!check.valid) {
      return res.status(403).json({ success: false, message: 'Incorrect password. Account deletion aborted.' });
    }
  }

  if (viewer.isAdmin) {
    const { data: admins } = await db.from('users').select('id').or('isadmin.eq.true,role_code.eq.0');
    const otherAdmins = (admins || []).filter((a: any) => a.id !== viewer.id);
    if (otherAdmins.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete the sole Master Administrator account while the platform is active.'
      });
    }
  }

  try {
    // 1. Close or remove listings owned by deleted user & anonymize bids on other items
    const { data: allItemsRaw } = await db.from('items').select('*');
    for (const row of allItemsRaw || []) {
      const item = itemFromDbRow(row);
      if (item.sellerId === viewer.id) {
        if (item.status === 'active' || item.status === 'pending_approval') {
          await db.from('items').update({ status: 'closed', sellername: 'Deleted Account' }).eq('id', item.id);
        } else {
          await db.from('items').update({ sellername: 'Deleted Account' }).eq('id', item.id);
        }
      } else if (Array.isArray(item.bids) && item.bids.some((b: any) => b.bidderId === viewer.id)) {
        const scrubbedBids = item.bids.map((b: any) =>
          b.bidderId === viewer.id ? { ...b, bidderName: 'Deleted Account', bidderAvatar: '' } : b
        );
        await db.from('items').update({ bids: scrubbedBids }).eq('id', item.id);
      }
    }

    // 2. Anonymize user identity in chats
    const { data: allChatsRaw } = await db
      .from('chats')
      .select('*')
      .or(`buyerid.eq.${viewer.id},sellerid.eq.${viewer.id}`);
    for (const crow of allChatsRaw || []) {
      const c = chatFromDbRow(crow);
      if (c.buyerId === viewer.id || c.sellerId === viewer.id) {
        const scrubbedMsgs = (c.messages || []).map((m: any) =>
          m.senderId === viewer.id ? { ...m, senderName: 'Deleted Account' } : m
        );
        await db
          .from('chats')
          .update({
            buyername: c.buyerId === viewer.id ? 'Deleted Account' : c.buyerName,
            sellername: c.sellerId === viewer.id ? 'Deleted Account' : c.sellerName,
            messages: scrubbedMsgs
          })
          .eq('id', c.id);
      }
    }

    // 3. Remove ratings written by user & anonymize seller references on ratings received
    await db.from('seller_ratings').delete().eq('raterid', viewer.id);
    await db.from('seller_ratings').update({ sellername: 'Deleted Account' }).eq('sellerid', viewer.id);

    // 4. Delete user record & clear session cookie
    const { error: delErr } = await db.from('users').delete().eq('id', viewer.id);
    if (delErr) {
      return res.status(500).json({ success: false, message: 'Failed to delete user record.' });
    }

    clearSessionCookie(req, res);
    broadcastSync('all');
    return res.json({ success: true, message: 'Your account and personal credentials have been permanently deleted.' });
  } catch (err) {
    console.error('[DELETE /api/auth/account] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete account deletion.' });
  }
});

// ==================== ITEMS & AUCTION ENDPOINTS ====================

app.post('/api/items', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Authentication required.' });
  if (!viewer.isVerified) return res.status(403).json({ success: false, message: 'Identity verification required.' });

  const body = req.body || {};
  const title = sanitizeText(body.title, 180);
  const provenance = sanitizeText(body.provenance, 2500);
  if (!title || !provenance) {
    return res.status(400).json({ success: false, message: 'Title and provenance details are required.' });
  }

  const startingBidNum = Math.max(300, Math.round(Number(body.startingBid) || 300));
  const city = sanitizeText(body.city, 80) || 'Colombo';
  const country = sanitizeText(body.country, 80) || 'Sri Lanka';

  const { data: settingsRow } = await db.from('platform_settings').select('*').eq('id', 'platform').maybeSingle();
  const fee = settingsRow ? Number(settingsRow.sellerlistingfee ?? settingsRow.sellerListingFee ?? 0) : 0;
  if (!Number.isFinite(fee) || fee < 0) {
    return res.status(500).json({ success: false, message: 'The listing fee is not configured correctly.' });
  }
  if (fee > 0 && !viewer.isAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Listing payments are not enabled yet. No payment has been taken and your listing has not been submitted.'
    });
  }
  const txId = fee === 0 ? 'FEE_WAIVED' : 'ADMIN_EXEMPT';
  const requiresApproval = !viewer.isAdmin;

  const newItem = {
    id: `item_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    title,
    category: sanitizeText(body.category, 60) || 'Timepieces',
    era: sanitizeText(body.era, 100) || 'Antique Period',
    condition: sanitizeText(body.condition, 60) || 'Original Aged Condition',
    provenance,
    dimensions: sanitizeText(body.dimensions, 120),
    city,
    country,
    location: `${city}, ${country}`,
    startingBid: startingBidNum,
    reservePrice: 0,
    estimatedValueRange: '',
    images: await persistImageArrayToStorage(body.images, viewer.id),
    sellerId: viewer.id,
    sellerName: viewer.name,
    sellerVerified: viewer.isVerified,
    sellerRating: viewer.rating,
    sellerReviewCount: viewer.reviewCount,
    createdAt: new Date().toISOString(),
    endsAt: typeof body.endsAt === 'string' && !isNaN(Date.parse(body.endsAt))
      ? body.endsAt
      : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: requiresApproval ? 'pending_approval' : 'active',
    currentBid: startingBidNum,
    bidCount: 0,
    bids: [],
    listingFeePaid: fee === 0 || viewer.isAdmin,
    listingFeeTxId: txId
  };

  const { error } = await upsertItemResilient(itemToDbRow(newItem));
  if (error) {
    console.error('[POST /api/items] DB Error:', (error as any).code || 'unknown');
    return res.status(500).json({ success: false, message: 'Failed to create auction listing.' });
  }

  broadcastSync('items');
  return res.json({ success: true, txId, requiresApproval, item: sanitizeItemForViewer(itemFromDbRow(itemToDbRow(newItem)), viewer) });
});

app.patch('/api/items/:id', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const { data: existingRow } = await db.from('items').select('*').eq('id', req.params.id).maybeSingle();
  if (!existingRow) return res.status(404).json({ success: false, message: 'Item not found.' });
  const existing = itemFromDbRow(existingRow);

  if (!viewer.isAdmin && existing.sellerId !== viewer.id) {
    return res.status(403).json({ success: false, message: 'Permission denied.' });
  }

  const body = req.body || {};
  const allowedUpdates: Record<string, any> = {};
  if (body.title !== undefined) allowedUpdates.title = sanitizeText(body.title, 180) || existing.title;
  if (body.category !== undefined) allowedUpdates.category = sanitizeText(body.category, 60) || existing.category;
  if (body.era !== undefined) allowedUpdates.era = sanitizeText(body.era, 100);
  if (body.condition !== undefined) allowedUpdates.condition = sanitizeText(body.condition, 60);
  if (body.provenance !== undefined) allowedUpdates.provenance = sanitizeText(body.provenance, 2500);
  if (body.dimensions !== undefined) allowedUpdates.dimensions = sanitizeText(body.dimensions, 120);
  if (body.city !== undefined) allowedUpdates.city = sanitizeText(body.city, 80);
  if (body.country !== undefined) allowedUpdates.country = sanitizeText(body.country, 80);
  if (body.location !== undefined) allowedUpdates.location = sanitizeText(body.location, 160);
  if (body.startingBid !== undefined && Number.isFinite(Number(body.startingBid))) {
    allowedUpdates.startingBid = Math.max(300, Math.round(Number(body.startingBid)));
  }
  if (body.images !== undefined) {
    allowedUpdates.images = await persistImageArrayToStorage(body.images, existing.sellerId || viewer.id);
  }

  if (viewer.isAdmin) {
    const validStatuses = ['pending_approval', 'active', 'deal_pending', 'sold', 'rejected', 'expired', 'deal_cancelled', 'closed'];
    if (typeof body.status === 'string' && validStatuses.includes(body.status)) {
      allowedUpdates.status = body.status;
    }
    if (body.rejectionReason !== undefined) {
      allowedUpdates.rejectionReason = sanitizeText(body.rejectionReason, 500);
    }
  }

  const merged = { ...existing, ...allowedUpdates };
  const { error } = await upsertItemResilient(itemToDbRow(merged));
  if (error) {
    console.error('[PATCH /api/items] DB Error:', (error as any).code || 'unknown');
    return res.status(500).json({ success: false, message: 'Failed to update listing.' });
  }

  broadcastSync('items');
  return res.json({ success: true, item: sanitizeItemForViewer(merged, viewer) });
});

app.delete('/api/items/:id', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const { data: existingRow } = await db.from('items').select('*').eq('id', req.params.id).maybeSingle();
  if (!existingRow) return res.status(404).json({ success: false, message: 'Item not found.' });
  const existing = itemFromDbRow(existingRow);

  if (!viewer.isAdmin && existing.sellerId !== viewer.id) {
    return res.status(403).json({ success: false, message: 'Permission denied.' });
  }

  await db.from('items').delete().eq('id', req.params.id);
  broadcastSync('items');
  return res.json({ success: true });
});

app.post('/api/items/:id/approve', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required.' });

  await db.from('items').update({ status: 'active', rejectionreason: null }).eq('id', req.params.id);
  broadcastSync('items');
  return res.json({ success: true });
});

app.post('/api/items/:id/reject', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required.' });

  const reason = sanitizeText(req.body?.reason, 500) || 'Documentation, era verification, or photo standards not met.';
  await db.from('items').update({ status: 'rejected', rejectionreason: reason }).eq('id', req.params.id);
  broadcastSync('items');
  return res.json({ success: true });
});

app.post('/api/items/:id/bids', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Please log in to place bids.' });
  if (!viewer.isVerified) return res.status(403).json({ success: false, message: 'Only verified collectors can place bids.' });

  const { data: row } = await db.from('items').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false, message: 'Item not found.' });
  const item = itemFromDbRow(row);

  if (item.status !== 'active') return res.status(400).json({ success: false, message: 'This lot is no longer accepting bids.' });
  if (item.sellerId === viewer.id) return res.status(400).json({ success: false, message: 'Sellers cannot bid on their own listings.' });

  const existingBid = (item.bids || []).find((b: any) => b.bidderId === viewer.id);
  if (existingBid) {
    return res.status(400).json({ success: false, message: 'You have already placed an offer on this lot. Use Edit Bid to adjust.' });
  }

  const amount = Math.round(Number(req.body?.amount));
  const minFloor = Math.max(300, item.startingBid || 300);
  const minimumAllowed = item.bids && item.bids.length > 0 ? item.currentBid + 1 : minFloor;
  if (!Number.isFinite(amount) || amount < minimumAllowed) {
    return res.status(400).json({ success: false, message: `Bid must be at least Rs. ${minimumAllowed.toLocaleString()}.` });
  }

  const newBid = {
    id: `bid_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    itemId: item.id,
    bidderId: viewer.id,
    bidderName: viewer.name,
    bidderAvatar: viewer.avatar,
    bidderVerified: viewer.isVerified,
    bidderRating: viewer.rating,
    amount,
    timestamp: new Date().toISOString(),
    isLeading: true
  };

  const updatedBids = [newBid, ...(item.bids || []).map((b: any) => ({ ...b, isLeading: false }))];
  const expectedCurrentBid = row.currentbid ?? row.currentBid ?? item.currentBid;
  const { data: updatedRow, error } = await db
    .from('items')
    .update({ currentbid: amount, bidcount: (item.bidCount || 0) + 1, bids: updatedBids })
    .eq('id', item.id)
    .eq('currentbid', expectedCurrentBid)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[POST /api/items/:id/bids] DB Error:', error.code || 'unknown');
    return res.status(500).json({ success: false, message: 'Unable to record bid right now.' });
  }
  if (!updatedRow) {
    return res.status(409).json({
      success: false,
      message: 'Another bid was just recorded on this lot. Please review the updated price and try again.'
    });
  }

  broadcastSync('items');
  return res.json({ success: true, bid: newBid });
});

app.patch('/api/items/:id/bids/:bidId', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Please log in to edit your bid.' });

  const { data: row } = await db.from('items').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false, message: 'Antique item not found.' });
  const item = itemFromDbRow(row);

  if (item.status !== 'active') return res.status(400).json({ success: false, message: 'Bidding is no longer active.' });
  const targetBid = (item.bids || []).find((b: any) => b.id === req.params.bidId);
  if (!targetBid) return res.status(404).json({ success: false, message: 'Bid record not found.' });
  if (targetBid.bidderId !== viewer.id && !viewer.isAdmin) {
    return res.status(403).json({ success: false, message: 'You are only permitted to edit your own bids.' });
  }

  const newAmount = Math.round(Number(req.body?.amount));
  const minFloor = Math.max(300, item.startingBid || 300);
  if (!Number.isFinite(newAmount) || newAmount < minFloor) {
    return res.status(400).json({ success: false, message: `Bid cannot be lower than Rs. ${minFloor.toLocaleString()}.` });
  }

  const updatedBids = item.bids.map((b: any) =>
    b.id === req.params.bidId ? { ...b, amount: newAmount, timestamp: new Date().toISOString() } : b
  );
  updatedBids.sort((a: any, b: any) => b.amount - a.amount);
  const highestAmount = updatedBids[0]?.amount || minFloor;
  const rankedBids = updatedBids.map((b: any, idx: number) => ({ ...b, isLeading: idx === 0 }));

  const expectedCurrentBid = row.currentbid ?? row.currentBid ?? item.currentBid;
  const { data: updatedRow, error } = await db
    .from('items')
    .update({ currentbid: highestAmount, bids: rankedBids })
    .eq('id', item.id)
    .eq('currentbid', expectedCurrentBid)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[PATCH /api/items/:id/bids] DB Error:', error.code || 'unknown');
    return res.status(500).json({ success: false, message: 'Unable to update bid right now.' });
  }
  if (!updatedRow) {
    return res.status(409).json({
      success: false,
      message: 'Another bid updated this lot simultaneously. Please review the latest price and try again.'
    });
  }

  broadcastSync('items');
  return res.json({ success: true });
});

app.post('/api/items/:id/select-winner', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false });

  const { data: row } = await db.from('items').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false });
  const item = itemFromDbRow(row);

  if (item.sellerId !== viewer.id && !viewer.isAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }

  if (item.status !== 'active') {
    return res.status(409).json({ success: false, message: 'This lot is no longer accepting winner selections.' });
  }
  const chosenBid = (item.bids || []).find((b: any) => b.id === req.body?.bidId);
  if (!chosenBid) return res.status(404).json({ success: false, message: 'Bid not found.' });
  if (!chosenBid.bidderId || chosenBid.bidderId === item.sellerId) {
    return res.status(400).json({ success: false, message: 'The selected bid is not valid.' });
  }

  const { data: selectedItem, error: selectError } = await db
    .from('items')
    .update({
      status: 'deal_pending',
      acceptedbidid: chosenBid.id,
      chosenbuyerid: chosenBid.bidderId,
      chosenbuyername: chosenBid.bidderName,
      chosendealamount: chosenBid.amount
    })
    .eq('id', item.id)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (selectError) {
    return res.status(500).json({ success: false, message: 'Unable to select the winning buyer.' });
  }
  if (!selectedItem) {
    return res.status(409).json({ success: false, message: 'This lot has already been updated. Refresh and try again.' });
  }

  const { data: existingChats } = await db
    .from('chats')
    .select('*')
    .eq('itemid', item.id)
    .eq('buyerid', chosenBid.bidderId);

  let targetChatId = existingChats?.[0]?.id;
  if (!targetChatId) {
    targetChatId = `chat_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newChat = {
      id: targetChatId,
      itemId: item.id,
      itemTitle: item.title,
      itemEra: item.era,
      itemImage: item.images[0] || '',
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      buyerId: chosenBid.bidderId,
      buyerName: chosenBid.bidderName,
      dealAmount: chosenBid.amount,
      dealStatus: 'negotiating',
      createdAt: nowIso,
      lastMessageTime: nowIso,
      messages: [
        {
          id: `msg_sys_${Date.now()}`,
          chatId: targetChatId,
          senderId: 'system',
          senderName: 'Antiauc Protocol',
          senderRole: 'seller',
          text: `Deal initiated! ${item.sellerName} selected ${chosenBid.bidderName}'s bid of Rs. ${chosenBid.amount.toLocaleString()}. Note: Contact phone numbers are kept private to protect both parties from external scams. Use this secure chat to arrange inspection, shipping or physical handover, and escrow.`,
          timestamp: nowIso,
          isSystemNotice: true
        },
        {
          id: `msg_seller_init_${Date.now()}`,
          chatId: targetChatId,
          senderId: item.sellerId,
          senderName: item.sellerName,
          senderRole: 'seller',
          text: `Hello ${chosenBid.bidderName}, I have accepted your bid of Rs. ${chosenBid.amount.toLocaleString()} for the ${item.title}. How would you like to proceed with the provenance verification and handover?`,
          timestamp: nowIso
        }
      ]
    };
    await db.from('chats').upsert(chatToDbRow(newChat));
  }

  broadcastSync('all');
  return res.json({ success: true, chatId: targetChatId });
});

app.post('/api/items/:id/deal-off', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'You must be signed in.' });

  const { data: row } = await db.from('items').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false, message: 'Item not found.' });
  const item = itemFromDbRow(row);

  if (item.sellerId !== viewer.id && !viewer.isAdmin) {
    return res.status(403).json({ success: false, message: 'Permission denied.' });
  }

  await db.from('items').update({ status: 'deal_cancelled' }).eq('id', item.id);

  const { data: chatsRaw } = await db.from('chats').select('*').eq('itemid', item.id);
  const chatRow = (chatsRaw || []).find((c: any) => !(c.isadmindirectchat ?? c.isAdminDirectChat));
  if (chatRow) {
    const chat = chatFromDbRow(chatRow);
    const nowIso = new Date().toISOString();
    const cancelNotice = {
      id: `msg_sys_${Date.now()}`,
      chatId: chat.id,
      senderId: 'system',
      senderName: 'Curatorial Desk Notice',
      senderRole: 'admin',
      text: `NOTICE: Seller ${viewer.name} has officially called off this deal. This antique lot has been closed from the public marketplace and archived under Previous Exchanges.`,
      timestamp: nowIso,
      isSystemNotice: true
    };
    await db
      .from('chats')
      .update({ dealstatus: 'deal_off', lastmessagetime: nowIso, messages: [...chat.messages, cancelNotice] })
      .eq('id', chat.id);
  }

  broadcastSync('all');
  return res.json({ success: true });
});

// ==================== CHATS ENDPOINTS ====================

app.post('/api/chats/admin-direct', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin authority required.' });

  const itemId = sanitizeText(req.body?.itemId, 80);
  const initialMessage = sanitizeText(req.body?.initialMessage, 1500);
  const { data: row } = await db.from('items').select('*').eq('id', itemId).maybeSingle();
  if (!row) return res.status(404).json({ success: false, message: 'Item not found.' });
  const item = itemFromDbRow(row);

  const { data: existingChats } = await db.from('chats').select('*').eq('itemid', itemId);
  const existing = (existingChats || []).map(chatFromDbRow).find(
    c => c.isAdminDirectChat || (c.buyerId === viewer.id && c.sellerId === item.sellerId)
  );
  if (existing) {
    return res.json({ success: true, chatId: existing.id });
  }

  const targetChatId = `chat_admin_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const newChat = {
    id: targetChatId,
    itemId: item.id,
    itemTitle: item.title,
    itemEra: item.era,
    itemImage: item.images[0] || '',
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    buyerId: viewer.id,
    buyerName: `${viewer.name} (Curator Admin)`,
    dealAmount: item.startingBid || item.currentBid || 0,
    dealStatus: 'negotiating',
    isAdminDirectChat: true,
    createdAt: nowIso,
    lastMessageTime: nowIso,
    messages: [
      {
        id: `msg_sys_${Date.now()}`,
        chatId: targetChatId,
        senderId: 'system',
        senderName: 'Curatorial Administration Protocol',
        senderRole: 'admin',
        text: `Official Administrator Direct Channel initiated. The Antiauc administration has opened this direct inquiry with seller ${item.sellerName} regarding listing "${item.title}". Contact numbers remain masked for privacy.`,
        timestamp: nowIso,
        isSystemNotice: true
      },
      {
        id: `msg_admin_${Date.now()}`,
        chatId: targetChatId,
        senderId: viewer.id,
        senderName: `${viewer.name} (Curator Admin)`,
        senderRole: 'admin',
        text: initialMessage || `Hello ${item.sellerName}, this is the Antiauc curatorial administrator regarding your listing "${item.title}".`,
        timestamp: nowIso
      }
    ]
  };

  await db.from('chats').upsert(chatToDbRow(newChat));
  broadcastSync('chats');
  return res.json({ success: true, chatId: targetChatId });
});

app.post('/api/chats/:id/messages', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false });

  const { data: row } = await db.from('chats').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false });
  const chat = chatFromDbRow(row);

  if (!viewer.isAdmin && chat.buyerId !== viewer.id && chat.sellerId !== viewer.id) {
    return res.status(403).json({ success: false });
  }

  const text = sanitizeText(req.body?.text, 2000);
  if (!text) return res.status(400).json({ success: false });

  const nowIso = new Date().toISOString();
  const newMsg = {
    id: `msg_${Date.now()}`,
    chatId: chat.id,
    senderId: viewer.id,
    senderName: viewer.name,
    senderRole: viewer.role,
    text,
    timestamp: nowIso
  };

  await db
    .from('chats')
    .update({ lastmessagetime: nowIso, messages: [...chat.messages, newMsg] })
    .eq('id', chat.id);

  broadcastSync('chats');
  return res.json({ success: true, messageObj: newMsg });
});

app.patch('/api/chats/:id/status', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false });

  const { data: row } = await db.from('chats').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false });
  const chat = chatFromDbRow(row);

  if (!viewer.isAdmin && chat.buyerId !== viewer.id && chat.sellerId !== viewer.id) {
    return res.status(403).json({ success: false });
  }

  const statusLabels: Record<string, string> = {
    negotiating: 'Discussion in progress',
    inspection_agreed: 'Physical / Document Inspection Agreed',
    payment_escrowed: 'Payment Deposited into Escrow',
    deal_sealed: 'Deal Completed & Handover Finalized',
    deal_off: 'Deal Called Off by Seller'
  };
  const requestedStatus = String(req.body?.status || 'negotiating');
  // Escrow confirmation remains admin-only until a payment gateway is integrated.
  if (!viewer.isAdmin && requestedStatus === 'payment_escrowed') {
    return res.status(403).json({ success: false, message: 'Escrow status requires administrator confirmation.' });
  }
  // The seller who owns this chat may seal the deal; buyers cannot complete it.
  if (!viewer.isAdmin && requestedStatus === 'deal_sealed' && chat.sellerId !== viewer.id) {
    return res.status(403).json({ success: false, message: 'Only the seller can mark this deal as sealed.' });
  }
  if (!viewer.isAdmin && requestedStatus === 'deal_off' && chat.sellerId !== viewer.id) {
    return res.status(403).json({ success: false, message: 'Only the seller or an administrator can call off this deal.' });
  }
  const status = requestedStatus in statusLabels ? requestedStatus : 'negotiating';

  const nowIso = new Date().toISOString();
  const sysMsg = {
    id: `msg_sys_${Date.now()}`,
    chatId: chat.id,
    senderId: 'system',
    senderName: 'Antiauc Protocol',
    senderRole: viewer.role,
    text: `Deal status updated to: "${statusLabels[status] || status}" by ${viewer.name}.`,
    timestamp: nowIso,
    isSystemNotice: true
  };

  await db
    .from('chats')
    .update({ dealstatus: status, lastmessagetime: nowIso, messages: [...chat.messages, sysMsg] })
    .eq('id', chat.id);

  if (status === 'deal_sealed' && chat.itemId) {
    await db.from('items').update({ status: 'sold' }).eq('id', chat.itemId);
  }

  broadcastSync('all');
  return res.json({ success: true });
});

app.delete('/api/chats/:id', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin required.' });

  await db.from('chats').delete().eq('id', req.params.id);
  broadcastSync('chats');
  return res.json({ success: true });
});

app.delete('/api/chats/:id/messages/:messageId', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin required.' });

  const { data: row } = await db.from('chats').select('*').eq('id', req.params.id).maybeSingle();
  if (!row) return res.status(404).json({ success: false });
  const chat = chatFromDbRow(row);

  const remaining = chat.messages.filter((m: any) => m.id !== req.params.messageId);
  const nonSystemRemaining = remaining.filter((m: any) => !m.isSystemNotice);

  if (chat.isAdminDirectChat && nonSystemRemaining.length === 0) {
    await db.from('chats').delete().eq('id', chat.id);
    broadcastSync('chats');
    return res.json({ success: true, deletedSession: true });
  }

  const lastMessageTime = remaining.length > 0 ? remaining[remaining.length - 1].timestamp : chat.lastMessageTime;
  await db.from('chats').update({ messages: remaining, lastmessagetime: lastMessageTime }).eq('id', chat.id);

  broadcastSync('chats');
  return res.json({ success: true });
});

// ==================== SELLER RATINGS ENDPOINTS ====================

app.post('/api/ratings', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer) return res.status(401).json({ success: false, message: 'Please log in to submit a rating.' });

  const rawBody = req.body || {};
  const sellerId = sanitizeText(rawBody.sellerId, 80);
  const sellerName = sanitizeText(rawBody.sellerName, 120) || 'Verified Antique Seller';
  const comment = sanitizeText(rawBody.comment, 1000) || undefined;
  const tag = sanitizeText(rawBody.tag, 80) || undefined;
  const itemId = sanitizeText(rawBody.itemId, 80) || undefined;
  const itemTitle = sanitizeText(rawBody.itemTitle, 180) || undefined;
  const rating = rawBody.rating;

  if (!sellerId) {
    return res.status(400).json({ success: false, message: 'Seller reference is required.' });
  }
  if (viewer.id === sellerId) {
    return res.status(400).json({ success: false, message: 'Sellers cannot rate their own profile or lots.' });
  }

  const clampedRating = Math.min(5, Math.max(1, Math.round(Number(rating || 5))));
  const { data: existingAll } = await db.from('seller_ratings').select('*');
  const existingRatings = (existingAll || []).map(sellerRatingFromDbRow);

  const existing = existingRatings.find(
    r => r.sellerId === sellerId && r.raterId === viewer.id && (itemId ? r.itemId === itemId : true)
  );

  const reviewRecord = {
    id: existing ? existing.id : `rating_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    sellerId,
    sellerName,
    raterId: viewer.id,
    raterName: viewer.name,
    rating: clampedRating,
    comment,
    tag,
    timestamp: new Date().toISOString(),
    itemId,
    itemTitle
  };

  await db.from('seller_ratings').upsert(sellerRatingToDbRow(reviewRecord));

  const { data: updatedAll } = await db.from('seller_ratings').select('*').eq('sellerid', sellerId);
  const forSeller = (updatedAll || []).map(sellerRatingFromDbRow);
  const count = forSeller.length;
  const avg = count > 0 ? Math.round((forSeller.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 5.0;

  await db.from('users').update({ rating: avg, reviewcount: count }).eq('id', sellerId);
  await db.from('items').update({ sellerrating: avg, sellerreviewcount: count }).eq('sellerid', sellerId);

  broadcastSync('all');
  return res.json({ success: true, review: reviewRecord });
});

app.delete('/api/ratings/:id', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin authority required.' });

  const { data: targetRow } = await db.from('seller_ratings').select('*').eq('id', req.params.id).maybeSingle();
  if (!targetRow) return res.status(404).json({ success: false, message: 'Review not found.' });
  const target = sellerRatingFromDbRow(targetRow);

  await db.from('seller_ratings').delete().eq('id', req.params.id);

  const { data: remainingRows } = await db.from('seller_ratings').select('*').eq('sellerid', target.sellerId);
  const remaining = (remainingRows || []).map(sellerRatingFromDbRow);
  const newCount = remaining.length;
  const newAvg =
    newCount > 0 ? Math.round((remaining.reduce((s, r) => s + r.rating, 0) / newCount) * 10) / 10 : 5.0;

  await db.from('users').update({ rating: newAvg, reviewcount: newCount }).eq('id', target.sellerId);
  await db.from('items').update({ sellerrating: newAvg, sellerreviewcount: newCount }).eq('sellerid', target.sellerId);

  broadcastSync('all');
  return res.json({ success: true });
});

// ==================== INQUIRIES, SETTINGS & ADMIN ROLE ====================

app.post('/api/inquiries', inquiryRateLimiter, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const name = sanitizeText(req.body?.name, 120);
  const email = sanitizeText(req.body?.email, 160);
  const phone = sanitizeText(req.body?.phone, 40);
  const subject = sanitizeText(req.body?.subject, 160) || 'General Inquiry';
  const message = sanitizeText(req.body?.message, 2500);
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
  }

  const newInq = {
    id: `inq_${Date.now()}`,
    fullname: name,
    email,
    phone,
    subject,
    message,
    status: 'new',
    submittedat: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };

  await db.from('inquiries').upsert(newInq);
  broadcastSync('inquiries');
  return res.json({
    success: true,
    message: 'Your inquiry has been successfully transmitted to the curatorial desk.'
  });
});

app.post('/api/inquiries/:id/reviewed', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false });

  await db.from('inquiries').update({ status: 'reviewed' }).eq('id', req.params.id);
  broadcastSync('inquiries');
  return res.json({ success: true });
});

app.patch('/api/settings', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false });

  const updates: Record<string, any> = { id: 'platform', updatedat: new Date().toISOString() };
  if (req.body?.sellerListingFee !== undefined && Number.isFinite(Number(req.body.sellerListingFee))) {
    updates.sellerlistingfee = Math.max(0, Number(req.body.sellerListingFee));
  }
  if (req.body?.contactInfo && typeof req.body.contactInfo === 'object') {
    const ci = req.body.contactInfo;
    updates.contactinfo = {
      organizationName: sanitizeText(ci.organizationName, 160),
      tagline: sanitizeText(ci.tagline, 240),
      email: sanitizeText(ci.email, 160),
      phone: sanitizeText(ci.phone, 40),
      secondaryPhone: sanitizeText(ci.secondaryPhone, 40),
      address: sanitizeText(ci.address, 240),
      cityStateCountry: sanitizeText(ci.cityStateCountry, 240),
      businessHours: sanitizeText(ci.businessHours, 160),
      inspectionHours: sanitizeText(ci.inspectionHours, 160),
      notes: sanitizeText(ci.notes, 1000)
    };
  }

  await db.from('platform_settings').upsert(updates);
  broadcastSync('settings');
  return res.json({ success: true });
});

app.post('/api/admin/users/:id/verify', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false, message: 'Database unavailable.' });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin authority required.' });

  const { data: target, error: lookupError } = await db
    .from('users')
    .select('id, isverified, verificationidnumber')
    .eq('id', req.params.id)
    .maybeSingle();
  if (lookupError || !target) return res.status(404).json({ success: false, message: 'Account not found.' });
  if (!target.verificationidnumber) {
    return res.status(400).json({ success: false, message: 'No identity reference is on file for this account.' });
  }

  const { error } = await db
    .from('users')
    .update({ isverified: true, verificationdate: new Date().toISOString() })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ success: false, message: 'Unable to approve identity verification.' });

  broadcastSync('users');
  return res.json({ success: true, message: 'Identity verification approved.' });
});

app.patch('/api/admin/users/:id/role', async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ success: false });
  const viewer = await getAuthenticatedUser(req);
  if (!viewer?.isAdmin) return res.status(403).json({ success: false, message: 'Admin authority required.' });

  const code = Number(req.body?.roleCode) === 0 ? 0 : 1;
  const isTargetAdmin = code === 0;

  await db
    .from('users')
    .update({
      role_code: code,
      role: isTargetAdmin ? 'admin' : 'buyer',
      isadmin: isTargetAdmin
    })
    .eq('id', req.params.id);

  broadcastSync('users');
  return res.json({ success: true });
});

// ==================== STATIC CRAWLER-READABLE POLICY PAGES ====================

// ==================== VITE / STATIC SERVING ====================

app.all('/api/*', (_req: Request, res: Response) => {
  return res.status(404).json({ success: false, message: 'API route not found.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Antiauc] Secure server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app };
export default app;

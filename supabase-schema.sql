-- ==============================================================================
-- ANTIAUC & CURATORIAL AUCTIONS - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create items table (Auction lots)
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  era TEXT,
  origin TEXT,
  city TEXT,
  country TEXT,
  location TEXT,
  condition TEXT,
  dimensions TEXT,
  weight TEXT,
  material TEXT,
  provenance TEXT,
  certificateNumber TEXT,
  reservePrice NUMERIC,
  startingBid NUMERIC NOT NULL DEFAULT 300,
  currentBid NUMERIC NOT NULL DEFAULT 300,
  bidCount INTEGER NOT NULL DEFAULT 0,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  sellerId TEXT NOT NULL,
  sellerName TEXT NOT NULL,
  sellerRating NUMERIC DEFAULT 5.0,
  sellerReviewCount INTEGER DEFAULT 0,
  sellerVerified BOOLEAN DEFAULT true,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  endsAt TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  bids JSONB NOT NULL DEFAULT '[]'::jsonb,
  listingFeePaid BOOLEAN DEFAULT true,
  listingFeeTxId TEXT,
  acceptedBidId TEXT,
  chosenBuyerId TEXT,
  chosenBuyerName TEXT,
  chosenDealAmount NUMERIC,
  rejectionReason TEXT
);

-- Ensure location columns and updated default floor exist on pre-existing items tables
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.items ALTER COLUMN startingBid SET DEFAULT 300;
ALTER TABLE public.items ALTER COLUMN currentBid SET DEFAULT 300;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'buyer',
  role_code INTEGER NOT NULL DEFAULT 1, -- 0 for Admin, 1 for Normal user
  isAdmin BOOLEAN NOT NULL DEFAULT false,
  isVerified BOOLEAN NOT NULL DEFAULT false,
  verificationIdNumber TEXT,
  verificationDate TEXT,
  avatar TEXT,
  rating NUMERIC DEFAULT 5.0,
  reviewCount INTEGER DEFAULT 0,
  memberSince TEXT,
  location TEXT,
  sellerFeeCredits NUMERIC DEFAULT 0,
  watchlist JSONB DEFAULT '[]'::jsonb,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure role_code column exists if users table was previously created without it
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_code INTEGER NOT NULL DEFAULT 1;
-- Map initial roles: 0 = Admin, 1 = Normal user
UPDATE public.users SET role_code = 0 WHERE role = 'admin';
UPDATE public.users SET role_code = 1 WHERE role_code IS NULL;

-- 3. Create chats table (Direct negotiation and admin deal rooms)
CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY,
  itemId TEXT NOT NULL,
  itemTitle TEXT NOT NULL,
  itemEra TEXT,
  itemImage TEXT,
  sellerId TEXT NOT NULL,
  sellerName TEXT NOT NULL,
  buyerId TEXT NOT NULL,
  buyerName TEXT NOT NULL,
  dealAmount NUMERIC,
  dealStatus TEXT DEFAULT 'negotiating',
  isAdminDirectChat BOOLEAN DEFAULT false,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  createdAt TEXT,
  lastMessageTime TEXT
);

-- 4. Create inquiries table (Contact us & curatorial inquiries)
CREATE TABLE IF NOT EXISTS public.inquiries (
  id TEXT PRIMARY KEY,
  fullName TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT,
  category TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  submittedAt TEXT
);

-- 5. Create seller_ratings table
CREATE TABLE IF NOT EXISTS public.seller_ratings (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL,
  sellerName TEXT,
  raterId TEXT NOT NULL,
  raterName TEXT,
  rating NUMERIC NOT NULL,
  comment TEXT,
  tag TEXT,
  timestamp TEXT,
  itemId TEXT,
  itemTitle TEXT
);

-- 6. Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'platform',
  sellerListingFee NUMERIC DEFAULT 500,
  contactInfo JSONB,
  updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS); database queries are mediated through the authenticated backend API server
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- The application accesses public tables only through the server API using
-- SUPABASE_SERVICE_ROLE_KEY. Never grant direct browser access to account,
-- chat, inquiry, listing, rating, or settings records.
REVOKE ALL PRIVILEGES ON TABLE
  public.items,
  public.users,
  public.chats,
  public.inquiries,
  public.seller_ratings,
  public.platform_settings
FROM anon, authenticated;

-- RLS remains enabled as defense in depth. No browser-role policies are
-- intentionally created; service_role bypasses RLS for server-side operations.

-- Keep future tables, sequences, and functions created by this schema owner
-- from inheriting browser-role privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Enable Realtime publication safely (checks if tables are already in supabase_realtime to avoid error 42710)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['items', 'chats', 'users', 'seller_ratings', 'inquiries', 'platform_settings'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- Migration: 002_biointel_nursery_tables.sql
-- Description: Schema and Row-Level Security for Feature 17 & 18
-- Modules: Agricultural Biotechnology Intelligence & Intelligent Nursery Marketplace
-- Team: Syntax Squad (HackWarts 2026)
-- =============================================================================

-- Enable UUID extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Table: nurseries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nurseries (
    id TEXT PRIMARY KEY DEFAULT ('nursery_' || substr(md5(random()::text), 1, 8)),
    name TEXT NOT NULL,
    license_number TEXT,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    village_or_taluk TEXT,
    district TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Karnataka',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.50,
    data_source TEXT NOT NULL DEFAULT 'direct_nursery_inventory' CHECK (data_source IN ('direct_nursery_inventory', 'google_places_supplier', 'demo_data')),
    google_place_id TEXT,
    website_uri TEXT,
    google_maps_uri TEXT,
    opening_hours TEXT,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nurseries_district ON public.nurseries(district);
CREATE INDEX IF NOT EXISTS idx_nurseries_coords ON public.nurseries(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_nurseries_owner ON public.nurseries(owner_user_id);

-- -----------------------------------------------------------------------------
-- 2. Table: nursery_products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nursery_products (
    id TEXT PRIMARY KEY DEFAULT ('prod_' || substr(md5(random()::text), 1, 8)),
    nursery_id TEXT NOT NULL REFERENCES public.nurseries(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    variety_name TEXT NOT NULL,
    biotechnology_category TEXT NOT NULL CHECK (biotechnology_category IN (
        'biofertilizers',
        'biopesticides',
        'disease_resistant_varieties',
        'drought_tolerant_varieties',
        'hybrid_varieties',
        'tissue_cultured_plants',
        'grafted_plants',
        'beneficial_soil_microorganisms',
        'biological_nutrient_management',
        'agricultural_waste_bioconversion'
    )),
    description TEXT NOT NULL,
    price_per_unit NUMERIC(10, 2),
    pricing_unit TEXT NOT NULL DEFAULT 'per_seedling',
    available_quantity INTEGER,
    minimum_order_quantity INTEGER NOT NULL DEFAULT 1,
    certification_info TEXT,
    availability_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (availability_status IN ('in_stock', 'low_stock', 'pre_order_only', 'out_of_stock', 'contact_nursery')),
    data_source TEXT NOT NULL DEFAULT 'direct_nursery_inventory' CHECK (data_source IN ('direct_nursery_inventory', 'google_places_supplier', 'demo_data')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast marketplace catalog queries
CREATE INDEX IF NOT EXISTS idx_products_nursery_id ON public.nursery_products(nursery_id);
CREATE INDEX IF NOT EXISTS idx_products_crop_name ON public.nursery_products(crop_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.nursery_products(biotechnology_category);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.nursery_products(price_per_unit);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.nursery_products(availability_status);

-- -----------------------------------------------------------------------------
-- 3. Table: nursery_inquiries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nursery_inquiries (
    id TEXT PRIMARY KEY DEFAULT ('inq_' || substr(md5(random()::text), 1, 8)),
    nursery_id TEXT NOT NULL REFERENCES public.nurseries(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.nursery_products(id) ON DELETE SET NULL,
    farmer_name TEXT NOT NULL,
    farmer_phone TEXT NOT NULL,
    farmer_location TEXT NOT NULL,
    required_quantity INTEGER NOT NULL DEFAULT 100,
    intended_sowing_date DATE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'acknowledged', 'fulfilled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inquiries_nursery_id ON public.nursery_inquiries(nursery_id);

-- -----------------------------------------------------------------------------
-- 4. Supabase Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.nurseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursery_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursery_inquiries ENABLE ROW LEVEL SECURITY;

-- Nurseries Policies:
-- Anyone (farmers and buyers) can read nurseries
CREATE POLICY "Public nurseries are viewable by all users"
    ON public.nurseries FOR SELECT
    USING (true);

-- Nursery owners can update their own nursery profile
CREATE POLICY "Nursery owners can update their own nursery"
    ON public.nurseries FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_user_id)
    WITH CHECK (auth.uid() = owner_user_id);

-- Authenticated nursery owners can create their nursery profile
CREATE POLICY "Authenticated users can create nurseries"
    ON public.nurseries FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_user_id);

-- Products Policies:
-- Anyone can view products
CREATE POLICY "Public products are viewable by all users"
    ON public.nursery_products FOR SELECT
    USING (true);

-- Nursery owners can insert products into their own nursery
CREATE POLICY "Nursery owners can insert products"
    ON public.nursery_products FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.nurseries
            WHERE nurseries.id = nursery_products.nursery_id
            AND nurseries.owner_user_id = auth.uid()
        )
    );

-- Nursery owners can update their own products
CREATE POLICY "Nursery owners can update their products"
    ON public.nursery_products FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.nurseries
            WHERE nurseries.id = nursery_products.nursery_id
            AND nurseries.owner_user_id = auth.uid()
        )
    );

-- Nursery owners can delete their own products
CREATE POLICY "Nursery owners can delete their products"
    ON public.nursery_products FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.nurseries
            WHERE nurseries.id = nursery_products.nursery_id
            AND nurseries.owner_user_id = auth.uid()
        )
    );

-- Inquiries Policies:
-- Anyone can submit inquiries (farmers do not need strict auth to inquire)
CREATE POLICY "Anyone can insert purchase inquiries"
    ON public.nursery_inquiries FOR INSERT
    WITH CHECK (true);

-- Nursery owners can view and update inquiries for their nursery
CREATE POLICY "Nursery owners can view their inquiries"
    ON public.nursery_inquiries FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.nurseries
            WHERE nurseries.id = nursery_inquiries.nursery_id
            AND nurseries.owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Nursery owners can update their inquiries"
    ON public.nursery_inquiries FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.nurseries
            WHERE nurseries.id = nursery_inquiries.nursery_id
            AND nurseries.owner_user_id = auth.uid()
        )
    );

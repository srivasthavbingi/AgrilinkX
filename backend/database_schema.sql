-- AgriLinkX Supabase PostgreSQL Schema & Migration Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 0. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Common for all users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    role TEXT CHECK (role IN ('family', 'farmer')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTOMATIC USER PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'family'),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. FARMERS TABLE
CREATE TABLE IF NOT EXISTS public.farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    farm_name TEXT,
    phone TEXT,
    location_name TEXT,
    latitude DOUBLE PRECISION DEFAULT 17.4210,
    longitude DOUBLE PRECISION DEFAULT 78.4420,
    verified BOOLEAN DEFAULT false,
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FAMILIES TABLE
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    delivery_address TEXT,
    latitude DOUBLE PRECISION DEFAULT 17.4040,
    longitude DOUBLE PRECISION DEFAULT 78.4560,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FARMER PRODUCTS (INVENTORY) TABLE
CREATE TABLE IF NOT EXISTS public.farmer_products (
    id VARCHAR(50) PRIMARY KEY,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    variety VARCHAR(100),
    quantity_available DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    price DOUBLE PRECISION NOT NULL,
    quality VARCHAR(50) DEFAULT 'Grade A',
    harvest_date DATE,
    origin VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    minimum_order DOUBLE PRECISION DEFAULT 1,
    delivery_available BOOLEAN DEFAULT true,
    availability_status VARCHAR(50) DEFAULT 'Available',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(50) PRIMARY KEY,
    customer_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    product_id VARCHAR(50) REFERENCES public.farmer_products(id) ON DELETE SET NULL,
    quantity DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    price_per_unit DOUBLE PRECISION NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL,
    delivery_method VARCHAR(50) DEFAULT 'Home Delivery',
    status VARCHAR(50) DEFAULT 'Placed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_farmers_user_id ON public.farmers(user_id);
CREATE INDEX IF NOT EXISTS idx_families_user_id ON public.families(user_id);
CREATE INDEX IF NOT EXISTS idx_products_farmer ON public.farmer_products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_product ON public.farmer_products(product);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.farmer_products(availability_status);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON public.orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 8. AUTO-UPDATE TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT unnest(ARRAY['profiles', 'farmers', 'families', 'farmer_products', 'orders'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_%I ON public.%I;
            CREATE TRIGGER trg_update_%I
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
        ', t_name, t_name, t_name, t_name);
    END LOOP;
END;
$$;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Farmers Policies
DROP POLICY IF EXISTS "Farmers profile public view" ON public.farmers;
CREATE POLICY "Farmers profile public view" ON public.farmers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Farmers insert own profile" ON public.farmers;
CREATE POLICY "Farmers insert own profile" ON public.farmers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Farmers update own profile" ON public.farmers;
CREATE POLICY "Farmers update own profile" ON public.farmers FOR UPDATE USING (auth.uid() = user_id);

-- Families Policies
DROP POLICY IF EXISTS "Families view own profile" ON public.families;
CREATE POLICY "Families view own profile" ON public.families FOR SELECT USING (true);

DROP POLICY IF EXISTS "Families insert own profile" ON public.families;
CREATE POLICY "Families insert own profile" ON public.families FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Families update own profile" ON public.families;
CREATE POLICY "Families update own profile" ON public.families FOR UPDATE USING (auth.uid() = user_id);

-- Farmer Products Policies
DROP POLICY IF EXISTS "Public view products" ON public.farmer_products;
CREATE POLICY "Public view products" ON public.farmer_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users insert products" ON public.farmer_products;
CREATE POLICY "Authenticated users insert products" ON public.farmer_products FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users update products" ON public.farmer_products;
CREATE POLICY "Authenticated users update products" ON public.farmer_products FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users delete products" ON public.farmer_products;
CREATE POLICY "Authenticated users delete products" ON public.farmer_products FOR DELETE USING (auth.role() = 'authenticated');

-- Orders Policies
DROP POLICY IF EXISTS "Authenticated users view orders" ON public.orders;
CREATE POLICY "Authenticated users view orders" ON public.orders FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users insert orders" ON public.orders;
CREATE POLICY "Authenticated users insert orders" ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users update orders" ON public.orders;
CREATE POLICY "Authenticated users update orders" ON public.orders FOR UPDATE USING (auth.role() = 'authenticated');


-- 10. MANDI PRICE HISTORY TABLE (Phase 4 ML Data Pipeline)
CREATE TABLE IF NOT EXISTS public.mandi_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arrival_date DATE NOT NULL,
    state TEXT,
    district TEXT,
    market TEXT,
    commodity TEXT,
    variety TEXT,
    grade TEXT,
    min_price_quintal NUMERIC,
    max_price_quintal NUMERIC,
    modal_price_quintal NUMERIC,
    modal_price_per_kg NUMERIC,
    source TEXT DEFAULT 'data.gov.in (AGMARKNET)',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_mandi_history UNIQUE (arrival_date, state, district, market, commodity, variety, grade)
);

CREATE INDEX IF NOT EXISTS idx_mandi_history_date ON public.mandi_price_history(arrival_date);
CREATE INDEX IF NOT EXISTS idx_mandi_history_commodity ON public.mandi_price_history(commodity);
CREATE INDEX IF NOT EXISTS idx_mandi_history_lookup ON public.mandi_price_history(commodity, state, district, arrival_date);

ALTER TABLE public.mandi_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read mandi price history" ON public.mandi_price_history;
CREATE POLICY "Public read mandi price history" ON public.mandi_price_history FOR SELECT USING (true);


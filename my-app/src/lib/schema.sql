-- Enable PostGIS for geospatial queries
create extension if not exists postgis;

-- Core tax lots table (populated from NYC PLUTO data)
create table if not exists tax_lots (
  id bigserial primary key,
  bbl text unique not null,           -- Borough-Block-Lot (universal NYC identifier)
  address text,
  zipcode text,
  owner_name text,
  land_use text,                       -- 01=residential, 11=vacant, etc.
  zone_dist text,                      -- Zoning district (R10, C6-4, etc.)
  lot_area numeric,                    -- Lot size in sqft
  bldg_area numeric,                   -- Existing building sqft
  res_far numeric,                     -- Max allowed residential FAR
  comm_far numeric,                    -- Max allowed commercial FAR
  built_far numeric,                   -- Currently built FAR
  num_floors numeric,                  -- Number of floors
  year_built numeric,
  assess_total numeric,                -- Tax assessed value
  latitude numeric,
  longitude numeric,
  geom geometry(MultiPolygon, 4326),  -- Lot boundary polygon
  created_at timestamptz default now()
);

-- Opportunity scores (computed nightly)
create table if not exists opportunity_scores (
  id bigserial primary key,
  bbl text unique references tax_lots(bbl),
  score numeric default 0,                          -- 0-100 opportunity score
  available_res_sqft numeric,                       -- Unused residential buildable sqft
  available_comm_sqft numeric,                      -- Unused commercial buildable sqft
  est_air_rights_value numeric,                     -- Estimated $ value of unused FAR
  price_per_buildable_sqft numeric,                 -- Last sale price / buildable sqft
  days_since_last_sale numeric,
  has_landmark boolean default false,
  in_historic_district boolean default false,
  is_vacant boolean default false,
  recent_permit boolean default false,
  distress_signals integer default 0,
  assemblage_potential boolean default false,
  updated_at timestamptz default now()
);

-- Property sales from ACRIS
create table if not exists property_sales (
  id bigserial primary key,
  bbl text references tax_lots(bbl),
  sale_price numeric,
  sale_date date,
  buyer_name text,
  seller_name text,
  doc_type text,
  created_at timestamptz default now()
);

-- Building permits from DOB
create table if not exists permits (
  id bigserial primary key,
  bbl text references tax_lots(bbl),
  job_type text,                        -- NB=New Building, DM=Demolition, A1/A2/A3=Alteration
  job_description text,
  filing_date date,
  issuance_date date,
  estimated_cost numeric,
  created_at timestamptz default now()
);

-- Saved properties per user
create table if not exists saved_properties (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  bbl text references tax_lots(bbl),
  notes text,
  created_at timestamptz default now()
);

-- User alerts
create table if not exists alerts (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  bbl text,
  alert_type text,                      -- new_permit, ownership_change, score_change
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Spatial index for fast map queries
create index if not exists tax_lots_geom_idx on tax_lots using gist(geom);
create index if not exists tax_lots_bbl_idx on tax_lots(bbl);
create index if not exists opportunity_scores_score_idx on opportunity_scores(score desc);

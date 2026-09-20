-- Target schema for the versioned GeoJSON adapter and future ETL loading.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS dataset_registry (
    dataset_id text PRIMARY KEY,
    dataset_name text NOT NULL,
    provider text NOT NULL,
    source_url text NOT NULL,
    resource_url text,
    consulted_at timestamptz NOT NULL,
    period_start date,
    period_end date,
    period_description text,
    geographic_coverage text NOT NULL,
    license text NOT NULL DEFAULT 'unknown',
    evidence_type text NOT NULL CHECK (evidence_type IN ('observed','derived','estimated','modelled','proxy','declared')),
    confidence text NOT NULL CHECK (confidence IN ('high','medium','low','unknown')),
    transformation text NOT NULL,
    limitations text NOT NULL,
    integration_status text NOT NULL CHECK (integration_status IN ('integrated','candidate','failed','not_available','pending_integration','partial_coverage','stale','unavailable'))
);

CREATE TABLE IF NOT EXISTS source_snapshot (
    snapshot_id bigserial PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    ingested_at timestamptz NOT NULL,
    source_version text,
    sha256 char(64),
    record_count bigint CHECK (record_count IS NULL OR record_count >= 0),
    invalid_record_count bigint NOT NULL DEFAULT 0 CHECK (invalid_record_count >= 0),
    status text NOT NULL CHECK (status IN ('success','partial','failed')),
    error_summary text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS source_snapshot_dataset_time_idx ON source_snapshot (dataset_id, ingested_at DESC);

CREATE TABLE IF NOT EXISTS municipalities (
    municipality_code char(3) PRIMARY KEY,
    name text NOT NULL,
    reference_year integer NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    CHECK (ST_IsValid(geom))
);
CREATE INDEX IF NOT EXISTS municipalities_geom_gix ON municipalities USING GIST (geom);

-- Administrative district boundaries are not yet part of the checked-in data.
CREATE TABLE IF NOT EXISTS districts (
    district_id text PRIMARY KEY,
    municipality_code char(3) NOT NULL REFERENCES municipalities(municipality_code),
    name text NOT NULL,
    reference_year integer NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    CHECK (ST_IsValid(geom))
);
CREATE INDEX IF NOT EXISTS districts_geom_gix ON districts USING GIST (geom);

CREATE TABLE IF NOT EXISTS buildings (
    building_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    municipality_code char(3) REFERENCES municipalities(municipality_code),
    name text,
    height_m numeric CHECK (height_m IS NULL OR height_m >= 0),
    floors integer CHECK (floors IS NULL OR floors >= 0),
    construction_year integer,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    observed_at timestamptz,
    CHECK (ST_IsValid(geom))
);
CREATE INDEX IF NOT EXISTS buildings_geom_gix ON buildings USING GIST (geom);

CREATE TABLE IF NOT EXISTS transit_stops (
    stop_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    municipality_code char(3) REFERENCES municipalities(municipality_code),
    name text NOT NULL,
    zone_id text,
    wheelchair_boarding smallint,
    geom geometry(Point, 4326) NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS transit_stops_geom_gix ON transit_stops USING GIST (geom);

CREATE TABLE IF NOT EXISTS transit_routes (
    route_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    agency_id text,
    short_name text,
    long_name text,
    route_type integer,
    geom geometry(MultiLineString, 4326),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS transit_routes_geom_gix ON transit_routes USING GIST (geom);

CREATE TABLE IF NOT EXISTS transit_vehicles (
    vehicle_id text NOT NULL,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    route_id text,
    trip_id text,
    observed_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL,
    geom geometry(Point, 4326) NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (vehicle_id, observed_at)
);
CREATE INDEX IF NOT EXISTS transit_vehicles_geom_gix ON transit_vehicles USING GIST (geom);
CREATE INDEX IF NOT EXISTS transit_vehicles_time_idx ON transit_vehicles (observed_at DESC);

CREATE TABLE IF NOT EXISTS service_alerts (
    alert_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    active_from timestamptz,
    active_until timestamptz,
    header text,
    description text,
    affected_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
    observed_at timestamptz NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS universities (
    university_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    name text NOT NULL,
    geom geometry(Point, 4326),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS universities_geom_gix ON universities USING GIST (geom);

CREATE TABLE IF NOT EXISTS research_institutions (
    institution_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    name text NOT NULL,
    research_areas text[],
    geom geometry(Point, 4326),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS research_institutions_geom_gix ON research_institutions USING GIST (geom);

CREATE TABLE IF NOT EXISTS technology_companies (
    company_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    name text NOT NULL,
    sector text,
    geom geometry(Point, 4326),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS technology_companies_geom_gix ON technology_companies USING GIST (geom);

CREATE TABLE IF NOT EXISTS public_services (
    service_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    name text NOT NULL,
    category text,
    accessibility jsonb NOT NULL DEFAULT '{}'::jsonb,
    geom geometry(Point, 4326),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS public_services_geom_gix ON public_services USING GIST (geom);

CREATE TABLE IF NOT EXISTS climate_observations (
    observation_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    variable text NOT NULL,
    value numeric NOT NULL,
    unit text,
    observed_at timestamptz NOT NULL,
    geom geometry(Point, 4326),
    evidence_type text NOT NULL CHECK (evidence_type IN ('observed','derived','estimated','modelled','proxy','declared'))
);
CREATE INDEX IF NOT EXISTS climate_observations_geom_gix ON climate_observations USING GIST (geom);

CREATE TABLE IF NOT EXISTS energy_indicators (
    indicator_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    subject_id text NOT NULL,
    variable text NOT NULL,
    value numeric NOT NULL,
    unit text,
    period_start date,
    period_end date,
    evidence_type text NOT NULL CHECK (evidence_type IN ('observed','derived','estimated','modelled','proxy','declared')),
    method text NOT NULL,
    limitations text NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
    entity_id text PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    entity_type text NOT NULL,
    name text NOT NULL,
    sector text,
    evidence_type text NOT NULL CHECK (evidence_type IN ('observed','derived','estimated','modelled','proxy','declared')),
    geom geometry(Point, 4326),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS entities_geom_gix ON entities USING GIST (geom);

CREATE TABLE IF NOT EXISTS observations (
    observation_id bigserial PRIMARY KEY,
    dataset_id text NOT NULL REFERENCES dataset_registry(dataset_id),
    entity_id text REFERENCES entities(entity_id),
    district_id text REFERENCES districts(district_id),
    indicator text NOT NULL,
    value numeric NOT NULL,
    unit text,
    period_start date,
    period_end date,
    observed_at timestamptz,
    evidence_type text NOT NULL CHECK (evidence_type IN ('observed','derived','estimated','modelled','proxy','declared')),
    method text NOT NULL,
    limitations text NOT NULL
);
CREATE INDEX IF NOT EXISTS observations_lookup_idx ON observations (indicator, period_end, district_id);

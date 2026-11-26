-- Additive SQLite migration for AD-40C Community Crop Disease Surveillance
-- Safe to run repeatedly with IF NOT EXISTS guards.

CREATE TABLE IF NOT EXISTS disease_reports (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    crop TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    observation_date TEXT NOT NULL,
    affected_area_ha REAL NOT NULL DEFAULT 0.5,
    symptoms_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    diagnostic_confidence REAL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Karnataka',
    image_reference TEXT,
    verification_status TEXT NOT NULL DEFAULT 'farmer_reported' CHECK(
        verification_status IN ('farmer_reported', 'ai_suspected', 'expert_confirmed', 'dismissed')
    ),
    data_source TEXT NOT NULL DEFAULT 'manual_farmer_report' CHECK(
        data_source IN ('manual_farmer_report', 'crop_diagnostics_ai', 'agronomist_verification', 'demonstration_simulation')
    ),
    anonymous_community_consent INTEGER NOT NULL DEFAULT 0,
    is_demonstration INTEGER NOT NULL DEFAULT 0,
    dedupe_fingerprint TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disease_alerts (
    id TEXT PRIMARY KEY,
    recipient_user_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    crop TEXT NOT NULL,
    approximate_region TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK(
        risk_level IN ('Low', 'Moderate', 'High', 'Critical', 'Insufficient evidence')
    ),
    observation_recency_days INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    preventive_actions_json TEXT NOT NULL DEFAULT '[]',
    scientific_references_json TEXT NOT NULL DEFAULT '[]',
    followup_inspection TEXT NOT NULL,
    alert_fingerprint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK(
        status IN ('unread', 'read', 'acknowledged', 'dismissed')
    ),
    is_demonstration INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disease_reports_demo_date
ON disease_reports(is_demonstration, observation_date DESC);

CREATE INDEX IF NOT EXISTS idx_disease_reports_crop_disease
ON disease_reports(crop, disease_name, is_demonstration);

CREATE INDEX IF NOT EXISTS idx_disease_reports_farmer
ON disease_reports(farmer_id, farm_id);

CREATE INDEX IF NOT EXISTS idx_disease_alerts_recipient
ON disease_alerts(recipient_user_id, is_demonstration, status, updated_at DESC);

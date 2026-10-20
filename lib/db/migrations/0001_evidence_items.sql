-- Phase 1 / Step 4: minimal evidence model.
--
-- Additive only: creates one new table and two indexes. No existing table,
-- column, constraint or row is touched. `leads` stays the canonical creator
-- record; evidence references it by id and is deleted with it (ON DELETE CASCADE).
--
-- Safe to run against an existing database. Applied once and recorded in
-- schema_migrations by lib/db/scripts/migrate.mjs.

CREATE TABLE IF NOT EXISTS evidence_items (
  id serial PRIMARY KEY,
  lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  source_url text,
  source_description text,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  content text NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified',
  retrieval_method text NOT NULL DEFAULT 'manual_entry',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_items_lead_id_idx ON evidence_items (lead_id);
CREATE INDEX IF NOT EXISTS evidence_items_user_id_idx ON evidence_items (user_id);

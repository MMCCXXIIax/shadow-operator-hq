-- ShadowOS Creator Intelligence Scan: orchestration state.
--
-- Additive only. Nothing existing is dropped, renamed or rewritten:
--   * scan_jobs      — one row per submitted handle / profile URL, holding the
--                      persisted stage list so a failed scan is inspectable and
--                      retryable instead of lost.
--   * leads.instagram_user_id — the platform's stable account id, so a creator
--                      is deduplicated even after the username changes.
--   * unique index   — per owner, and only once an account id is known, so the
--                      nullable column does not collide.
--
-- Reversal (this feature's own objects only):
--   DROP TABLE IF EXISTS scan_jobs;
--   DROP INDEX IF EXISTS leads_user_instagram_user_id_idx;
--   ALTER TABLE leads DROP COLUMN IF EXISTS instagram_user_id;
--
-- Applied once and recorded in schema_migrations by lib/db/scripts/migrate.mjs.

CREATE TABLE IF NOT EXISTS scan_jobs (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Filled in only once a creator is actually identified or reused. A handle on
  -- its own is not a creator record, so this stays NULL until then.
  lead_id integer REFERENCES leads(id) ON DELETE CASCADE,
  input text NOT NULL,
  normalized_handle text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  current_stage text,
  stages jsonb NOT NULL,
  error_code text,
  error_message text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_jobs_user_id_idx ON scan_jobs (user_id);
CREATE INDEX IF NOT EXISTS scan_jobs_lead_id_idx ON scan_jobs (lead_id);
CREATE INDEX IF NOT EXISTS scan_jobs_user_handle_idx ON scan_jobs (user_id, normalized_handle);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_user_instagram_user_id_idx
  ON leads (user_id, instagram_user_id)
  WHERE instagram_user_id IS NOT NULL;

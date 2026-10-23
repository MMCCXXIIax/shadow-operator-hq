-- Creator Intelligence Report: storage for validated report bodies.
--
-- Additive only. No existing table, column, constraint or row is touched.
--
--   * scan_reports — one row per scan ATTEMPT. `scan_jobs.attempt` is incremented
--                    in place when a scan is retried, so keying a report by
--                    (scan_job_id, attempt) keeps every earlier attempt's report
--                    instead of overwriting it. The unique index is what makes a
--                    re-run of the same attempt replace only that attempt.
--   * sections     — the report body, already validated by the report contract
--                    before it is written. jsonb on purpose: the contract lives
--                    in lib/api-zod/src/report.ts, not in the column type.
--   * limitations  — report-level limitations, kept separate from findings.
--   * blocked_by   — the typed stage blocker when the run could not produce a
--                    report; `status` stays 'incomplete' in that case.
--
-- No evidence is copied into this table: findings reference `evidence_items`
-- by id and provenance is resolved live on read.
--
-- Reversal (this feature's own object only):
--   DROP TABLE IF EXISTS scan_reports;
--
-- Applied once and recorded in schema_migrations by lib/db/scripts/migrate.mjs.

CREATE TABLE IF NOT EXISTS scan_reports (
  id serial PRIMARY KEY,
  scan_job_id integer NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id integer REFERENCES leads(id) ON DELETE CASCADE,
  attempt integer NOT NULL,
  status text NOT NULL DEFAULT 'incomplete',
  generator text NOT NULL,
  generator_version text NOT NULL,
  sections jsonb NOT NULL,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_by jsonb,
  generated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS scan_reports_scan_attempt_uidx
  ON scan_reports (scan_job_id, attempt);

CREATE INDEX IF NOT EXISTS scan_reports_user_id_idx ON scan_reports (user_id);
CREATE INDEX IF NOT EXISTS scan_reports_lead_id_idx ON scan_reports (lead_id);

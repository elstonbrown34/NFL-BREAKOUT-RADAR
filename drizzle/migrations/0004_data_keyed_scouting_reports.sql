CREATE TABLE public.scouting_report_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 player_id text NOT NULL,
 season integer NOT NULL CHECK (season IN (2024,2025,2026)),
 cutoff_week integer NOT NULL CHECK (cutoff_week BETWEEN 1 AND 18),
 data_fingerprint text NOT NULL CHECK (length(data_fingerprint)=64),
 report jsonb,
 model text NOT NULL,
 generated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(player_id,season,cutoff_week,data_fingerprint),
 CHECK (report IS NULL OR (jsonb_typeof(report)='object' AND report ?& ARRAY['why_rising','what_to_watch','verdict'] AND jsonb_typeof(report->'why_rising')='string' AND jsonb_typeof(report->'what_to_watch')='string' AND jsonb_typeof(report->'verdict')='string'))
);
GRANT SELECT ON public.scouting_report_versions TO anon,authenticated;
GRANT ALL ON public.scouting_report_versions TO service_role;
ALTER TABLE public.scouting_report_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read completed public scouting summaries" ON public.scouting_report_versions FOR SELECT TO anon,authenticated USING (report IS NOT NULL);
COMMENT ON TABLE public.scouting_reports IS 'DEPRECATED: replaced by data-keyed scouting_report_versions; retained for historical reports.';
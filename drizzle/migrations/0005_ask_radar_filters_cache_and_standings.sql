CREATE TABLE public.radar_team_quality (season integer NOT NULL, cutoff_week integer NOT NULL, team text NOT NULL, win_pct double precision NOT NULL, quality text NOT NULL CHECK (quality IN ('good','average','bad')), PRIMARY KEY(season,cutoff_week,team));
GRANT SELECT ON public.radar_team_quality TO anon, authenticated;
GRANT ALL ON public.radar_team_quality TO service_role;
ALTER TABLE public.radar_team_quality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public team standings" ON public.radar_team_quality FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.radar_queries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question text NOT NULL CHECK(length(question)<=200), season integer NOT NULL, cutoff_week integer NOT NULL, returned_json jsonb, validation_passed boolean NOT NULL DEFAULT false, result_count integer NOT NULL DEFAULT 0, cached boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.radar_queries TO service_role;
ALTER TABLE public.radar_queries ENABLE ROW LEVEL SECURITY;
CREATE INDEX radar_queries_created ON public.radar_queries(created_at DESC);
CREATE TABLE public.radar_question_cache (season integer NOT NULL, cutoff_week integer NOT NULL, question text NOT NULL CHECK(length(question)<=200), filters jsonb, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','failed')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(season,cutoff_week,question));
GRANT ALL ON public.radar_question_cache TO service_role;
ALTER TABLE public.radar_question_cache ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.radar_search_requests (visitor_id uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.radar_search_requests TO service_role;
ALTER TABLE public.radar_search_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX radar_search_visitor_time ON public.radar_search_requests(visitor_id,requested_at);
CREATE OR REPLACE FUNCTION public.claim_radar_search(p_visitor uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_visitor::text, 0));
 IF (SELECT count(*) FROM public.radar_search_requests WHERE visitor_id=p_visitor AND requested_at>now()-interval '1 hour')>=20 THEN RETURN false; END IF;
 INSERT INTO public.radar_search_requests(visitor_id) VALUES(p_visitor);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_radar_search(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_radar_search(uuid) TO service_role;
CREATE TABLE public.radar_schedule_syncs (season integer PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.radar_schedule_syncs TO service_role;
ALTER TABLE public.radar_schedule_syncs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_radar_schedule_sync(p_season integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed integer;
BEGIN
 IF p_season NOT IN (2024,2025,2026) THEN RAISE EXCEPTION 'Unsupported season'; END IF;
 INSERT INTO public.radar_schedule_syncs(season) VALUES(p_season) ON CONFLICT(season) DO UPDATE SET started_at=now() WHERE radar_schedule_syncs.started_at<=now()-interval '5 minutes';
 GET DIAGNOSTICS claimed=ROW_COUNT;
 RETURN claimed=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_radar_schedule_sync(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_radar_schedule_sync(integer) TO service_role;
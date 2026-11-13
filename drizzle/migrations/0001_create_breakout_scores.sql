CREATE TABLE public.breakout_scores (
 season integer NOT NULL, cutoff_week integer NOT NULL CHECK (cutoff_week BETWEEN 1 AND 18), player_id text NOT NULL, player_name text NOT NULL, position text NOT NULL CHECK (position IN ('WR','TE','RB')), team text NOT NULL, headshot_url text, games integer NOT NULL, ppg double precision NOT NULL, avg_snap_pct double precision NOT NULL, role_score double precision NOT NULL, opportunity_score double precision NOT NULL, efficiency_score double precision NOT NULL, breakout_score double precision NOT NULL CHECK (breakout_score BETWEEN 0 AND 100), rank integer NOT NULL, PRIMARY KEY (season, cutoff_week, player_id)
);
GRANT SELECT ON public.breakout_scores TO anon, authenticated;
GRANT ALL ON public.breakout_scores TO service_role;
ALTER TABLE public.breakout_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public score reads" ON public.breakout_scores FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.breakout_score_runs (season integer NOT NULL, cutoff_week integer NOT NULL, computed_at timestamptz NOT NULL DEFAULT now(), player_count integer NOT NULL DEFAULT 0, PRIMARY KEY (season, cutoff_week));
GRANT SELECT ON public.breakout_score_runs TO anon, authenticated;
GRANT ALL ON public.breakout_score_runs TO service_role;
ALTER TABLE public.breakout_score_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public computation status" ON public.breakout_score_runs FOR SELECT TO anon, authenticated USING (true);
CREATE FUNCTION public.save_breakout_scores(p_season integer, p_cutoff_week integer, p_scores jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_season NOT IN (2024,2025,2026) OR p_cutoff_week NOT BETWEEN 1 AND 18 OR jsonb_array_length(p_scores) > 2000 THEN RAISE EXCEPTION 'Invalid score batch'; END IF;
 PERFORM pg_advisory_xact_lock(p_season, p_cutoff_week);
 DELETE FROM public.breakout_scores WHERE season = p_season AND cutoff_week = p_cutoff_week;
 INSERT INTO public.breakout_scores SELECT p_season, p_cutoff_week, s.player_id, s.player_name, s.position, s.team, s.headshot_url, s.games, s.ppg, s.avg_snap_pct, s.role_score, s.opportunity_score, s.efficiency_score, s.breakout_score, s.rank FROM jsonb_populate_recordset(NULL::public.breakout_scores, p_scores) s;
 INSERT INTO public.breakout_score_runs (season, cutoff_week, player_count) VALUES (p_season, p_cutoff_week, jsonb_array_length(p_scores)) ON CONFLICT (season,cutoff_week) DO UPDATE SET computed_at = now(), player_count = EXCLUDED.player_count;
END;
$$;
REVOKE ALL ON FUNCTION public.save_breakout_scores(integer,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_breakout_scores(integer,integer,jsonb) TO service_role;
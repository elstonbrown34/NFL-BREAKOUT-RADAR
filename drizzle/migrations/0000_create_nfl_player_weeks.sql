CREATE TABLE public.player_weeks (
 season integer NOT NULL, week integer NOT NULL, player_id text NOT NULL, player_name text NOT NULL, position text NOT NULL, team text NOT NULL, headshot_url text,
 targets numeric, receptions numeric, receiving_yards numeric, receiving_epa numeric, carries numeric, rushing_yards numeric, rushing_epa numeric, target_share numeric, wopr numeric, fantasy_points_ppr numeric, offense_snaps numeric, offense_pct numeric,
 PRIMARY KEY (season, week, player_id)
);
GRANT SELECT ON public.player_weeks TO anon, authenticated;
GRANT ALL ON public.player_weeks TO service_role;
ALTER TABLE public.player_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public NFL statistics are readable" ON public.player_weeks FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.season_syncs (season integer PRIMARY KEY, status text NOT NULL DEFAULT 'idle', started_at timestamptz, completed_at timestamptz, row_count integer NOT NULL DEFAULT 0, latest_week integer, message text);
GRANT SELECT ON public.season_syncs TO anon, authenticated;
GRANT ALL ON public.season_syncs TO service_role;
ALTER TABLE public.season_syncs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public season sync status" ON public.season_syncs FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX player_weeks_season_position ON public.player_weeks(season, position);
CREATE FUNCTION public.claim_season_sync(p_season integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed integer;
BEGIN
 IF p_season NOT IN (2024,2025,2026) THEN RETURN false; END IF;
 INSERT INTO public.season_syncs(season,status,started_at,message) VALUES(p_season,'syncing',now(),null)
 ON CONFLICT(season) DO UPDATE SET status='syncing',started_at=now(),message=null
 WHERE season_syncs.started_at IS NULL OR season_syncs.started_at < now()-interval '5 minutes';
 GET DIAGNOSTICS claimed = ROW_COUNT;
 RETURN claimed > 0;
END; $$;
REVOKE ALL ON FUNCTION public.claim_season_sync(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_season_sync(integer) TO service_role;
CREATE TABLE public.scouting_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), season integer NOT NULL, cutoff_week integer NOT NULL, player_id text NOT NULL,
 why_on_radar text NOT NULL, risks text NOT NULL, verdict text NOT NULL CHECK (verdict IN ('Strong Buy','Buy','Watch')), model text NOT NULL, generated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (season,cutoff_week,player_id) REFERENCES public.breakout_scores(season,cutoff_week,player_id) ON DELETE CASCADE
);
GRANT SELECT ON public.scouting_reports TO anon, authenticated;
GRANT ALL ON public.scouting_reports TO service_role;
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public scouting reports" ON public.scouting_reports FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX scouting_reports_player_latest ON public.scouting_reports(season,cutoff_week,player_id,generated_at DESC);
CREATE TABLE public.scouting_generation_locks (season integer NOT NULL, cutoff_week integer NOT NULL, player_id text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(season,cutoff_week,player_id));
GRANT ALL ON public.scouting_generation_locks TO service_role;
ALTER TABLE public.scouting_generation_locks ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.claim_scouting_generation(p_season integer,p_cutoff_week integer,p_player_id text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed integer;
BEGIN
 INSERT INTO public.scouting_generation_locks(season,cutoff_week,player_id) VALUES(p_season,p_cutoff_week,p_player_id) ON CONFLICT(season,cutoff_week,player_id) DO UPDATE SET started_at=now() WHERE scouting_generation_locks.started_at < now()-interval '1 minute';
 GET DIAGNOSTICS claimed=ROW_COUNT;
 RETURN claimed=1;
END; $$;
REVOKE ALL ON FUNCTION public.claim_scouting_generation(integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_scouting_generation(integer,integer,text) TO service_role;
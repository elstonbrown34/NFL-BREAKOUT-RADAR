CREATE OR REPLACE FUNCTION public.save_breakout_scores(p_season integer, p_cutoff_week integer, p_scores jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_season NOT IN (2024,2025,2026) OR p_cutoff_week NOT BETWEEN 1 AND 18 OR jsonb_array_length(p_scores)>2000 THEN RAISE EXCEPTION 'Invalid score batch'; END IF;
 PERFORM pg_advisory_xact_lock(p_season,p_cutoff_week);
 INSERT INTO public.breakout_scores SELECT p_season,p_cutoff_week,s.player_id,s.player_name,s.position,s.team,s.headshot_url,s.games,s.ppg,s.avg_snap_pct,s.role_score,s.opportunity_score,s.efficiency_score,s.breakout_score,s.rank FROM jsonb_populate_recordset(NULL::public.breakout_scores,p_scores) s
 ON CONFLICT(season,cutoff_week,player_id) DO UPDATE SET player_name=EXCLUDED.player_name,position=EXCLUDED.position,team=EXCLUDED.team,headshot_url=EXCLUDED.headshot_url,games=EXCLUDED.games,ppg=EXCLUDED.ppg,avg_snap_pct=EXCLUDED.avg_snap_pct,role_score=EXCLUDED.role_score,opportunity_score=EXCLUDED.opportunity_score,efficiency_score=EXCLUDED.efficiency_score,breakout_score=EXCLUDED.breakout_score,rank=EXCLUDED.rank;
 DELETE FROM public.breakout_scores b WHERE season=p_season AND cutoff_week=p_cutoff_week AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_scores) s WHERE s->>'player_id'=b.player_id);
 INSERT INTO public.breakout_score_runs(season,cutoff_week,player_count) VALUES(p_season,p_cutoff_week,jsonb_array_length(p_scores)) ON CONFLICT(season,cutoff_week) DO UPDATE SET computed_at=now(),player_count=EXCLUDED.player_count;
END; $$;
REVOKE ALL ON FUNCTION public.save_breakout_scores(integer,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_breakout_scores(integer,integer,jsonb) TO service_role;
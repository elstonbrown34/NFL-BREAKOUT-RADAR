import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { computeBreakoutScores } from './breakout-model';

const cutoffSchema = z.object({ season: z.union([z.literal(2024), z.literal(2025), z.literal(2026)]), cutoffWeek: z.number().int().min(1).max(18) });

// compute-scores: public bounded maintenance, accepting no caller-provided rows or identities.
export const computeScores = createServerFn({ method: 'POST' }).inputValidator(cutoffSchema).handler(async ({ data }) => {
  const { readPlayerWeeks, publicClient } = await import('./nfl.server');
  const latest = await publicClient().from('player_weeks').select('week').eq('season',data.season).order('week',{ascending:false}).limit(1).maybeSingle();
  if (latest.error) throw new Error('Loaded week could not be checked.');
  if (!latest.data || data.cutoffWeek > latest.data.week) throw new Error('Choose a cutoff week that has been loaded.');
  const rows = await readPlayerWeeks(data.season,data.cutoffWeek);
  const scores = computeBreakoutScores(rows,data.season,data.cutoffWeek);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const saved = await supabaseAdmin.rpc('save_breakout_scores', { p_season:data.season, p_cutoff_week:data.cutoffWeek, p_scores:scores });
  if (saved.error) { console.error('Score save failed',saved.error.message); throw new Error('Scores could not be saved. Please retry.'); }
  return { count:scores.length, cutoffWeek:data.cutoffWeek, season:data.season };
});

export const getScores = createServerFn({ method:'GET' }).handler(async () => {
  const { publicClient } = await import('./nfl.server');
  const db = publicClient();
  const latest = await db.from('player_weeks').select('week').eq('season',2026).order('week',{ascending:false}).limit(1).maybeSingle();
  if (latest.error) throw new Error('Loaded week could not be checked.');
  const cutoffWeek = latest.data?.week ?? 0;
  if (!cutoffWeek) return { players:[], cutoffWeek, computedAt:null as string | null };
  const [scores, run] = await Promise.all([
    db.from('breakout_scores').select('*').eq('season',2026).eq('cutoff_week',cutoffWeek).order('rank').limit(2000),
    db.from('breakout_score_runs').select('computed_at').eq('season',2026).eq('cutoff_week',cutoffWeek).maybeSingle(),
  ]);
  if (scores.error || run.error) throw new Error('Breakout scores could not be loaded.');
  return { players:scores.data, cutoffWeek, computedAt:run.data?.computed_at ?? null };
});

export const getPlayerScore = createServerFn({ method:'GET' }).inputValidator(cutoffSchema.extend({ playerId:z.string().min(1).max(100) })).handler(async ({ data }) => {
  const { publicClient, readPlayerWeeks } = await import('./nfl.server');
  const [score, weeks, report] = await Promise.all([
    publicClient().from('breakout_scores').select('*').eq('season',data.season).eq('cutoff_week',data.cutoffWeek).eq('player_id',data.playerId).maybeSingle(),
    readPlayerWeeks(data.season,data.cutoffWeek,data.playerId),
    publicClient().from('scouting_reports').select('*').eq('season',data.season).eq('cutoff_week',data.cutoffWeek).eq('player_id',data.playerId).order('generated_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if (score.error) throw new Error('Player score could not be loaded.');
  if (report.error) throw new Error('Saved scouting report could not be loaded.');
  return { player:score.data, weeks, report:report.data };
});
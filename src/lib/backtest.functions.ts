import { createServerFn } from '@tanstack/react-start';
import { evaluateBacktest } from './backtest';

export const getBacktest = createServerFn({ method:'GET' }).handler(async () => {
  const { publicClient, readPlayerWeeks } = await import('./nfl.server');
  return Promise.all(([2024,2025] as const).map(async season => {
    const db = publicClient();
    const [scores, weeks, run] = await Promise.all([
      db.from('breakout_scores').select('*').eq('season',season).eq('cutoff_week',10).order('rank').limit(2000),
      readPlayerWeeks(season,18),
      db.from('breakout_score_runs').select('computed_at').eq('season',season).eq('cutoff_week',10).maybeSingle(),
    ]);
    if (scores.error || run.error) throw new Error('Historical rankings could not be loaded. Please retry.');
    if (!run.data) throw new Error(`${season} week-10 scores have not been computed yet.`);
    if (!weeks.some(w => w.week === 18)) throw new Error(`${season} statistics are incomplete through Week 18.`);
    return evaluateBacktest(scores.data,weeks,season);
  }));
});
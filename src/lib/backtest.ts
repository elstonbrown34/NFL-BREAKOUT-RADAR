import { breakoutMetrics, type BreakoutScore } from './breakout-model';
import type { PlayerWeek } from './nfl-data';

export function breakoutHit(position: string, beforePpg: number, afterPpg: number | null, games: number) {
  return games >= 4 && afterPpg !== null && afterPpg >= (position === 'TE' ? 9 : 12) && afterPpg - beforePpg >= 4;
}

export function evaluateBacktest(scores: BreakoutScore[], weeks: PlayerWeek[], season: 2024 | 2025) {
  const players = scores.filter(p => p.season === season && p.cutoff_week === 10).sort((a,b) => a.rank - b.rank).map(player => {
    const after = weeks.filter(w => w.season === season && w.player_id === player.player_id && w.week >= 11 && w.week <= 18 && (w.offense_snaps ?? 0) > 0);
    const afterPpg = after.length ? after.reduce((total,w) => total + (w.fantasy_points_ppr ?? 0),0) / after.length : null;
    return { ...player, afterGames: after.length, afterPpg, hit: breakoutHit(player.position, player.ppg, afterPpg, after.length) };
  });
  const rate = (group: typeof players) => {
    const hits = group.filter(p => p.hit).length;
    return { hits, total: group.length, rate: group.length ? hits / group.length : null };
  };
  const top10 = rate(players.slice(0,10)), top20 = rate(players.slice(0,20)), baseline = rate(players);
  // Benchmarks use the saved eligible cohort, never future production to rank it.
  const metrics = new Map(breakoutMetrics(weeks,season,10).map(p => [p.player_id,p]));
  const recentPpr = new Map(players.map(p => {
    const recent = weeks.filter(w => w.season === season && w.player_id === p.player_id && w.week >= 1 && w.week <= 10 && (w.offense_snaps ?? 0) > 0).sort((a,b) => a.week-b.week).slice(-3);
    return [p.player_id,recent.length ? recent.reduce((sum,w) => sum + (w.fantasy_points_ppr ?? 0),0)/recent.length : null];
  }));
  const ranked = (value:(id:string)=>number|null) => [...players].sort((a,b) => {
    const av=value(a.player_id), bv=value(b.player_id);
    return (av === null ? (bv === null ? 0 : 1) : bv === null ? -1 : bv-av) || a.player_name.localeCompare(b.player_name) || a.player_id.localeCompare(b.player_id);
  });
  const comparison = (id:string, label:string, group:typeof players) => ({id,label,top10:rate(group.slice(0,10)),top20:rate(group.slice(0,20)),playerIds:group.slice(0,20).map(p=>p.player_id)});
  const benchmarks = [
    comparison('model','Breakout Score',players),
    comparison('recent-ppr','Recent PPR',ranked(id=>recentPpr.get(id) ?? null)),
    comparison('snap-growth','Snap-share growth',ranked(id=>metrics.get(id)?.snapTrend ?? null)),
  ];
  return { season, top10, top20, baseline, benchmarks, lift: baseline.rate && top10.rate !== null ? top10.rate / baseline.rate : null, players: players.slice(0,20) };
}
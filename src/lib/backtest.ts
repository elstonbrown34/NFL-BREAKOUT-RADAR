import type { BreakoutScore } from './breakout-model';
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
  return { season, top10, top20, baseline, lift: baseline.rate && top10.rate !== null ? top10.rate / baseline.rate : null, players: players.slice(0,20) };
}
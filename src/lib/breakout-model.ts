import type { PlayerWeek } from './nfl-data';

export type BreakoutScore = {
  season: number; cutoff_week: number; player_id: string; player_name: string; position: string; team: string; headshot_url: string | null;
  games: number; ppg: number; avg_snap_pct: number; role_score: number; opportunity_score: number; efficiency_score: number; breakout_score: number; rank: number;
};
const sum = (rows: PlayerWeek[], field: keyof PlayerWeek) => rows.reduce((total, row) => total + (typeof row[field] === 'number' ? row[field] as number : 0), 0);
const mean = (rows: PlayerWeek[], field: keyof PlayerWeek) => {
  const values = rows.map(r => r[field]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
};
export const LIMITED_SNAP_PCT = 0.2;
export const isLimitedGame = (row: PlayerWeek) => (row.offense_snaps ?? 0) > 0 && row.offense_pct !== null && row.offense_pct < LIMITED_SNAP_PCT;
const difference = (a: number | null, b: number | null) => a === null || b === null ? null : a - b;
// Tied values use the average zero-based rank. A singleton or missing metric is neutral.
export function percentile(value: number | null, peers: (number | null)[]) {
  const valid = peers.filter((v): v is number => v !== null && Number.isFinite(v));
  if (value === null || valid.length < 2) return 50;
  const lower = valid.filter(v => v < value).length;
  const equal = valid.filter(v => v === value).length;
  return 100 * (lower + (equal - 1) / 2) / (valid.length - 1);
}
export function breakoutMetrics(rows: PlayerWeek[], season: number, cutoffWeek: number) {
  const groups = new Map<string, PlayerWeek[]>();
  for (const row of rows) {
    if (row.season !== season || row.week > cutoffWeek || row.week < 1 || !['WR','TE','RB'].includes(row.position)) continue;
    if ((row.offense_snaps ?? 0) <= 0) continue;
    groups.set(row.player_id, [...(groups.get(row.player_id) ?? []), row]);
  }
  return [...groups.values()].flatMap(games => {
    games.sort((a,b) => a.week - b.week);
    const last = games.at(-1);
    if (!last) return [];
    const opportunities = sum(games,'targets') + sum(games,'carries');
    const snap = mean(games,'offense_pct');
    const ppg = sum(games,'fantasy_points_ppr') / games.length;
    if (games.length < 4 || opportunities < 15 || snap === null || snap > .75 || ppg >= 12) return [];
    // Games under 20% snap share are treated as possible injury exits, not role changes.
    const trendGames = games.filter(g => !isLimitedGame(g));
    const recent = trendGames.slice(-3), earlier = trendGames.slice(0,-3);
    const snaps = sum(games,'offense_snaps');
    return [{ season, cutoff_week: cutoffWeek, player_id: last.player_id, player_name: last.player_name, position: last.position, team: last.team, headshot_url: last.headshot_url,
      games: games.length, ppg, avg_snap_pct: snap,
      snapTrend: difference(mean(recent,'offense_pct'), mean(earlier,'offense_pct')),
      targetTrend: difference(mean(recent,'target_share'), mean(earlier,'target_share')),
      opportunity: last.position === 'RB' ? opportunities / snaps : mean(games,'wopr'),
      yardsPerSnap: (sum(games,'receiving_yards') + sum(games,'rushing_yards')) / snaps,
      epaPerOpportunity: (sum(games,'receiving_epa') + sum(games,'rushing_epa')) / opportunities,
    }];
  });
}
export function computeBreakoutScores(rows: PlayerWeek[], season: number, cutoffWeek: number): BreakoutScore[] {
  const eligible = breakoutMetrics(rows, season, cutoffWeek);
  return eligible.map(player => {
    const peers = eligible.filter(p => p.position === player.position);
    const rankMetric = (field: 'snapTrend' | 'targetTrend' | 'opportunity' | 'yardsPerSnap' | 'epaPerOpportunity') => percentile(player[field], peers.map(p => p[field]));
    const role_score = (rankMetric('snapTrend') + rankMetric('targetTrend')) / 2;
    const opportunity_score = rankMetric('opportunity');
    const efficiency_score = (rankMetric('yardsPerSnap') + rankMetric('epaPerOpportunity')) / 2;
    const { snapTrend: _snap, targetTrend: _target, opportunity: _opp, yardsPerSnap: _yards, epaPerOpportunity: _epa, ...identity } = player;
    return { ...identity, role_score, opportunity_score, efficiency_score, breakout_score: .4 * role_score + .4 * opportunity_score + .2 * efficiency_score, rank: 0 };
  }).sort((a,b) => b.breakout_score - a.breakout_score || a.player_name.localeCompare(b.player_name) || a.player_id.localeCompare(b.player_id)).map((p,i) => ({ ...p, rank: i + 1 }));
}
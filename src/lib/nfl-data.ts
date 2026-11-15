import Papa from 'papaparse';
import { z } from 'zod';

export const SEASONS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;
export const seasonSchema = z.union([z.literal(2019),z.literal(2020),z.literal(2021),z.literal(2022),z.literal(2023),z.literal(2024),z.literal(2025),z.literal(2026)]);
export type Season = typeof SEASONS[number];
export type CsvRow = Record<string, string>;
export type PlayerWeek = {
  season: number; week: number; player_id: string; player_name: string; position: string; team: string; headshot_url: string | null;
  targets: number | null; receptions: number | null; receiving_yards: number | null; receiving_epa: number | null; carries: number | null; rushing_yards: number | null; rushing_epa: number | null;
  target_share: number | null; wopr: number | null; fantasy_points_ppr: number | null; offense_snaps: number | null; offense_pct: number | null;
};
export function normalizeName(name: string | undefined) {
  return (name ?? '').toLowerCase().replace(/[.,'’\-]/g, '').replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}
export function parseCsv(text: string, type: 'stats' | 'snaps') {
  const result: CsvRow[] = [];
  Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true, step: ({ data }) => {
    if (['WR', 'TE', 'RB'].includes(data['position'] ?? '') && data[type === 'stats' ? 'season_type' : 'game_type'] === 'REG') result.push(data);
  }});
  return result;
}
const num = (s: string | undefined) => s == null || s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s);
export function joinWeeks(stats: CsvRow[], snaps: CsvRow[], season: number): PlayerWeek[] {
  const exact = new Map<string, CsvRow>();
  const fallback = new Map<string, CsvRow[]>();
  const key = (name: string, team: string | undefined, week: string | undefined) => `${name}|${team}|${week}`;
  for (const row of snaps) {
    const name = normalizeName(row['player']);
    exact.set(key(name, row['team'], row['week']), row);
    const k = key(name.split(' ').at(-1) ?? '', row['team'], row['week']);
    fallback.set(k, [...(fallback.get(k) ?? []), row]);
  }
  const unique = new Map<string, PlayerWeek>();
  for (const row of stats) {
    if (Number(row['season']) !== season || !row['player_id']) continue;
    const name = normalizeName(row['player_display_name'] || row['player_name']);
    const team = row['team'] || row['recent_team'];
    const matches = fallback.get(key(name.split(' ').at(-1) ?? '', team, row['week']));
    const snap = exact.get(key(name, team, row['week'])) ?? (matches?.length === 1 ? matches[0] : undefined);
    const player: PlayerWeek = {
      season, week: Number(row['week']), player_id: row['player_id'], player_name: row['player_display_name'] || row['player_name'] || '', position: row['position'] ?? '', team: team ?? '', headshot_url: row['headshot_url'] || null,
      targets: num(row['targets']), receptions: num(row['receptions']), receiving_yards: num(row['receiving_yards']), receiving_epa: num(row['receiving_epa']), carries: num(row['carries']), rushing_yards: num(row['rushing_yards']), rushing_epa: num(row['rushing_epa']),
      target_share: num(row['target_share']), wopr: num(row['wopr']), fantasy_points_ppr: num(row['fantasy_points_ppr']), offense_snaps: num(snap?.['offense_snaps']), offense_pct: num(snap?.['offense_pct']),
    };
    unique.set(`${season}|${player.week}|${player.player_id}`, player);
  }
  return [...unique.values()];
}
export function rankPlayers(rows: PlayerWeek[]) {
  const latestWeek = Math.max(0, ...rows.map(r => r.week));
  const groups = new Map<string, PlayerWeek[]>();
  rows.forEach(r => groups.set(r.player_id, [...(groups.get(r.player_id) ?? []), r]));
  const average = (rows: PlayerWeek[], field: keyof PlayerWeek) => {
    const values = rows.map(r => r[field]).filter((v): v is number => typeof v === 'number');
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  return [...groups.values()].filter(rs => rs.some(r => r.week >= latestWeek - 1)).map(rs => {
    rs.sort((a,b) => a.week - b.week);
    const recent = rs.filter(r => r.week > latestWeek - 3);
    const prior = rs.filter(r => r.week <= latestWeek - 3 && r.week > latestWeek - 6);
    const last = rs.at(-1) as PlayerWeek;
    const snap = average(recent, 'offense_pct');
    const prevSnap = average(prior, 'offense_pct');
    const snapChange = snap !== null && prevSnap !== null ? (snap - prevSnap) * 100 : null;
    const targets = average(recent, 'targets') ?? 0;
    const priorTargets = average(prior, 'targets');
    const targetChange = priorTargets === null ? null : targets - priorTargets;
    const carries = average(recent, 'carries') ?? 0;
    const priorCarries = average(prior, 'carries') ?? carries;
    const score = Math.round(Math.max(0, Math.min(99, 40 + (snapChange ?? 0) * 1.2 + (targetChange ?? 0) * 5 + (last.position === 'RB' ? (carries - priorCarries) * 3 : 0) + (average(recent,'target_share') ?? 0) * 40)));
    return { ...last, score, snap, snapChange, targetsAvg: targets, targetChange, ppr: average(recent, 'fantasy_points_ppr') ?? 0, share: average(recent,'target_share'), trend: rs.slice(-6).map(r => ({ week: r.week, snap: r.offense_pct, targets: r.targets, ppr: r.fantasy_points_ppr })), sample: recent.length, priorSample: prior.length };
  }).sort((a,b) => b.score - a.score);
}
export type RankedPlayer = ReturnType<typeof rankPlayers>[number];
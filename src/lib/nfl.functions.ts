import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { joinWeeks, parseCsv, rankPlayers, SEASONS, seasonSchema as supportedSeason, type PlayerWeek } from './nfl-data';

const seasonSchema = z.object({ season: supportedSeason });
export const getSeasonStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { publicClient } = await import('./nfl.server');
  const { data, error } = await publicClient().from('season_syncs').select('*').order('season');
  if (error) throw new Error('Season status could not be loaded.');
  return SEASONS.map(season => data?.find(r => r.season === season) ?? { season, status: 'idle', row_count: 0, latest_week: null, completed_at: null, started_at: null, message: null });
});
export const getRadar = createServerFn({ method: 'GET' }).inputValidator(seasonSchema).handler(async ({ data }) => {
  const { publicClient } = await import('./nfl.server');
  const db = publicClient();
  const rows: PlayerWeek[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db.from('player_weeks').select('*').eq('season', data.season).order('week').order('player_id').range(offset, offset + 999);
    if (result.error) throw new Error('Player statistics could not be loaded.');
    rows.push(...result.data);
    if (result.data.length < 1000) break;
  }
  return { players: rankPlayers(rows), rowCount: rows.length, latestWeek: Math.max(0,...rows.map(r => r.week)) };
});

// Public, bounded refresh of fixed public datasets; no arbitrary URL, rows, or credentials accepted.
export const syncSeason = createServerFn({ method: 'POST' }).inputValidator(seasonSchema).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const claim = await db.rpc('claim_season_sync', { p_season: data.season });
  if (claim.error) throw new Error('Unable to start season sync.');
  if (!claim.data) return { success: false, message: 'This season was refreshed recently. Please wait five minutes before syncing again.' };
  try {
    const download = async (url: string) => {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(response.status === 404 ? `The ${data.season} season is not yet available from nflverse.` : 'nflverse is currently unavailable. Please try again.');
      return response.text();
    };
    const [stats, snaps] = await Promise.all([
      download(`https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${data.season}.csv`),
      download(`https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_${data.season}.csv`),
    ]);
    const rows = joinWeeks(parseCsv(stats,'stats'), parseCsv(snaps,'snaps'), data.season);
    if (!rows.length) throw new Error(`No regular-season WR, TE or RB data is available for ${data.season} yet.`);
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from('player_weeks').upsert(rows.slice(i,i+500), { onConflict: 'season,week,player_id' });
      if (error) { console.error('Season upsert failed',error.message); throw new Error('Could not save the season. You can retry the sync safely.'); }
    }
    const {syncTeamQuality}=await import('./radar-standings.server');
    await syncTeamQuality(data.season,Math.max(...rows.map(r=>r.week)));
    const summary = { status:'complete', completed_at: new Date().toISOString(), row_count: rows.length, latest_week: Math.max(...rows.map(r => r.week)), message: null };
    const saved = await db.from('season_syncs').update(summary).eq('season',data.season);
    if (saved.error) throw new Error('Data saved, but the sync summary could not be updated.');
    return { success: true, message: `${rows.length.toLocaleString()} player weeks loaded for ${data.season}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Season sync failed. Please try again.';
    await db.from('season_syncs').update({ status:'error', message }).eq('season',data.season);
    return { success: false, message };
  }
});
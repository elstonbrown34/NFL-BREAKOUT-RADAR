import { computeTeamQuality } from './radar-standings';
export async function syncTeamQuality(season:number,cutoffWeek:number) {
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const claimed=await db.rpc('claim_radar_schedule_sync',{p_season:season});
  if(claimed.error) throw new Error('Standings refresh unavailable');
  if(!claimed.data) return;
  const response=await fetch('https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',{signal:AbortSignal.timeout(45000)});
  if(!response.ok) throw new Error('nflverse standings unavailable');
  const csv=await response.text();
  const rows=Array.from({length:cutoffWeek},(_,i)=>computeTeamQuality(csv,season,i+1)).flat();
  if(!rows.length) throw new Error('No complete team standings available');
  const saved=await db.from('radar_team_quality').upsert(rows,{onConflict:'season,cutoff_week,team'});
  if(saved.error) throw new Error('Standings could not be saved');
}
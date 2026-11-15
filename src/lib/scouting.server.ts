import { computeBreakoutScores } from './breakout-model';
import { publicClient, readPlayerWeeks } from './nfl.server';
import { readSavedScoutingReport, scoutingNumbers, scoutingFingerprint } from './scouting-data';

export async function scoutingContext(data:{season:number;cutoffWeek:number;playerId:string}) {
  const db = publicClient();
  const [scores,weeks] = await Promise.all([
    db.from('breakout_scores').select('*').eq('season',data.season).eq('cutoff_week',data.cutoffWeek).order('player_id').limit(2000),
    readPlayerWeeks(data.season,data.cutoffWeek),
  ]);
  if (scores.error) throw new Error('Scouting scores unavailable');
  const player = scores.data.find(p=>p.player_id===data.playerId);
  if (!player) return null;
  // Reconstruct the earlier cutoff against its entire eligible cohort, not just this player.
  const previous = data.cutoffWeek>3 ? computeBreakoutScores(weeks,data.season,data.cutoffWeek-3) : [];
  const numbers = scoutingNumbers(player,scores.data,previous);
  const fingerprint = await scoutingFingerprint(numbers);
  const cached = await db.from('scouting_report_versions').select('report').eq('player_id',data.playerId).eq('season',data.season).eq('cutoff_week',data.cutoffWeek).eq('data_fingerprint',fingerprint).maybeSingle();
  if (cached.error) throw new Error('Scouting cache unavailable');
  const parsed = readSavedScoutingReport(cached.data?.report);
  if (cached.data && !parsed) console.error('Invalid saved scouting summary',{playerId:data.playerId});
  return {numbers,fingerprint,report:parsed};
}
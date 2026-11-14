import { computeBreakoutScores } from './breakout-model';
import { publicClient,readPlayerWeeks } from './nfl.server';
import { normalizeTeam,type RadarPlayer } from './radar-filters';
export async function radarContext(season:number,cutoffWeek:number) {
  const db=publicClient();
  const [scores,weeks,standings]=await Promise.all([
    db.from('breakout_scores').select('*').eq('season',season).eq('cutoff_week',cutoffWeek).order('rank').limit(2000),
    readPlayerWeeks(season,cutoffWeek),
    db.from('radar_team_quality').select('team,quality').eq('season',season).eq('cutoff_week',cutoffWeek),
  ]);
  if(scores.error||standings.error) throw new Error('Radar data unavailable');
  const previous=cutoffWeek>3?computeBreakoutScores(weeks,season,cutoffWeek-3):[];
  const prior=new Map(previous.map(p=>[p.player_id,p]));
  const qualities=new Map(standings.data.map(r=>[r.team,r.quality]));
  const players:RadarPlayer[]=scores.data.map(p=>{
    const old=prior.get(p.player_id);
    const delta=(field:'breakout_score'|'role_score'|'opportunity_score'|'efficiency_score')=>old?p[field]-old[field]:null;
    const quality=qualities.get(normalizeTeam(p.team));
    return {...p,changes:{overall:delta('breakout_score'),role:delta('role_score'),opportunity:delta('opportunity_score'),efficiency:delta('efficiency_score')},team_quality:quality==='good'||quality==='average'||quality==='bad'?quality:null};
  });
  return players;
}
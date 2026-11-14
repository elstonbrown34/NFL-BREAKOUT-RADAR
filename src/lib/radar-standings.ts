import Papa from 'papaparse';
import { RADAR_TEAMS,normalizeTeam } from './radar-filters';
export function computeTeamQuality(csv:string,season:number,cutoffWeek:number) {
  const records=new Map<string,{games:number;wins:number}>(RADAR_TEAMS.map(t=>[t,{games:0,wins:0}]));
  const rows=Papa.parse<Record<string,string>>(csv,{header:true,skipEmptyLines:true}).data;
  for(const r of rows) {
    if(Number(r['season'])!==season||r['game_type']!=='REG'||Number(r['week'])<1||Number(r['week'])>cutoffWeek||!r['home_score']?.trim()||!r['away_score']?.trim()) continue;
    const home=records.get(normalizeTeam(r['home_team']??'')),away=records.get(normalizeTeam(r['away_team']??''));
    const hs=Number(r['home_score']),as=Number(r['away_score']);
    if(!home||!away||!Number.isFinite(hs)||!Number.isFinite(as)) continue;
    home.games++;away.games++;home.wins+=hs>as?1:hs===as?.5:0;away.wins+=as>hs?1:hs===as?.5:0;
  }
  // Unplayed teams remain unknown; never label missing standings as bad.
  const ranked=[...records].filter(([,r])=>r.games>0).map(([team,r])=>({team,win_pct:r.wins/r.games})).sort((a,b)=>b.win_pct-a.win_pct||a.team.localeCompare(b.team));
  if(ranked.length!==32) return [];
  return ranked.map((r,i)=>({...r,season,cutoff_week:cutoffWeek,quality:i<10?'good' as const:i>=22?'bad' as const:'average' as const}));
}
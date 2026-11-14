import { describe,it,expect } from 'vitest';
import { computeTeamQuality } from './radar-standings';
import { RADAR_TEAMS } from './radar-filters';
const header='season,game_type,week,home_team,away_team,home_score,away_score\n';
const games=RADAR_TEAMS.slice(0,16).map((t,i)=>`2026,REG,10,${t},${RADAR_TEAMS[i+16]},20,10`).join('\n');
describe('Team quality through cutoff',()=>{
  it('top 10 are good, bottom 10 bad, remaining 12 average',()=>{const rows=computeTeamQuality(header+games,2026,10);expect(rows.filter(r=>r.quality==='good')).toHaveLength(10);expect(rows.filter(r=>r.quality==='bad')).toHaveLength(10);expect(rows.filter(r=>r.quality==='average')).toHaveLength(12);});
  it('ignores games after cutoff and other seasons',()=>{const csv=header+games+'\n2026,REG,11,ARI,TB,0,50\n2025,REG,10,ARI,TB,0,50';expect(computeTeamQuality(csv,2026,10).find(r=>r.team==='ARI')?.win_pct).toBe(1);});
  it('counts a tie as half a win',()=>{const csv=header+games.replace(`ARI,${RADAR_TEAMS[16]},20,10`,`ARI,${RADAR_TEAMS[16]},10,10`);expect(computeTeamQuality(csv,2026,10).find(r=>r.team==='ARI')?.win_pct).toBe(.5);});
  it('returns unknown when no season results exist',()=>{expect(computeTeamQuality(header,2026,10)).toEqual([]);});
});
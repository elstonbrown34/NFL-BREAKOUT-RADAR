import {describe,it,expect} from 'vitest';
import {reportSchema,readSavedScoutingReport,scoutingNumbers,scoutingFingerprint} from './scouting-data';
import type {BreakoutScore} from './breakout-model';
const player:BreakoutScore={season:2026,cutoff_week:10,player_id:'a',player_name:'Test',position:'WR',team:'NYJ',headshot_url:null,games:8,ppg:8.123,avg_snap_pct:.5,role_score:60,opportunity_score:70,efficiency_score:50,breakout_score:62,rank:1};
const report={why_rising:'His role score increased. Opportunity is strong.',what_to_watch:'The numbers do not establish why his role changed.',verdict:'Watch: Wait for sustained opportunity.'};
describe('scouting summary rules',()=>{
  it('accepts exactly the three requested fields',()=>{
    expect(reportSchema.safeParse(report).success).toBe(true);
    expect(reportSchema.safeParse({...report,news:'extra'}).success).toBe(false);
    expect(reportSchema.safeParse({why_rising:report.why_rising,verdict:report.verdict}).success).toBe(false);
  });
  it('requires one to two sentences for why_rising',()=>{
    expect(reportSchema.safeParse({...report,why_rising:''}).success).toBe(false);
    expect(reportSchema.safeParse({...report,why_rising:'One. Two. Three.'}).success).toBe(false);
  });
  it('requires one to two sentences for what_to_watch',()=>{
    expect(reportSchema.safeParse({...report,what_to_watch:''}).success).toBe(false);
    expect(reportSchema.safeParse({...report,what_to_watch:'One. Two. Three.'}).success).toBe(false);
  });
  it('requires a single short verdict sentence',()=>{
    expect(reportSchema.safeParse({...report,verdict:'Watch. Then buy.'}).success).toBe(false);
    expect(reportSchema.safeParse({...report,verdict:'x'.repeat(241)}).success).toBe(false);
  });
  it('requires exactly one allowed verdict label followed by a reason',()=>{
    for (const label of ['Strong Buy','Buy','Watch']) expect(reportSchema.safeParse({...report,verdict:`${label}: Opportunity supports the signal.`}).success).toBe(true);
    for (const verdict of ['Sell: Role is declining.','Watch:','Wait for sustained opportunity.','Buy: Watch for growth.']) {
      expect(reportSchema.safeParse({...report,verdict}).success).toBe(false);
    }
    expect(reportSchema.safeParse({...report,verdict:'Buy: Role\nis strong.'}).success).toBe(false);
  });
  it('keeps old cached reports available with a conservative label without changing data keys',()=>{
    expect(readSavedScoutingReport({...report,verdict:'Wait for sustained opportunity.'})?.verdict).toBe('Watch: Wait for sustained opportunity.');
    expect(readSavedScoutingReport(report)).toEqual(report);
    expect(readSavedScoutingReport({...report,verdict:''})).toBeNull();
  });
  it('compares each score to exactly three calendar weeks earlier',()=>{
    const previous={...player,cutoff_week:7,role_score:40,opportunity_score:75,efficiency_score:30,breakout_score:52};
    const data=scoutingNumbers(player,[player,{...player,player_id:'b',role_score:20}],[previous,{...previous,cutoff_week:8,role_score:99}]);
    expect(data.role.change_last_3_weeks).toBe(20);
    expect(data.opportunity.change_last_3_weeks).toBe(-5);
    expect(data.efficiency.change_last_3_weeks).toBe(20);
    expect(data.breakout.change_last_3_weeks).toBe(10);
  });
  it('uses null for an ineligible or missing earlier comparison',()=>{
    expect(scoutingNumbers(player,[player],[{...player,season:2025,cutoff_week:7}]).role.change_last_3_weeks).toBeNull();
  });
  it('only sends requested data and position-relative percentiles',()=>{
    const data=scoutingNumbers(player,[player,{...player,player_id:'b',role_score:20},{...player,player_id:'c',position:'RB',role_score:99},{...player,player_id:'d',cutoff_week:9,role_score:99}],[]);
    expect(data.role.percentile).toBe(100);
    expect(data.ppr_per_game).toBe(8.1);
    expect(Object.keys(data).sort()).toEqual(['season','week','position','team','ppr_per_game','breakout','role','opportunity','efficiency'].sort());
  });
  it('keeps an unchanged data cache key and changes it when weekly data changes',async()=>{
    const data=scoutingNumbers(player,[player],[]);
    expect(await scoutingFingerprint(data)).toBe(await scoutingFingerprint({...data}));
    expect(await scoutingFingerprint(data)).not.toBe(await scoutingFingerprint({...data,ppr_per_game:9}));
  });
});
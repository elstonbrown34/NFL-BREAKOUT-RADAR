import { describe,it,expect } from 'vitest';
import {reportSchema,scoutingNumbers} from './scouting-data';
import type {BreakoutScore} from './breakout-model';
import type {PlayerWeek} from './nfl-data';
const report={radar_sentences:['His role is growing.','He has 20 targets.'],risk_sentences:['Four games is a small sample.'],verdict:'Buy'};
describe('scouting report rules',()=>{
  it('requires exactly two to three radar sentences',()=>{
    expect(reportSchema.safeParse(report).success).toBe(true);
    expect(reportSchema.safeParse({...report,radar_sentences:['One.']}).success).toBe(false);
    expect(reportSchema.safeParse({...report,radar_sentences:['One.','Two.','Three.','Four.']}).success).toBe(false);
  });
  it('requires one to two risk sentences',()=>{
    expect(reportSchema.safeParse({...report,risk_sentences:[]}).success).toBe(false);
    expect(reportSchema.safeParse({...report,risk_sentences:['One.','Two.']}).success).toBe(true);
    expect(reportSchema.safeParse({...report,risk_sentences:['One.','Two.','Three.']}).success).toBe(false);
  });
  it('allows only Strong Buy, Buy, or Watch verdicts',()=>{
    for(const verdict of ['Strong Buy','Buy','Watch']) expect(reportSchema.safeParse({...report,verdict}).success).toBe(true);
    expect(reportSchema.safeParse({...report,verdict:'Sell'}).success).toBe(false);
  });
  it('never supplies another player, season, or future week to AI',()=>{
    const player={season:2026,cutoff_week:4,player_id:'a',games:4,ppg:8,avg_snap_pct:.5} as BreakoutScore;
    const row={season:2026,week:4,player_id:'a',offense_snaps:40,targets:5,carries:2,offense_pct:.5,target_share:.2} as PlayerWeek;
    const data=scoutingNumbers(player,[row,{...row,week:5,targets:100},{...row,season:2025,targets:200},{...row,player_id:'b',targets:300}]);
    expect(data.season_numbers.targets).toBe(5); expect(data.season_numbers.carries).toBe(2);
    expect(data.weekly_trend).toHaveLength(1); expect(data.weekly_trend[0]?.snap_share_pct).toBe(50);
  });
});
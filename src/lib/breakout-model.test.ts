import { describe, expect, it } from 'vitest';
import { breakoutMetrics, computeBreakoutScores, percentile } from './breakout-model';
import type { PlayerWeek } from './nfl-data';
const games = (id='a', changes:Partial<PlayerWeek> = {}):PlayerWeek[] => [1,3,4,6].map(week => ({ season:2026, week, player_id:id, player_name:id, position:'WR', team:'BUF', headshot_url:null, targets:4, receptions:3, receiving_yards:30, receiving_epa:2, carries:0, rushing_yards:0, rushing_epa:0, target_share:.2, wopr:.3, fantasy_points_ppr:8, offense_snaps:40, offense_pct:.5, ...changes }));
describe('breakout eligibility', () => {
  it('includes only WR TE RB', () => expect(computeBreakoutScores([...games('wr'),...games('te',{position:'TE'}),...games('rb',{position:'RB'}),...games('qb',{position:'QB'})],2026,6).map(p=>p.position).sort()).toEqual(['RB','TE','WR']));
  it('requires at least four games with offensive snaps', () => {
    expect(computeBreakoutScores(games().slice(0,3),2026,6)).toHaveLength(0);
    expect(computeBreakoutScores(games().map((r,i)=>i===0 ? {...r,offense_snaps:0}:r),2026,6)).toHaveLength(0);
    expect(computeBreakoutScores(games(),2026,6)[0]?.games).toBe(4);
  });
  it('requires at least 15 targets plus carries', () => {
    const rows = games().map((r,i)=>({...r,targets:i===0 ? 3:4}));
    expect(computeBreakoutScores(rows,2026,6)).toHaveLength(1);
    expect(computeBreakoutScores(rows.map((r,i)=>i===0 ? {...r,targets:2}:r),2026,6)).toHaveLength(0);
  });
  it('allows 75 percent snap share but not above it', () => {
    expect(computeBreakoutScores(games('a',{offense_pct:.75}),2026,6)).toHaveLength(1);
    expect(computeBreakoutScores(games('a',{offense_pct:.751}),2026,6)).toHaveLength(0);
  });
  it('requires PPR points per game strictly under 12', () => {
    expect(computeBreakoutScores(games('a',{fantasy_points_ppr:11.99}),2026,6)[0]?.ppg).toBeCloseTo(11.99);
    expect(computeBreakoutScores(games('a',{fantasy_points_ppr:12}),2026,6)).toHaveLength(0);
  });
  it('excludes future games and other seasons entirely', () => {
    const rows = games();
    expect(computeBreakoutScores([...rows,{...rows[0] as PlayerWeek,week:7,fantasy_points_ppr:1000},{...rows[0] as PlayerWeek,season:2025,fantasy_points_ppr:1000}],2026,6)).toEqual(computeBreakoutScores(rows,2026,6));
    expect(computeBreakoutScores(rows,2026,5)).toHaveLength(0);
  });
});
describe('metric and percentile rules', () => {
  it('uses last three games, not league weeks, against all earlier games', () => {
    const rows = games().map((r,i)=>({...r,offense_pct:i===0 ? .2:.6,target_share:i===0 ? .1:.3}));
    expect(breakoutMetrics(rows,2026,6)[0]?.snapTrend).toBeCloseTo(.4);
    expect(breakoutMetrics(rows,2026,6)[0]?.targetTrend).toBeCloseTo(.2);
  });
  it('uses average WOPR for WR and TE', () => {
    for (const position of ['WR','TE']) expect(breakoutMetrics(games('a',{position}),2026,6)[0]?.opportunity).toBeCloseTo(.3);
  });
  it('uses targets plus carries over snaps for RB', () => expect(breakoutMetrics(games('a',{position:'RB',carries:6}),2026,6)[0]?.opportunity).toBeCloseTo(.25));
  it('uses total receiving and rushing yards over snaps', () => expect(breakoutMetrics(games('a',{rushing_yards:10}),2026,6)[0]?.yardsPerSnap).toBe(1));
  it('uses total receiving and rushing EPA over opportunities', () => expect(breakoutMetrics(games('a',{rushing_epa:2,carries:4}),2026,6)[0]?.epaPerOpportunity).toBe(.5));
  it('ranks only against eligible players at the same position', () => {
    const scores = computeBreakoutScores([...games('a',{wopr:.1}),...games('b',{wopr:.9}),...games('c',{position:'RB',wopr:100}),...games('d',{wopr:100,fantasy_points_ppr:12})],2026,6);
    expect(scores.find(p=>p.player_id==='a')?.opportunity_score).toBe(0);
    expect(scores.find(p=>p.player_id==='b')?.opportunity_score).toBe(100);
    expect(scores.find(p=>p.player_id==='c')?.opportunity_score).toBe(50);
  });
  it('uses 40 percent Role, 40 percent Opportunity, and 20 percent Efficiency', () => {
    const scores = computeBreakoutScores([...games('a',{wopr:.1}),...games('b',{wopr:.9})],2026,6);
    const high = scores[0];
    expect(high?.role_score).toBe(50); expect(high?.opportunity_score).toBe(100); expect(high?.efficiency_score).toBe(50);
    expect(high?.breakout_score).toBe(70); expect(high?.rank).toBe(1); expect(scores[1]?.breakout_score).toBe(30);
  });
  it('uses average tied ranks and neutral missing metrics', () => {
    expect(percentile(1,[1,2,3])).toBe(0); expect(percentile(3,[1,2,3])).toBe(100);
    expect(percentile(2,[1,2,2,3])).toBe(50); expect(percentile(null,[1,2])).toBe(50);
  });
});
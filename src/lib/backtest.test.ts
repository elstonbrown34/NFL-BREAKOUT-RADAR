import { describe, expect, it } from 'vitest';
import { breakoutHit, evaluateBacktest, BACKTEST_SEASONS, finalRegularWeek, summarizeBacktests } from './backtest';
import { computeBreakoutScores } from './breakout-model';
import type { PlayerWeek } from './nfl-data';

const row = (player_id: string, week: number, fantasy_points_ppr = 8): PlayerWeek => ({ season:2024, week, player_id, player_name:player_id, team:'BUF', position:'WR', headshot_url:null, targets:4, receptions:3, receiving_yards:30, receiving_epa:2, carries:0, rushing_yards:0, rushing_epa:0, target_share:.2, wopr:.3, fantasy_points_ppr, offense_snaps:40, offense_pct:.5 });
describe('historical breakout rules', () => {
  it('covers 2019–2025 at the same Week 10 cutoff and handles the 17-week seasons',()=>{
    expect(BACKTEST_SEASONS).toEqual([2019,2020,2021,2022,2023,2024,2025]);
    for (const season of BACKTEST_SEASONS) {
      expect(finalRegularWeek(season)).toBe(season<2021?17:18);
      const before=[1,2,3,10].map(w=>({...row('a',w),season}));
      const after=[11,12,13,17].map(w=>({...row('a',w,12),season}));
      const result=evaluateBacktest(computeBreakoutScores(before,season,10),[...before,...after],season);
      expect(result.top20).toEqual({hits:1,total:1,rate:1});
    }
  });
  it('combines raw hits and denominators for all three rankings, not averaged rates',()=>{
    const a=evaluateBacktest([],[],2019),b=evaluateBacktest([],[],2020);
    a.baseline={hits:1,total:10,rate:.1};b.baseline={hits:9,total:30,rate:.3};
    a.benchmarks.forEach((benchmark,i)=>{benchmark.top20={hits:i+1,total:5,rate:(i+1)/5};});
    b.benchmarks.forEach((benchmark,i)=>{benchmark.top20={hits:i+2,total:20,rate:(i+2)/20};});
    const combined=summarizeBacktests([a,b]);
    expect(combined.baseline).toEqual({hits:10,total:40,rate:.25});
    combined.benchmarks.forEach((benchmark,i)=>{
      expect(benchmark.top20).toEqual({hits:2*i+3,total:25,rate:(2*i+3)/25});
      expect(benchmark.lift).toBe(((2*i+3)/25)/.25);
    });
    expect(summarizeBacktests([]).benchmarks.map(b=>b.lift)).toEqual([null,null,null]);
  });
  it('requires four played games', () => {
    expect(breakoutHit('WR',8,12,3)).toBe(false);
    expect(breakoutHit('WR',8,12,4)).toBe(true);
  });
  it('requires at least 12 PPR for WR and RB', () => {
    for (const position of ['WR','RB']) {
      expect(breakoutHit(position,7,11.99,4)).toBe(false);
      expect(breakoutHit(position,8,12,4)).toBe(true);
    }
  });
  it('requires at least 9 PPR for TE', () => {
    expect(breakoutHit('TE',4,8.99,4)).toBe(false);
    expect(breakoutHit('TE',5,9,4)).toBe(true);
  });
  it('requires at least four additional PPR points per game', () => {
    expect(breakoutHit('WR',8.01,12,4)).toBe(false);
    expect(breakoutHit('WR',8,12,4)).toBe(true);
  });
  it('evaluates only weeks 11 through 18 of the matching season and counts offensive games', () => {
    const before = [1,2,3,10].map(w => row('a',w));
    const scores = computeBreakoutScores(before,2024,10);
    const after = [11,12,17,18].map(w => row('a',w,12));
    const result = evaluateBacktest(scores,[...before,...after,row('a',19,100),{...row('a',15,100),season:2025},row('other',14,100),{...row('a',16,100),offense_snaps:0}],2024);
    expect(result.players[0]?.afterGames).toBe(4);
    expect(result.players[0]?.afterPpg).toBe(12);
    expect(result.players[0]?.hit).toBe(true);
  });
  it('uses all eligible players as the baseline, including players who never play again', () => {
    const before = Array.from({length:25},(_,i) => [1,2,3,10].map(w => row(`p${String(i).padStart(2,'0')}`,w))).flat();
    const scores = computeBreakoutScores(before,2024,10);
    const after = scores.slice(0,5).flatMap(p => [11,12,13,14].map(w => row(p.player_id,w,12)));
    const result = evaluateBacktest(scores,after,2024);
    expect(result.top10).toEqual({hits:5,total:10,rate:.5});
    expect(result.top20).toEqual({hits:5,total:20,rate:.25});
    expect(result.baseline).toEqual({hits:5,total:25,rate:.2});
    expect(result.lift).toBe(2.5);
    expect(result.players).toHaveLength(20);
    expect(result.players[5]?.afterPpg).toBeNull();
    expect(result.players[5]?.hit).toBe(false);
  });
  it('does not claim a lift when the baseline has no hits', () => {
    expect(evaluateBacktest(computeBreakoutScores([1,2,3,10].map(w=>row('a',w)),2024,10),[],2024).lift).toBeNull();
  });
  it('ranks recent PPR by the last three offensive games through week 10, not future results', () => {
    const before = ['a','b'].flatMap(id => [1,2,3,10].map(w=>row(id,w,id==='a' ? (w===1?30:5) : 9)));
    const scores=computeBreakoutScores(before,2024,10);
    const after=[11,12,13,14].map(w=>row('a',w,100));
    const result=evaluateBacktest(scores,[...before,...after,{...row('a',9,999),offense_snaps:0},{...row('a',10,999),season:2025}],2024);
    expect(result.benchmarks[1]?.playerIds).toEqual(['b','a']);
    expect(evaluateBacktest(scores,before,2024).benchmarks[1]?.playerIds).toEqual(['b','a']);
  });
  it('ranks snap growth using the last three non-limited games versus earlier games', () => {
    const before=['a','b'].flatMap(id=>[1,2,3,4,10].map(w=>({...row(id,w),offense_pct:w===10?.1:w===1?(id==='a'?.2:.6):.5})));
    const result=evaluateBacktest(computeBreakoutScores(before,2024,10),before,2024);
    expect(result.benchmarks[2]?.playerIds).toEqual(['a','b']);
  });
  it('keeps identical eligible pools, missing outcomes, and deterministic ties in every benchmark', () => {
    const before=Array.from({length:25},(_,i)=>[1,2,3,10].map(w=>row(`p${String(i).padStart(2,'0')}`,w))).flat();
    const scores=computeBreakoutScores(before,2024,10);
    const after=scores.slice(0,5).flatMap(p=>[11,12,13,14].map(w=>row(p.player_id,w,12)));
    const result=evaluateBacktest(scores,[...before,...after,...[1,2,3,10].map(w=>row('ineligible',w,100))],2024);
    for (const benchmark of result.benchmarks) {
      expect(benchmark.top10).toEqual({hits:5,total:10,rate:.5});
      expect(benchmark.top20).toEqual({hits:5,total:20,rate:.25});
      expect(benchmark.playerIds).toEqual(scores.slice(0,20).map(p=>p.player_id));
    }
  });
  it('places missing benchmark metrics last and returns null rates for empty cohorts', () => {
    const before=['a','b'].flatMap(id=>[1,2,3,10].map(w=>row(id,w)));
    const scores=computeBreakoutScores(before,2024,10);
    const result=evaluateBacktest(scores,before.filter(w=>w.player_id==='b'),2024);
    expect(result.benchmarks[1]?.playerIds).toEqual(['b','a']);
    expect(evaluateBacktest([],[],2024).benchmarks.map(b=>b.top20.rate)).toEqual([null,null,null]);
  });
});
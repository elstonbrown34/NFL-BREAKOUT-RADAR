import { describe, expect, it } from 'vitest';
import { breakoutHit, evaluateBacktest } from './backtest';
import { computeBreakoutScores } from './breakout-model';
import type { PlayerWeek } from './nfl-data';

const row = (player_id: string, week: number, fantasy_points_ppr = 8): PlayerWeek => ({ season:2024, week, player_id, player_name:player_id, team:'BUF', position:'WR', headshot_url:null, targets:4, receptions:3, receiving_yards:30, receiving_epa:2, carries:0, rushing_yards:0, rushing_epa:0, target_share:.2, wopr:.3, fantasy_points_ppr, offense_snaps:40, offense_pct:.5 });
describe('historical breakout rules', () => {
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
});
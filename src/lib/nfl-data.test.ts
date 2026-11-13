import { describe, expect, it } from 'vitest';
import { joinWeeks, normalizeName, parseCsv, SEASONS } from './nfl-data';
describe('nflverse import rules', () => {
  it('supports exactly the requested seasons', () => expect(SEASONS).toEqual([2024,2025,2026]));
  it('normalizes punctuation and name suffixes', () => expect(normalizeName("D.J. Moore Jr., III")).toBe('dj moore'));
  it('keeps only regular-season WR TE RB stats', () => {
    const rows = parseCsv('position,season_type\nWR,REG\nTE,REG\nRB,REG\nQB,REG\nWR,POST','stats');
    expect(rows.map(r => r['position'])).toEqual(['WR','TE','RB']);
  });
  it('keeps only regular-season WR TE RB snaps', () => {
    expect(parseCsv('position,game_type\nWR,REG\nRB,REG\nTE,REG\nQB,REG\nTE,POST','snaps').map(r => r['position'])).toEqual(['WR','RB','TE']);
  });
  it('joins normalized names on team and week and deduplicates', () => {
    const stats = {season:'2024',week:'1',player_id:'1',player_display_name:'John Smith Jr.',position:'WR',team:'NYJ'};
    const result = joinWeeks([stats,stats],[{player:'John Smith',team:'NYJ',week:'1',offense_pct:'0.75',offense_snaps:'45'}],2024);
    expect(result).toHaveLength(1); expect(result[0]?.offense_snaps).toBe(45);
  });
  it('falls back to last name with team and week', () => {
    const result = joinWeeks([{season:'2025',week:'2',player_id:'2',player_display_name:'J. Smith',position:'TE',team:'BUF'}],[{player:'John Smith',team:'BUF',week:'2',offense_pct:'0.9'}],2025);
    expect(result[0]?.offense_pct).toBe(0.9);
  });
  it('does not guess when last names are ambiguous', () => {
    const result = joinWeeks([{season:'2025',week:'2',player_id:'2',player_display_name:'J. Smith',position:'TE',team:'BUF'}],[{player:'John Smith',team:'BUF',week:'2',offense_pct:'0.9'},{player:'James Smith',team:'BUF',week:'2',offense_pct:'0.2'}],2025);
    expect(result[0]?.offense_pct).toBeNull();
  });
});
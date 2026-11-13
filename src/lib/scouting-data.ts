import { z } from 'zod';
import type { BreakoutScore } from './breakout-model';
import type { PlayerWeek } from './nfl-data';

export const scoutingInput = z.object({season:z.union([z.literal(2024),z.literal(2025),z.literal(2026)]),cutoffWeek:z.number().int().min(1).max(18),playerId:z.string().min(1).max(100)});
export const reportSchema = z.object({
  radar_sentences:z.array(z.string().trim().min(1).max(600)).min(2).max(3),
  risk_sentences:z.array(z.string().trim().min(1).max(600)).min(1).max(2),
  verdict:z.enum(['Strong Buy','Buy','Watch']),
}).strict();
export const SCOUTING_SYSTEM = 'You are an NFL front office analyst. Only use the numbers provided. Do not invent stats, injuries or news. If the sample is small, say so.';
export const reportJsonSchema = {
  type:'object', additionalProperties:false,
  properties:{
    radar_sentences:{type:'array',minItems:2,maxItems:3,items:{type:'string'},description:'Two to three sentences for Why he\'s on the radar, citing specific supplied numbers.'},
    risk_sentences:{type:'array',minItems:1,maxItems:2,items:{type:'string'},description:'One to two sentences for What could stop it. Only data-supported risks; do not assert a crowded depth chart without evidence.'},
    verdict:{type:'string',enum:['Strong Buy','Buy','Watch']},
  },required:['radar_sentences','risk_sentences','verdict'],
};
export function scoutingNumbers(player:BreakoutScore, weeks:PlayerWeek[]) {
  const eligibleWeeks = weeks.filter(w => w.season===player.season && w.player_id===player.player_id && w.week<=player.cutoff_week).sort((a,b)=>a.week-b.week);
  const games = eligibleWeeks.filter(w=>(w.offense_snaps ?? 0)>0);
  const total = (field:keyof PlayerWeek) => games.reduce((n,w)=>n+(typeof w[field]==='number' ? w[field] as number : 0),0);
  return {
    player, season_numbers:{games:player.games,ppr_per_game:player.ppg,average_snap_share_pct:player.avg_snap_pct*100,
      targets:total('targets'),carries:total('carries'),offensive_snaps:total('offense_snaps'),receiving_yards:total('receiving_yards'),rushing_yards:total('rushing_yards'),receiving_epa:total('receiving_epa'),rushing_epa:total('rushing_epa')},
    weekly_trend:eligibleWeeks.map(w=>({week:w.week,offensive_snaps:w.offense_snaps,snap_share_pct:w.offense_pct===null ? null:w.offense_pct*100,target_share_pct:w.target_share===null ? null:w.target_share*100,targets:w.targets,carries:w.carries,ppr:w.fantasy_points_ppr,wopr:w.wopr})),
    scoring_context:'Scores are 0–100 percentiles against eligible players at the same position, not probabilities. Role measures snap and target share growth; Opportunity measures WOPR for WR/TE or touches per snap for RB; Efficiency measures yards per snap and EPA per opportunity. Missing metrics are neutral. Season totals and PPR per game use games with offensive snaps. Depth chart, injuries and news are not provided.',
  };
}
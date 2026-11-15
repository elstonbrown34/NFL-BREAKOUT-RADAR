import { z } from 'zod';
import { seasonSchema } from './nfl-data';
import { percentile, type BreakoutScore } from './breakout-model';

export const scoutingInput = z.object({season:seasonSchema,cutoffWeek:z.number().int().min(1).max(18),playerId:z.string().min(1).max(100)}).strict();
const sentences = (min:number,max:number) => z.string().trim().min(1).max(900).refine(text => {
  const count = text.split(/(?<=[.!?])\s+(?=[A-Z"'])/).filter(Boolean).length;
  return count >= min && count <= max;
}, 'Unexpected sentence count');
const verdictSchema = sentences(1,1).pipe(z.string().max(240).regex(/^(Strong Buy|Buy|Watch):\s+\S[^\r\n]*$/, 'Verdict must start with exactly one label and a short reason')).refine(text => !/\b(?:Strong Buy|Buy|Watch)\b/.test(text.replace(/^(Strong Buy|Buy|Watch):\s+/,'')), 'Use exactly one verdict label');
export const reportSchema = z.object({why_rising:sentences(1,2),what_to_watch:sentences(1,2),verdict:verdictSchema}).strict();
// Older cached reports stay usable without another inference for unchanged data.
export function readSavedScoutingReport(value:unknown) {
  const legacy = reportSchema.extend({verdict:sentences(1,1).pipe(z.string().max(240))}).safeParse(value);
  if (!legacy.success) return null;
  const strict = reportSchema.safeParse(legacy.data);
  if (strict.success) return strict.data;
  const reason = legacy.data.verdict.replace(/^(Strong Buy|Buy|Watch)\b[:\s—–-]*/,'').trim();
  const labeled = reportSchema.safeParse({...legacy.data,verdict:`Watch: ${(reason || 'The supplied data does not support a stronger conclusion.').slice(0,233)}`});
  return labeled.success ? labeled.data : null;
}
export type ScoutingSummary = z.infer<typeof reportSchema>;
export const SCOUTING_SYSTEM = 'You are an NFL scout. Using ONLY the data provided, write a short scouting report. Do not invent stats, injuries or news. If the data does not support a conclusion, say so. The verdict must be one short sentence starting with exactly one label: Strong Buy, Buy, or Watch, followed by a colon and a short data-grounded reason. Use Watch when the evidence is inconclusive. Round all numbers to 1 decimal place. Treat games under 20% snap share as possible injury exits, not role changes.';
export const reportJsonSchema = {
  type:'object',additionalProperties:false,
  properties:{
    why_rising:{type:'string',description:'One to two sentences; do not assume the player is rising if the numbers do not support it.'},
    what_to_watch:{type:'string',description:'One to two sentences about data-supported uncertainty or signals to watch.'},
    verdict:{type:'string',description:'One short sentence starting with exactly Strong Buy:, Buy:, or Watch:, followed by a short reason; use only one label.',pattern:'^(Strong Buy|Buy|Watch):\\s+\\S[^\\r\\n]*$'},
  },required:['why_rising','what_to_watch','verdict'],
};
export function scoutingNumbers(player:BreakoutScore, current:BreakoutScore[], previous:BreakoutScore[]) {
  const peers = current.filter(p => p.season===player.season && p.cutoff_week===player.cutoff_week && p.position===player.position);
  const prior = previous.find(p => p.player_id===player.player_id && p.season===player.season && p.cutoff_week===player.cutoff_week-3);
  const round = (n:number) => Math.round(n*10)/10;
  const signal = (field:'breakout_score'|'role_score'|'opportunity_score'|'efficiency_score') => ({score:round(player[field]),percentile:round(percentile(player[field],peers.map(p=>p[field]))),change_last_3_weeks:prior ? round(player[field]-prior[field]) : null});
  return {season:player.season,week:player.cutoff_week,position:player.position,team:player.team,ppr_per_game:round(player.ppg),breakout:signal('breakout_score'),role:signal('role_score'),opportunity:signal('opportunity_score'),efficiency:signal('efficiency_score')};
}
export async function scoutingFingerprint(data:ReturnType<typeof scoutingNumbers>) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)));
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
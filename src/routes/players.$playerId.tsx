import { SEASONS, seasonSchema } from '@/lib/nfl-data';
import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/players/$playerId')({
  validateSearch:(s:Record<string,unknown>)=>({season:seasonSchema.parse(SEASONS.some(year=>year===Number(s['season'])) ? Number(s['season']) : 2026),cutoffWeek:Number(s['cutoffWeek']) || 0}),
  beforeLoad:({params,search})=>{throw redirect({to:'/player/$playerId',params,search});},
});

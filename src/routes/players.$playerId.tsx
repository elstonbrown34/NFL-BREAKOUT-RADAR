import {createFileRoute,redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/players/$playerId')({
  validateSearch:(s:Record<string,unknown>)=>({season:([2024,2025,2026].includes(Number(s['season'])) ? Number(s['season']):2026) as 2024 | 2025 | 2026,cutoffWeek:Number(s['cutoffWeek']) || 0}),
  beforeLoad:({params,search})=>{throw redirect({to:'/player/$playerId',params,search});},
});

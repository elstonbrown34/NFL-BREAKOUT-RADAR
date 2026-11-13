import { queryOptions } from '@tanstack/react-query';
import { getScores, getPlayerScore } from './scores.functions';
export const scoresOptions = queryOptions({ queryKey:['breakout-scores',2026], queryFn:() => getScores() });
export const playerScoreOptions = (playerId:string, cutoffWeek:number, season:2024 | 2025 | 2026 = 2026) => queryOptions({ queryKey:['player-score',season,cutoffWeek,playerId], queryFn:() => getPlayerScore({data:{playerId,cutoffWeek,season}}) });
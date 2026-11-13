import { queryOptions } from '@tanstack/react-query';
import { getRadar, getSeasonStatus } from './nfl.functions';
export const seasonStatusOptions = queryOptions({ queryKey: ['season-status'], queryFn: () => getSeasonStatus() });
export const radarOptions = (season: 2024 | 2025 | 2026) => queryOptions({ queryKey: ['radar', season], queryFn: () => getRadar({ data: { season } }) });

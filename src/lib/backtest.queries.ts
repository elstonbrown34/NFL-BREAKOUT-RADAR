import { queryOptions } from '@tanstack/react-query';
import { getBacktest } from './backtest.functions';
export const backtestOptions = queryOptions({ queryKey:['backtest',2024,2025,10], queryFn:() => getBacktest() });
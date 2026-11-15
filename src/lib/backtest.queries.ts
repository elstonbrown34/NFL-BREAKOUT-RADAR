import { queryOptions } from '@tanstack/react-query';
import { BACKTEST_SEASONS } from './backtest';
import { getBacktest } from './backtest.functions';
export const backtestOptions = queryOptions({ queryKey:['backtest',...BACKTEST_SEASONS,10], queryFn:() => getBacktest() });
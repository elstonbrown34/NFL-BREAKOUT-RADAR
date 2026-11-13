import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { evaluateBacktest } from '@/lib/backtest';

export function BacktestChart({seasons}:{seasons:ReturnType<typeof evaluateBacktest>[]}) {
  const data = seasons.map(s => ({season:String(s.season),top10:(s.top10.rate ?? 0)*100,top20:(s.top20.rate ?? 0)*100,baseline:(s.baseline.rate ?? 0)*100}));
  return <div className="backtest-chart" role="img" aria-label="Top 10, Top 20 and baseline breakout hit rates for 2024 and 2025"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:16,right:12,bottom:8,left:0}} barGap={8}>
    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
    <XAxis dataKey="season" stroke="var(--muted-foreground)" tickLine={false} axisLine={false}/>
    <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} width={45}/>
    <Tooltip cursor={{fill:'var(--secondary)'}} contentStyle={{background:'var(--card)',borderColor:'var(--border)',color:'var(--foreground)'}} formatter={v=>`${Number(v).toFixed(1)}%`}/>
    <Legend/>
    <Bar dataKey="top10" name="Top 10" fill="var(--primary)" maxBarSize={64} radius={[3,3,0,0]} isAnimationActive={false}/>
    <Bar dataKey="top20" name="Top 20" fill="var(--info)" maxBarSize={64} radius={[3,3,0,0]} isAnimationActive={false}/>
    <Bar dataKey="baseline" name="Baseline" fill="var(--muted-foreground)" maxBarSize={64} radius={[3,3,0,0]} isAnimationActive={false}/>
  </BarChart></ResponsiveContainer></div>;
}
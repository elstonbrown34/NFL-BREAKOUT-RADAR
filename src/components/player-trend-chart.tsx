import { LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Legend } from 'recharts';
import type {PlayerWeek} from '@/lib/nfl-data';
export function PlayerTrendChart({weeks,cutoffWeek}:{weeks:PlayerWeek[];cutoffWeek:number}) {
  const data=Array.from({length:cutoffWeek},(_,i)=>{
    const row=weeks.find(w=>w.week===i+1);
    return {week:i+1,snap:row?.offense_pct==null ? null:row.offense_pct*100,target:row?.target_share==null ? null:row.target_share*100};
  });
  return <div className="trend-chart" role="img" aria-label="Weekly snap share and target share line chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:12,right:16,bottom:8,left:0}}>
    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
    <XAxis dataKey="week" tickFormatter={v=>`W${v}`} stroke="var(--muted-foreground)" tickLine={false} axisLine={false}/>
    <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} width={45}/>
    <Tooltip contentStyle={{background:'var(--card)',borderColor:'var(--border)',color:'var(--foreground)'}} formatter={v=>`${Number(v).toFixed(1)}%`} labelFormatter={v=>`Week ${v}`}/>
    <Legend/>
    <Line type="linear" dataKey="snap" name="Snap share" stroke="var(--primary)" strokeWidth={2.5} dot={{r:3}} connectNulls={false} isAnimationActive={false}/>
    <Line type="linear" dataKey="target" name="Target share" stroke="var(--info)" strokeWidth={2.5} dot={{r:3}} connectNulls={false} isAnimationActive={false}/>
  </LineChart></ResponsiveContainer></div>;
}
import { UserRound } from 'lucide-react';
import { useState } from 'react';
export function Headshot({ url, name, large = false }: { url: string | null; name: string; large?: boolean }) {
  const [failed,setFailed] = useState(false);
  return <span className={`headshot ${large ? 'headshot-large' : ''}`}>{url && !failed ? <img src={url} alt={name} onError={() => setFailed(true)} loading="lazy"/> : <UserRound aria-label={`${name} headshot unavailable`}/>}</span>;
}
export function ScoreDisplay({ value }: { value:number }) {
  return <span className={`breakout-value ${value >= 70 ? 'signal-high' : value >= 40 ? 'signal-medium' : 'signal-low'}`}><strong>{value.toFixed(1)}</strong><progress max={100} value={value} aria-label="Breakout Score"/></span>;
}
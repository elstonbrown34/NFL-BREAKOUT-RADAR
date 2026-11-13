import { Link, useRouterState } from '@tanstack/react-router';
import { Radar, LayoutDashboard, BookOpen, ArrowUpRight, ChartColumn } from 'lucide-react';
import type { ReactNode } from 'react';
export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  return <><header className="app-header">
    <Link to="/" search={{ season: 2026 }} className="brand"><span className="brand-mark"><Radar size={25}/></span><div><div className="brand-name">NFL BREAKOUT RADAR<span className="text-primary">.</span></div><div className="brand-sub">Player intelligence</div></div></Link>
    <nav className="main-nav" aria-label="Main navigation"><Link to="/" search={{ season: 2026 }} className={`nav-link ${path === '/' ? 'active' : ''}`}><LayoutDashboard size={15}/>Radar</Link><Link to="/backtest" className={`nav-link ${path === '/backtest' ? 'active' : ''}`}><ChartColumn size={15}/>Backtest</Link><Link to="/how-it-works" className={`nav-link ${path === '/how-it-works' ? 'active' : ''}`}><BookOpen size={15}/>How It Works</Link></nav>
    <div className="header-right"><span className="live-dot"/> Powered by nflverse <ArrowUpRight size={13}/></div>
  </header><main className="page-content">{children}<footer className="footer"><span>Built by Elston Brown II · Data: nflverse</span><span>Regular season only · Not affiliated with the NFL</span></footer></main></>;
}

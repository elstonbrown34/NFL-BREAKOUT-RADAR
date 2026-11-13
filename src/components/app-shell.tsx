import { Link, useRouterState } from '@tanstack/react-router';
import { Radar, LayoutDashboard, Database, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  return <><header className="app-header">
    <Link to="/" search={{ season: 2026 }} className="brand"><span className="brand-mark"><Radar size={25}/></span><div><div className="brand-name">NFL BREAKOUT RADAR<span className="text-primary">.</span></div><div className="brand-sub">Player intelligence</div></div></Link>
    <nav className="main-nav" aria-label="Main navigation"><Link to="/" search={{ season: 2026 }} className={`nav-link ${path === '/' ? 'active' : ''}`}><LayoutDashboard size={15}/>Breakout radar</Link><Link to="/admin" className={`nav-link ${path === '/admin' ? 'active' : ''}`}><Database size={15}/>Data admin</Link></nav>
    <div className="header-right"><span className="live-dot"/> Powered by nflverse <ArrowUpRight size={13}/></div>
  </header><main className="page-content">{children}<footer className="footer"><span>NFL BREAKOUT RADAR <span className="mx-2">/</span> THE NEXT PLAY STARTS HERE.</span><span>Public data by nflverse · Regular season only · Not affiliated with the NFL</span></footer></main></>;
}

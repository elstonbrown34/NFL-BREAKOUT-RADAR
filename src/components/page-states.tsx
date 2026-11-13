import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { LoaderCircle, RefreshCw, ArrowLeft, SearchX } from 'lucide-react';
import { AppShell } from './app-shell';
import { Button } from './ui/button';
export function PageLoading() {
  return <AppShell><section className="page-state" role="status" aria-live="polite" aria-busy="true"><LoaderCircle className="animate-spin text-primary" size={30}/><h1 className="section-heading">Loading NFL Breakout Radar…</h1><p className="text-muted-foreground">Gathering the numbers. Just a moment.</p><div className="loading-lines" aria-hidden="true"><span/><span/><span/></div></section></AppShell>;
}
export function PageError({error}:ErrorComponentProps) {
  const router = useRouter();
  return <AppShell><section className="page-state"><h1 className="page-title">We couldn't load this page</h1><p role="alert" className="text-muted-foreground">{error instanceof Error ? error.message : 'Please try again in a moment.'}</p><div className="flex flex-wrap gap-3"><Button onClick={()=>router.invalidate()}><RefreshCw/>Try again</Button><Button asChild variant="outline"><Link to="/" search={{season:2026}}><ArrowLeft/>Back to Radar</Link></Button></div></section></AppShell>;
}
export function PageNotFound() {
  return <AppShell><section className="page-state"><SearchX size={32} className="text-muted-foreground"/><h1 className="page-title">Nothing here yet</h1><p className="text-muted-foreground">This page or player isn't available for the selected season and week.</p><Button asChild><Link to="/" search={{season:2026}}><ArrowLeft/>Back to Radar</Link></Button></section></AppShell>;
}
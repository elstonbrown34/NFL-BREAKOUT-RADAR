import {render,waitFor,cleanup} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
const {generate} = vi.hoisted(()=>({generate:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({useServerFn:()=>generate}));
vi.mock('@/lib/scouting.functions',()=>({generateScoutingReport:generate}));
import {ScoutingReport} from './scouting-report';
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('automatic scouting recovery',()=>{
  const props={season:2026 as const,cutoffWeek:10,playerId:'a'};
  it('does not invoke generation when a saved report exists',()=>{
    render(<ScoutingReport {...props} report={{why_rising:'Role is rising.',what_to_watch:'Watch opportunity.',verdict:'Watch: Monitor the role.'}}/>);
    expect(generate).not.toHaveBeenCalled();
  });
  it('leaves no card after the server rejects invalid AI output',async()=>{
    generate.mockResolvedValue(null);
    const {container}=render(<ScoutingReport {...props} report={null}/>);
    await waitFor(()=>expect(generate).toHaveBeenCalledTimes(1));
    expect(container.childElementCount).toBe(0);
  });
  it('logs transport failures without displaying a broken card',async()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    generate.mockRejectedValue(new Error('Unavailable'));
    const {container}=render(<ScoutingReport {...props} report={null}/>);
    await waitFor(()=>expect(log).toHaveBeenCalled());
    expect(container.childElementCount).toBe(0);
    log.mockRestore();
  });
});
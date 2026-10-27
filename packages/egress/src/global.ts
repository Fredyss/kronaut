import { setGlobalDispatcher } from 'undici';
import { createGuardedAgent } from './guarded-agent.ts';

let installed = false;

export function installGlobalDispatcher(): void {
  if (installed) {
    return;
  }
  setGlobalDispatcher(createGuardedAgent());
  installed = true;
}
